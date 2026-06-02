import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

// ── Runtime schema validation (zod) ──────────────────────────────────────────
// Validates and strips unexpected fields from the upstream API response before
// any data flows to the client or the Excel export.

const s = z.string();
const n = z.number();
const b = z.boolean();
const sOpt = z.string().optional().default("");
const nOpt = z.number().optional().default(0);

const ApiDescriptionRowSchema = z.object({ country: s, language: s, productName: s, shortDescription: s, longDescription: s });
const ApiDetailsRowSchema = z.object({ country: s, kitType: s, startDate: s, endDate: s, standardWeight: n, freightable: b, shippable: b, commissionable: b, memberOnly: b, coO: s, tariffCode: s });
const ApiIngredientsRowSchema = z.object({ country: s, culture: s, productName: s, ingredientName: s, shortDescription: s, allSort: n, keySort: n, modalCtaText: sOpt, modalCtaLink: sOpt });
const ApiChannelAvailabilityRowSchema = z.object({ country: s, warehouse: s, salesChannel: s, startDate: s, endDate: s, available: b });
const ApiPricingRowSchema = z.object({ country: s, priceType: s, price: n, startDate: s, endDate: s });
const ApiProductPointsRowSchema = z.object({ country: s, productPointsType: s, value: n, startDate: s, endDate: s });
const ApiKitDetailsRowSchema = z.object({ country: s, quantity: n, sortOrder: n, newSortOrder: n, parentSku: s, childSku: s, childSkuDescription: s, selectType: s, startDate: s, endDate: s });
const ApiBusinessRuleRowSchema = z.object({ country: s, businessRule: s, startDate: s, endDate: s, itemUnitQty: nOpt, maxQty: nOpt, bundleMaxWeight: nOpt, productCategoryIden: sOpt, shipToCountry: sOpt, shipToCountryIden: sOpt, ruleSku: sOpt, notificationLocalizationKey: sOpt, generalSupportingData: sOpt });
const ApiProductBayLocationRowSchema = z.object({ country: s, warehouse: s, bayLocation: s });
const ApiProductDimensionRowSchema = z.object({ country: s, unit: s, height: n, width: n, depth: n });
const ApiProductWeightRowSchema = z.object({ country: s, weightAmount: n, weightUnit: s });
const ApiSkuCounterRowSchema = z.object({ country: s, warehouse: s, onHand: n, pending: n, available: n });
const ApiCustomsDetailsRowSchema = z.object({ country: s, euTariffCode: sOpt, standardCostEur: n.nullable() });

const ApiProductInfoSchema = z.object({
  descriptions: z.array(ApiDescriptionRowSchema),
  details: z.array(ApiDetailsRowSchema),
  ingredients: z.array(ApiIngredientsRowSchema),
  channelAvailability: z.array(ApiChannelAvailabilityRowSchema),
  pricing: z.array(ApiPricingRowSchema),
  productPoints: z.array(ApiProductPointsRowSchema),
  kitDetails: z.array(ApiKitDetailsRowSchema),
  productBusinessRules: z.array(ApiBusinessRuleRowSchema),
  productBayLocation: z.array(ApiProductBayLocationRowSchema),
  productDimension: z.array(ApiProductDimensionRowSchema),
  productWeight: z.array(ApiProductWeightRowSchema),
  productSkuCounter: z.array(ApiSkuCounterRowSchema),
  customsDetails: z.array(ApiCustomsDetailsRowSchema),
});

const ApiSkuItemArraySchema = z.array(
  z.object({ sku: s, productInformation: ApiProductInfoSchema })
);

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = (process.env.PRODUCT_API_BASE_URL ?? "").replace(/\/$/, "");
const DEFAULT_SOFTWARE_SYSTEM = process.env.PRODUCT_API_SOFTWARE_SYSTEM ?? "NorthAmerica";
const USER_ID = process.env.PRODUCT_API_USER_ID ?? "";

// Some software systems route to a different upstream host.
// Add PRODUCT_API_BASE_URL_<SYSTEM> to .env.local to override per system.
const SYSTEM_BASE_URL_OVERRIDES: Partial<Record<string, string>> = {
  Europe: (process.env.PRODUCT_API_BASE_URL_EUROPE ?? "").replace(/\/$/, "") || BASE_URL,
};

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

type SoftwareSystem = (typeof ALLOWED_SOFTWARE_SYSTEMS)[number];

class UpstreamFetchError extends Error {
  country: string;
  status: number;

  constructor(country: string, status: number) {
    super(`Upstream API returned ${status} for country=${country}`);
    this.name = "UpstreamFetchError";
    this.country = country;
    this.status = status;
  }
}

class AllCountriesFailedError extends Error {
  softwareSystem: SoftwareSystem;
  failedCountries: FailedCountryFetch[];

  constructor(softwareSystem: SoftwareSystem, failedCountries: FailedCountryFetch[]) {
    const failureSummary = failedCountries
      .map(({ country, status }) => `${country} (${status})`)
      .join(", ");
    super(
      `Upstream API returned failures for all ${softwareSystem} countries${failureSummary ? `: ${failureSummary}` : ""}`
    );
    this.name = "AllCountriesFailedError";
    this.softwareSystem = softwareSystem;
    this.failedCountries = failedCountries;
  }
}

const SOFTWARE_SYSTEM_COUNTRIES: Record<SoftwareSystem, readonly string[]> = {
  NorthAmerica: ["UnitedStates", "Canada", "Mexico"],
  Taiwan: ["Taiwan"],
  Japan: ["Japan"],
  Australia: ["Australia", "NewZealand"],
  Korea: ["Korea", "HongKong"],
  Europe: [
    "UnitedKingdom",
    "Ireland",
    "Netherlands",
    "Germany",
    "Austria",
    "Hungary",
    "Poland",
    "Spain",
    "Lithuania",
    "Latvia",
    "Estonia",
  ],
  Singapore: ["Singapore", "Malaysia"],
  China: ["China"],
  Philippines: ["Philippines"],
};

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchSkuData(skus: string[], country: string, softwareSystem: string): Promise<ApiSkuItem[]> {
  const params = new URLSearchParams();
  for (const sku of skus) {
    params.append("skus", sku);
  }
  if (country) {
    params.set("country", country);
  }

  const baseUrl = SYSTEM_BASE_URL_OVERRIDES[softwareSystem] ?? BASE_URL;
  const url = `${baseUrl}/v1/Products/GlobalProductInformation?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      accept: "text/plain",
      SoftwareSystem: softwareSystem,
      UserId: USER_ID,
      CorrelationId: `skuvd-${crypto.randomUUID()}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new UpstreamFetchError(country, res.status);
  }

  const raw = await res.json();
  const parsed = ApiSkuItemArraySchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      "[dashboard] upstream response failed schema validation:",
      parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`)
    );
    return raw as ApiSkuItem[];
  }
  return parsed.data as ApiSkuItem[];
}

function dedupe<T>(rows: T[], key: (r: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = key(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function mergeInfoInto(target: ApiProductInfo, source: ApiProductInfo) {
  target.descriptions.push(...source.descriptions);
  target.details.push(...source.details);
  target.ingredients.push(...source.ingredients);
  target.channelAvailability.push(...source.channelAvailability);
  target.pricing.push(...source.pricing);
  target.productPoints.push(...source.productPoints);
  target.kitDetails.push(...source.kitDetails);
  target.kitDetails = dedupe(target.kitDetails, (r) => `${r.country}|${r.parentSku}|${r.childSku}|${r.sortOrder}|${r.newSortOrder}|${r.startDate}`);
  target.productBusinessRules.push(...source.productBusinessRules);
  target.productBayLocation.push(...source.productBayLocation);
  target.productBayLocation = dedupe(target.productBayLocation, (r) => `${r.country}|${r.warehouse}|${r.bayLocation}`);
  target.productDimension.push(...source.productDimension);
  target.productDimension = dedupe(target.productDimension, (r) => `${r.country}|${r.unit}`);
  target.productWeight.push(...source.productWeight);
  target.productWeight = dedupe(target.productWeight, (r) => `${r.country}|${r.weightUnit}`);
  target.productSkuCounter.push(...source.productSkuCounter);
  target.productSkuCounter = dedupe(target.productSkuCounter, (r) => `${r.country}|${r.warehouse}`);
  target.customsDetails.push(...source.customsDetails);
  target.customsDetails = dedupe(target.customsDetails, (r) => r.country);
}

function mergeSkuItems(itemsByCountry: ApiSkuItem[][]) {
  const merged = new Map<string, ApiSkuItem>();

  for (const countryItems of itemsByCountry) {
    for (const item of countryItems) {
      const existing = merged.get(item.sku);
      if (!existing) {
        merged.set(item.sku, item);
        continue;
      }

      mergeInfoInto(existing.productInformation, item.productInformation);
    }
  }

  return Array.from(merged.values());
}

type FailedCountryFetch = {
  country: string;
  status: number | "ERR";
};

const CHUNK_SIZE = 60;
const MAX_SKUS = 240;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// Fetches one chunk of SKUs across all required countries and merges the results.
async function fetchChunk(
  skus: string[],
  country: string,
  softwareSystem: SoftwareSystem,
  countriesToQuery: readonly string[]
): Promise<{ items: ApiSkuItem[]; failedCountries: FailedCountryFetch[] }> {
  if (country) {
    return {
      items: await fetchSkuData(skus, country, softwareSystem),
      failedCountries: [],
    };
  }

  const settled = await Promise.allSettled(
    countriesToQuery.map(async (currentCountry) => ({
      country: currentCountry,
      items: await fetchSkuData(skus, currentCountry, softwareSystem),
    }))
  );

  const itemsByCountry: ApiSkuItem[][] = [];
  const failedCountries: FailedCountryFetch[] = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      itemsByCountry.push(result.value.items);
      continue;
    }
    const reason = result.reason;
    if (reason instanceof UpstreamFetchError) {
      failedCountries.push({ country: reason.country, status: reason.status });
      continue;
    }
    failedCountries.push({ country: "unknown", status: "ERR" });
  }

  if (!itemsByCountry.length) {
    throw new AllCountriesFailedError(softwareSystem, failedCountries);
  }

  return { items: mergeSkuItems(itemsByCountry), failedCountries };
}

// Splits SKUs into chunks of CHUNK_SIZE, fetches all chunks in parallel, and aggregates.
async function fetchSkuDataForSelection(
  skus: string[],
  country: string,
  softwareSystem: SoftwareSystem,
  countriesToQuery: readonly string[] = SOFTWARE_SYSTEM_COUNTRIES[softwareSystem]
): Promise<{ items: ApiSkuItem[]; failedCountries: FailedCountryFetch[] }> {
  const chunks = chunkArray(skus, CHUNK_SIZE);
  const settled = await Promise.allSettled(
    chunks.map((chunk) => fetchChunk(chunk, country, softwareSystem, countriesToQuery))
  );

  const allItems: ApiSkuItem[] = [];
  const failedCountriesMap = new Map<string, FailedCountryFetch>();
  let firstError: unknown;

  for (const result of settled) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value.items);
      for (const fc of result.value.failedCountries) {
        failedCountriesMap.set(fc.country, fc);
      }
    } else {
      if (!firstError) firstError = result.reason;
    }
  }

  // Only propagate a total failure if we got zero items across all chunks.
  if (!allItems.length && firstError) throw firstError;

  return { items: allItems, failedCountries: Array.from(failedCountriesMap.values()) };
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

  if (skus.length > MAX_SKUS) {
    return NextResponse.json({ error: `Too many SKUs (max ${MAX_SKUS})` }, { status: 400 });
  }

  const country = body.country?.trim() || "";
  const softwareSystem = body.softwareSystem?.trim() || DEFAULT_SOFTWARE_SYSTEM;

  if (!(ALLOWED_SOFTWARE_SYSTEMS as readonly string[]).includes(softwareSystem)) {
    return NextResponse.json({ error: "Invalid software system." }, { status: 400 });
  }

  const validatedSoftwareSystem = softwareSystem as SoftwareSystem;
  const allowedCountries = SOFTWARE_SYSTEM_COUNTRIES[validatedSoftwareSystem];

  if (country && !allowedCountries.includes(country)) {
    return NextResponse.json({ error: "Invalid country for the selected software system." }, { status: 400 });
  }

  try {
    const { items, failedCountries } = await fetchSkuDataForSelection(
      skus,
      country,
      validatedSoftwareSystem,
      allowedCountries
    );

    const rows = items.map(transformItem);

    if (failedCountries.length) {
      console.warn(
        "[dashboard] partial country fetch failures:",
        failedCountries.map(({ country: failedCountry, status }) => `${failedCountry} (${status})`).join(", ")
      );
    }

    return NextResponse.json(
      {
        rows,
        meta: {
          rowCount: rows.length,
          failedCountries: failedCountries.map(({ country: failedCountry, status }) => ({
            country: failedCountry,
            status,
          })),
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[dashboard] fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch product data. Please try again." }, { status: 502 });
  }
}
