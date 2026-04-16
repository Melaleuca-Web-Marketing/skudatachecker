import { NextRequest, NextResponse } from "next/server";

// ── Request body from the frontend ───────────────────────────────────────────

type RequestBody = {
  skus?: string[];
  country?: string;
  softwareSystem?: string;
};

// ── External API response types ───────────────────────────────────────────────

type ApiDescriptionRow = {
  country: string;
  language: string;
  productName: string;
  shortDescription: string;
  longDescription: string;
};

type ApiDetailsRow = {
  country: string;
  kitType: string;
  startDate: string;
  endDate: string;
  standardWeight: number;
  freightable: boolean;
  shippable: boolean;
  commissionable: boolean;
  memberOnly: boolean;
  coO: string;
  tariffCode: string;
};

type ApiIngredientsRow = {
  country: string;
  culture: string;
  productName: string;
  ingredientName: string;
  shortDescription: string;
  allSort: number;
  keySort: number;
  modalCtaText: string;
  modalCtaLink: string;
};

type ApiChannelAvailabilityRow = {
  country: string;
  warehouse: string;
  salesChannel: string;
  startDate: string;
  endDate: string;
  available: boolean;
};

type ApiPricingRow = {
  country: string;
  priceType: string;
  price: number;
  startDate: string;
  endDate: string;
};

type ApiProductPointsRow = {
  country: string;
  productPointsType: string;
  value: number;
  startDate: string;
  endDate: string;
};

type ApiKitDetailsRow = {
  country: string;
  quantity: number;
  sortOrder: number;
  newSortOrder: number;
  parentSku: string;
  childSku: string;
  childSkuDescription: string;
  selectType: string;
  startDate: string;
  endDate: string;
};

type ApiBusinessRuleRow = {
  country: string;
  businessRule: string;
  startDate: string;
  endDate: string;
  itemUnitQty: number;
  maxQty: number;
  bundleMaxWeight: number;
  productCategoryIden: string;
  shipToCountry: string;
  shipToCountryIden: string;
  ruleSku: string;
  notificationLocalizationKey: string;
  generalSupportingData: string;
};

type ApiProductBayLocationRow = {
  country: string;
  warehouse: string;
  bayLocation: string;
};

type ApiProductDimensionRow = {
  country: string;
  unit: string;
  height: number;
  width: number;
  depth: number;
};

type ApiProductWeightRow = {
  country: string;
  weightAmount: number;
  weightUnit: string;
};

type ApiSkuCounterRow = {
  country: string;
  warehouse: string;
  onHand: number;
  pending: number;
  available: number;
};

type ApiCustomsDetailsRow = {
  country: string;
  euTariffCode: string;
  standardCostEur: number | null;
};

type ApiProductInfo = {
  descriptions: ApiDescriptionRow[];
  details: ApiDetailsRow[];
  ingredients: ApiIngredientsRow[];
  channelAvailability: ApiChannelAvailabilityRow[];
  pricing: ApiPricingRow[];
  productPoints: ApiProductPointsRow[];
  kitDetails: ApiKitDetailsRow[];
  productBusinessRules: ApiBusinessRuleRow[];
  productBayLocation: ApiProductBayLocationRow[];
  productDimension: ApiProductDimensionRow[];
  productWeight: ApiProductWeightRow[];
  productSkuCounter: ApiSkuCounterRow[];
  customsDetails: ApiCustomsDetailsRow[];
};

type ApiSkuItem = {
  sku: string;
  productInformation: ApiProductInfo;
};

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = (process.env.PRODUCT_API_BASE_URL ?? "").replace(/\/$/, "");
const DEFAULT_SOFTWARE_SYSTEM = process.env.PRODUCT_API_SOFTWARE_SYSTEM ?? "NorthAmerica";
const USER_ID = process.env.PRODUCT_API_USER_ID ?? "";

const ALLOWED_SOFTWARE_SYSTEMS = [
  "NorthAmerica",
  "Taiwan",
  "Japan",
  "Australia",
  "Korea",
  "Europe",
  "Singapore",
  "China",
  "Philippines",
] as const;

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchSkuData(skus: string[], country: string, softwareSystem: string): Promise<ApiSkuItem[]> {
  const params = new URLSearchParams();
  for (const sku of skus) {
    params.append("skus", sku);
  }
  if (country) {
    params.set("country", country);
  }

  const url = `${BASE_URL}/v1/Products/GlobalProductInformation?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      accept: "text/plain",
      SoftwareSystem: softwareSystem,
      UserId: USER_ID,
      CorrelationId: "asdf",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Upstream API returned ${res.status} for country=${country}`);
  }

  return res.json() as Promise<ApiSkuItem[]>;
}

// ── Transform API shape → frontend DashboardRow shape ────────────────────────

function transformItem(item: ApiSkuItem) {
  const info = item.productInformation;
  return {
    sku: item.sku,
    skuInfo: [{ sku: item.sku }],
    description: info.descriptions,
    details: info.details.map((d) => ({
      country: d.country,
      kitType: d.kitType,
      startDate: d.startDate,
      endDate: d.endDate,
      standardWeight: d.standardWeight,
      freightable: d.freightable,
      shippable: d.shippable,
      commissionable: d.commissionable,
      memberOnly: d.memberOnly,
      coo: d.coO,
      tariffCode: d.tariffCode,
    })),
    ingredients: info.ingredients,
    channelAvailability: info.channelAvailability,
    pricing: info.pricing,
    productPoints: info.productPoints,
    kitDetails: info.kitDetails,
    businessRules: info.productBusinessRules,
    productBayLocation: info.productBayLocation,
    productDimension: info.productDimension,
    productWeight: info.productWeight,
    skuCounters: info.productSkuCounter,
    customsDetails: info.customsDetails,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody;
  const skus = Array.from(
    new Set((body.skus || []).map((s) => (s ?? "").toString().trim()).filter(Boolean))
  );

  if (!skus.length) {
    return NextResponse.json({ error: "No SKUs provided" }, { status: 400 });
  }

  if (skus.length > 60) {
    return NextResponse.json({ error: "Too many SKUs (max 60)" }, { status: 400 });
  }

  const country = body.country?.trim() || "";
  const softwareSystem = body.softwareSystem?.trim() || DEFAULT_SOFTWARE_SYSTEM;

  if (!(ALLOWED_SOFTWARE_SYSTEMS as readonly string[]).includes(softwareSystem)) {
    return NextResponse.json({ error: "Invalid software system." }, { status: 400 });
  }

  try {
    let items: ApiSkuItem[];
    items = await fetchSkuData(skus, country, softwareSystem);

    const rows = items.map(transformItem);

    return NextResponse.json({ rows, meta: { rowCount: rows.length } }, { status: 200 });
  } catch (err: unknown) {
    console.error("[dashboard] fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch product data. Please try again." }, { status: 502 });
  }
}
