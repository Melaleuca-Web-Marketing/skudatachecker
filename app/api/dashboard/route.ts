import { NextRequest, NextResponse } from "next/server";

type RequestBody = Filters & {
  skus?: string[];
};

type Filters = {
  asOfDate?: string | null;
  channelId?: number | null;
  channelTypeId?: number | null;
  availableOnly?: number | boolean;
  languageId?: number | null;
};

const COUNTRIES = ["United States", "Canada", "Mexico", "United Kingdom", "Australia"];
const LANGUAGES = ["en-US", "es-MX", "fr-CA", "en-GB"];
const CULTURES = ["en-US", "es-MX", "fr-CA", "en-GB"];
const KIT_TYPES = ["Starter", "Bundle", "Sampler", "Core", "Accessory"];
const SALES_CHANNELS = ["Online", "Retail", "Wholesale", "Partner", "Direct"];
const WAREHOUSES = ["Warehouse A", "Warehouse B", "Warehouse C"];
const PRICE_TYPES = ["Retail", "Member", "Promo", "Wholesale"];
const POINTS_TYPES = ["Base", "Bonus", "Seasonal"];
const SELECT_TYPES = ["Required", "Optional", "Auto"];
const BAY_LOCATIONS = ["A1-04", "B3-12", "C2-07", "D4-09"];
const DIMENSION_UNITS = ["in", "cm"];
const WEIGHT_UNITS = ["lb", "kg"];
const PRODUCT_CATEGORIES = ["CAT-100", "CAT-200", "CAT-300"];
const SHIP_TO_COUNTRIES = ["US", "CA", "MX", "GB", "AU"];
const BUSINESS_RULES = [
  "Requires enrollment",
  "Limited to 2 per order",
  "Seasonal availability",
  "Bundle-only pricing",
];

function hashSeed(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 1_000_003;
  }
  return hash;
}

function pick<T>(values: T[], seed: number, offset: number) {
  return values[(seed + offset) % values.length];
}

function formatDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function buildDateRange(seed: number) {
  const startYear = 2022 + (seed % 3);
  const startMonth = (seed % 12) + 1;
  const endYear = startYear + 1;
  const endMonth = ((seed + 6) % 12) + 1;
  return {
    startDate: formatDate(startYear, startMonth, ((seed % 27) + 1)),
    endDate: formatDate(endYear, endMonth, ((seed % 27) + 1)),
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody;
  const skus = Array.from(new Set((body.skus || []).map((s) => (s ?? "").toString().trim()).filter(Boolean)));
  if (!skus.length) {
    return NextResponse.json({ error: "No SKUs provided" }, { status: 400 });
  }

  const rows = skus.map((sku) => {
    const seed = hashSeed(sku);
    const country = pick(COUNTRIES, seed, 1);
    const altCountry = pick(COUNTRIES, seed, 3);
    const language = pick(LANGUAGES, seed, 2);
    const { startDate, endDate } = buildDateRange(seed);
    const altDates = buildDateRange(seed + 11);
    const priceBase = 10 + (seed % 90);
    const childSku = `${sku}-A`;
    const ingredientSeed = seed + 17;
    const dimensionUnit = pick(DIMENSION_UNITS, seed, 4);
    const weightUnit = pick(WEIGHT_UNITS, seed, 5);

    return {
      sku,
      skuInfo: [{ sku }],
      description: [
        {
          country,
          language,
          productName: `Sample SKU ${sku}`,
          shortDescription: `Short description for SKU ${sku}.`,
          longDescription: `Placeholder description for SKU ${sku}, generated for UI testing.`,
        },
        {
          country: altCountry,
          language: pick(LANGUAGES, seed, 4),
          productName: `SKU ${sku} (${altCountry})`,
          shortDescription: `Localized short description for ${altCountry}.`,
          longDescription: `Extended placeholder copy for ${sku} in ${altCountry}.`,
        },
      ],
      details: [
        {
          country,
          kitType: pick(KIT_TYPES, seed, 2),
          startDate,
          endDate,
          standardWeight: `${(seed % 12) + 1} ${weightUnit}`,
          freightable: seed % 2 === 0,
          shippable: seed % 3 !== 0,
          commissionable: seed % 4 !== 0,
          memberOnly: seed % 5 === 0,
          coo: pick(SHIP_TO_COUNTRIES, seed, 7),
          tariffCode: `T-${(seed % 9000) + 1000}`,
        },
      ],
      ingredients: [
        {
          country,
          culture: pick(CULTURES, seed, 2),
          productName: `Sample SKU ${sku}`,
          ingredientName: `Ingredient ${(ingredientSeed % 40) + 1}`,
          shortDescription: `Ingredient notes for SKU ${sku}.`,
          allSort: (ingredientSeed % 20) + 1,
          keySort: (ingredientSeed % 10) + 1,
          modalCtaText: "View ingredient details",
          modalCtaLink: "https://example.com/ingredients",
        },
      ],
      channelAvailability: [
        {
          country,
          warehouse: pick(WAREHOUSES, seed, 1),
          salesChannel: pick(SALES_CHANNELS, seed, 2),
          startDate,
          endDate,
          available: seed % 2 === 0,
        },
        {
          country: altCountry,
          warehouse: pick(WAREHOUSES, seed, 4),
          salesChannel: pick(SALES_CHANNELS, seed, 5),
          startDate: altDates.startDate,
          endDate: altDates.endDate,
          available: seed % 3 !== 0,
        },
      ],
      pricing: [
        {
          country,
          priceType: pick(PRICE_TYPES, seed, 2),
          price: Number((priceBase + 0.95).toFixed(2)),
          startDate,
          endDate,
        },
      ],
      productPoints: [
        {
          country,
          productPointsType: pick(POINTS_TYPES, seed, 1),
          startDate,
          endDate,
        },
      ],
      kitDetails: [
        {
          country,
          quantity: 1 + (seed % 4),
          sortOrder: (seed % 5) + 1,
          newSortOrder: (seed % 7) + 1,
          parentSku: sku,
          childSku,
          childSkuDescription: `Accessory for SKU ${sku}`,
          selectType: pick(SELECT_TYPES, seed, 2),
          startDate,
          endDate,
        },
      ],
      businessRules: [
        {
          country,
          businessRule: pick(BUSINESS_RULES, seed, 2),
          startDate,
          endDate,
          itemUnitQty: (seed % 6) + 1,
          maxQty: (seed % 12) + 1,
          bundleMaxWeight: Number(((seed % 20) + 5 + 0.5).toFixed(1)),
          productCategoryIden: pick(PRODUCT_CATEGORIES, seed, 2),
          shipToCountry: pick(SHIP_TO_COUNTRIES, seed, 3),
          shipToCountryIden: `CT-${(seed % 200) + 1}`,
          ruleSku: sku,
          notificationLocalizationKey: `rule.${sku}.notice`,
          generalSupportingData: "Placeholder supporting data",
        },
      ],
      productBayLocation: [
        {
          country,
          warehouse: pick(WAREHOUSES, seed, 2),
          bayLocation: pick(BAY_LOCATIONS, seed, 1),
        },
      ],
      productDimension: [
        {
          country,
          unit: dimensionUnit,
          height: Number(((seed % 10) + 1 + 0.2).toFixed(2)),
          width: Number(((seed % 12) + 1 + 0.3).toFixed(2)),
          depth: Number(((seed % 8) + 1 + 0.4).toFixed(2)),
        },
      ],
      productWeight: [
        {
          country,
          weightAmount: Number(((seed % 15) + 1 + 0.6).toFixed(2)),
          weightUnit,
        },
      ],
      skuCounters: [
        {
          country,
          warehouse: pick(WAREHOUSES, seed, 2),
          onHand: 100 + (seed % 120),
          pending: 5 + (seed % 20),
          available: 90 + (seed % 90),
        },
      ],
      customsDetails: [
        {
          country,
          euTariffCode: `EU-${(seed % 9000) + 1000}`,
          standardCostEur: Number((priceBase * 0.82).toFixed(2)),
        },
      ],
    };
  });

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
