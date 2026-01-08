import { NextRequest, NextResponse } from "next/server";
import { getPool, sql } from "../../../lib/db";

type Filters = {
  asOfDate?: string | null;
  channelId?: number | null;
  channelTypeId?: number | null;
  availableOnly?: number | boolean;
  languageId?: number | null;
};

type RequestBody = Filters & {
  skus?: string[];
};

function buildSkuParams(skus: string[]) {
  const params: { name: string; value: string }[] = [];
  const values: string[] = [];
  skus.forEach((sku, idx) => {
    const name = `sku${idx}`;
    params.push({ name, value: sku });
    values.push(`(@${name})`);
  });
  return { params, values };
}

function groupBySku<T extends { SKU_NBR?: string; sku?: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  rows.forEach((row) => {
    const key = (row.SKU_NBR || row.sku || "").toString();
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });
  return map;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody;
  const skus = Array.from(new Set((body.skus || []).map((s) => (s ?? "").toString().trim()).filter(Boolean)));
  if (!skus.length) {
    return NextResponse.json({ error: "No SKUs provided" }, { status: 400 });
  }

  const asOfDate = body.asOfDate ?? null;
  const channelId = body.channelId ?? null;
  const channelTypeId = body.channelTypeId ?? null;
  const availableOnly = body.availableOnly ? 1 : 0;
  const languageId = body.languageId ?? null;

  const { params, values } = buildSkuParams(skus);
  const pool = await getPool();

  const request = pool.request();
  params.forEach((p) => request.input(p.name, sql.NVarChar(50), p.value));
  request.input("asOf", sql.Date, asOfDate);
  request.input("channelId", sql.Int, channelId);
  request.input("channelTypeId", sql.Int, channelTypeId);
  request.input("availableOnly", sql.Bit, availableOnly);
  request.input("languageId", sql.Int, languageId);

  const skuTable = values.join(",");

  const query = `
    SET NOCOUNT ON;
    DECLARE @MaxDate date = '9999-12-31';
    DECLARE @Skus TABLE (sku nvarchar(50));
    INSERT INTO @Skus (sku) VALUES ${skuTable};

    ------------------------------------------------------------
    -- Product spine
    ------------------------------------------------------------
    DECLARE @Prod TABLE (ProductId int PRIMARY KEY, ProductSku nvarchar(50), ProductDesc nvarchar(4000));
    INSERT INTO @Prod
    SELECT p.IDEN, p.SKU_NBR, p.DESCRIPTION
    FROM dbo.TBL_PRODUCT p
    WHERE p.SKU_NBR IN (SELECT sku FROM @Skus);

    DECLARE @ProdCountry TABLE (
      ProductCountryId int PRIMARY KEY,
      ProductId int,
      SKU_NBR nvarchar(50),
      CountryId int,
      LIFECYCLE_BEGIN_DATE date,
      LIFECYCLE_END_DATE date
    );
    INSERT INTO @ProdCountry
    SELECT
      pc.IDEN,
      pc.PRODUCT_IDEN_FK,
      COALESCE(pc.SKU_NBR, pr.ProductSku),
      pc.COUNTRY_IDEN_FK,
      pc.LIFECYCLE_BEGIN_DATE,
      pc.LIFECYCLE_END_DATE
    FROM dbo.TBL_PRODUCT_COUNTRY pc
    LEFT JOIN @Prod pr ON pr.ProductId = pc.PRODUCT_IDEN_FK
    WHERE pc.SKU_NBR IN (SELECT sku FROM @Skus) OR pr.ProductSku IN (SELECT sku FROM @Skus);

    ------------------------------------------------------------
    -- Section queries
    ------------------------------------------------------------
    -- Description: localized naming/description from TBL_PRODUCT_COUNTRY_LANGUAGE (falls back to product desc)
    SELECT
      spine.SKU_NBR AS sku,
      spine.CountryId,
      c.DESCRIPTION AS country,
      COALESCE(pcl.PRODUCT_NAME, pr.ProductDesc) AS productName,
      COALESCE(pcl.SHORT_DESC, pr.ProductDesc) AS shortDescription,
      COALESCE(pcl.LONG_DESC, pr.ProductDesc) AS longDescription,
      pcl.LANG_IDEN_FK AS languageId
    FROM @ProdCountry spine
    LEFT JOIN @Prod pr ON pr.ProductId = spine.ProductId
    LEFT JOIN dbo.TBL_COUNTRY c ON c.IDEN = spine.CountryId
    OUTER APPLY (
      SELECT TOP 1 *
      FROM dbo.TBL_PRODUCT_COUNTRY_LANGUAGE pcl
      WHERE pcl.PRODUCT_COUNTRY_IDEN_FK = spine.ProductCountryId
        AND (@languageId IS NULL OR pcl.LANG_IDEN_FK = @languageId)
      ORDER BY CASE WHEN pcl.LANG_IDEN_FK = @languageId THEN 0 ELSE 1 END, pcl.IDEN
    ) pcl
    WHERE @asOf IS NULL OR @asOf BETWEEN spine.LIFECYCLE_BEGIN_DATE AND ISNULL(spine.LIFECYCLE_END_DATE, @MaxDate);

    -- Details
    SELECT
      spine.SKU_NBR AS sku,
      c.DESCRIPTION AS country,
      kt.DESCRIPTION AS kitType,
      spine.LIFECYCLE_BEGIN_DATE AS startDate,
      spine.LIFECYCLE_END_DATE AS endDate
    FROM @ProdCountry spine
    LEFT JOIN dbo.TBL_PRODUCT_COUNTRY pc ON pc.IDEN = spine.ProductCountryId
    LEFT JOIN dbo.TBL_COUNTRY c ON c.IDEN = spine.CountryId
    LEFT JOIN dbo.TBL_KIT_TYPE kt ON kt.IDEN = pc.KIT_TYPE_IDEN_FK
    WHERE @asOf IS NULL OR @asOf BETWEEN spine.LIFECYCLE_BEGIN_DATE AND ISNULL(spine.LIFECYCLE_END_DATE, @MaxDate);

    -- Channel Availability
    SELECT
      spine.SKU_NBR AS sku,
      spine.CountryId,
      c.DESCRIPTION AS country,
      ch.CHANNEL_IDEN_FK AS channelId,
      chm.DESCRIPTION AS salesChannel,
      chm.CHANNEL_TYPE_IDEN_FK AS channelTypeId,
      ch.WAREHOUSE_IDEN_FK AS warehouseId,
      ch.START_DATE AS startDate,
      ch.END_DATE AS endDate,
      ch.AVAILABLE
    FROM @ProdCountry spine
    JOIN dbo.TBL_CHANNEL_PRODUCT ch ON ch.PRODUCT_COUNTRY_IDEN_FK = spine.ProductCountryId
    LEFT JOIN dbo.TBL_CHANNEL chm ON chm.IDEN = ch.CHANNEL_IDEN_FK
    LEFT JOIN dbo.TBL_COUNTRY c ON c.IDEN = spine.CountryId
    WHERE (@channelId IS NULL OR ch.CHANNEL_IDEN_FK = @channelId)
      AND (@channelTypeId IS NULL OR chm.CHANNEL_TYPE_IDEN_FK = @channelTypeId)
      AND (@availableOnly = 0 OR ch.AVAILABLE = 1)
      AND (@asOf IS NULL OR @asOf BETWEEN ch.START_DATE AND ISNULL(ch.END_DATE, @MaxDate));

    -- Pricing (effective price)
    ;WITH ActiveBase AS (
      SELECT
        pps.PRODCOUNTRY_IDEN_FK AS ProductCountryId,
        ps.DESCRIPTION AS PriceSchedule,
        pt.DESCRIPTION AS PriceType,
        v.PRICETYPE_IDEN_FK,
        v.PRODPRICESCHED_IDEN_FK,
        v.PRICEVALUE,
        v.BEGIN_DATE AS BaseBeginDate,
        v.END_DATE AS BaseEndDate
      FROM dbo.TBL_PRODUCT_PRICE_SCHEDULE pps
      JOIN dbo.TBL_PRICE_SCHEDULE ps ON ps.IDEN = pps.PRICESCHED_IDEN_FK
      JOIN dbo.TBL_PROD_PRICE_SCHED_VALUE v ON v.PRODPRICESCHED_IDEN_FK = pps.IDEN
      JOIN dbo.TBL_PRICE_TYPE pt ON pt.IDEN = v.PRICETYPE_IDEN_FK
      WHERE pps.PRODCOUNTRY_IDEN_FK IN (SELECT ProductCountryId FROM @ProdCountry)
        AND (@asOf IS NULL OR @asOf BETWEEN v.BEGIN_DATE AND ISNULL(v.END_DATE, @MaxDate))
    ),
    ActiveOverride AS (
      SELECT
        pps.PRODCOUNTRY_IDEN_FK AS ProductCountryId,
        o.PRICETYPE_IDEN_FK,
        o.PRODPRICESCHED_IDEN_FK,
        o.OVERRIDE_PRICEVALUE,
        o.BEGIN_DATE AS OverrideBeginDate,
        o.END_DATE AS OverrideEndDate
      FROM dbo.TBL_PRODUCT_PRICE_SCHEDULE pps
      JOIN dbo.TBL_PROD_PRICE_SCHED_VALUE_OVERRIDE o ON o.PRODPRICESCHED_IDEN_FK = pps.IDEN
      WHERE pps.PRODCOUNTRY_IDEN_FK IN (SELECT ProductCountryId FROM @ProdCountry)
        AND (@asOf IS NULL OR @asOf BETWEEN o.BEGIN_DATE AND ISNULL(o.END_DATE, @MaxDate))
    )
    SELECT
      spine.SKU_NBR AS sku,
      spine.CountryId,
      c.DESCRIPTION AS country,
      b.PriceSchedule,
      b.PriceType,
      COALESCE(o.OVERRIDE_PRICEVALUE, b.PRICEVALUE) AS price,
      CASE WHEN o.OVERRIDE_PRICEVALUE IS NULL THEN b.BaseBeginDate ELSE o.OverrideBeginDate END AS startDate,
      CASE WHEN o.OVERRIDE_PRICEVALUE IS NULL THEN b.BaseEndDate ELSE o.OverrideEndDate END AS endDate
    FROM ActiveBase b
    JOIN @ProdCountry spine ON spine.ProductCountryId = b.ProductCountryId
    LEFT JOIN ActiveOverride o
      ON o.ProductCountryId = b.ProductCountryId
      AND o.PRICETYPE_IDEN_FK = b.PRICETYPE_IDEN_FK
      AND o.PRODPRICESCHED_IDEN_FK = b.PRODPRICESCHED_IDEN_FK
    LEFT JOIN dbo.TBL_COUNTRY c ON c.IDEN = spine.CountryId;

    -- Product Points
    SELECT
      spine.SKU_NBR AS sku,
      spine.CountryId,
      c.DESCRIPTION AS country,
      bpd.BPTYPE_IDEN_FK AS pointsTypeId,
      bpd.BASEPOINTVALUE AS pointsValue,
      bpd.BEGIN_DATE AS startDate,
      bpd.END_DATE AS endDate
    FROM dbo.TBL_PRODUCT_COUNTRY_BP_DETAIL bpd
    JOIN @ProdCountry spine ON spine.ProductCountryId = bpd.PRODUCT_COUNTRY_IDEN_FK
    LEFT JOIN dbo.TBL_COUNTRY c ON c.IDEN = spine.CountryId
    WHERE @asOf IS NULL OR @asOf BETWEEN bpd.BEGIN_DATE AND ISNULL(bpd.END_DATE, @MaxDate);

    -- Kit Details
    SELECT
      pTop.SKU_NBR AS topSku,
      pParent.SKU_NBR AS parentSku,
      pChild.SKU_NBR AS childSku,
      f.COUNTRY_IDEN_FK AS countryId,
      c.DESCRIPTION AS country,
      f.PRODUCT_QTY AS quantity,
      f.KIT_DETAIL_SELECT_TYPE_IDEN_FK AS selectType,
      f.LIFECYCLE_BEGIN_DATE AS startDate,
      f.LIFECYCLE_END_DATE AS endDate
    FROM dbo.TBL_KIT_DETAIL_PRODUCT_FLAT f
    JOIN dbo.TBL_PRODUCT pTop ON pTop.IDEN = f.TOP_PARENT_PRODUCT_IDEN_FK
    JOIN dbo.TBL_PRODUCT pParent ON pParent.IDEN = f.PARENT_PRODUCT_IDEN_FK
    JOIN dbo.TBL_PRODUCT pChild ON pChild.IDEN = f.CHILD_PRODUCT_IDEN_FK
    LEFT JOIN dbo.TBL_COUNTRY c ON c.IDEN = f.COUNTRY_IDEN_FK
    WHERE f.TOP_PARENT_PRODUCT_IDEN_FK IN (SELECT DISTINCT ProductId FROM @ProdCountry)
      AND (@asOf IS NULL OR @asOf BETWEEN f.LIFECYCLE_BEGIN_DATE AND ISNULL(f.LIFECYCLE_END_DATE, @MaxDate));

    -- Business Rules (placeholder schema)
    SELECT TOP 0
      CAST(NULL AS nvarchar(50)) AS sku,
      CAST(NULL AS nvarchar(100)) AS country,
      CAST(NULL AS nvarchar(4000)) AS businessRule,
      CAST(NULL AS date) AS startDate,
      CAST(NULL AS date) AS endDate;

    -- SKU Counters (placeholder schema)
    SELECT TOP 0
      CAST(NULL AS nvarchar(50)) AS sku,
      CAST(NULL AS nvarchar(100)) AS country,
      CAST(NULL AS nvarchar(100)) AS warehouse,
      CAST(NULL AS int) AS onHand,
      CAST(NULL AS int) AS pending,
      CAST(NULL AS int) AS available;
  `;

  const result = await request.query(query);
  const [
    description,
    details,
    channelAvailability,
    pricing,
    productPoints,
    kitDetails,
    businessRules,
    skuCounters,
  ] = result.recordsets;

  const descBySku = groupBySku(description);
  const detailsBySku = groupBySku(details);
  const channelBySku = groupBySku(channelAvailability);
  const pricingBySku = groupBySku(pricing);
  const pointsBySku = groupBySku(productPoints);
  const kitsBySku = groupBySku(
    kitDetails.map((k) => ({ ...k, sku: k.topSku ?? k.parentSku ?? k.childSku }))
  );
  const rulesBySku = groupBySku(businessRules);
  const countersBySku = groupBySku(skuCounters);

  const rows = skus.map((sku) => ({
    sku,
    skuInfo: { sku },
    description: descBySku.get(sku) ?? [],
    details: detailsBySku.get(sku) ?? [],
    channelAvailability: channelBySku.get(sku) ?? [],
    pricing: pricingBySku.get(sku) ?? [],
    productPoints: pointsBySku.get(sku) ?? [],
    kitDetails: kitsBySku.get(sku) ?? [],
    businessRules: rulesBySku.get(sku) ?? [],
    skuCounters: countersBySku.get(sku) ?? [],
  }));

  return NextResponse.json(
    {
      rows,
      meta: {
        rowCount: rows.length,
      },
    },
    { status: 200 }
  );
}
