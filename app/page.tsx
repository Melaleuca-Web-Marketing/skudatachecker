"use client";

import Image from "next/image";
import { FormEvent, Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  exportDashboardWorkbook,
  type ExportCellValue,
  type ExportColumn,
  type ExportContext,
  type ExportWarning,
  type ExportWorkbookSection,
} from "./exportWorkbook";
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

type FailedCountryFetch = {
  country: string;
  status: number | string;
};

type Theme = "light" | "dark";

type ColumnDescriptor<K extends SectionKey> = {
  header: string;
  className?: string;
  initialWidth?: number;
  render: (row: SectionRowMap[K][number]) => ReactNode;
  /** Optional raw value for sorting — use this for dates, numbers, etc. Falls back to rendered text. */
  sortValue?: (row: SectionRowMap[K][number]) => string | number;
  /** Declares which filter UI to show on this column. */
  filterType?: FilterKind;
  /** Raw value used for filter matching. Falls back to rendered text when omitted. */
  filterValue?: (row: SectionRowMap[K][number]) => string | number;
};

type SortEntry = { colIndex: number; dir: "asc" | "desc" };
type SectionSortState = Record<string, SortEntry[]>;

type FilterKind = "text" | "date-range" | "set" | "number-range";
type ColumnFilter =
  | { kind: "text"; value: string }
  | { kind: "date-range"; from: string; to: string }
  | { kind: "date-active"; date: string }
  | { kind: "set"; values: Set<string> }
  | { kind: "number-range"; min: string; max: string };
type SectionFilterState = Record<string, Record<number, ColumnFilter>>;

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
  allSections: AnySectionConfig[];
  rows: DashboardRow[];
  expandedSections: Record<SectionKey, boolean>;
  onToggleSection: (key: SectionKey) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExport: () => void | Promise<void>;
  exporting: boolean;
  theme: Theme;
  validationDate: string;
  visibility: Record<SectionKey, boolean>;
  onToggleVisibility: (key: SectionKey) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onReorder: (order: SectionKey[]) => void;
};

const SOFTWARE_SYSTEMS = [
  "NorthAmerica",
  "APAC",
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
  NorthAmerica: ["UnitedStates", "Canada", "Mexico"],
  APAC: ["Australia", "NewZealand", "Singapore", "Malaysia", "Philippines", "Taiwan", "HongKong"],
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
const DETAIL_ITEM_HEIGHT = 37;
const DETAIL_ITEM_GAP = 4;

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
      { header: "Country", filterType: "set", render: (row) => row.country },
      { header: "Language", filterType: "set", render: (row) => row.language },
      { header: "Product Name", filterType: "text", initialWidth: 260, className: "truncate", render: (row) => <span title={row.productName} className="block truncate">{row.productName}</span> },
      { header: "Short Description", filterType: "text", initialWidth: 240, className: "truncate", render: (row) => <span title={row.shortDescription} className="block truncate">{row.shortDescription}</span> },
      { header: "Long Description", filterType: "text", initialWidth: 280, className: "truncate", render: (row) => <span title={row.longDescription} className="block truncate">{row.longDescription}</span> },
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
      { header: "Country", filterType: "set", render: (row) => formatText(row.country) },
      { header: "Kit Type", filterType: "set", render: (row) => formatText(row.kitType) },
      { header: "Start Date", filterType: "date-range", filterValue: (row) => row.startDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate), sortValue: (row) => row.startDate ?? "" },
      { header: "End Date", filterType: "date-range", filterValue: (row) => row.endDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate), sortValue: (row) => row.endDate ?? "" },
      { header: "Standard Weight", filterType: "number-range", filterValue: (row) => row.standardWeight ?? 0, render: (row) => row.standardWeight ?? "--", sortValue: (row) => row.standardWeight ?? 0 },
      { header: "Freightable", filterType: "set", render: (row) => renderBooleanPill(row.freightable) },
      { header: "Shippable", filterType: "set", render: (row) => renderBooleanPill(row.shippable) },
      { header: "Commissionable", filterType: "set", render: (row) => renderBooleanPill(row.commissionable) },
      { header: "Member Only", filterType: "set", render: (row) => renderBooleanPill(row.memberOnly) },
      { header: "CoO", filterType: "set", initialWidth: 80, render: (row) => formatText(row.coo) },
      { header: "Tariff Code", filterType: "text", initialWidth: 160, className: "truncate", render: (row) => { const v = formatText(row.tariffCode); return v === "--" ? "--" : <span title={v} className="block truncate">{v}</span>; } },
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
      { header: "Country", filterType: "set", render: (row) => row.country },
      { header: "Culture", filterType: "set", render: (row) => row.culture },
      { header: "Product Name", filterType: "text", render: (row) => row.productName },
      { header: "Ingredient Name", filterType: "text", render: (row) => row.ingredientName },
      { header: "Short Description", filterType: "text", className: "max-w-xs", render: (row) => row.shortDescription },
      { header: "All Sort", filterType: "number-range", filterValue: (row) => row.allSort, className: "text-right font-mono", render: (row) => row.allSort },
      { header: "Key Sort", filterType: "number-range", filterValue: (row) => row.keySort, className: "text-right font-mono", render: (row) => row.keySort },
      { header: "Modal CTA Text", filterType: "text", render: (row) => row.modalCtaText },
      { header: "Modal CTA Link", filterType: "text", className: "max-w-xs", render: (row) => row.modalCtaLink },
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
      { header: "Country", filterType: "set", render: (row) => row.country },
      { header: "Warehouse", filterType: "set", initialWidth: 220, className: "truncate", render: (row) => <span title={row.warehouse} className="block truncate">{row.warehouse}</span> },
      { header: "Sales Channel", filterType: "set", render: (row) => row.salesChannel },
      { header: "Start Date", filterType: "date-range", filterValue: (row) => row.startDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate), sortValue: (row) => row.startDate ?? "" },
      { header: "End Date", filterType: "date-range", filterValue: (row) => row.endDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate), sortValue: (row) => row.endDate ?? "" },
      { header: "Available", filterType: "set", render: (row) => renderBooleanPill(row.available) },
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
      { header: "Country", filterType: "set", render: (row) => row.country },
      { header: "Price Type", filterType: "set", render: (row) => row.priceType },
      { header: "Price", filterType: "number-range", filterValue: (row) => row.price, className: "text-right font-mono", render: (row) => currencyFormatter.format(row.price), sortValue: (row) => row.price },
      { header: "Start Date", filterType: "date-range", filterValue: (row) => row.startDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate), sortValue: (row) => row.startDate ?? "" },
      { header: "End Date", filterType: "date-range", filterValue: (row) => row.endDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate), sortValue: (row) => row.endDate ?? "" },
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
      { header: "Country", filterType: "set", render: (row) => row.country },
      { header: "Product Points Type", filterType: "set", render: (row) => row.productPointsType },
      { header: "Value", filterType: "number-range", filterValue: (row) => row.value, className: "text-right font-mono", render: (row) => row.value, sortValue: (row) => row.value },
      { header: "Start Date", filterType: "date-range", filterValue: (row) => row.startDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate), sortValue: (row) => row.startDate ?? "" },
      { header: "End Date", filterType: "date-range", filterValue: (row) => row.endDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate), sortValue: (row) => row.endDate ?? "" },
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
      { header: "Country", filterType: "set", initialWidth: 100, render: (row) => row.country },
      { header: "Quantity", filterType: "number-range", filterValue: (row) => row.quantity, initialWidth: 75, className: "text-right font-mono", render: (row) => row.quantity, sortValue: (row) => row.quantity },
      { header: "Sort Order", filterType: "number-range", filterValue: (row) => row.sortOrder, initialWidth: 85, className: "text-right font-mono", render: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
      { header: "New Sort Order", filterType: "number-range", filterValue: (row) => row.newSortOrder, initialWidth: 100, className: "text-right font-mono", render: (row) => row.newSortOrder, sortValue: (row) => row.newSortOrder },
      { header: "Parent SKU", filterType: "text", initialWidth: 100, render: (row) => row.parentSku },
      { header: "Child SKU", filterType: "text", initialWidth: 100, render: (row) => row.childSku },
      { header: "Child SKU Description", filterType: "text", initialWidth: 280, className: "truncate", render: (row) => <span title={row.childSkuDescription} className="block truncate">{row.childSkuDescription}</span> },
      { header: "Select Type", filterType: "set", initialWidth: 105, render: (row) => row.selectType },
      { header: "Start Date", filterType: "date-range", filterValue: (row) => row.startDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate), sortValue: (row) => row.startDate ?? "" },
      { header: "End Date", filterType: "date-range", filterValue: (row) => row.endDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate), sortValue: (row) => row.endDate ?? "" },
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
      { header: "Country", filterType: "set", render: (row) => row.country },
      { header: "Business Rule", filterType: "text", render: (row) => row.businessRule },
      { header: "Start Date", filterType: "date-range", filterValue: (row) => row.startDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.startDate) },
      { header: "End Date", filterType: "date-range", filterValue: (row) => row.endDate ?? "", initialWidth: 155, render: (row) => formatDisplayDate(row.endDate) },
      { header: "Item Unit Qty", filterType: "number-range", filterValue: (row) => row.itemUnitQty, className: "text-right font-mono", render: (row) => row.itemUnitQty },
      { header: "Max Qty", filterType: "number-range", filterValue: (row) => row.maxQty, className: "text-right font-mono", render: (row) => row.maxQty },
      { header: "Bundle Max Weight", filterType: "number-range", filterValue: (row) => row.bundleMaxWeight, className: "text-right font-mono", render: (row) => row.bundleMaxWeight },
      { header: "Product Category Iden", filterType: "text", render: (row) => row.productCategoryIden },
      { header: "Ship To Country", filterType: "set", render: (row) => row.shipToCountry },
      { header: "Ship To Country Iden", filterType: "text", render: (row) => row.shipToCountryIden },
      { header: "Rule SKU", filterType: "text", render: (row) => row.ruleSku },
      { header: "Notification Localization Key", filterType: "text", className: "max-w-xs", render: (row) => row.notificationLocalizationKey },
      { header: "General Supporting Data", filterType: "text", className: "max-w-xs", render: (row) => row.generalSupportingData },
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
      { header: "Country", filterType: "set", render: (row) => row.country },
      { header: "Warehouse", filterType: "set", render: (row) => row.warehouse },
      { header: "Bay Location", filterType: "text", render: (row) => row.bayLocation },
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
      { header: "Country", filterType: "set", render: (row) => row.country },
      { header: "Unit", filterType: "set", render: (row) => row.unit },
      { header: "Height", filterType: "number-range", filterValue: (row) => row.height, className: "text-right font-mono", render: (row) => row.height },
      { header: "Width", filterType: "number-range", filterValue: (row) => row.width, className: "text-right font-mono", render: (row) => row.width },
      { header: "Depth", filterType: "number-range", filterValue: (row) => row.depth, className: "text-right font-mono", render: (row) => row.depth },
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
      { header: "Country", filterType: "set", render: (row) => row.country },
      { header: "Weight Amount", filterType: "number-range", filterValue: (row) => row.weightAmount, className: "text-right font-mono", render: (row) => row.weightAmount },
      { header: "Weight Unit", filterType: "set", render: (row) => row.weightUnit },
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
      { header: "Country", filterType: "set", render: (row) => row.country },
      { header: "Warehouse", filterType: "set", render: (row) => row.warehouse },
      { header: "On Hand", filterType: "number-range", filterValue: (row) => row.onHand, className: "text-right font-mono", render: (row) => row.onHand.toLocaleString() },
      { header: "Pending", filterType: "number-range", filterValue: (row) => row.pending, className: "text-right font-mono", render: (row) => row.pending.toLocaleString() },
      { header: "Available", filterType: "number-range", filterValue: (row) => row.available, className: "text-right font-mono", render: (row) => row.available.toLocaleString() },
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
      { header: "Country", filterType: "set", render: (row) => row.country },
      { header: "EU Tariff Code", filterType: "text", render: (row) => row.euTariffCode },
      { header: "07 Standard Cost [EUR]", filterType: "number-range", filterValue: (row) => row.standardCostEur ?? 0, className: "text-right font-mono", render: (row) => row.standardCostEur != null ? currencyFormatter.format(row.standardCostEur) : "--" },
    ],
  },
};

export default function Page() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [skuInput, setSkuInput] = useState("117\n5048\n8321");
  const [rows, setRows] = useState<DashboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [missingSkus, setMissingSkus] = useState<string[]>([]);
  const [failedCountryFetches, setFailedCountryFetches] = useState<FailedCountryFetch[]>([]);
  const [softwareSystem, setSoftwareSystem] = useState("NorthAmerica");
  const [country, setCountry] = useState("");
  const [webOnly, setWebOnly] = useState(false);
  const [validationDate, setValidationDate] = useState<string>("");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const prefsRef = useRef<HTMLDivElement>(null);

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
  // isInitialized stays false until the read effect applies stored values, which
  // prevents the write effect from overwriting storage with defaults on first render.
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") { setIsInitialized(true); return; }
    try {
      const raw = window.localStorage.getItem("sku-prefs");
      if (raw) {
        const prefs = JSON.parse(raw);
        if (typeof prefs.skuInput === "string") setSkuInput(prefs.skuInput);
        if (typeof prefs.softwareSystem === "string") setSoftwareSystem(prefs.softwareSystem);
        if (typeof prefs.country === "string") setCountry(prefs.country);
        if (typeof prefs.webOnly === "boolean") setWebOnly(prefs.webOnly);
        if (typeof prefs.validationDate === "string") setValidationDate(prefs.validationDate);
        if (prefs.sectionVisibility && typeof prefs.sectionVisibility === "object") {
          setSectionVisibility((prev) => ({ ...prev, ...prefs.sectionVisibility }));
        }
      }
    } catch {
      // corrupted storage — ignore
    }
    try {
      const storedOrder = window.localStorage.getItem("sku-section-order");
      if (storedOrder) {
        const parsed = JSON.parse(storedOrder) as SectionKey[];
        const defaults = SECTION_ORDER.filter((k) => k !== "skuInfo") as SectionKey[];
        const merged = parsed.filter((k) => defaults.includes(k));
        defaults.forEach((k) => { if (!merged.includes(k)) merged.push(k); });
        setSectionOrder(merged);
      }
    } catch {
      // corrupted storage — ignore
    }
    setIsInitialized(true);
  }, []);

  // ── Persist preferences whenever they change ────────────────────────────────
  useEffect(() => {
    if (!isInitialized) return; // skip the initial render before stored values are loaded
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
  }, [isInitialized, skuInput, softwareSystem, country, webOnly, validationDate, sectionVisibility]);

  const countryOptions = useMemo(
    () => SYSTEM_COUNTRIES[softwareSystem as SoftwareSystem] ?? [],
    [softwareSystem]
  );

  useEffect(() => {
    if (country && !countryOptions.includes(country)) {
      setCountry("");
    }
  }, [country, countryOptions]);

  const skus = useMemo(() => parseSkus(skuInput), [skuInput]);
  const { rawSkuCount, duplicateSkuCount } = useMemo(() => {
    const entries = skuInput.split(/[\s,;]+/g).map((v) => v.trim()).filter(Boolean);
    const unique = new Set(entries).size;
    return { rawSkuCount: unique, duplicateSkuCount: entries.length - unique };
  }, [skuInput]);

  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(
    SECTION_ORDER.filter((k) => k !== "skuInfo") as SectionKey[]
  );

  const handleReorder = (newOrder: SectionKey[]) => {
    setSectionOrder(newOrder);
    window.localStorage.setItem("sku-section-order", JSON.stringify(newOrder));
  };

  const sectionList: AnySectionConfig[] = useMemo(
    () => (["skuInfo", ...sectionOrder] as SectionKey[]).map((key) => SECTION_CONFIGS[key]),
    [sectionOrder]
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
  const exportWarnings = useMemo<ExportWarning[]>(
    () =>
      failedCountryFetches.length
        ? [
            {
              title: "Failed country requests",
              details: failedCountryFetches.map(
                ({ country: failedCountry, status }) => `${failedCountry} (${status})`
              ),
            },
          ]
        : [],
    [failedCountryFetches]
  );

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
    if (isInitialized) window.localStorage.setItem("sku-theme", theme);
  }, [isInitialized, theme]);

  useEffect(() => {
    if (!prefsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (prefsRef.current && !prefsRef.current.contains(e.target as Node)) {
        setPrefsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [prefsOpen]);

  async function handleGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMissingSkus([]);
    setFailedCountryFetches([]);
    if (!skus.length) {
      setError("Enter at least one SKU to build the dashboard.");
      setRows(null);
      setLastGenerated(null);
      setMissingSkus([]);
      setFailedCountryFetches([]);
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
        let message = `HTTP ${res.status}`;
        try {
          const data = await res.json() as { error?: string };
          if (typeof data.error === "string") message = data.error;
        } catch { /* not JSON — fall back to status code */ }
        throw new Error(message);
      }
      const json = (await res.json()) as {
        rows: DashboardRow[];
        meta?: {
          failedCountries?: FailedCountryFetch[];
        };
      };
      const resultRows = json.rows ?? [];
      setFailedCountryFetches(json.meta?.failedCountries ?? []);
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
      setFailedCountryFetches([]);
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

  async function handleExportExcel() {
    if (!displayRows?.length) return;

    setError(null);
    setExporting(true);
    try {
      const exportSections = buildExportSections(displayRows, visibleSections);
      const exportContext: ExportContext = {
        softwareSystem,
        country,
        validationDate,
        webOnly,
        skus,
        visibleSections: visibleSections.map((section) => section.title),
        rowCount: displayRows.length,
        generatedAt: new Date(),
        warnings: exportWarnings,
        requestedBy: "",
      };

      await exportDashboardWorkbook(exportContext, exportSections);
    } catch (err: any) {
      setError(`Export failed: ${err?.message ?? err}`);
    } finally {
      setExporting(false);
    }
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
                alt="SKU Validation Dashboard logo"
                fill
                sizes="48px"
                className="rounded-xl object-contain"
                priority
              />
            </div>
            <div className="space-y-1">
              <h1 className={`text-3xl font-semibold sm:text-4xl ${isDark ? "text-white" : "text-slate-900"}`}>
                SKU Validation Dashboard
              </h1>
              <p className={`max-w-3xl text-base ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Search SKUs to validate product data.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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

            {/* Theme */}
            <div className={`flex flex-col items-center gap-1 border-l pl-4 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
              <div className="group relative inline-flex">
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
                    style={{ height: "auto" }}
                    priority
                  />
                </button>
                <div className={`pointer-events-none absolute top-full left-1/2 z-50 mt-2 w-48 -translate-x-1/2 rounded-xl border px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 ${
                  isDark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-700"
                }`}>
                  Switch between light and dark mode.
                  <div className={`absolute left-1/2 bottom-full -translate-x-1/2 border-4 border-transparent ${isDark ? "border-b-slate-700" : "border-b-slate-200"}`} />
                </div>
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Theme
              </span>
            </div>
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
              <div className="group relative inline-flex">
                <span
                  className={`inline-flex h-6 w-6 cursor-default items-center justify-center rounded-full border text-[11px] font-semibold ${
                    isDark
                      ? "border-slate-700 text-slate-200 hover:border-indigo-300 hover:text-indigo-200"
                      : "border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                  aria-label="SKU input help"
                  role="img"
                >
                  ?
                </span>
                <div className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl border px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 ${
                  isDark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-700"
                }`}>
                  Paste multiple SKUs separated by commas, spaces, or new lines.
                  <div className={`absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent ${isDark ? "border-t-slate-700" : "border-t-slate-200"}`} />
                </div>
              </div>
              {skus.length > 0 && (
                <span className={`text-xs ${rawSkuCount > 240 ? "text-amber-500" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {rawSkuCount > 240
                    ? `240 of ${rawSkuCount} SKUs (max 240 — extras ignored)`
                    : `${skus.length} SKU${skus.length === 1 ? "" : "s"} detected`}
                  {duplicateSkuCount > 0 && (
                    <span className="text-amber-500">
                      {" "}· {duplicateSkuCount} duplicate{duplicateSkuCount === 1 ? "" : "s"} removed
                    </span>
                  )}
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

          {/* ── Submit + Preferences gear ── */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Searching…" : "Search"}
              </button>

              {/* Preferences popover */}
              <div ref={prefsRef} className="relative">
                <button
                  type="button"
                  onClick={() => setPrefsOpen((p) => !p)}
                  aria-label="Preferences"
                  className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                    isDark
                      ? "border-slate-700 bg-slate-800 text-slate-300 hover:border-indigo-400 hover:text-indigo-200"
                      : "border-slate-200 bg-white text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  {(webOnly || validationDate) && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                </button>

                {prefsOpen && (
                  <div className={`absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border p-4 shadow-xl ${
                    isDark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-white text-slate-900"
                  }`}>
                    <p className={`mb-3 text-xs font-semibold uppercase tracking-widest ${isDark ? "text-slate-400" : "text-slate-500"}`}>Preferences</p>
                    <div className="space-y-4">
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
                            isDark ? "border-slate-600 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-900"
                          }`}
                        />
                      </div>
                      {/* Web Channels Only */}
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-300" : "text-slate-500"}`}>Channel Filter</span>
                        <label className={`inline-flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition hover:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400 ${
                          isDark ? "border-slate-600 bg-slate-900" : "border-slate-300 bg-white"
                        }`}>
                          <input type="checkbox" checked={webOnly} onChange={(e) => setWebOnly(e.target.checked)} className="h-4 w-4 accent-emerald-500" />
                          <span className={isDark ? "text-slate-100" : "text-slate-800"}>Web channels only</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

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

        {failedCountryFetches.length > 0 && (
          <p
            className={`mt-4 rounded-2xl border px-5 py-3 text-sm ${
              isDark
                ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            Some country requests failed and were skipped:{" "}
            <span className="font-semibold">
              {failedCountryFetches
                .map(({ country: failedCountry, status }) => `${failedCountry} (${status})`)
                .join(", ")}
            </span>
            .
          </p>
        )}

        <CombinedSectionsTable
          sections={visibleSections}
          allSections={sectionList}
          rows={displayRows ?? []}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          onExport={handleExportExcel}
          exporting={exporting}
          theme={theme}
          validationDate={validationDate}
          visibility={sectionVisibility}
          onToggleVisibility={toggleSectionVisibility}
          onShowAll={showAllSections}
          onHideAll={hideAllSections}
          onReorder={handleReorder}
        />
      </div>
    </main>
  );
}

// ── Filter helpers ─────────────────────────────────────────────────────────────

function matchesFilter(filter: ColumnFilter, rawVal: string | number): boolean {
  const str = String(rawVal ?? "");
  switch (filter.kind) {
    case "text":
      return !filter.value || str.toLowerCase().includes(filter.value.toLowerCase());
    case "date-range":
      if (!str) return true;
      if (filter.from && str < filter.from) return false;
      if (filter.to && str > filter.to) return false;
      return true;
    case "date-active":
      return true;
    case "set":
      return filter.values.has(str);
    case "number-range": {
      const num = Number(rawVal);
      if (filter.min !== "" && !Number.isNaN(Number(filter.min)) && num < Number(filter.min)) return false;
      if (filter.max !== "" && !Number.isNaN(Number(filter.max)) && num > Number(filter.max)) return false;
      return true;
    }
  }
}

function isDateWindowColumn(header: string) {
  return header === "Start Date" || header === "End Date";
}

function getActiveDateForSection(
  section: AnySectionConfig,
  activeFilters: Record<number, ColumnFilter>
): string | null {
  const orderedFilters = Object.entries(activeFilters)
    .map(([colIdx, filter]) => ({ colIdx: Number(colIdx), filter }))
    .sort((a, b) => a.colIdx - b.colIdx);

  for (const { colIdx, filter } of orderedFilters) {
    const column = section.columns[colIdx];
    if (filter.kind === "date-active" && filter.date && column && isDateWindowColumn(column.header)) {
      return filter.date;
    }
  }

  return null;
}

function renderDateActiveValue(
  value: ReactNode,
  row: unknown,
  columnHeader: string,
  activeDate: string | null
) {
  if (!activeDate || !isDateWindowColumn(columnHeader)) return value;
  const dateRow = row as { startDate?: string | null; endDate?: string | null };
  const active = isWindowValid(dateRow.startDate, dateRow.endDate, activeDate);
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 align-top leading-5">
      <span className="truncate">{value}</span>
      {renderCompactBooleanPill(active)}
    </span>
  );
}

function renderCompactBooleanPill(value: boolean) {
  return (
    <span
      className={`inline-flex h-4 min-w-8 flex-shrink-0 items-center justify-center rounded-full border px-1.5 text-[10px] font-semibold leading-none ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

function getStackedItemHeight(count: number) {
  if (count <= 0) return 0;
  return count * DETAIL_ITEM_HEIGHT + Math.max(0, count - 1) * DETAIL_ITEM_GAP;
}

function hasSectionRowsAbove(scrollTop: number, rowCount: number) {
  return rowCount > 0 && scrollTop > getStackedItemHeight(rowCount) + 8;
}

type FilterPopoverProps = {
  filterType: FilterKind;
  currentFilter: ColumnFilter | undefined;
  distinctValues?: string[];
  isDark: boolean;
  onFilterChange: (filter: ColumnFilter | null) => void;
  popoverRef: React.RefObject<HTMLDivElement | null>;
};

function FilterPopover({ filterType, currentFilter, distinctValues, isDark, onFilterChange, popoverRef }: FilterPopoverProps) {
  const bg = isDark
    ? "bg-slate-800 border-slate-700 text-slate-100 shadow-slate-950/60"
    : "bg-white border-slate-200 text-slate-900 shadow-slate-900/15";
  const inputClass = isDark
    ? "w-full rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    : "w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400";
  const clearBtn = "mt-2 block text-[10px] text-rose-400 hover:text-rose-300 transition-colors";

  const base = `rounded-xl border p-3 shadow-xl ${bg}`;

  if (filterType === "text") {
    const value = currentFilter?.kind === "text" ? currentFilter.value : "";
    return (
      <div ref={popoverRef} className={`${base} w-48`} onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">Contains</p>
        <input
          className={inputClass}
          placeholder="Filter text…"
          value={value}
          autoFocus
          onChange={(e) => onFilterChange(e.target.value ? { kind: "text", value: e.target.value } : null)}
        />
        {value && <button className={clearBtn} onClick={() => onFilterChange(null)}>Clear filter</button>}
      </div>
    );
  }

  if (filterType === "date-range") {
    return (
      <DateFilterPopover
        currentFilter={currentFilter}
        isDark={isDark}
        inputClass={inputClass}
        clearBtn={clearBtn}
        base={base}
        popoverRef={popoverRef}
        onFilterChange={onFilterChange}
      />
    );
  }

  if (filterType === "set") {
    // null active = no filter (all shown); empty Set = explicit deselect all (none shown)
    const active = currentFilter?.kind === "set" ? currentFilter.values : null;
    const vals = distinctValues ?? [];
    const allChecked = active === null;
    const noneChecked = active !== null && active.size === 0;
    const partialChecked = active !== null && active.size > 0;
    const indeterminate = partialChecked && active.size < vals.length;

    const handleSelectAll = () => {
      if (noneChecked) {
        onFilterChange(null); // none → all
      } else {
        onFilterChange({ kind: "set", values: new Set() }); // all or partial → none
      }
    };

    const toggle = (val: string) => {
      if (active === null) {
        // all were on — deselect just this one
        const next = new Set(vals.filter((v) => v !== val));
        onFilterChange(next.size === 0 ? { kind: "set", values: new Set() } : { kind: "set", values: next });
      } else {
        const next = new Set(active);
        next.has(val) ? next.delete(val) : next.add(val);
        // if all values are now checked, remove the filter entirely
        onFilterChange(next.size === vals.length ? null : { kind: "set", values: next });
      }
    };

    const rowClass = `flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`;
    return (
      <div ref={popoverRef} className={`${base} min-w-[160px] max-w-[260px]`} onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">Filter by value</p>
        <div className="max-h-52 overflow-y-auto space-y-0.5">
          <label className={rowClass}>
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = indeterminate; }}
              onChange={handleSelectAll}
            />
            <span className="text-xs font-semibold">{noneChecked ? "(Select all)" : "(Deselect all)"}</span>
          </label>
          {vals.map((val) => (
            <label key={val} className={rowClass}>
              <input
                type="checkbox"
                checked={active === null || active.has(val)}
                onChange={() => toggle(val)}
              />
              <span className="truncate text-xs">{val || "(blank)"}</span>
            </label>
          ))}
        </div>
        {!allChecked && <button className={clearBtn} onClick={() => onFilterChange(null)}>Clear filter</button>}
      </div>
    );
  }

  if (filterType === "number-range") {
    const min = currentFilter?.kind === "number-range" ? currentFilter.min : "";
    const max = currentFilter?.kind === "number-range" ? currentFilter.max : "";
    const update = (newMin: string, newMax: string) =>
      onFilterChange(newMin || newMax ? { kind: "number-range", min: newMin, max: newMax } : null);
    return (
      <div ref={popoverRef} className={`${base} w-44`} onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">Number range</p>
        <div className="space-y-2">
          <div>
            <label className="mb-0.5 block text-[10px] opacity-60">Min</label>
            <input type="number" className={inputClass} placeholder="Min…" value={min} onChange={(e) => update(e.target.value, max)} />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] opacity-60">Max</label>
            <input type="number" className={inputClass} placeholder="Max…" value={max} onChange={(e) => update(min, e.target.value)} />
          </div>
        </div>
        {(min || max) && <button className={clearBtn} onClick={() => onFilterChange(null)}>Clear filter</button>}
      </div>
    );
  }

  return null;
}

type DateFilterMode = "date-range" | "date-active";

type DateFilterPopoverProps = {
  currentFilter: ColumnFilter | undefined;
  isDark: boolean;
  inputClass: string;
  clearBtn: string;
  base: string;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  onFilterChange: (filter: ColumnFilter | null) => void;
};

function DateFilterPopover({
  currentFilter,
  isDark,
  inputClass,
  clearBtn,
  base,
  popoverRef,
  onFilterChange,
}: DateFilterPopoverProps) {
  const [mode, setMode] = useState<DateFilterMode>(
    currentFilter?.kind === "date-active" ? "date-active" : "date-range"
  );

  useEffect(() => {
    if (currentFilter?.kind === "date-active") setMode("date-active");
    if (currentFilter?.kind === "date-range") setMode("date-range");
  }, [currentFilter?.kind]);

  const from = currentFilter?.kind === "date-range" ? currentFilter.from : "";
  const to = currentFilter?.kind === "date-range" ? currentFilter.to : "";
  const activeDate = currentFilter?.kind === "date-active" ? currentFilter.date : "";
  const updateRange = (newFrom: string, newTo: string) =>
    onFilterChange(newFrom || newTo ? { kind: "date-range", from: newFrom, to: newTo } : null);
  const updateActiveDate = (date: string) =>
    onFilterChange(date ? { kind: "date-active", date } : null);
  const setFilterMode = (nextMode: DateFilterMode) => {
    setMode(nextMode);
    if (nextMode === "date-range" && currentFilter?.kind === "date-active") onFilterChange(null);
    if (nextMode === "date-active" && currentFilter?.kind === "date-range") onFilterChange(null);
  };

  const activeModeClass = isDark
    ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
    : "border-indigo-300 bg-indigo-50 text-indigo-700";
  const inactiveModeClass = isDark
    ? "border-slate-600 bg-slate-900 text-slate-300 hover:border-indigo-400"
    : "border-slate-300 bg-white text-slate-600 hover:border-indigo-300";

  return (
    <div ref={popoverRef} className={`${base} w-56`} onClick={(e) => e.stopPropagation()}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">Date filter</p>
      <div className="mb-3 grid grid-cols-2 gap-1">
        {(["date-range", "date-active"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
              mode === option ? activeModeClass : inactiveModeClass
            }`}
            onClick={() => setFilterMode(option)}
          >
            {option === "date-range" ? "Range" : "Active on"}
          </button>
        ))}
      </div>

      {mode === "date-range" ? (
        <div className="space-y-2">
          <div>
            <label className="mb-0.5 block text-[10px] opacity-60">On or after</label>
            <input type="date" className={inputClass} value={from} onChange={(e) => updateRange(e.target.value, to)} />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] opacity-60">On or before</label>
            <input type="date" className={inputClass} value={to} onChange={(e) => updateRange(from, e.target.value)} />
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-0.5 block text-[10px] opacity-60">Date within start/end</label>
          <input
            type="date"
            className={inputClass}
            value={activeDate}
            autoFocus
            onChange={(e) => updateActiveDate(e.target.value)}
          />
        </div>
      )}

      {((mode === "date-range" && (from || to)) || (mode === "date-active" && activeDate)) && (
        <button className={clearBtn} onClick={() => onFilterChange(null)}>Clear filter</button>
      )}
    </div>
  );
}

function CombinedSectionsTable({
  sections,
  allSections,
  rows,
  expandedSections,
  onToggleSection,
  onExpandAll,
  onCollapseAll,
  onExport,
  exporting,
  theme,
  validationDate,
  visibility,
  onToggleVisibility,
  onShowAll,
  onHideAll,
  onReorder,
}: CombinedTableProps) {
  const isDark = theme === "dark";
  const [chipsOpen, setChipsOpen] = useState(true);
  useEffect(() => {
    const stored = window.localStorage.getItem("sku-section-selection-open");
    if (stored !== null) setChipsOpen(stored === "true");
  }, []);
  const [tableStickyActive, setTableStickyActive] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [headerHeights, setHeaderHeights] = useState({ section: 44, column: 44 });
  const [resizing, setResizing] = useState<{ colId: string; startX: number; startWidth: number } | null>(null);
  const [skuSortDir, setSkuSortDir] = useState<"asc" | "desc" | null>(null);
  const [sortState, setSortState] = useState<SectionSortState>({});
  const [filterState, setFilterState] = useState<SectionFilterState>({});
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [openFilterColId, setOpenFilterColId] = useState<string | null>(null);
  const [filterButtonRect, setFilterButtonRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<SectionKey[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const chipSections = useMemo(
    () => allSections.filter((s) => s.key !== "skuInfo"),
    [allSections]
  );

  function enterReorderMode() {
    setPendingOrder(chipSections.map((s) => s.key));
    setReorderMode(true);
    if (!chipsOpen) {
      setChipsOpen(true);
      window.localStorage.setItem("sku-section-selection-open", "true");
    }
  }

  function saveReorder() {
    onReorder(pendingOrder);
    setReorderMode(false);
  }

  function cancelReorder() {
    setReorderMode(false);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== i) setDragOverIndex(i);
  }

  function handleDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...pendingOrder];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    setPendingOrder(next);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  const distinctValuesByCol = useMemo(() => {
    const result: Record<string, Record<number, string[]>> = {};
    for (const row of rows) {
      for (const section of sections) {
        const data = (row as Record<string, unknown>)[section.key];
        if (!Array.isArray(data)) continue;
        for (const item of data) {
          section.columns.forEach((col, colIdx) => {
            if (col.filterType !== "set") return;
            const val = col.filterValue
              ? String(col.filterValue(item as never))
              : getTextFromReactNode(col.render(item as never));
            if (!result[section.key]) result[section.key] = {};
            if (!result[section.key][colIdx]) result[section.key][colIdx] = [];
            if (!result[section.key][colIdx].includes(val)) result[section.key][colIdx].push(val);
          });
        }
      }
    }
    return result;
  }, [rows, sections]);

  useEffect(() => {
    if (!openFilterColId) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenFilterColId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openFilterColId]);

  function setColumnFilter(sectionKey: string, colIndex: number, filter: ColumnFilter | null) {
    setFilterState((prev) => {
      const section = { ...(prev[sectionKey] ?? {}) };
      if (filter?.kind === "date-active") {
        const sectionConfig = sections.find((s) => s.key === sectionKey);
        sectionConfig?.columns.forEach((column, index) => {
          if (index !== colIndex && isDateWindowColumn(column.header) && section[index]?.kind === "date-active") {
            delete section[index];
          }
        });
      }
      if (filter === null) delete section[colIndex];
      else section[colIndex] = filter;
      return { ...prev, [sectionKey]: section };
    });
  }

  function handleColumnSort(sectionKey: SectionKey, colIndex: number, shiftKey: boolean) {
    setSortState((prev) => {
      const current = prev[sectionKey] ?? [];
      const existingIdx = current.findIndex((e) => e.colIndex === colIndex);

      if (shiftKey) {
        // Shift+click: append, toggle, or remove from multi-sort
        if (existingIdx === -1) {
          return { ...prev, [sectionKey]: [...current, { colIndex, dir: "asc" }] };
        }
        const entry = current[existingIdx];
        if (entry.dir === "asc") {
          const updated = [...current];
          updated[existingIdx] = { colIndex, dir: "desc" };
          return { ...prev, [sectionKey]: updated };
        }
        // desc → remove
        const updated = current.filter((_, i) => i !== existingIdx);
        return { ...prev, [sectionKey]: updated };
      } else {
        // Plain click: single-sort cycle asc → desc → clear
        if (existingIdx === -1 || current.length > 1) {
          return { ...prev, [sectionKey]: [{ colIndex, dir: "asc" }] };
        }
        const entry = current[0];
        if (entry.dir === "asc") return { ...prev, [sectionKey]: [{ colIndex, dir: "desc" }] };
        return { ...prev, [sectionKey]: [] };
      }
    });
  }
  const sortedRows = useMemo(() => {
    if (!skuSortDir) return rows;
    return [...rows].sort((a, b) => {
      const aVal = isNaN(Number(a.sku)) ? a.sku : Number(a.sku);
      const bVal = isNaN(Number(b.sku)) ? b.sku : Number(b.sku);
      if (aVal < bVal) return skuSortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return skuSortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, skuSortDir]);

  function jumpToSection(key: SectionKey) {
    const th = document.getElementById(`section-col-${key}`);
    const wrapper = tableWrapperRef.current;
    if (!th || !wrapper) return;
    const thRect = th.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    wrapper.scrollTo({ left: wrapper.scrollLeft + thRect.left - wrapperRect.left - SUMMARY_COLUMN_WIDTH, behavior: "smooth" });
  }

  function scrollToSkuRow(rowIndex: number) {
    const wrapper = tableWrapperRef.current;
    const rowEl = wrapper?.querySelector<HTMLElement>(`[data-sku-row-index="${rowIndex}"]`);
    if (!wrapper || !rowEl) return;
    const stickyHeaderHeight = headerHeights.section + headerHeights.column;
    wrapper.scrollTo({
      top: Math.max(0, rowEl.offsetTop - stickyHeaderHeight),
      behavior: "smooth",
    });
  }

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

  // Pre-compute which items fail validation per section per SKU row.
  const failingItemsByRow = useMemo(() => {
    const result = new Map<number, Map<SectionKey, { hasEmptyFailure: boolean; failingItems: Set<unknown> }>>();
    if (!validationDate) return result;
    rows.forEach((row, rowIndex) => {
      const sectionMap = new Map<SectionKey, { hasEmptyFailure: boolean; failingItems: Set<unknown> }>();
      (Object.keys(VALIDATION_RULES) as SectionKey[]).forEach((sectionKey) => {
        const rule = VALIDATION_RULES[sectionKey];
        if (!rule) return;
        const data = row[sectionKey];
        if (!Array.isArray(data)) return;
        const failingItems = new Set<unknown>();
        let hasEmptyFailure = false;
        if ((data as unknown[]).length === 0) {
          if (!rule.allowEmpty || !rule.allowEmpty(row)) {
            hasEmptyFailure = true;
          }
        } else {
          (data as unknown[]).forEach((item) => {
            if (!rule.passes(item, validationDate)) failingItems.add(item);
          });
        }
        if (hasEmptyFailure || failingItems.size > 0) {
          sectionMap.set(sectionKey, { hasEmptyFailure, failingItems });
        }
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
      {/* ── Row 1: heading left, action buttons right ── */}
      <div className="flex items-center justify-between gap-4">
        {/* Product Details collapse toggle + tooltip */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !chipsOpen;
              setChipsOpen(next);
              window.localStorage.setItem("sku-section-selection-open", String(next));
            }}
            className={`flex items-center gap-1.5 text-sm font-semibold ${isDark ? "text-slate-100 hover:text-white" : "text-slate-900 hover:text-slate-700"}`}
          >
            Product Details
            <svg className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${chipsOpen ? "rotate-180" : "rotate-0"}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="group relative inline-flex">
            <span className={`inline-flex h-6 w-6 cursor-default items-center justify-center rounded-full border text-[11px] font-semibold ${isDark ? "border-slate-700 text-slate-200 hover:border-indigo-300 hover:text-indigo-200" : "border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600"}`} aria-label="Tips" role="img">?</span>
            <div className={`pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 ${isDark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-700"}`}>
              <p className="mb-1">Toggle section chips on/off to show or hide columns. Click the crosshair icon — or Shift+click the chip — to jump to that section in the table.</p>
              <p>Click a section header to expand its rows, then drag column edges to resize.</p>
              <div className={`absolute left-2 top-full border-4 border-transparent ${isDark ? "border-t-slate-700" : "border-t-slate-200"}`} />
            </div>
          </div>
        </div>

        {/* Action buttons — always right-aligned */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {reorderMode ? (
            <>
              <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Drag to reorder sections</span>
              <div className={`flex items-center gap-1.5 border-l pl-2.5 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                <button type="button" onClick={saveReorder} className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${isDark ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400 hover:text-emerald-50" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:text-emerald-900"}`}>Save order</button>
                <button type="button" onClick={cancelReorder} className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${isDark ? "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-slate-100" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"}`}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              {/* Section visibility controls (only when chips are visible) */}
              {chipsOpen && (
                <div className={`flex items-center gap-1.5 border-r pr-2.5 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <button type="button" onClick={onShowAll} className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${isDark ? "border-slate-700 bg-slate-800 text-slate-100 hover:border-indigo-300 hover:text-indigo-200" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:text-indigo-600"}`}>Show all</button>
                  <button type="button" onClick={onHideAll} className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${isDark ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-indigo-300 hover:text-indigo-200" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600"}`}>Hide all</button>
                </div>
              )}

              {/* Reorder edit button */}
              {chipsOpen && (
                <div className={`flex items-center border-r pr-2.5 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <button type="button" onClick={enterReorderMode} className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${isDark ? "border-slate-700 bg-slate-800 text-slate-100 hover:border-indigo-300 hover:text-indigo-200" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:text-indigo-600"}`}>Edit order</button>
                </div>
              )}

              {/* Table expand/collapse */}
              <div className={`flex items-center gap-1.5 border-r pr-2.5 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                <button type="button" onClick={onExpandAll} className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${isDark ? "border-slate-700 bg-slate-800 text-slate-100 hover:border-indigo-300 hover:text-indigo-200" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:text-indigo-600"}`}>Expand all</button>
                <button type="button" onClick={onCollapseAll} className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${isDark ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-indigo-300 hover:text-indigo-200" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600"}`}>Collapse all</button>
              </div>

              {/* Export */}
              <button type="button" onClick={() => void onExport()} disabled={!hasData || exporting} className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${isDark ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400 hover:text-emerald-50" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:text-emerald-900"} disabled:cursor-not-allowed disabled:opacity-60`}>{exporting ? "Preparing…" : "Export Excel"}</button>

              {/* Conditional reset buttons */}
              {Object.values(sortState).some((s) => s.length > 0) && (
                <button type="button" onClick={() => setSortState({})} className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${isDark ? "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:border-amber-400 hover:text-amber-50" : "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:text-amber-900"}`}>Reset Sort</button>
              )}
              {Object.values(filterState).some((s) => Object.keys(s).length > 0) && (
                <button type="button" onClick={() => { setFilterState({}); setOpenFilterColId(null); setFilterButtonRect(null); }} className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${isDark ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-100 hover:border-indigo-400 hover:text-indigo-50" : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:text-indigo-900"}`}>Reset Filters</button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Row 2: collapsible section chips ── */}
      {chipsOpen && (
        <div className={`mt-3 flex flex-wrap gap-2 border-t pt-3 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
          {(reorderMode ? pendingOrder.map((key) => allSections.find((s) => s.key === key)!).filter(Boolean) : chipSections).map((section, i) => {
            const enabled = visibility[section.key];
            const isDragOver = reorderMode && dragOverIndex === i;
            const isDragging = reorderMode && dragIndex === i;
            return (
              <div
                key={`vis-${section.key}`}
                draggable={reorderMode}
                onDragStart={reorderMode ? (e) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; } : undefined}
                onDragOver={reorderMode ? (e) => handleDragOver(e, i) : undefined}
                onDragLeave={reorderMode ? () => setDragOverIndex(null) : undefined}
                onDrop={reorderMode ? (e) => handleDrop(e, i) : undefined}
                onDragEnd={reorderMode ? () => { setDragIndex(null); setDragOverIndex(null); } : undefined}
                className={`inline-flex items-stretch rounded-full border text-xs font-semibold transition ${
                  reorderMode
                    ? isDragging
                      ? "opacity-40 cursor-grabbing"
                      : isDragOver
                        ? isDark ? "border-indigo-400 bg-indigo-200 text-indigo-900 scale-105" : "border-indigo-500 bg-indigo-100 text-indigo-900 scale-105"
                        : isDark ? "border-slate-500 bg-slate-700 text-slate-100 cursor-grab" : "border-slate-300 bg-slate-100 text-slate-700 cursor-grab"
                    : enabled
                      ? isDark
                        ? "border-indigo-300 bg-indigo-100 text-indigo-900 shadow-sm shadow-indigo-900/40"
                        : "border-indigo-300 bg-indigo-100 text-indigo-900 shadow-sm shadow-indigo-200/70"
                      : isDark
                        ? "border-slate-600 bg-slate-800 text-slate-300 opacity-80 hover:opacity-100 hover:border-slate-500"
                        : "border-slate-300 bg-slate-50 text-slate-500 opacity-80 hover:opacity-100 hover:border-slate-400"
                }`}
              >
                {reorderMode ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 select-none">
                    {/* Grip handle */}
                    <svg className="h-3 w-3 flex-shrink-0 opacity-50" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
                      <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
                      <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
                    </svg>
                    {section.title}
                  </span>
                ) : (
                  <>
                    {/* Toggle side — Shift+click jumps to section when ON */}
                    <button
                      type="button"
                      aria-pressed={enabled}
                      onClick={(e) => {
                        if (enabled && e.shiftKey) {
                          jumpToSection(section.key);
                        } else {
                          onToggleVisibility(section.key);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 transition ${
                        enabled ? "rounded-l-full hover:bg-indigo-200/60" : "rounded-full"
                      }`}
                    >
                      <span className={`flex items-center gap-0.5 rounded-full border px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-widest ${
                        enabled
                          ? "border-indigo-400 bg-indigo-600 text-white"
                          : isDark ? "border-slate-600 bg-slate-700 text-slate-400" : "border-slate-300 bg-slate-100 text-slate-400"
                      }`}>
                        {enabled
                          ? <><svg className="h-2 w-2" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>On</>
                          : <><svg className="h-2 w-2" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Off</>
                        }
                      </span>
                      <span>{section.title}</span>
                    </button>

                    {/* Jump side — only for enabled sections */}
                    {enabled && (
                      <>
                        <span className={`w-px self-stretch ${isDark ? "bg-indigo-300/40" : "bg-indigo-300/60"}`} />
                        <button
                          type="button"
                          aria-label={`Jump to ${section.title}`}
                          onClick={() => jumpToSection(section.key)}
                          className={`inline-flex items-center justify-center rounded-r-full px-2.5 py-1.5 transition ${
                            isDark
                              ? "text-indigo-700 hover:bg-indigo-200/60 hover:text-indigo-900"
                              : "text-indigo-400 hover:bg-indigo-200/60 hover:text-indigo-700"
                          }`}
                        >
                          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="8" cy="8" r="3"/>
                            <line x1="8" y1="1" x2="8" y2="4"/>
                            <line x1="8" y1="12" x2="8" y2="15"/>
                            <line x1="1" y1="8" x2="4" y2="8"/>
                            <line x1="12" y1="8" x2="15" y2="8"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}


      <div
        ref={tableWrapperRef}
        className={`table-scroll-wrapper rounded-2xl border ${tableStickyActive ? "sticky-fixed" : ""} ${isDark ? "border-slate-800 bg-white/5" : "border-slate-200 bg-transparent"}`}
        onScroll={(e) => setTableScrollTop(e.currentTarget.scrollTop)}
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
                    id={`section-col-${section.key}`}
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
                      className={`px-3 py-1.5 cursor-pointer group`}
                      style={{
                        ...summaryCellStyle(expanded, accent, isSticky, isDark, isSticky ? 0 : undefined),
                        position: "sticky",
                        top: headerHeights.section,
                        zIndex: isSticky ? 210 : 55,
                        backgroundColor: expanded ? accent : (isDark ? "#0b1221" : "#f8fafc"),
                        borderRight: isLast ? undefined : `1px solid ${separator}`,
                      }}
                      onClick={isSticky
                        ? () => setSkuSortDir((d) => d === null ? "asc" : d === "asc" ? "desc" : null)
                        : () => onToggleSection(section.key)}
                    >
                      <span
                        className={`inline-flex w-full items-center gap-1 text-left font-semibold uppercase tracking-wide ${isDark ? "text-slate-50" : "text-slate-900"} transition-opacity duration-200 ${
                          expanded ? "opacity-0" : "opacity-100"
                        }`}
                      >
                        {isSticky ? (
                          <>
                            SKU
                            <span className="text-[10px] font-bold">
                              {skuSortDir === "asc" ? "↑" : skuSortDir === "desc" ? "↓" : <span className="opacity-25 transition-opacity duration-150 group-hover:opacity-70">↕</span>}
                            </span>
                          </>
                        ) : "Summary"}
                      </span>
                    </th>
                    {section.columns.map((column, columnIndex) => {
                      const stickyLeft = isSticky && columnIndex === 0 ? SUMMARY_COLUMN_WIDTH : undefined;
                      const colId = `${section.key}-${columnIndex}`;
                      const colWidth = columnWidths[colId] ?? DETAIL_COLUMN_WIDTH;
                      const headerBackground = isSticky ? accent : accent;
                      const sectionSort = sortState[section.key] ?? [];
                      const sortEntry = sectionSort.find((e) => e.colIndex === columnIndex);
                      const sortPriority = sectionSort.findIndex((e) => e.colIndex === columnIndex);
                      const isFiltered = !!(filterState[section.key] ?? {})[columnIndex];
                      return (
                        <th
                          key={`header-${section.key}-${column.header}`}
                          className={`px-3 py-1.5 ${column.className ?? ""} relative group ${expanded ? "cursor-pointer select-none" : ""}`}
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
                          onClick={expanded ? (e) => handleColumnSort(section.key, columnIndex, e.shiftKey) : undefined}
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
                            className={`inline-flex w-full items-center gap-1 text-left font-semibold ${isDark ? "text-slate-50" : "text-slate-900"} transition-opacity duration-200 ${
                              expanded ? "opacity-100" : "opacity-0"
                            }`}
                          >
                            <span className="flex-1 inline-flex min-w-0 items-center gap-1 truncate">
                              <span className="truncate">{column.header}</span>
                              {sortEntry && (
                                <span className="inline-flex flex-shrink-0 items-center gap-0.5 text-[10px] font-bold">
                                  {sectionSort.length > 1 && (
                                    <span className={`rounded-full px-1 py-px ${isDark ? "bg-white/20" : "bg-black/10"}`}>
                                      {sortPriority + 1}
                                    </span>
                                  )}
                                  {sortEntry.dir === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                              {!sortEntry && expanded && (
                                <span className="flex-shrink-0 text-[10px] opacity-25 transition-opacity duration-150 group-hover:opacity-70">↕</span>
                              )}
                            </span>
                            {column.filterType && expanded && (
                              <button
                                title="Filter column"
                                className={`flex-shrink-0 rounded p-0.5 transition-opacity ${
                                  isFiltered
                                    ? "opacity-100 text-indigo-300"
                                    : "opacity-35 hover:opacity-100"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (openFilterColId === colId) {
                                    setOpenFilterColId(null);
                                    setFilterButtonRect(null);
                                  } else {
                                    setOpenFilterColId(colId);
                                    setFilterButtonRect((e.currentTarget as HTMLElement).getBoundingClientRect());
                                  }
                                }}
                              >
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                                  <path d="M1 1.5h10l-4 4.5V11L5 10V6L1 1.5z" />
                                </svg>
                              </button>
                            )}
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
              sortedRows.map((row, rowIndex) => {
                const isEvenSkuRow = rowIndex % 2 === 0;
                const rowTint = isDark
                  ? isEvenSkuRow ? "rgba(255,255,255,0.0)" : "rgba(255,255,255,0.04)"
                  : isEvenSkuRow ? "rgba(0,0,0,0.0)" : "rgba(0,0,0,0.04)";
                return (
                <tr
                  key={`row-${row.sku}-${rowIndex}`}
                  data-sku-row-index={rowIndex}
                  className={isDark ? "text-slate-100 hover:bg-slate-800" : "text-slate-900 hover:bg-slate-50"}
                >
                  {sections.flatMap((section, sectionIndex) => {
                    const isSticky = section.key === "skuInfo";
                    const expanded = isSticky ? false : expandedSections[section.key];
                    const data = row[section.key];
                    const accent = SECTION_ACCENTS[section.key];
                    const isLast = sectionIndex === sections.length - 1;
                    const separator = isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(148, 163, 184, 0.35)";
                    const failingState = failingItemsByRow.get(rowIndex)?.get(section.key);
                    const failingCount = validationDate
                      ? ((failingState?.failingItems.size ?? 0) + (failingState?.hasEmptyFailure ? 1 : 0))
                      : 0;

                    // Apply column filters then multi-column sort to this section's data
                    const sectionSort = sortState[section.key] ?? [];
                    const rawArr = Array.isArray(data) ? (data as unknown[]) : [];
                    const activeFilters = filterState[section.key] ?? {};
                    const activeDateForSection = getActiveDateForSection(section, activeFilters);
                    const filteredArr = Object.keys(activeFilters).length === 0 ? rawArr : rawArr.filter((item) =>
                      Object.entries(activeFilters).every(([colIdxStr, filter]) => {
                        const col = section.columns[Number(colIdxStr)] as ColumnDescriptor<typeof section.key> | undefined;
                        if (!col) return true;
                        const rawVal = col.filterValue
                          ? col.filterValue(item as never)
                          : getTextFromReactNode(col.render(item as never));
                        return matchesFilter(filter, rawVal);
                      })
                    );
                    const sortedArr = sectionSort.length === 0 ? filteredArr : [...filteredArr].sort((a, b) => {
                      for (const { colIndex, dir } of sectionSort) {
                        const col = section.columns[colIndex] as ColumnDescriptor<typeof section.key>;
                        const aVal = col.sortValue
                          ? col.sortValue(a as never)
                          : getTextFromReactNode(col.render(a as never));
                        const bVal = col.sortValue
                          ? col.sortValue(b as never)
                          : getTextFromReactNode(col.render(b as never));
                        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                        if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
                      }
                      return 0;
                    });
                    return [
                      <td
                        key={`cell-${rowIndex}-${section.key}-summary`}
                        className={`px-3 py-2 align-top ${isSticky ? "" : "cursor-pointer select-none"} ${isDark ? "text-slate-100" : "text-slate-900"}`}
                        style={{
                          ...summaryCellStyle(expanded, accent, isSticky, isDark, isSticky ? 0 : undefined),
                          backgroundColor: isSticky
                            ? (isDark ? "#0f172a" : "#f8fafc")
                            : `color-mix(in srgb, ${expanded ? `${accent}22` : `${accent}12`} 100%, ${rowTint})`,
                          borderTop: rowIndex === 0 ? "none" : isDark ? "1px solid rgb(71 85 105 / 0.6)" : "1px solid rgb(148 163 184 / 0.5)",
                          borderRight: isLast ? undefined : `1px solid ${separator}`,
                          ...(isSticky
                            ? {
                                position: "sticky",
                                left: 0,
                                zIndex: 80,
                                overflow: "visible",
                              }
                            : {}),
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
                          style={
                            isSticky
                              ? {
                                  position: "sticky",
                                  top: headerHeights.section + headerHeights.column,
                                  zIndex: 85,
                                  paddingTop: "0.125rem",
                                  paddingBottom: "0.125rem",
                                  backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                                }
                              : undefined
                          }
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
                        const arr = sortedArr;
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
                              position: "relative",
                            }}
                            data-colid={`${section.key}-${columnIndex}`}
                          >
                            {expanded && (
                              <div
                                className="column-resizer"
                                role="separator"
                                aria-orientation="horizontal"
                                onMouseDown={startColumnResize(`${section.key}-${columnIndex}`)}
                                onDoubleClick={() => autoFitColumn(`${section.key}-${columnIndex}`)}
                              />
                            )}
                            <div
                              className={`space-y-1 transition-opacity duration-200 ${
                                expanded ? "opacity-100" : "opacity-0"
                              }`}
                              aria-hidden={!expanded}
                              style={{
                                maxHeight: expanded ? "none" : "0px",
                                overflow: expanded ? "visible" : "hidden",
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
                                <>
                                  {arr.map((item, idx) => {
                                    const isEvenRow = idx % 2 === 0;
                                    const itemBg = isDark ? (isEvenRow ? `${accent}25` : `${accent}15`) : (isEvenRow ? `${accent}20` : `${accent}10`);
                                    const itemBorder = `1px solid ${isEvenRow ? `${accent}40` : `${accent}22`}`;
                                    const renderedValue = renderDateActiveValue(
                                      column.render(item as never),
                                      item,
                                      column.header,
                                      activeDateForSection
                                    );
                                    const rule = VALIDATION_RULES[section.key];
                                    const itemFails =
                                      !!validationDate &&
                                      !!rule &&
                                      (failingItemsByRow.get(rowIndex)?.get(section.key)?.failingItems.has(item) ?? false);
                                    const columnRelevant =
                                      !!validationDate &&
                                      !!rule &&
                                      (rule.highlightColumns.length === 0 || rule.highlightColumns.includes(column.header));
                                    const columnHighlighted = itemFails && columnRelevant;
                                    const columnPasses = !itemFails && columnRelevant;
                                    return (
                                      <div
                                        key={`${section.key}-${rowIndex}-${idx}`}
                                        className="h-[37px] px-3 py-2"
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
                                        <div className="min-h-5 truncate leading-5">
                                          {renderDetailValue(renderedValue, isDark)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {expanded && columnIndex === 0 && hasSectionRowsAbove(tableScrollTop, arr.length) && (
                                    <button
                                      type="button"
                                      onClick={() => scrollToSkuRow(rowIndex)}
                                      className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm transition hover:brightness-110 ${
                                        isDark
                                          ? "border-slate-600 bg-slate-950/90 text-slate-100 shadow-slate-950/40"
                                          : "border-slate-300 bg-white/95 text-slate-700 shadow-slate-200/80"
                                      }`}
                                      style={{
                                        position: "sticky",
                                        top: headerHeights.section + headerHeights.column + 8,
                                        zIndex: 35,
                                      }}
                                      title={`Scroll up to ${section.title} rows`}
                                    >
                                      <span aria-hidden="true">↑</span>
                                      <span className="truncate">{section.title} rows are above</span>
                                    </button>
                                  )}
                                </>
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

      {/* Fixed-position filter popover — rendered outside the overflow scroll container */}
      {openFilterColId && filterButtonRect && (() => {
        const lastDash = openFilterColId.lastIndexOf("-");
        const sectionKey = openFilterColId.slice(0, lastDash);
        const colIdx = Number(openFilterColId.slice(lastDash + 1));
        const section = sections.find((s) => s.key === sectionKey);
        const col = section?.columns[colIdx];
        if (!section || !col || !col.filterType) return null;
        return (
          <div
            style={{
              position: "fixed",
              top: filterButtonRect.bottom + 4,
              left: Math.min(filterButtonRect.left, window.innerWidth - 300),
              zIndex: 9999,
            }}
          >
            <FilterPopover
              filterType={col.filterType}
              currentFilter={(filterState[sectionKey] ?? {})[colIdx]}
              distinctValues={distinctValuesByCol[sectionKey]?.[colIdx]}
              isDark={isDark}
              onFilterChange={(f) => setColumnFilter(sectionKey, colIdx, f)}
              popoverRef={popoverRef}
            />
          </div>
        );
      })()}
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

function summaryCellStyle(expanded: boolean, accent: string, sticky = false, isDark = false, stickyLeft?: number) {
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
          ...(typeof stickyLeft === "number" ? { left: stickyLeft } : {}),
          zIndex: 90,
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

function getTextFromReactNode(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getTextFromReactNode).join("");
  if (typeof node === "object" && "props" in node && (node as any)?.props?.children) {
    return getTextFromReactNode((node as any).props.children);
  }
  return "";
}

function renderDetailValue(value: ReactNode, isDark: boolean) {
  const normalizedText = getTextFromReactNode(value).trim();
  if (!normalizedText) {
    return <span className={isDark ? "text-slate-400" : "text-slate-500"}>--</span>;
  }
  return value;
}

function toExportCellValue(value: ReactNode): ExportCellValue {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return getTextFromReactNode(value);
}

function toExcelColumnWidth(column: { header: string; initialWidth?: number }) {
  const headerWidth = column.header.trim().length + 2;
  const pixelWidth = column.initialWidth ? Math.ceil(column.initialWidth / 8) : 0;
  return Math.min(Math.max(headerWidth, pixelWidth, 10), 80);
}

function buildExportSections(
  rows: DashboardRow[],
  sections: AnySectionConfig[]
): ExportWorkbookSection[] {
  // Build SKU → English product name lookup for use across all sheets
  const productNames = new Map<string, string>();
  rows.forEach((row) => {
    const englishDesc = row.description.find((d) => d.language === "English");
    if (englishDesc?.productName) productNames.set(row.sku, englishDesc.productName);
  });

  return sections.map((section) => {
    const isSkuInfo = section.key === "skuInfo";
    const isDescription = section.key === "description";
    const addProductName = !isDescription;

    const sectionDataColumns = section.columns.map((column) => ({
      header: column.header,
      width: toExcelColumnWidth(column),
    }));

    const sectionColumns: ExportColumn[] = isSkuInfo
      ? [{ header: "SKU", width: 16 }, { header: "Product Name", width: 40 }]
      : addProductName
        ? [{ header: "SKU", width: 16 }, { header: "Product Name", width: 40 }, ...sectionDataColumns]
        : [{ header: "SKU", width: 16 }, ...sectionDataColumns];

    const sectionRows: ExportCellValue[][] = [];

    if (isSkuInfo) {
      rows.forEach((row) => {
        sectionRows.push([row.sku, productNames.get(row.sku) ?? ""]);
      });
    } else {
      rows.forEach((row) => {
        const productName = productNames.get(row.sku) ?? "";
        const sectionData = Array.isArray(row[section.key]) ? (row[section.key] as any[]) : [];
        sectionData.forEach((item) => {
          const dataCells = section.columns.map((column) => {
            try { return toExportCellValue(column.render(item as never)); } catch { return ""; }
          });
          sectionRows.push(
            isDescription
              ? [row.sku, ...dataCells]
              : [row.sku, productName, ...dataCells]
          );
        });
      });
    }

    return {
      key: section.key,
      title: section.title,
      columns: sectionColumns,
      rows: sectionRows,
      emptyMessage: "No data for current query.",
    };
  });
}

function parseSkus(input: string): string[] {
  const values = input
    .split(/[\s,;]+/g)
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(values));
  return unique.slice(0, 240);
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

function renderBooleanPill(value?: boolean | null) {
  const label = formatBoolean(value);
  if (label === "--") return label;

  const isYes = value === true;
  return (
    <span
      className={`inline-flex h-5 min-w-12 items-center justify-center rounded-full border px-2.5 text-xs font-semibold leading-none ${
        isYes
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {label}
    </span>
  );
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
