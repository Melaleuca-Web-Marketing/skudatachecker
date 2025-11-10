// app/api/sku-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Agent, type Dispatcher } from "undici";

// --- Types (trimmed to what the UI needs) ---
type ChannelWindow = {
  channel: string;
  availabilityStartDate: string;
  availabilityEndDate: string;
};

type KitDetail = {
  kitSku: string;
  availableSelections?: string[];
};

type SkuInfo = {
  sku: string;
  channelTypes: ChannelWindow[];
  packSavings?: number | null;
  regularPrice?: number | null;
  preferredPrice?: number | null;
  selectPrice?: number | null;
  points?: number | null;
  kitType?: string | null;
  offSaleStartDate?: string | null;
  offSaleExpirationDate?: string | null;
  kitDetails?: KitDetail[];
  hidden?: boolean | null;
  isCommissionable?: boolean | null;
  isShippable?: boolean | null;
  isInventoryControlled?: boolean | null;
  productNames?: { culture: string; value: string }[];
  weight?: number | null;
  weightUnits?: string | null;
  dimension?: {
    width?: number | null;
    height?: number | null;
    depth?: number | null;
    unitsOfMeasurement?: string | null;
  };
};

type Payload = {
  skus: string[];
  country?: string;          // e.g., "UnitedStates"
  softwareSystem?: string;   // e.g., "NorthAmerica"
  culture?: string;          // e.g., "en-US"
  channelForDates?: string;  // e.g., "Web" (optional, for columns)
  concurrency?: number;      // optional
};

// --- Helpers ---
const API_BASE = "https://uausapincde.melaleuca.net/DataForge.API";

function pickNameByCulture(
  names: { culture: string; value: string }[] | undefined,
  culture = "en-US"
) {
  if (!names?.length) return "";
  return (
    names.find(n => n.culture === culture)?.value ||
    names.find(n => n.culture.toLowerCase().startsWith(culture.split("-")[0].toLowerCase()))?.value ||
    names[0].value
  );
}

function getChannelWindow(s: SkuInfo, channel = "Web") {
  return s.channelTypes?.find(c => c.channel === channel);
}

type FetchOptions = RequestInit & { dispatcher?: Dispatcher };

const allowInsecureTls =
  process.env.ALLOW_INSECURE_TLS === "true" ||
  (!("ALLOW_INSECURE_TLS" in process.env) && process.env.NODE_ENV !== "production");

const insecureAgent = allowInsecureTls
  ? new Agent({ connect: { rejectUnauthorized: false } })
  : undefined;

async function fetchWithTimeout(input: RequestInfo, init: FetchOptions = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function fetchSkuInfo(
  sku: string,
  country: string,
  softwareSystem: string
): Promise<{ ok: true; data: SkuInfo } | { ok: false; error: string }> {
  const url = `${API_BASE}/SkuSearch/${encodeURIComponent(sku)}/info?country=${encodeURIComponent(
    country
  )}`;
  try {
    const dispatcher = insecureAgent;
    const res = await fetchWithTimeout(url, {
      headers: {
        Accept: "application/json",
        SoftwareSystem: softwareSystem,
      },
      ...(dispatcher ? { dispatcher } : {}),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} for ${sku}` };
    }
    const data = (await res.json()) as SkuInfo;
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: `Fetch failed for ${sku}: ${e?.message || e}` };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (t: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  const workers = new Array(Math.max(1, limit)).fill(0).map(async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await mapper(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

// --- Route handler ---
export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const country = body.country || "UnitedStates";
  const softwareSystem = body.softwareSystem || "NorthAmerica";
  const culture = body.culture || "en-US";
  const channelForDates = body.channelForDates || "Web";
  const concurrency = Math.min(Math.max(body.concurrency ?? 8, 1), 16);

  // Parse + sanitize SKUs
  const skus = (body.skus || [])
    .map(s => (s ?? "").toString().trim())
    .filter(Boolean);
  const uniqueSkus = Array.from(new Set(skus));
  if (!uniqueSkus.length) {
    return NextResponse.json({ error: "No SKUs provided" }, { status: 400 });
  }

  const raw = await mapWithConcurrency(uniqueSkus, concurrency, (sku) =>
    fetchSkuInfo(sku, country, softwareSystem)
  );

  const rows = raw.map((r, i) => {
    const sku = uniqueSkus[i];
    if (!("ok" in r) || !r.ok) {
      return {
        sku,
        error: r && "error" in r ? r.error : "Unknown error",
      };
    }
    const s = r.data;
    const name = pickNameByCulture(s.productNames, culture);
    const ch = getChannelWindow(s, channelForDates);

    return {
      sku: s.sku || sku,
      name,
      productNames: s.productNames ?? [],
      regularPrice: s.regularPrice ?? null,
      preferredPrice: s.preferredPrice ?? null,
      points: s.points ?? null,
      shippable: s.isShippable ?? null,
      commissionable: s.isCommissionable ?? null,
      hidden: s.hidden ?? null,
      weight: s.weight ?? null,
      weightUnits: s.weightUnits ?? "",
      kitType: s.kitType ?? null,
      offSaleStartDate: s.offSaleStartDate ?? null,
      offSaleExpirationDate: s.offSaleExpirationDate ?? null,
      kitDetails: s.kitDetails ?? [],
      channel: channelForDates,
      startDate: ch?.availabilityStartDate ?? null,
      endDate: ch?.availabilityEndDate ?? null,
    };
  });

  return NextResponse.json(
    { rows },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
