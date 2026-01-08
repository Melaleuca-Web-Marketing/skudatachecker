"use client";

import Image from "next/image";
import { FormEvent, Fragment, ReactNode, useEffect, useMemo, useState } from "react";
import leafLight from "../assets/leaf-light.png";
import leafDark from "../assets/leaf-dark.png";
import dropDark from "../assets/leaf-dark.png";

type DescriptionRow = {
  sku: string;
  country: string;
  language: string;
  productName: string;
  shortDescription: string;
  longDescription: string;
};

type DetailsRow = {
  sku: string;
  country: string;
  kitType: string;
  startDate: string;
  endDate: string;
};

type ChannelAvailabilityRow = {
  sku: string;
  country: string;
  warehouse: string;
  salesChannel: string;
  startDate: string;
  endDate: string;
};

type PricingRow = {
  sku: string;
  country: string;
  priceType: string;
  price: number;
  startDate: string;
  endDate: string;
};

type ProductPointsRow = {
  sku: string;
  country: string;
  pointsType: string;
  pointsValue: number;
  startDate: string;
  endDate: string;
};

type KitDetailsRow = {
  sku: string;
  country: string;
  quantity: number;
  parentSku: string;
  childSku: string;
  childSkuDescription: string;
  selectType: string;
  startDate: string;
  endDate: string;
};

type BusinessRuleRow = {
  sku: string;
  country: string;
  businessRule: string;
  startDate: string;
  endDate: string;
};

type SkuCounterRow = {
  sku: string;
  country: string;
  warehouse: string;
  onHand: number;
  pending: number;
  available: number;
};

type SectionRowMap = {
  skuInfo: { sku: string }[];
  description: DescriptionRow[];
  details: DetailsRow[];
  channelAvailability: ChannelAvailabilityRow[];
  pricing: PricingRow[];
  productPoints: ProductPointsRow[];
  kitDetails: KitDetailsRow[];
  businessRules: BusinessRuleRow[];
  skuCounters: SkuCounterRow[];
};

type SectionKey = keyof SectionRowMap;

type DashboardRow = {
  sku: string;
} & SectionRowMap;

type Theme = "light" | "dark";

type ColumnDescriptor<K extends SectionKey> = {
  header: string;
  className?: string;
  render: (row: SectionRowMap[K][number]) => ReactNode;
};

type SectionConfig<K extends SectionKey> = {
  key: K;
  title: string;
  blurb: string;
  emptyHint: string;
  summary: (rows: SectionRowMap[K]) => ReactNode;
  columns: ColumnDescriptor<K>[];
};

type AnySectionConfig = SectionConfig<SectionKey>;

type CombinedTableProps = {
  sections: AnySectionConfig[];
  rows: DashboardRow[];
  expandedSections: Record<SectionKey, boolean>;
  onToggleSection: (key: SectionKey) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  theme: Theme;
};

type SectionVisibilityControlsProps = {
  sections: AnySectionConfig[];
  visibility: Record<SectionKey, boolean>;
  onToggle: (key: SectionKey) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  theme: Theme;
  disabled?: boolean;
};

const SECTION_ORDER: SectionKey[] = [
  "skuInfo",
  "description",
  "details",
  "channelAvailability",
  "pricing",
  "productPoints",
  "kitDetails",
  "businessRules",
  "skuCounters",
];

const SECTION_ACCENTS: Record<SectionKey, string> = {
  skuInfo: "#a5b4fc", // indigo
  description: "#38bdf8", // sky
  details: "#34d399", // green
  channelAvailability: "#f59e0b", // amber
  pricing: "#f87171", // rose
  productPoints: "#e879f9", // fuchsia
  kitDetails: "#10b981", // emerald
  businessRules: "#eab308", // yellow
  skuCounters: "#60a5fa", // blue
};

const SUMMARY_COLUMN_WIDTH = 150;
const DETAIL_COLUMN_WIDTH = 140;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const SECTION_CONFIGS: { [K in SectionKey]: SectionConfig<K> } = {
  skuInfo: {
    key: "skuInfo",
    title: "SKU",
    blurb: "Identifiers used across all sections.",
    emptyHint: "Add at least one SKU above.",
    summary: (rows) => (
      <div className="space-y-1 text-sm">
        {rows?.length ? rows.map((r) => <div key={r.sku} className="font-semibold">{r.sku}</div>) : <span className="text-slate-400">--</span>}
      </div>
    ),
    columns: [{ header: "SKU", className: "font-semibold", render: (row) => row.sku }],
  },
  description: {
    key: "description",
    title: "Description",
    blurb: "Localized naming and descriptions.",
    emptyHint: "No description rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.productName}</p>
          <p className="text-xs opacity-80">
            {first.country} · {first.language}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "SKU", className: "font-semibold", render: (row) => row.sku },
      { header: "Country", render: (row) => row.country },
      { header: "Language", render: (row) => row.language },
      { header: "Product Name", render: (row) => row.productName },
      { header: "Short Description", className: "max-w-xs", render: (row) => row.shortDescription },
      { header: "Long Description", className: "max-w-md", render: (row) => row.longDescription },
    ],
  },
  details: {
    key: "details",
    title: "Details",
    blurb: "Lifecycle and kit details per country.",
    emptyHint: "No detail rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.kitType}</p>
          <p className="text-xs opacity-80">
            {first.country} · {formatDisplayDate(first.startDate)} → {formatDisplayDate(first.endDate)}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "SKU", className: "font-semibold", render: (row) => row.sku },
      { header: "Country", render: (row) => row.country },
      { header: "Kit Type", render: (row) => row.kitType },
      { header: "Start Date", render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", render: (row) => formatDisplayDate(row.endDate) },
    ],
  },
  channelAvailability: {
    key: "channelAvailability",
    title: "Channel Availability",
    blurb: "Channel windows per warehouse.",
    emptyHint: "No channel rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.salesChannel}</p>
          <p className="text-xs opacity-80">
            {first.country} · {first.warehouse}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "SKU", className: "font-semibold", render: (row) => row.sku },
      { header: "Country", render: (row) => row.country },
      { header: "Warehouse", render: (row) => row.warehouse },
      { header: "Sales Channel", render: (row) => row.salesChannel },
      { header: "Start Date", render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", render: (row) => formatDisplayDate(row.endDate) },
    ],
  },
  pricing: {
    key: "pricing",
    title: "Pricing",
    blurb: "Price book snapshot.",
    emptyHint: "No pricing rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.priceType}</p>
          <p className="text-xs opacity-80">
            {currencyFormatter.format(first.price)}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "SKU", className: "font-semibold", render: (row) => row.sku },
      { header: "Country", render: (row) => row.country },
      { header: "Price Type", render: (row) => row.priceType },
      { header: "Price", className: "text-right font-mono", render: (row) => currencyFormatter.format(row.price) },
      { header: "Start Date", render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", render: (row) => formatDisplayDate(row.endDate) },
    ],
  },
  productPoints: {
    key: "productPoints",
    title: "Product Points",
    blurb: "Point values and windows.",
    emptyHint: "No points rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.pointsType}</p>
          <p className="text-xs opacity-80">
            {first.pointsValue.toLocaleString()} pts
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "SKU", className: "font-semibold", render: (row) => row.sku },
      { header: "Country", render: (row) => row.country },
      { header: "Product Points Type", render: (row) => row.pointsType },
      { header: "Product Points Value", className: "text-right font-mono", render: (row) => row.pointsValue.toLocaleString() },
      { header: "Start Date", render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", render: (row) => formatDisplayDate(row.endDate) },
    ],
  },
  kitDetails: {
    key: "kitDetails",
    title: "Kit Details",
    blurb: "Parent/child kit composition.",
    emptyHint: "No kit rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.childSku}</p>
          <p className="text-xs opacity-80">
            Qty {first.quantity} · {first.selectType}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "SKU", className: "font-semibold", render: (row) => row.sku },
      { header: "Country", render: (row) => row.country },
      { header: "Quantity", className: "text-right font-mono", render: (row) => row.quantity },
      { header: "Parent SKU", render: (row) => row.parentSku },
      { header: "Child SKU", render: (row) => row.childSku },
      { header: "Child SKU Description", render: (row) => row.childSkuDescription },
      { header: "Select Type", render: (row) => row.selectType },
      { header: "Start Date", render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", render: (row) => formatDisplayDate(row.endDate) },
    ],
  },
  businessRules: {
    key: "businessRules",
    title: "Product Business Rules",
    blurb: "Market-specific guardrails and activation windows.",
    emptyHint: "No business rule rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold leading-snug">{first.businessRule}</p>
          <p className="text-xs opacity-80">
            {first.country} · {formatDisplayDate(first.startDate)} → {formatDisplayDate(first.endDate)}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "SKU", className: "font-semibold", render: (row) => row.sku },
      { header: "Country", render: (row) => row.country },
      { header: "Business Rule", render: (row) => row.businessRule },
      { header: "Start Date", render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", render: (row) => formatDisplayDate(row.endDate) },
    ],
  },
  skuCounters: {
    key: "skuCounters",
    title: "Product SKU Counter",
    blurb: "Inventory snapshot with pending allocations.",
    emptyHint: "No inventory rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.warehouse}</p>
          <p className="text-xs opacity-80">
            Available {first.available.toLocaleString()}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "SKU", className: "font-semibold", render: (row) => row.sku },
      { header: "Country", render: (row) => row.country },
      { header: "Warehouse", render: (row) => row.warehouse },
      { header: "On Hand", className: "text-right font-mono", render: (row) => row.onHand.toLocaleString() },
      { header: "Pending", className: "text-right font-mono", render: (row) => row.pending.toLocaleString() },
      { header: "Available", className: "text-right font-mono", render: (row) => row.available.toLocaleString() },
    ],
  },
};

export default function Page() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [skuInput, setSkuInput] = useState("117\n5048\n8321");
  const [rows, setRows] = useState<DashboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [missingSkus, setMissingSkus] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<"all" | "us" | "ca">("all");
  const [webOnly, setWebOnly] = useState(false);
  const [validationDate, setValidationDate] = useState<string>("");

  const buildCollapsedState = () =>
    SECTION_ORDER.reduce(
      (acc, key) => {
        acc[key] = false;
        return acc;
      },
      {} as Record<SectionKey, boolean>
    );

  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>(buildCollapsedState);
  const [sectionVisibility, setSectionVisibility] = useState<Record<SectionKey, boolean>>(() =>
    SECTION_ORDER.reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as Record<SectionKey, boolean>
    )
  );

  const skus = useMemo(() => parseSkus(skuInput), [skuInput]);
  const sectionList: AnySectionConfig[] = useMemo(
    () => SECTION_ORDER.map((key) => SECTION_CONFIGS[key]),
    []
  );
  const visibleSections = sectionList.filter((section) =>
    section.key === "skuInfo" ? true : sectionVisibility[section.key]
  );
  const hasRows = !!rows?.length;

  useEffect(() => {
    setExpandedSections(buildCollapsedState());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("sku-theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("sku-theme", theme);
  }, [theme]);

  async function handleGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMissingSkus([]);
    if (!skus.length) {
      setError("Enter at least one SKU to build the dashboard.");
      setRows(null);
      setLastGenerated(null);
      setMissingSkus([]);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skus,
          asOfDate: null,
          channelId: null,
          channelTypeId: null,
          availableOnly: 0,
          languageId: null,
          countryFilter,
          webOnly,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { rows: DashboardRow[] };
      const resultRows = json.rows ?? [];
      setRows(resultRows);
      setLastGenerated(new Date());
      const normalizedRequested = skus.map((sku) => sku.trim().toLowerCase()).filter(Boolean);
      const returnedSkus = new Set(resultRows.map((r) => r.sku?.toLowerCase?.().trim?.()).filter(Boolean));
      const missingByAbsence = normalizedRequested.filter((sku) => !returnedSkus.has(sku));

      const hasRowData = (row: DashboardRow) => {
        return SECTION_ORDER.some((key) => {
          if (key === "skuInfo") return false;
          const value = row[key];
          return Array.isArray(value) && value.length > 0;
        });
      };

      const missingByEmpty = resultRows
        .filter((row) => !hasRowData(row))
        .map((row) => row.sku?.trim().toLowerCase?.())
        .filter(Boolean);

      const missing = Array.from(new Set([...missingByAbsence, ...missingByEmpty]));
      setMissingSkus(missing);
      setExpandedSections(buildCollapsedState());
    } catch (err: any) {
      setError(`Fetch failed: ${err?.message ?? err}`);
      setRows(null);
      setMissingSkus([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(key: SectionKey) {
    if (key === "skuInfo") return;
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function expandAll() {
    setExpandedSections(
      SECTION_ORDER.reduce(
        (acc, key) => {
          acc[key] = key === "skuInfo" ? false : true;
          return acc;
        },
        {} as Record<SectionKey, boolean>
      )
    );
  }

  function collapseAll() {
    setExpandedSections(buildCollapsedState());
  }

  function toggleSectionVisibility(key: SectionKey) {
    if (key === "skuInfo") return;
    setSectionVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }
  function showAllSections() {
    setSectionVisibility(
      SECTION_ORDER.reduce(
        (acc, key) => {
          acc[key] = true;
          return acc;
        },
        {} as Record<SectionKey, boolean>
      )
    );
  }
  function hideAllSections() {
    setSectionVisibility(
      SECTION_ORDER.reduce(
        (acc, key) => {
          acc[key] = key === "skuInfo" ? true : false;
          return acc;
        },
        {} as Record<SectionKey, boolean>
      )
    );
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  const isDark = theme === "dark";

  return (
    <main className={`min-h-screen ${isDark ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-900"}`}>
      <div className="mx-auto w-full max-w-[1700px] px-6 py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="relative h-12 w-12 flex-shrink-0">
              <Image
                src={isDark ? leafLight : leafDark}
                alt="SKU Data Checker logo"
                fill
                sizes="48px"
                className="rounded-xl object-contain"
                priority
              />
            </div>
            <div className="space-y-1">
              <h1 className={`text-3xl font-semibold sm:text-4xl ${isDark ? "text-white" : "text-slate-900"}`}>
                SKU Data Checker
              </h1>
              <p className={`max-w-3xl text-base ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Search SKUs to validate product data.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`relative inline-flex h-12 w-12 items-center justify-center rounded-full border transition shadow-sm ${
                isDark
                  ? "border-slate-700 bg-slate-900 hover:border-emerald-400"
                  : "border-slate-200 bg-white hover:border-emerald-500"
              }`}
            >
              <Image
                src={isDark ? leafLight : dropDark}
                alt={isDark ? "Light theme" : "Dark theme"}
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </button>
            <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Theme
            </span>
          </div>
        </header>

        <form
          onSubmit={handleGenerate}
          className={`mt-10 space-y-4 rounded-3xl border p-6 shadow-2xl ${
            isDark ? "border-white/10 bg-white/5 shadow-slate-900/40" : "border-slate-200 bg-white shadow-slate-900/10"
          }`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="skuInput"
                className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
              >
                SKU list
              </label>
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  isDark
                    ? "border-slate-700 text-slate-200 hover:border-indigo-300 hover:text-indigo-200"
                    : "border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
                }`}
                title="Paste multiple SKUs separated by commas, spaces, or new lines."
                aria-label="SKU input help"
                role="img"
              >
                ?
              </span>
            </div>
            <textarea
              id="skuInput"
              className={`min-h-[180px] flex-1 rounded-2xl border p-4 font-mono text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/40 ${
                isDark
                  ? "border-white/10 bg-slate-950/60 text-white focus:border-indigo-400"
                  : "border-slate-300 bg-white text-slate-900 focus:border-indigo-500"
              }`}
              placeholder="One SKU per line or comma separated"
              value={skuInput}
              onChange={(event) => setSkuInput(event.target.value)}
            />
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 shadow-sm shadow-slate-900/5">
                <div className="flex flex-col">
                  <span className={isDark ? "text-slate-300 text-[11px] uppercase tracking-wide" : "text-slate-500 text-[11px] uppercase tracking-wide"}>
                    Country
                  </span>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value as "all" | "us" | "ca")}
                    className={`mt-1 rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                      isDark
                        ? "border-slate-700 bg-slate-900 text-slate-100"
                        : "border-slate-300 bg-white text-slate-900"
                    }`}
                  >
                    <option value="all">All</option>
                    <option value="us">US Only</option>
                    <option value="ca">CA Only</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <span className={isDark ? "text-slate-300 text-[11px] uppercase tracking-wide" : "text-slate-500 text-[11px] uppercase tracking-wide"}>
                    Channel
                  </span>
                  <label className="mt-1 inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-medium transition hover:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400">
                    <input
                      type="checkbox"
                      checked={webOnly}
                      onChange={(e) => setWebOnly(e.target.checked)}
                      className="h-4 w-4 accent-emerald-500"
                    />
                    <span className={isDark ? "text-slate-100" : "text-slate-800"}>Web channels only</span>
                  </label>
                </div>
                <div className="flex flex-col">
                  <span className={isDark ? "text-slate-300 text-[11px] uppercase tracking-wide" : "text-slate-500 text-[11px] uppercase tracking-wide"}>
                    Validation date
                  </span>
                  <input
                    type="date"
                    value={validationDate}
                    onChange={(e) => setValidationDate(e.target.value)}
                    className={`mt-1 rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                      isDark
                        ? "border-slate-700 bg-slate-900 text-slate-100"
                        : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          {!lastGenerated && <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>No dashboard data yet.</p>}
        </form>

        {error && (
          <p
            className={`mt-4 rounded-2xl border px-5 py-3 text-sm ${
              isDark
                ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {error}
          </p>
        )}

        {missingSkus.length > 0 && (
          <p
            className={`mt-4 rounded-2xl border px-5 py-3 text-sm ${
              isDark
                ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            No data returned for {missingSkus.length} SKU{missingSkus.length === 1 ? "" : "s"}:{" "}
            <span className="font-semibold">{missingSkus.join(", ")}</span>.
          </p>
        )}

        <SectionVisibilityToggles
          sections={sectionList}
          visibility={sectionVisibility}
          onToggle={toggleSectionVisibility}
          onShowAll={showAllSections}
          onHideAll={hideAllSections}
          theme={theme}
        />

        <CombinedSectionsTable
          sections={visibleSections}
          rows={rows ?? []}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          theme={theme}
        />
      </div>
    </main>
  );
}

function CombinedSectionsTable({
  sections,
  rows,
  expandedSections,
  onToggleSection,
  onExpandAll,
  onCollapseAll,
  theme,
}: CombinedTableProps) {
  const isDark = theme === "dark";
  const [controlsOpen, setControlsOpen] = useState(false);
  const hasData = rows.length > 0;

  function handleExportCsv() {
    if (!hasData) return;
    const csv = buildCsv(rows, sections);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sku-export-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!sections.length) {
    return (
      <section
        className={`mt-10 rounded-3xl border p-6 text-center text-sm shadow-lg ${
          isDark ? "border-slate-800 bg-slate-900 text-slate-200 shadow-slate-950/30" : "border-slate-200 bg-white text-slate-500 shadow-slate-900/5"
        }`}
      >
        Choose at least one section above to render the dashboard table.
      </section>
    );
  }

  const columnCount = sections.reduce((total, section) => total + section.columns.length + 1, 0);

  return (
    <section
      className={`mt-10 space-y-4 rounded-3xl border p-6 shadow-2xl ${
        isDark ? "border-slate-800 bg-slate-900 text-slate-100 shadow-slate-950/40" : "border-slate-200 bg-white text-slate-900 shadow-slate-900/10"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Section controls</p>
          <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>
            Toggle each header to collapse or expand the columns it owns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onExpandAll}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-100 hover:border-indigo-300 hover:text-indigo-200"
                : "border-slate-200 bg-slate-50 text-slate-900 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={onCollapseAll}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-indigo-300 hover:text-indigo-200"
                : "border-slate-200 bg-white text-slate-900 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            Collapse all
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!hasData}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400 hover:text-emerald-50"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:text-emerald-900"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white"}`}>
        <button
          type="button"
          onClick={() => setControlsOpen((prev) => !prev)}
          className={`flex w-full items-center justify-between text-sm font-semibold ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
          aria-expanded={controlsOpen}
        >
          <span>Section chips</span>
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
              isDark ? "border-slate-700 text-slate-200" : "border-slate-300 text-slate-700"
            } ${controlsOpen ? "rotate-180" : ""} transition-transform`}
            aria-hidden="true"
          >
            ▼
          </span>
        </button>
        {controlsOpen && (
          <div className="mt-3">
            <SectionChipBar
              sections={sections}
              expandedSections={expandedSections}
              onToggleSection={onToggleSection}
              isDark={isDark}
            />
          </div>
        )}
      </div>

      <div className={`overflow-x-auto rounded-2xl border ${isDark ? "border-slate-800 bg-white/5" : "border-slate-200 bg-white"}`}>
        <table className={`min-w-full table-auto text-left text-sm ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          <thead>
            <tr className={`text-xs font-semibold uppercase ${isDark ? "text-slate-300" : "text-slate-500"}`}>
              {sections.map((section, sectionIndex) => {
                const isSticky = section.key === "skuInfo";
                const expanded = isSticky ? false : expandedSections[section.key];
                const span = section.columns.length + 1;
                const accent = SECTION_ACCENTS[section.key];
                const isLast = sectionIndex === sections.length - 1;
                const separator = isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(148, 163, 184, 0.35)";
                return (
                  <th
                    key={`header-group-${section.key}`}
                    colSpan={span}
                    className={`border-b px-3 py-3 text-left ${
                      isSticky
                        ? isDark
                          ? "sticky left-0 z-30 border-slate-700 bg-slate-800 text-slate-200 shadow shadow-indigo-900/30"
                          : "sticky left-0 z-30 border-slate-200 bg-slate-50 text-slate-700 shadow shadow-indigo-100"
                        : isDark
                          ? "border-slate-700 bg-slate-900 text-slate-200"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                    style={{
                      borderBottom: `4px solid ${accent}`,
                      borderRight: isLast ? undefined : `1px solid ${separator}`,
                      ...(isSticky ? { left: 0 } : {}),
                    }}
                  >
                    {isSticky ? (
                      <div className={`text-left font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {section.title}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleSection(section.key)}
                        className={`flex w-full items-center justify-between gap-3 text-left font-semibold ${
                          isDark ? "text-slate-100" : "text-slate-900"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{section.title}</span>
                        <PlusMinusIcon expanded={expanded} isDark={isDark} />
                        <span className="sr-only">
                          {expanded ? "Collapse section" : "Expand section"}
                        </span>
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
            <tr className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-600"}`}>
              {sections.map((section, sectionIndex) => {
                const isSticky = section.key === "skuInfo";
                const expanded = isSticky ? false : expandedSections[section.key];
                const accent = SECTION_ACCENTS[section.key];
                const isLast = sectionIndex === sections.length - 1;
                const separator = isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(148, 163, 184, 0.35)";
                return (
                  <Fragment key={`header-set-${section.key}`}>
                    <th
                      className="px-3 py-1.5"
                      style={{
                        ...summaryCellStyle(expanded, accent, isSticky, isDark),
                        borderRight: isLast ? undefined : `1px solid ${separator}`,
                      }}
                    >
                      {isSticky ? (
                        <span
                          className={`inline-flex w-full justify-between text-left font-semibold uppercase tracking-wide ${isDark ? "text-slate-50" : "text-slate-900"} transition-all duration-500 ${
                            expanded ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
                          }`}
                        >
                          Summary
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onToggleSection(section.key)}
                          className={`inline-flex w-full items-center justify-start gap-2 text-left font-semibold uppercase tracking-wide ${isDark ? "text-slate-50" : "text-slate-900"} transition-all duration-500 ${
                            expanded ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
                          }`}
                        >
                          <span>Summary</span>
                          <span className="sr-only">{expanded ? "Collapse section" : "Expand section"}</span>
                        </button>
                      )}
                    </th>
                    {section.columns.map((column, columnIndex) => {
                      const stickyLeft = isSticky && columnIndex === 0 ? SUMMARY_COLUMN_WIDTH : undefined;
                      return (
                        <th
                          key={`header-${section.key}-${column.header}`}
                          className={`px-3 py-1.5 ${column.className ?? ""}`}
                          style={{
                            ...detailCellStyle(expanded, accent, columnIndex === 0, stickyLeft, isDark),
                            borderRight:
                              expanded && !(isLast && columnIndex === section.columns.length - 1)
                                ? `1px solid ${separator}`
                                : undefined,
                          }}
                        >
                          <span
                            className={`inline-flex w-full justify-between text-left font-semibold ${isDark ? "text-slate-50" : "text-slate-900"} transition-all duration-500 ${
                              expanded ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                            }`}
                          >
                            {column.header}
                          </span>
                        </th>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-10 text-center text-slate-500">
                  No results yet. Add SKUs and search when you’re ready.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={`row-${row.sku}-${rowIndex}`}
                  className={`border-t ${isDark ? "border-slate-800 text-slate-100 hover:bg-slate-800" : "border-slate-200 text-slate-900 hover:bg-slate-50"}`}
                >
                  {sections.flatMap((section, sectionIndex) => {
                    const isSticky = section.key === "skuInfo";
                    const expanded = isSticky ? false : expandedSections[section.key];
                    const data = row[section.key];
                    const accent = SECTION_ACCENTS[section.key];
                    const isLast = sectionIndex === sections.length - 1;
                    const separator = isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(148, 163, 184, 0.35)";
                    return [
                      <td
                        key={`cell-${rowIndex}-${section.key}-summary`}
                        className={`px-3 py-2 align-top ${isSticky ? "" : "cursor-pointer select-none"} ${isDark ? "text-slate-100" : "text-slate-900"}`}
                        style={{
                          ...summaryCellStyle(expanded, accent, isSticky, isDark),
                          borderRight: isLast ? undefined : `1px solid ${separator}`,
                        }}
                        onClick={() => (isSticky ? undefined : onToggleSection(section.key))}
                        role={isSticky ? undefined : "button"}
                        aria-pressed={expanded}
                      >
                        <div
                          className={`transition-all duration-500 ${
                            expanded ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
                          }`}
                          aria-hidden={expanded}
                        >
                          {section.summary(data as never)}
                        </div>
                      </td>,
                      ...section.columns.map((column, columnIndex) => {
                        const stickyLeft = isSticky && columnIndex === 0 ? SUMMARY_COLUMN_WIDTH : undefined;
                        const arr = Array.isArray(data) ? data : [];
                        const isLastColumn = isLast && columnIndex === section.columns.length - 1;
                        return (
                          <td
                            key={`cell-${rowIndex}-${section.key}-${column.header}`}
                            className={`px-3 ${expanded ? "py-2" : "py-0"} align-top ${column.className ?? ""} ${isDark ? "text-slate-100" : "text-slate-900"}`}
                            style={{
                              ...detailCellStyle(expanded, accent, columnIndex === 0, stickyLeft, isDark),
                              borderRight: expanded && !isLastColumn ? `1px solid ${separator}` : "none",
                              borderLeft: "none",
                            }}
                          >
                            <div
                              className={`space-y-1 transition-all duration-500 ${
                                expanded ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                              }`}
                              aria-hidden={!expanded}
                              style={{
                                maxHeight: expanded ? "1200px" : "0px",
                                overflow: "hidden",
                              }}
                            >
                              {arr.length === 0 ? (
                                <span className="text-slate-400">--</span>
                              ) : (
                                arr.map((item, idx) => (
                                  <div key={`${section.key}-${rowIndex}-${idx}`} className="space-y-0.5">
                                    {column.render(item as never)}
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                        );
                      }),
                    ];
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SectionChipBar({
  sections,
  expandedSections,
  onToggleSection,
  isDark,
}: {
  sections: AnySectionConfig[];
  expandedSections: Record<SectionKey, boolean>;
  onToggleSection: (key: SectionKey) => void;
  isDark: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {sections.map((section) => {
        const isSticky = section.key === "skuInfo";
        const expanded = isSticky ? true : expandedSections[section.key];
        const accent = SECTION_ACCENTS[section.key];
        return (
          <button
            key={`chip-${section.key}`}
            type="button"
            onClick={() => (isSticky ? undefined : onToggleSection(section.key))}
            disabled={isSticky}
            className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              isSticky
                ? isDark
                  ? "cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500"
                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                : isDark
                  ? "border-slate-700 bg-slate-800 text-slate-200 hover:border-indigo-400 hover:text-indigo-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
            }`}
            style={{
              boxShadow: `inset 0 0 0 1px ${accent}22`,
            }}
          >
            <span className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
              <span className="truncate">{section.title}</span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                expanded
                  ? isDark
                    ? "bg-emerald-500/20 text-emerald-100"
                    : "bg-emerald-50 text-emerald-700"
                  : isDark
                    ? "bg-slate-800 text-slate-300"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {expanded ? "Expanded" : "Collapsed"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SectionVisibilityToggles({
  sections,
  visibility,
  onToggle,
  onShowAll,
  onHideAll,
  theme,
  disabled = false,
}: SectionVisibilityControlsProps) {
  const isDark = theme === "dark";
  const disabledStyles = disabled ? "opacity-60 pointer-events-none" : "";
  return (
    <section
      className={`mt-10 space-y-4 rounded-3xl border p-6 shadow-lg ${
        isDark ? "border-slate-800 bg-slate-900 text-slate-100 shadow-slate-950/40" : "border-slate-200 bg-white text-slate-900 shadow-slate-900/5"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Section selection</p>
          <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>
            Toggle individual data sets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onShowAll}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-100 hover:border-indigo-300 hover:text-indigo-200"
                : "border-slate-200 bg-slate-50 text-slate-900 hover:border-indigo-300 hover:text-indigo-600"
            }`}
            disabled={disabled}
          >
            Show all
          </button>
          <button
            type="button"
            onClick={onHideAll}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-indigo-300 hover:text-indigo-200"
                : "border-slate-200 bg-white text-slate-900 hover:border-indigo-300 hover:text-indigo-600"
            }`}
            disabled={disabled}
          >
            Hide all
          </button>
        </div>
      </div>
      <div className={`flex flex-wrap gap-2 ${disabledStyles}`}>
        {sections.map((section) => {
          const enabled = section.key === "skuInfo" ? true : visibility[section.key];
          const disabled = section.key === "skuInfo";
          return (
            <button
              key={`visibility-${section.key}`}
              type="button"
              aria-pressed={enabled}
              onClick={() => (disabled ? undefined : onToggle(section.key))}
              disabled={disabled}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                enabled
                  ? isDark
                    ? "border-indigo-400/60 bg-indigo-500/15 text-indigo-100 shadow-sm shadow-indigo-900/40"
                    : "border-indigo-200 bg-indigo-50 text-indigo-900 shadow-sm shadow-indigo-200/70"
                  : isDark
                    ? "border-slate-700 bg-slate-800 text-slate-200 hover:border-indigo-400 hover:text-indigo-200"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
              } ${disabled ? "cursor-not-allowed opacity-80" : ""}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`flex items-center rounded-full border px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-widest ${
                    enabled
                      ? isDark
                        ? "border-indigo-300/70 bg-slate-900 text-indigo-100"
                        : "border-indigo-300 bg-white text-indigo-600"
                      : isDark
                        ? "border-slate-600 bg-slate-800 text-slate-300"
                        : "border-slate-300 bg-slate-50 text-slate-500"
                  }`}
                >
                  {enabled ? "On" : "Off"}
                </span>
                <span>{section.title}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PlusMinusIcon({ expanded, isDark }: { expanded: boolean; isDark: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex aspect-square h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-indigo-500 shadow-sm transition ${
        isDark
          ? "border-indigo-400/60 bg-slate-900 text-indigo-200 hover:border-indigo-300 hover:text-indigo-100"
          : "border-indigo-200 bg-white text-indigo-500 hover:border-indigo-400 hover:text-indigo-600"
      }`}
    >
      <svg
        className={`h-3 w-3 transition-transform duration-300 ${expanded ? "rotate-90" : "rotate-0"}`}
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5.25 3.5L9.5 7L5.25 10.5V3.5Z" fill="currentColor" />
      </svg>
    </span>
  );
}

function summaryCellStyle(expanded: boolean, accent: string, sticky = false, isDark = false) {
  const width = expanded ? 0 : SUMMARY_COLUMN_WIDTH;
  const tint = `${accent}22`;
  const collapsedTint = `${accent}12`;
  return {
    width,
    maxWidth: width,
    minWidth: width,
    paddingInline: expanded ? 0 : undefined,
    overflow: "hidden",
    backgroundColor: expanded ? tint : collapsedTint,
    boxShadow: expanded ? `inset -2px 0 0 ${accent}33` : "none",
    color: isDark ? "#e5e7eb" : "#0f172a",
    transition: "all 0.5s ease",
    ...(sticky
      ? {
          position: "sticky" as const,
          left: 0,
          zIndex: 25,
          boxShadow: `inset -1px 0 0 rgba(148, 163, 184, 0.3), inset -2px 0 0 ${accent}33`,
        }
      : {}),
  };
}

function detailCellStyle(
  expanded: boolean,
  accent: string,
  isFirst: boolean,
  stickyLeft?: number,
  isDark = false
) {
  const width = expanded ? DETAIL_COLUMN_WIDTH : 0;
  const tint = `${accent}18`;
  const collapsedTint = `${accent}10`;
  return {
    width,
    maxWidth: width,
    minWidth: width,
    paddingInline: expanded ? undefined : 0,
    overflow: "hidden",
    backgroundColor: expanded ? tint : collapsedTint,
    boxShadow: expanded ? `inset -1px 0 0 ${accent}30` : "none",
    color: isDark ? "#e5e7eb" : "#0f172a",
    transition: "all 0.5s ease",
    ...(typeof stickyLeft === "number"
      ? {
          position: "sticky" as const,
          left: stickyLeft,
          zIndex: 20,
          boxShadow: `inset -1px 0 0 rgba(148, 163, 184, 0.2), inset -1px 0 0 ${accent}30`,
        }
      : {}),
  };
}

function buildCsv(rows: DashboardRow[], sections: AnySectionConfig[]) {
  const headers = ["SKU", ...sections.flatMap((section) => section.columns.map((col) => `${section.title} - ${col.header}`))];
  const lines = [headers.map(csvEscape).join(",")];

  const formatValue = (value: React.ReactNode) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    return "";
  };

  rows.forEach((row) => {
    const cells: string[] = [row.sku];
    sections.forEach((section) => {
      const data = Array.isArray(row[section.key]) ? (row[section.key] as any[]) : [];
      section.columns.forEach((column) => {
        if (!data.length) {
          cells.push("--");
          return;
        }
        const rendered = data
          .map((item) => {
            try {
              return formatValue(column.render(item as never));
            } catch {
              return "";
            }
          })
          .filter((v) => v !== "")
          .join(" | ");
        cells.push(rendered || "--");
      });
    });
    lines.push(cells.map(csvEscape).join(","));
  });

  return lines.join("\n");
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseSkus(input: string): string[] {
  const values = input
    .split(/[\s,;]+/g)
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(values));
  return unique.slice(0, 100);
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}
