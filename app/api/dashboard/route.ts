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
const KIT_TYPES = ["Starter", "Bundle", "Sampler", "Core", "Accessory"];
const SALES_CHANNELS = ["Online", "Retail", "Wholesale", "Partner", "Direct"];
const WAREHOUSES = ["Warehouse A", "Warehouse B", "Warehouse C"];
const PRICE_TYPES = ["Retail", "Member", "Promo", "Wholesale"];
const POINTS_TYPES = ["Base", "Bonus", "Seasonal"];
const SELECT_TYPES = ["Required", "Optional", "Auto"];
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
    const pointsBase = 5 + (seed % 30);
    const childSku = `${sku}-A`;

    return {
      sku,
      skuInfo: [{ sku }],
      description: [
        {
          sku,
          country,
          language,
          productName: `Sample SKU ${sku}`,
          shortDescription: `Short description for SKU ${sku}.`,
          longDescription: `Placeholder description for SKU ${sku}, generated for UI testing.`,
        },
        {
          sku,
          country: altCountry,
          language: pick(LANGUAGES, seed, 4),
          productName: `SKU ${sku} (${altCountry})`,
          shortDescription: `Localized short description for ${altCountry}.`,
          longDescription: `Extended placeholder copy for ${sku} in ${altCountry}.`,
        },
      ],
      details: [
        {
          sku,
          country,
          kitType: pick(KIT_TYPES, seed, 2),
          startDate,
          endDate,
        },
      ],
      channelAvailability: [
        {
          sku,
          country,
          warehouse: pick(WAREHOUSES, seed, 1),
          salesChannel: pick(SALES_CHANNELS, seed, 2),
          startDate,
          endDate,
        },
        {
          sku,
          country: altCountry,
          warehouse: pick(WAREHOUSES, seed, 4),
          salesChannel: pick(SALES_CHANNELS, seed, 5),
          startDate: altDates.startDate,
          endDate: altDates.endDate,
        },
      ],
      pricing: [
        {
          sku,
          country,
          priceType: pick(PRICE_TYPES, seed, 2),
          price: Number((priceBase + 0.95).toFixed(2)),
          startDate,
          endDate,
        },
      ],
      productPoints: [
        {
          sku,
          country,
          pointsType: pick(POINTS_TYPES, seed, 1),
          pointsValue: pointsBase,
          startDate,
          endDate,
        },
      ],
      kitDetails: [
        {
          sku,
          country,
          quantity: 1 + (seed % 4),
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
          sku,
          country,
          businessRule: pick(BUSINESS_RULES, seed, 2),
          startDate,
          endDate,
        },
      ],
      skuCounters: [
        {
          sku,
          country,
          warehouse: pick(WAREHOUSES, seed, 2),
          onHand: 100 + (seed % 120),
          pending: 5 + (seed % 20),
          available: 90 + (seed % 90),
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
