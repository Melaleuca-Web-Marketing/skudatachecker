// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  sku: string;
  name?: string;
  productNames?: { culture: string; value: string }[];
  regularPrice?: number | null;
  preferredPrice?: number | null;
  points?: number | null;
  shippable?: boolean | null;
  commissionable?: boolean | null;
  hidden?: boolean | null;
  weight?: number | null;
  weightUnits?: string | null;
  kitType?: string | null;
  offSaleStartDate?: string | null;
  offSaleExpirationDate?: string | null;
  kitDetails?: { kitSku: string; availableSelections?: string[] }[];
  channel?: string;
  startDate?: string | null;
  endDate?: string | null;
  error?: string;
};

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "sku-data-theme";
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const withBasePath = (path: string) => {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return BASE_PATH ? `${BASE_PATH}/${normalized}` : normalized;
};

const COUNTRIES = [
  "UnitedStates",
  "Canada",
  "Taiwan",
  "Japan",
  "HongKong",
  "Australia",
  "Korea",
  "NewZealand",
  "UnitedKingdom",
  "Ireland",
  "Netherlands",
  "Singapore",
  "China",
  "Malaysia",
  "Germany",
  "Mexico",
  "Austria",
  "Hungary",
  "Poland",
  "Spain",
  "Lithuania",
  "Latvia",
  "Estonia",
  "Philippines",
  "Italy",
  "Belgium",
  "Luxembourg",
];

const SYSTEMS = [
  "NorthAmerica",
  "Taiwan",
  "Japan",
  "Australia",
  "Korea",
  "Europe",
  "Singapore",
  "China",
  "Philippines",
];

export default function Page() {
  const [skuText, setSkuText] = useState("117\n5048");
  const [country, setCountry] = useState("UnitedStates");
  const [system, setSystem] = useState("NorthAmerica");
  const [culture, setCulture] = useState("en-US");
  const [channelForDates, setChannelForDates] = useState("Web");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");

  const skusPreview = useMemo(() => {
    return Array.from(
      new Set(
        skuText
          .split(/[\s,;]+/g)
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  }, [skuText]);

  const hasResults = !!rows?.length;
  const successCount = rows?.filter((r) => !r.error).length ?? 0;
  const errorCount = rows?.filter((r) => !!r.error).length ?? 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      return;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  const themeOptions: { value: Theme; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  function formatDisplayDate(value?: string | null, fallback = "--") {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
  }

  function summarizeProductNames(names?: Row["productNames"]) {
    if (!names?.length) return "";
    return names.map((n) => `${n.culture}: ${n.value}`).join(" | ");
  }

  function summarizeKitDetails(details?: Row["kitDetails"]) {
    if (!details?.length) return "";
    return details
      .map((detail) => {
        const selections = detail.availableSelections?.length
          ? ` (${detail.availableSelections.join(", ")})`
          : "";
        return `${detail.kitSku}${selections}`;
      })
      .join(" | ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setRows(null);

    const skus = skusPreview;
    try {
      const res = await fetch(withBasePath("api/sku-info"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skus,
          country,
          softwareSystem: system,
          culture,
          channelForDates,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`${res.status} ${res.statusText} - ${t}`);
      }
      const json = await res.json();
      setRows(json.rows as Row[]);
    } catch (err: any) {
      setError(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function toCsv() {
    if (!rows?.length) return "";
    const headers = [
      "SKU",
      "Name",
      "ProductNames",
      "RegularPrice",
      "PreferredPrice",
      "Points",
      "Shippable",
      "Commissionable",
      "Hidden",
      "Weight",
      "WeightUnits",
      "Channel",
      "StartDate",
      "EndDate",
      "KitType",
      "OffSaleStartDate",
      "OffSaleExpirationDate",
      "KitDetails",
      "Error",
    ];
    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.sku,
          r.name ?? "",
          summarizeProductNames(r.productNames),
          r.regularPrice ?? "",
          r.preferredPrice ?? "",
          r.points ?? "",
          r.shippable ?? "",
          r.commissionable ?? "",
          r.hidden ?? "",
          r.weight ?? "",
          r.weightUnits ?? "",
          r.channel ?? "",
          r.startDate ?? "",
          r.endDate ?? "",
          r.kitType ?? "",
          r.offSaleStartDate ? formatDisplayDate(r.offSaleStartDate, "") : "",
          r.offSaleExpirationDate ? formatDisplayDate(r.offSaleExpirationDate, "") : "",
          summarizeKitDetails(r.kitDetails),
          r.error ?? "",
        ]
          .map(escape)
          .join(",")
      ),
    ];
    return lines.join("\n");
  }

  function downloadCsv() {
    const csv = toCsv();
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sku-info.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 text-slate-900 transition-colors sm:px-6 lg:px-8 dark:text-slate-100">
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">
            Operations Toolkit
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            SKU Data Checker
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Quickly validate product availability and pricing across markets. Paste SKUs, choose
            the target context, and receive clean tabular results with export-ready data.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {themeOptions.map((option) => {
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={isActive}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                    isActive
                      ? "border-transparent bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900"
                      : "border-slate-300 text-slate-600 hover:text-slate-900 dark:border-white/30 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[3fr,2fr]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 transition dark:border-white/5 dark:bg-white/5 dark:shadow-black/20 backdrop-blur"
          >
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="sku-input" className="text-sm font-medium text-slate-900 dark:text-white">
                  SKU list
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {skusPreview.length} unique SKU(s)
                </span>
              </div>
              <textarea
                id="sku-input"
                className="mt-2 min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white p-4 font-mono text-sm text-slate-900 shadow-inner outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/40"
                value={skuText}
                onChange={(e) => setSkuText(e.target.value)}
                placeholder="117, 118, 5048"
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Separate with commas, spaces, or new lines. Duplicates are removed automatically.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">Country</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/40"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">SoftwareSystem header</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/40"
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                >
                  {SYSTEMS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">Culture (name column)</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/40"
                  value={culture}
                  onChange={(e) => setCulture(e.target.value)}
                  placeholder="en-US"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">Channel for dates</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/40"
                  value={channelForDates}
                  onChange={(e) => setChannelForDates(e.target.value)}
                  placeholder="Web"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={loading || !skusPreview.length}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-400 via-indigo-500 to-purple-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-800/50 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Fetching..." : "Fetch SKU info"}
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                disabled={!hasResults}
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:text-indigo-100"
              >
                Download CSV
              </button>
            </div>
          </form>

          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-sm shadow-xl shadow-slate-200/60 transition dark:border-white/5 dark:bg-gradient-to-br dark:from-slate-900/70 dark:to-slate-900/30 dark:shadow-black/30">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Live status</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Queued SKUs</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{skusPreview.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Successful rows</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-500 dark:text-emerald-300">{successCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Rows with errors</p>
                <p className="mt-2 text-3xl font-semibold text-rose-500 dark:text-rose-300">{errorCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Export ready</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{hasResults ? "Yes" : "No"}</p>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Use the status cards to confirm scope before fetching. CSV export becomes available once
              at least one row is returned.
            </p>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </div>
        )}

        {rows && (
          <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/90 text-slate-900 shadow-2xl">
            <div className="overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:text-left">
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Regular</th>
                    <th>Preferred</th>
                    <th>Points</th>
                    <th>Kit type</th>
                    <th>Kit details</th>
                    <th>Channel start</th>
                    <th>Channel end</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.sku} className="border-t border-slate-200 bg-white/60 [&>td]:px-3 [&>td]:py-2">
                      <td className="font-mono text-slate-700">{r.sku}</td>
                      <td>{r.name || <span className="text-slate-400">--</span>}</td>
                      <td>{r.regularPrice ?? "--"}</td>
                      <td>{r.preferredPrice ?? "--"}</td>
                      <td>{r.points ?? "--"}</td>
                      <td>{r.kitType ?? "--"}</td>
                      <td>
                        {r.kitDetails?.length ? (
                          <div className="space-y-1 text-xs">
                            {r.kitDetails.map((detail) => (
                              <div key={`${r.sku}-${detail.kitSku}`} className="text-slate-600">
                                <span className="font-medium text-slate-900">{detail.kitSku}</span>
                                {detail.availableSelections?.length ? (
                                  <span className="text-slate-500">
                                    {" "}
                                    ({detail.availableSelections.join(", ")})
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>
                      <td>{formatDisplayDate(r.startDate)}</td>
                      <td>{formatDisplayDate(r.endDate)}</td>
                      <td className="text-rose-500">{r.error ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
