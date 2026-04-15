"use client";

import Image from "next/image";
import { FormEvent, Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import leafLight from "../assets/leaf-light.png";
import leafDark from "../assets/leaf-dark.png";
import dropDark from "../assets/leaf-dark.png";

type DescriptionRow = {
  country: string;
  language: string;
  productName: string;
  shortDescription: string;
  longDescription: string;
};

type DetailsRow = {
  country: string;
  kitType: string;
  startDate: string;
  endDate: string;
  standardWeight: number;
  freightable: boolean;
  shippable: boolean;
  commissionable: boolean;
  memberOnly: boolean;
  coo: string;
  tariffCode: string;
};

type IngredientsRow = {
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

type ChannelAvailabilityRow = {
  country: string;
  warehouse: string;
  salesChannel: string;
  startDate: string;
  endDate: string;
  available: boolean;
};

type PricingRow = {
  country: string;
  priceType: string;
  price: number;
  startDate: string;
  endDate: string;
};

type ProductPointsRow = {
  country: string;
  productPointsType: string;
  value: number;
  startDate: string;
  endDate: string;
};

type KitDetailsRow = {
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

type BusinessRuleRow = {
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

type ProductBayLocationRow = {
  country: string;
  warehouse: string;
  bayLocation: string;
};

type ProductDimensionRow = {
  country: string;
  unit: string;
  height: number;
  width: number;
  depth: number;
};

type ProductWeightRow = {
  country: string;
  weightAmount: number;
  weightUnit: string;
};

type SkuCounterRow = {
  country: string;
  warehouse: string;
  onHand: number;
  pending: number;
  available: number;
};

type CustomsDetailsRow = {
  country: string;
  euTariffCode: string;
  standardCostEur: number | null;
};

type SectionRowMap = {
  skuInfo: { sku: string }[];
  description: DescriptionRow[];
  details: DetailsRow[];
  ingredients: IngredientsRow[];
  channelAvailability: ChannelAvailabilityRow[];
  pricing: PricingRow[];
  productPoints: ProductPointsRow[];
  kitDetails: KitDetailsRow[];
  businessRules: BusinessRuleRow[];
  productBayLocation: ProductBayLocationRow[];
  productDimension: ProductDimensionRow[];
  productWeight: ProductWeightRow[];
  skuCounters: SkuCounterRow[];
  customsDetails: CustomsDetailsRow[];
};

type SectionKey = keyof SectionRowMap;

type DashboardRow = {
  sku: string;
} & SectionRowMap;

type Theme = "light" | "dark";

type ColumnDescriptor<K extends SectionKey> = {
  header: string;
  className?: string;
  initialWidth?: number;
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
  validationDate: string;
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

const SOFTWARE_SYSTEMS = [
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

type SoftwareSystem = (typeof SOFTWARE_SYSTEMS)[number];

const SYSTEM_COUNTRIES: Record<SoftwareSystem, string[]> = {
  NorthAmerica: ["UnitedStates", "Canada", "Mexico", "MelaVanilla"],
  Taiwan: ["Taiwan"],
  Japan: ["Japan"],
  Australia: ["Australia", "NewZealand"],
  Korea: ["Korea", "HongKong"],
  Europe: ["UnitedKingdom", "Ireland", "Netherlands", "Germany", "Austria", "Hungary", "Poland", "Spain", "Lithuania", "Latvia", "Estonia"],
  Singapore: ["Singapore", "Malaysia"],
  China: ["China"],
  Philippines: ["Philippines"],
};

const SECTION_ORDER: SectionKey[] = [
  "skuInfo",
  "description",
  "details",
  "ingredients",
  "channelAvailability",
  "pricing",
  "productPoints",
  "kitDetails",
  "businessRules",
  "productBayLocation",
  "productDimension",
  "productWeight",
  "skuCounters",
  "customsDetails",
];

const SECTION_ACCENTS: Record<SectionKey, string> = {
  skuInfo: "#a5b4fc", // indigo
  description: "#38bdf8", // sky
  details: "#34d399", // green
  ingredients: "#facc15", // amber
  channelAvailability: "#f59e0b", // amber
  pricing: "#f87171", // rose
  productPoints: "#e879f9", // fuchsia
  kitDetails: "#10b981", // emerald
  businessRules: "#eab308", // yellow
  productBayLocation: "#22c55e", // green
  productDimension: "#0ea5e9", // sky
  productWeight: "#a855f7", // violet
  skuCounters: "#60a5fa", // blue
  customsDetails: "#f97316", // orange
};

// ── Validation date rules ─────────────────────────────────────────────────────

type AnyValidationRule = {
  highlightColumns: string[];
  passes: (row: unknown, validationDate: string) => boolean;
  /** Return true if empty section data should NOT be treated as a fail. */
  allowEmpty?: (dashboardRow: DashboardRow) => boolean;
};

const VALIDATION_RULES: Partial<Record<SectionKey, AnyValidationRule>> = {
  details: {
    highlightColumns: ["Start Date", "End Date"],
    passes: (row, vd) => {
      const r = row as DetailsRow;
      return isWindowValid(r.startDate, r.endDate, vd);
    },
  },
  channelAvailability: {
    highlightColumns: ["Start Date"],
    passes: (row, vd) => {
      const r = row as ChannelAvailabilityRow;
      return r.salesChannel !== "Web" || isStartDateExact(r.startDate, vd);
    },
  },
  pricing: {
    highlightColumns: ["Start Date", "End Date"],
    passes: (row, vd) => {
      const r = row as PricingRow;
      return isWindowValid(r.startDate, r.endDate, vd);
    },
  },
  productPoints: {
    highlightColumns: ["Start Date", "End Date"],
    passes: (row, vd) => {
      const r = row as ProductPointsRow;
      return isWindowValid(r.startDate, r.endDate, vd);
    },
  },
  kitDetails: {
    highlightColumns: ["Start Date", "End Date"],
    passes: (row, vd) => {
      const r = row as KitDetailsRow;
      return isWindowValid(r.startDate, r.endDate, vd);
    },
    allowEmpty: (dashboardRow) =>
      dashboardRow.details.length === 0 ||
      dashboardRow.details.every((d) => d.kitType === "NotAKit"),
  },
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

function getDashboardApiPath() {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  if (basePath) {
    return `${basePath}/api/dashboard`;
  }
  if (typeof window === "undefined") {
    return "api/dashboard";
  }
  const path = window.location.pathname;
  const normalized = path.endsWith("/") ? path : `${path}/`;
  return `${normalized}api/dashboard`;
}

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
      { header: "Country", render: (row) => row.country },
      { header: "Language", render: (row) => row.language },
      { header: "Product Name", initialWidth: 260, className: "truncate", render: (row) => <span title={row.productName} className="block truncate">{row.productName}</span> },
      { header: "Short Description", initialWidth: 240, className: "truncate", render: (row) => <span title={row.shortDescription} className="block truncate">{row.shortDescription}</span> },
      { header: "Long Description", initialWidth: 280, className: "truncate", render: (row) => <span title={row.longDescription} className="block truncate">{row.longDescription}</span> },
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
      { header: "Country", render: (row) => formatText(row.country) },
      { header: "Kit Type", render: (row) => formatText(row.kitType) },
      { header: "Start Date", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate) },
      { header: "Standard Weight", render: (row) => row.standardWeight ?? "--" },
      { header: "Freightable", render: (row) => formatBoolean(row.freightable) },
      { header: "Shippable", render: (row) => formatBoolean(row.shippable) },
      { header: "Commissionable", render: (row) => formatBoolean(row.commissionable) },
      { header: "Member Only", render: (row) => formatBoolean(row.memberOnly) },
      { header: "CoO", initialWidth: 80, render: (row) => formatText(row.coo) },
      { header: "Tariff Code", initialWidth: 160, className: "truncate", render: (row) => { const v = formatText(row.tariffCode); return v === "--" ? "--" : <span title={v} className="block truncate">{v}</span>; } },
    ],
  },
  ingredients: {
    key: "ingredients",
    title: "Ingredients",
    blurb: "Ingredient metadata per country and culture.",
    emptyHint: "No ingredient rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.ingredientName}</p>
          <p className="text-xs opacity-80">
            {first.country} · {first.culture}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "Country", render: (row) => row.country },
      { header: "Culture", render: (row) => row.culture },
      { header: "Product Name", render: (row) => row.productName },
      { header: "Ingredient Name", render: (row) => row.ingredientName },
      { header: "Short Description", className: "max-w-xs", render: (row) => row.shortDescription },
      { header: "All Sort", className: "text-right font-mono", render: (row) => row.allSort },
      { header: "Key Sort", className: "text-right font-mono", render: (row) => row.keySort },
      { header: "Modal CTA Text", render: (row) => row.modalCtaText },
      { header: "Modal CTA Link", className: "max-w-xs", render: (row) => row.modalCtaLink },
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
      { header: "Country", render: (row) => row.country },
      { header: "Warehouse", initialWidth: 220, className: "truncate", render: (row) => <span title={row.warehouse} className="block truncate">{row.warehouse}</span> },
      { header: "Sales Channel", render: (row) => row.salesChannel },
      { header: "Start Date", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate) },
      { header: "Available", render: (row) => formatBoolean(row.available) },
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
      { header: "Country", render: (row) => row.country },
      { header: "Price Type", render: (row) => row.priceType },
      { header: "Price", className: "text-right font-mono", render: (row) => currencyFormatter.format(row.price) },
      { header: "Start Date", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate) },
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
          <p className="font-semibold">{first.productPointsType}</p>
          <p className="text-xs opacity-80">
            {first.country}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "Country", render: (row) => row.country },
      { header: "Product Points Type", render: (row) => row.productPointsType },
      { header: "Value", className: "text-right font-mono", render: (row) => row.value },
      { header: "Start Date", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate) },
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
      { header: "Country", initialWidth: 100, render: (row) => row.country },
      { header: "Quantity", initialWidth: 75, className: "text-right font-mono", render: (row) => row.quantity },
      { header: "Sort Order", initialWidth: 85, className: "text-right font-mono", render: (row) => row.sortOrder },
      { header: "New Sort Order", initialWidth: 100, className: "text-right font-mono", render: (row) => row.newSortOrder },
      { header: "Parent SKU", initialWidth: 100, render: (row) => row.parentSku },
      { header: "Child SKU", initialWidth: 100, render: (row) => row.childSku },
      { header: "Child SKU Description", initialWidth: 280, className: "truncate", render: (row) => <span title={row.childSkuDescription} className="block truncate">{row.childSkuDescription}</span> },
      { header: "Select Type", initialWidth: 105, render: (row) => row.selectType },
      { header: "Start Date", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate) },
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
      { header: "Country", render: (row) => row.country },
      { header: "Business Rule", render: (row) => row.businessRule },
      { header: "Start Date", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate) },
      { header: "Item Unit Qty", className: "text-right font-mono", render: (row) => row.itemUnitQty },
      { header: "Max Qty", className: "text-right font-mono", render: (row) => row.maxQty },
      { header: "Bundle Max Weight", className: "text-right font-mono", render: (row) => row.bundleMaxWeight },
      { header: "Product Category Iden", render: (row) => row.productCategoryIden },
      { header: "Ship To Country", render: (row) => row.shipToCountry },
      { header: "Ship To Country Iden", render: (row) => row.shipToCountryIden },
      { header: "Rule SKU", render: (row) => row.ruleSku },
      { header: "Notification Localization Key", className: "max-w-xs", render: (row) => row.notificationLocalizationKey },
      { header: "General Supporting Data", className: "max-w-xs", render: (row) => row.generalSupportingData },
    ],
  },
  productBayLocation: {
    key: "productBayLocation",
    title: "Product Bay Location",
    blurb: "Warehouse bay positions.",
    emptyHint: "No bay location rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.bayLocation}</p>
          <p className="text-xs opacity-80">
            {first.country} · {first.warehouse}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "Country", render: (row) => row.country },
      { header: "Warehouse", render: (row) => row.warehouse },
      { header: "Bay Location", render: (row) => row.bayLocation },
    ],
  },
  productDimension: {
    key: "productDimension",
    title: "Product Dimension",
    blurb: "Pack dimensions by unit.",
    emptyHint: "No dimension rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.unit}</p>
          <p className="text-xs opacity-80">
            {first.country} · {first.height} × {first.width} × {first.depth}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "Country", render: (row) => row.country },
      { header: "Unit", render: (row) => row.unit },
      { header: "Height", className: "text-right font-mono", render: (row) => row.height },
      { header: "Width", className: "text-right font-mono", render: (row) => row.width },
      { header: "Depth", className: "text-right font-mono", render: (row) => row.depth },
    ],
  },
  productWeight: {
    key: "productWeight",
    title: "Product Weight",
    blurb: "Weight amounts by unit.",
    emptyHint: "No weight rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.weightAmount} {first.weightUnit}</p>
          <p className="text-xs opacity-80">
            {first.country}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "Country", render: (row) => row.country },
      { header: "Weight Amount", className: "text-right font-mono", render: (row) => row.weightAmount },
      { header: "Weight Unit", render: (row) => row.weightUnit },
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
      { header: "Country", render: (row) => row.country },
      { header: "Warehouse", render: (row) => row.warehouse },
      { header: "On Hand", className: "text-right font-mono", render: (row) => row.onHand.toLocaleString() },
      { header: "Pending", className: "text-right font-mono", render: (row) => row.pending.toLocaleString() },
      { header: "Available", className: "text-right font-mono", render: (row) => row.available.toLocaleString() },
    ],
  },
  customsDetails: {
    key: "customsDetails",
    title: "Customs Details",
    blurb: "Tariff and standard cost reference.",
    emptyHint: "No customs rows.",
    summary: (rows) => {
      const first = rows?.[0];
      if (!first) return <span className="text-slate-400">--</span>;
      return (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{first.euTariffCode}</p>
          <p className="text-xs opacity-80">
            {first.country} · {first.standardCostEur != null ? currencyFormatter.format(first.standardCostEur) : "--"}
            {rows.length > 1 ? ` (+${rows.length - 1} more)` : ""}
          </p>
        </div>
      );
    },
    columns: [
      { header: "Country", render: (row) => row.country },
      { header: "EU Tariff Code", render: (row) => row.euTariffCode },
      { header: "07 Standard Cost [EUR]", className: "text-right font-mono", render: (row) => row.standardCostEur != null ? currencyFormatter.format(row.standardCostEur) : "--" },
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
  const [softwareSystem, setSoftwareSystem] = useState("NorthAmerica");
  const [country, setCountry] = useState("");
  const [webOnly, setWebOnly] = useState(false);
  const [validationDate, setValidationDate] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  // ── Restore persisted preferences on mount ──────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("sku-prefs");
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (typeof prefs.skuInput === "string") setSkuInput(prefs.skuInput);
      if (typeof prefs.softwareSystem === "string") setSoftwareSystem(prefs.softwareSystem);
      if (typeof prefs.country === "string") setCountry(prefs.country);
      if (typeof prefs.webOnly === "boolean") setWebOnly(prefs.webOnly);
      if (typeof prefs.validationDate === "string") setValidationDate(prefs.validationDate);
      if (prefs.sectionVisibility && typeof prefs.sectionVisibility === "object") {
        setSectionVisibility((prev) => ({ ...prev, ...prefs.sectionVisibility }));
      }
    } catch {
      // corrupted storage — ignore
    }
  }, []);

  // ── Persist preferences whenever they change ────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("sku-prefs", JSON.stringify({
        skuInput,
        softwareSystem,
        country,
        webOnly,
        validationDate,
        sectionVisibility,
      }));
    } catch {
      // storage full or unavailable — ignore
    }
  }, [skuInput, softwareSystem, country, webOnly, validationDate, sectionVisibility]);

  const countryOptions = useMemo(
    () => SYSTEM_COUNTRIES[softwareSystem as SoftwareSystem] ?? [],
    [softwareSystem]
  );

  const skus = useMemo(() => parseSkus(skuInput), [skuInput]);
  const sectionList: AnySectionConfig[] = useMemo(
    () => SECTION_ORDER.map((key) => SECTION_CONFIGS[key]),
    []
  );
  const visibleSections = sectionList.filter((section) =>
    section.key === "skuInfo" ? true : sectionVisibility[section.key]
  );
  const displayRows = useMemo(() => {
    if (!webOnly || !rows) return rows;
    return rows.map((row) => ({
      ...row,
      channelAvailability: row.channelAvailability.filter(
        (r) => r.salesChannel === "Web"
      ),
    }));
  }, [rows, webOnly]);
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
      const res = await fetch(getDashboardApiPath(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skus,
          country,
          softwareSystem,
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
          {/* ── SKU Input ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="skuInput" className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                SKU List
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
              {skus.length > 0 && (
                <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {skus.length} SKU{skus.length === 1 ? "" : "s"} detected
                </span>
              )}
            </div>
            <textarea
              id="skuInput"
              className={`min-h-[140px] flex-1 rounded-2xl border p-4 font-mono text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/40 ${
                isDark
                  ? "border-white/10 bg-slate-950/60 text-white focus:border-indigo-400"
                  : "border-slate-300 bg-white text-slate-900 focus:border-indigo-500"
              }`}
              placeholder="One SKU per line, or comma/space separated"
              value={skuInput}
              onChange={(event) => setSkuInput(event.target.value)}
            />
          </div>

          {/* ── API Config ── */}
          <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-slate-50"}`}>
        
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* Software System */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                  Software System
                </label>
                <select
                  value={softwareSystem}
                  onChange={(e) => { setSoftwareSystem(e.target.value); setCountry(""); }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                    isDark ? "border-slate-600 bg-slate-800 text-slate-100" : "border-slate-300 bg-white text-slate-900"
                  }`}
                >
                  {SOFTWARE_SYSTEMS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Country */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                  Country
                  <span className={`ml-1.5 font-normal normal-case tracking-normal ${isDark ? "text-slate-500" : "text-slate-400"}`}>(optional)</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                    isDark ? "border-slate-600 bg-slate-800 text-slate-100" : "border-slate-300 bg-white text-slate-900"
                  }`}
                >
                  <option value="">All countries</option>
                  {countryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* ── Filters (accordion) ── */}
          <div className={`rounded-2xl border ${isDark ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-slate-50"}`}>
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-expanded={filtersOpen}
              className={`flex w-full items-center justify-between px-4 py-3 text-left ${isDark ? "text-slate-200 hover:text-white" : "text-slate-700 hover:text-slate-900"}`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest">Filters</span>
                {(webOnly || validationDate) && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
                    Active
                  </span>
                )}
              </span>
              <svg
                className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${filtersOpen ? "rotate-180" : "rotate-0"}`}
                viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {filtersOpen && (
              <div className="grid grid-cols-1 gap-4 border-t px-4 pb-4 pt-3 sm:grid-cols-2" style={{ borderColor: isDark ? "rgb(51 65 85)" : "rgb(226 232 240)" }}>

                {/* Validation Date */}
                <div className="flex flex-col gap-1">
                  <label className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                    Validation Date
                    <span className={`ml-1.5 font-normal normal-case tracking-normal ${isDark ? "text-slate-500" : "text-slate-400"}`}>(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={validationDate}
                    onChange={(e) => setValidationDate(e.target.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                      isDark ? "border-slate-600 bg-slate-800 text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>

                {/* Web Channels Only */}
                <div className="flex flex-col gap-1">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                    Channel Filter
                  </span>
                  <label className={`inline-flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition hover:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400 ${
                    isDark ? "border-slate-600 bg-slate-800" : "border-slate-300 bg-white"
                  }`}>
                    <input
                      type="checkbox"
                      checked={webOnly}
                      onChange={(e) => setWebOnly(e.target.checked)}
                      className="h-4 w-4 accent-emerald-500"
                    />
                    <span className={isDark ? "text-slate-100" : "text-slate-800"}>Web channels only</span>
                  </label>
                </div>

              </div>
            )}
          </div>

          {/* ── Submit ── */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching…" : "Search"}
            </button>
            {!lastGenerated && (
              <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>Enter SKUs above and press Search.</p>
            )}
          </div>
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
          rows={displayRows ?? []}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          theme={theme}
          validationDate={validationDate}
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
  validationDate,
}: CombinedTableProps) {
  const isDark = theme === "dark";
  const [tableStickyActive, setTableStickyActive] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [headerHeights, setHeaderHeights] = useState({ section: 44, column: 44 });
  const [resizing, setResizing] = useState<{ colId: string; startX: number; startWidth: number } | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const sectionHeaderRowRef = useRef<HTMLTableRowElement | null>(null);
  const columnHeaderRowRef = useRef<HTMLTableRowElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingResizeRef = useRef<{ colId: string; width: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScroll = () => {
      const tableEl = tableWrapperRef.current;
      if (!tableEl) {
        setTableStickyActive(false);
        return;
      }

      const rect = tableEl.getBoundingClientRect();
      const shouldStick = rect.top < 0 && rect.bottom > 100;
      setTableStickyActive(shouldStick);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const updateHeaderHeights = () => {
      const sectionHeight = sectionHeaderRowRef.current?.getBoundingClientRect().height ?? 44;
      const columnHeight = columnHeaderRowRef.current?.getBoundingClientRect().height ?? 44;
      setHeaderHeights({ section: sectionHeight, column: columnHeight });
    };
    updateHeaderHeights();
    window.addEventListener("resize", updateHeaderHeights);
    return () => window.removeEventListener("resize", updateHeaderHeights);
  }, [sections]);

  const hasData = rows.length > 0;

  // Pre-compute which item indices fail validation per section per SKU row.
  const failingRowIndices = useMemo(() => {
    const result = new Map<number, Map<SectionKey, Set<number>>>();
    if (!validationDate) return result;
    rows.forEach((row, rowIndex) => {
      const sectionMap = new Map<SectionKey, Set<number>>();
      (Object.keys(VALIDATION_RULES) as SectionKey[]).forEach((sectionKey) => {
        const rule = VALIDATION_RULES[sectionKey];
        if (!rule) return;
        const data = row[sectionKey];
        if (!Array.isArray(data)) return;
        const failing = new Set<number>();
        if ((data as unknown[]).length === 0) {
          if (!rule.allowEmpty || !rule.allowEmpty(row)) {
            failing.add(-1); // sentinel: section has no data — counts as a fail
          }
        } else {
          (data as unknown[]).forEach((item, idx) => {
            if (!rule.passes(item, validationDate)) failing.add(idx);
          });
        }
        if (failing.size > 0) sectionMap.set(sectionKey, failing);
      });
      if (sectionMap.size > 0) result.set(rowIndex, sectionMap);
    });
    return result;
  }, [rows, validationDate]);

  useEffect(() => {
    const baseWidths: Record<string, number> = {};
    sections.forEach((section) => {
      section.columns.forEach((column, columnIndex) => {
        const colId = `${section.key}-${columnIndex}`;
        if (!baseWidths[colId] && !columnWidths[colId]) {
          baseWidths[colId] = column.initialWidth ?? DETAIL_COLUMN_WIDTH;
        }
      });
    });
    if (Object.keys(baseWidths).length > 0) {
      setColumnWidths((prev) => ({ ...baseWidths, ...prev }));
    }
  }, [sections]);

  useEffect(() => {
    if (!resizing) return;

    const flushResize = () => {
      const pending = pendingResizeRef.current;
      if (!pending) return;
      applyColumnWidth(pending.colId, pending.width);
      setColumnWidths((prev) => ({ ...prev, [pending.colId]: pending.width }));
      pendingResizeRef.current = null;
      rafRef.current = null;
    };

    const onMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      const nextId = resizing.colId;
      const nextWidth = Math.max(70, resizing.startWidth + (event.clientX - resizing.startX));
      pendingResizeRef.current = { colId: nextId, width: nextWidth };
      applyColumnWidth(nextId, nextWidth);

      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(flushResize);
      }
    };

    const onMouseUp = () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        flushResize();
      }
      setResizing(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [resizing]);

  const applyColumnWidth = (colId: string, width: number) => {
    const table = tableWrapperRef.current?.querySelector("table");
    if (!table) return;

    table
      .querySelectorAll<HTMLElement>(`[data-colid="${colId}"]`)
      .forEach((cell) => {
        cell.style.width = `${width}px`;
        cell.style.minWidth = `${width}px`;
        cell.style.maxWidth = `${width}px`;
      });
  };

  const getTextFromReactNode = (node: ReactNode): string => {
    if (node === null || node === undefined || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(getTextFromReactNode).join("");
    if (typeof node === "object" && "props" in node && (node as any)?.props?.children) {
      return getTextFromReactNode((node as any).props.children);
    }
    return "";
  };

  const autoFitColumn = (colId: string) => {
    const sectionKey = colId.split("-")[0] as SectionKey;
    const columnIndex = Number(colId.split("-")[1]);
    const section = sections.find((s) => s.key === sectionKey);
    if (!section || Number.isNaN(columnIndex)) return;

    const column = section.columns[columnIndex];
    if (!column) return;

    const headerChars = column.header.trim().length;
    let maxChars = headerChars;

    rows.forEach((row) => {
      const sectionData = (row as any)[sectionKey];
      if (!Array.isArray(sectionData)) return;
      sectionData.forEach((item: any) => {
        const rendered = column.render(item as never);
        const textValue = getTextFromReactNode(rendered).trim();
        maxChars = Math.max(maxChars, textValue.length);
      });
    });

    const avgCharWidth = 9.5; // slightly larger to avoid too-tight abbreviation display
    const isDateColumn = /start date|end date|date/i.test(column.header);
    const minColumnWidth = isDateColumn ? 120 : 70;
    const targetWidth = Math.min(Math.max(minColumnWidth, maxChars * avgCharWidth + 20), 500);

    console.info(`[autoFitColumn] ${colId}: maxChars=${maxChars}, isDate=${isDateColumn}, targetWidth=${targetWidth}`);
    setColumnWidths((prev) => ({ ...prev, [colId]: targetWidth }));
    applyColumnWidth(colId, targetWidth);
  };

  const startColumnResize = (colId: string) => (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setResizing({
      colId,
      startX: event.clientX,
      startWidth: columnWidths[colId] ?? DETAIL_COLUMN_WIDTH,
    });
  };

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
          <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>Drag the right edge of any column header to resize it Excel-style.</p>
      </div>

      <div
        ref={tableWrapperRef}
        className={`table-scroll-wrapper rounded-2xl border ${tableStickyActive ? "sticky-fixed" : ""} ${isDark ? "border-slate-800 bg-white/5" : "border-slate-200 bg-transparent"}`}
      >
        <table className={`min-w-full table-auto border-separate border-spacing-0 text-left text-sm ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          <thead>
            <tr ref={sectionHeaderRowRef} className={`section-header-row text-xs font-semibold uppercase ${isDark ? "text-slate-300" : "text-slate-500"}`}>
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
                    className={`section-header-cell px-3 py-3 text-left ${
                      isSticky
                        ? isDark
                          ? "border-slate-700 bg-slate-800 text-slate-200"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                        : isDark
                          ? "border-slate-700 bg-slate-900 text-slate-200 cursor-pointer hover:bg-slate-800/60"
                          : "border-slate-200 bg-slate-50 text-slate-700 cursor-pointer hover:bg-slate-100"
                    }`}
                    style={{
                      borderBottom: "0",
                      borderRight: isLast ? undefined : `1px solid ${separator}`,
                      position: "sticky",
                      top: 0,
                      zIndex: 120,
                      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                      ...(isSticky ? { left: 0, zIndex: 130 } : {}),
                      ["--section-accent" as string]: accent,
                    }}
                    onClick={isSticky ? undefined : () => onToggleSection(section.key)}
                  >
                    {isSticky ? (
                      <div className={`text-left font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {section.title}
                      </div>
                    ) : (
                      <div
                        className={`inline-flex items-center gap-3 text-left font-semibold ${
                          isDark ? "text-slate-100" : "text-slate-900"
                        }`}
                        style={{
                          position: "sticky",
                          left: SUMMARY_COLUMN_WIDTH,
                          paddingLeft: "10px",
                          backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                        }}
                      >
                        <span className="truncate">{section.title}</span>
                        <PlusMinusIcon expanded={expanded} isDark={isDark} />
                        <span className="sr-only">
                          {expanded ? "Collapse section" : "Expand section"}
                        </span>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
            <tr ref={columnHeaderRowRef} className={`column-header-row text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-600"}`}>
              {sections.map((section, sectionIndex) => {
                const isSticky = section.key === "skuInfo";
                const expanded = isSticky ? false : expandedSections[section.key];
                const accent = SECTION_ACCENTS[section.key];
                const isLast = sectionIndex === sections.length - 1;
                const separator = isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(148, 163, 184, 0.35)";
                return (
                  <Fragment key={`header-set-${section.key}`}>
                    <th
                      className={`px-3 py-1.5 ${!isSticky ? "cursor-pointer" : ""}`}
                      style={{
                        ...summaryCellStyle(expanded, accent, isSticky, isDark, isSticky ? 0 : undefined),
                        position: "sticky",
                        top: headerHeights.section,
                        zIndex: isSticky ? 210 : 55,
                        backgroundColor: expanded ? accent : (isDark ? "#0b1221" : "#f8fafc"),
                        borderRight: isLast ? undefined : `1px solid ${separator}`,
                      }}
                      onClick={isSticky ? undefined : () => onToggleSection(section.key)}
                    >
                      <span
                        className={`inline-flex w-full justify-between text-left font-semibold uppercase tracking-wide ${isDark ? "text-slate-50" : "text-slate-900"} transition-opacity duration-200 ${
                          expanded ? "opacity-0" : "opacity-100"
                        }`}
                      >
                        Summary
                      </span>
                    </th>
                    {section.columns.map((column, columnIndex) => {
                      const stickyLeft = isSticky && columnIndex === 0 ? SUMMARY_COLUMN_WIDTH : undefined;
                      const colId = `${section.key}-${columnIndex}`;
                      const colWidth = columnWidths[colId] ?? DETAIL_COLUMN_WIDTH;
                      const headerBackground = isSticky
                        ? accent
                        : accent;
                      return (
                        <th
                          key={`header-${section.key}-${column.header}`}
                          className={`px-3 py-1.5 ${column.className ?? ""} relative`}
                          data-colid={colId}
                          style={{
                            ...detailCellStyle(expanded, accent, columnIndex === 0, stickyLeft, isDark),
                            backgroundColor: headerBackground,
                            color: isDark ? "#f8fafc" : "#0f172a",
                            position: "sticky",
                            top: headerHeights.section,
                            zIndex: columnIndex === 0 ? 175 : 104,
                            width: expanded ? colWidth : 0,
                            minWidth: expanded ? colWidth : 0,
                            borderRight:
                              expanded && !(isLast && columnIndex === section.columns.length - 1)
                                ? `1px solid ${separator}`
                                : undefined,
                          }}
                        >
                          <div
                            className="column-resizer"
                            role="separator"
                            aria-orientation="horizontal"
                            onMouseDown={startColumnResize(colId)}
                            onDoubleClick={() => autoFitColumn(colId)}
                          />
                          <span
                            onDoubleClick={() => autoFitColumn(colId)}
                            className={`inline-flex w-full justify-between text-left font-semibold ${isDark ? "text-slate-50" : "text-slate-900"} transition-opacity duration-200 ${
                              expanded ? "opacity-100" : "opacity-0"
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
              rows.map((row, rowIndex) => {
                const isEvenSkuRow = rowIndex % 2 === 0;
                const rowTint = isDark
                  ? isEvenSkuRow ? "rgba(255,255,255,0.0)" : "rgba(255,255,255,0.04)"
                  : isEvenSkuRow ? "rgba(0,0,0,0.0)" : "rgba(0,0,0,0.04)";
                return (
                <tr
                  key={`row-${row.sku}-${rowIndex}`}
                  className={isDark ? "text-slate-100 hover:bg-slate-800" : "text-slate-900 hover:bg-slate-50"}
                >
                  {sections.flatMap((section, sectionIndex) => {
                    const isSticky = section.key === "skuInfo";
                    const expanded = isSticky ? false : expandedSections[section.key];
                    const data = row[section.key];
                    const accent = SECTION_ACCENTS[section.key];
                    const isLast = sectionIndex === sections.length - 1;
                    const separator = isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(148, 163, 184, 0.35)";
                    const failingCount = validationDate
                      ? (failingRowIndices.get(rowIndex)?.get(section.key)?.size ?? 0)
                      : 0;
                    return [
                      <td
                        key={`cell-${rowIndex}-${section.key}-summary`}
                        className={`px-3 py-2 align-top ${isSticky ? "" : "cursor-pointer select-none"} ${isDark ? "text-slate-100" : "text-slate-900"}`}
                        style={{
                          ...summaryCellStyle(expanded, accent, isSticky, isDark, isSticky ? 0 : undefined, headerHeights.section + headerHeights.column),
                          backgroundColor: isSticky
                            ? (isDark ? "#0f172a" : "#f8fafc")
                            : `color-mix(in srgb, ${expanded ? `${accent}22` : `${accent}12`} 100%, ${rowTint})`,
                          borderTop: rowIndex === 0 ? "none" : isDark ? "1px solid rgb(71 85 105 / 0.6)" : "1px solid rgb(148 163 184 / 0.5)",
                          borderRight: isLast ? undefined : `1px solid ${separator}`,
                        }}
                        onClick={() => (isSticky ? undefined : onToggleSection(section.key))}
                        role={isSticky ? undefined : "button"}
                        aria-pressed={expanded}
                      >
                        <div
                          className={`transition-opacity duration-200 ${
                            expanded ? "opacity-0" : "opacity-100"
                          }`}
                          aria-hidden={expanded}
                        >
                          {section.summary(data as never)}
                          {failingCount > 0 && (
                            <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isDark ? "bg-rose-500/20 text-rose-300" : "bg-rose-50 text-rose-600"
                            }`}>
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                              {failingCount} failing
                            </div>
                          )}
                        </div>
                      </td>,
                      ...section.columns.map((column, columnIndex) => {
                        const stickyLeft = isSticky && columnIndex === 0 ? SUMMARY_COLUMN_WIDTH : undefined;
                        const arr = Array.isArray(data) ? data : [];
                        const isLastColumn = isLast && columnIndex === section.columns.length - 1;
                        const sectionMissing =
                          !!validationDate &&
                          !!VALIDATION_RULES[section.key] &&
                          arr.length === 0;
                        return (
                          <td
                            key={`cell-${rowIndex}-${section.key}-${column.header}`}
                            className={`px-4 ${expanded ? "py-3" : "py-0"} align-top ${column.className ?? ""} ${isDark ? "text-slate-100" : "text-slate-900"}`}
                            style={{
                              ...detailCellStyle(expanded, accent, columnIndex === 0, stickyLeft, isDark),
                              backgroundColor: `color-mix(in srgb, ${expanded ? `${accent}18` : `${accent}10`} 100%, ${rowTint})`,
                              borderTop: rowIndex === 0 ? "none" : isDark ? "1px solid rgb(71 85 105 / 0.6)" : "1px solid rgb(148 163 184 / 0.5)",
                              width: expanded ? (columnWidths[`${section.key}-${columnIndex}`] ?? DETAIL_COLUMN_WIDTH) : 0,
                              minWidth: expanded ? (columnWidths[`${section.key}-${columnIndex}`] ?? DETAIL_COLUMN_WIDTH) : 0,
                              borderRight: expanded && !isLastColumn ? `1px solid ${separator}` : "none",
                              borderLeft: "none",
                            }}
                            data-colid={`${section.key}-${columnIndex}`}
                          >
                            <div
                              className={`space-y-1 transition-opacity duration-200 ${
                                expanded ? "opacity-100" : "opacity-0"
                              }`}
                              aria-hidden={!expanded}
                              style={{
                                maxHeight: expanded ? "1200px" : "0px",
                                overflow: "hidden",
                              }}
                            >
                              {arr.length === 0 ? (
                                <span className={sectionMissing
                                  ? isDark ? "font-semibold text-rose-400" : "font-semibold text-rose-600"
                                  : "text-slate-400"
                                }>
                                  {sectionMissing ? "No data" : "--"}
                                </span>
                              ) : (
                                arr.map((item, idx) => {
                                  const isEvenRow = idx % 2 === 0;
                                  const itemBg = isDark ? (isEvenRow ? `${accent}25` : `${accent}15`) : (isEvenRow ? `${accent}20` : `${accent}10`);
                                  const itemBorder = `1px solid ${isEvenRow ? `${accent}40` : `${accent}22`}`;
                                  const rule = VALIDATION_RULES[section.key];
                                  const itemFails =
                                    !!validationDate &&
                                    !!rule &&
                                    (failingRowIndices.get(rowIndex)?.get(section.key)?.has(idx) ?? false);
                                  const columnRelevant =
                                    !!validationDate &&
                                    !!rule &&
                                    (rule.highlightColumns.length === 0 || rule.highlightColumns.includes(column.header));
                                  const columnHighlighted = itemFails && columnRelevant;
                                  const columnPasses = !itemFails && columnRelevant;
                                  return (
                                    <div
                                      key={`${section.key}-${rowIndex}-${idx}`}
                                      className="space-y-0.5 px-3 py-2"
                                      style={{
                                        backgroundColor: columnHighlighted
                                          ? `color-mix(in srgb, ${isDark ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.15)"} 100%, ${itemBg})`
                                          : columnPasses
                                            ? `color-mix(in srgb, ${isDark ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.12)"} 100%, ${itemBg})`
                                            : itemBg,
                                        borderBottom: itemBorder,
                                        borderLeft: columnHighlighted
                                          ? "3px solid rgb(239,68,68)"
                                          : columnPasses
                                            ? "3px solid rgb(34,197,94)"
                                            : "3px solid transparent",
                                        borderRadius: 0,
                                        margin: 0,
                                      }}
                                    >
                                      <div className="truncate">
                                        {column.render(item as never)}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </td>
                        );
                      }),
                    ];
                  })}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
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
        {sections
          .filter((section) => section.key !== "skuInfo")
          .map((section) => {
            const enabled = visibility[section.key];
            return (
              <button
                key={`visibility-${section.key}`}
                type="button"
                aria-pressed={enabled}
                onClick={() => onToggle(section.key)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  enabled
                    ? isDark
                      ? "border-indigo-400/60 bg-indigo-500/15 text-indigo-100 shadow-sm shadow-indigo-900/40"
                      : "border-indigo-200 bg-indigo-50 text-indigo-900 shadow-sm shadow-indigo-200/70"
                    : isDark
                      ? "border-slate-700 bg-slate-800 text-slate-200 hover:border-indigo-400 hover:text-indigo-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                }`}
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

function summaryCellStyle(expanded: boolean, accent: string, sticky = false, isDark = false, stickyLeft?: number, stickyTop?: number) {
  const width = expanded ? 0 : SUMMARY_COLUMN_WIDTH;
  const tint = `${accent}22`;
  const collapsedTint = `${accent}12`;
  const solidBg = isDark ? "#0f172a" : "#f8fafc";
  const rowDivider = isDark ? "#1e293b" : "#e2e8f0";
  const stickyShadow = `inset -1px 0 0 rgba(148, 163, 184, 0.3), inset -2px 0 0 ${accent}33, inset 0 -1px 0 ${rowDivider}`;
  return {
    width,
    maxWidth: width,
    minWidth: width,
    paddingInline: expanded ? 0 : undefined,
    overflow: "hidden",
    backgroundColor: sticky ? solidBg : expanded ? tint : collapsedTint,
    boxShadow: expanded ? `inset -2px 0 0 ${accent}33` : "none",
    color: isDark ? "#e5e7eb" : "#0f172a",
    transition: "background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
    ...(sticky
      ? {
          position: "sticky" as const,
          top: typeof stickyTop === "number" ? stickyTop : 88,
          ...(typeof stickyLeft === "number" ? { left: stickyLeft } : {}),
          zIndex: 180,
          backgroundColor: isDark ? "#0f172a" : "#f8fafc",
          boxShadow: stickyShadow,
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
  const solidBg = isDark ? "#0f172a" : "#f8fafc";
  const rowDivider = isDark ? "#1e293b" : "#e2e8f0";
  return {
    width,
    maxWidth: width,
    minWidth: width,
    paddingInline: expanded ? undefined : 0,
    overflow: "hidden",
    backgroundColor: typeof stickyLeft === "number" ? solidBg : expanded ? tint : collapsedTint,
    boxShadow: expanded ? `inset -1px 0 0 ${accent}30` : "none",
    color: isDark ? "#e5e7eb" : "#0f172a",
    transition: "background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
    ...(typeof stickyLeft === "number"
      ? {
          position: "sticky" as const,
          left: stickyLeft,
          zIndex: 20,
          boxShadow: `inset -1px 0 0 rgba(148, 163, 184, 0.2), inset -1px 0 0 ${accent}30, inset 0 -1px 0 ${rowDivider}`,
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

function formatBoolean(value?: boolean | null) {
  if (value === null || value === undefined) return "--";
  return value ? "Yes" : "No";
}

function formatText(value?: string | null) {
  if (value === null || value === undefined || value.trim() === "") return "--";
  return value;
}

// ── Validation date helpers ───────────────────────────────────────────────────

function toComparableDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = value.slice(0, 10);
  if (d === "0001-01-01") return null;
  return d;
}

function isWindowValid(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  validationDate: string
): boolean {
  const start = toComparableDate(startDate);
  const end = toComparableDate(endDate);
  if (!start) return false;
  return start <= validationDate && (end === null || end >= validationDate);
}

function isStartDateExact(
  startDate: string | null | undefined,
  validationDate: string
): boolean {
  const start = toComparableDate(startDate);
  if (!start) return false;
  return start === validationDate;
}
