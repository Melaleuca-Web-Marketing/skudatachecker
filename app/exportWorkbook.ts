export type ExportCellValue = string | number | boolean | null;

export type ExportColumn = {
  header: string;
  width?: number;
};

export type ExportWorkbookSection = {
  key: string;
  title: string;
  columns: ExportColumn[];
  rows: ExportCellValue[][];
  emptyMessage?: string;
};

export type ExportWarning = {
  title: string;
  details: string[];
};

export type ExportContext = {
  softwareSystem: string;
  country: string;
  validationDate: string;
  webOnly: boolean;
  skus: string[];
  visibleSections: string[];
  rowCount: number;
  generatedAt: Date;
  warnings: ExportWarning[];
  requestedBy?: string | null;
};

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const EXPORT_CREATOR = "SKU Data Checker";
// Preserve the visible text while ensuring formula-like values remain inert.
const FORMULA_GUARD_PREFIX = "\u200B";

type ExportWorkbookBuffer = ArrayBuffer | Uint8Array;

type WorksheetLike = {
  views: Array<{ state: string; ySplit: number }>;
  columns: Array<{ width: number }>;
  addRow: (values: unknown[]) => WorksheetRowLike;
  addTable: (config: {
    name: string;
    ref: string;
    headerRow: boolean;
    totalsRow: boolean;
    style: { theme: string; showRowStripes: boolean };
    columns: Array<{ name: string; filterButton: boolean }>;
    rows: Array<Array<string | number | boolean>>;
  }) => void;
  getColumn: (index: number) => { width: number };
  getRow: (index: number) => WorksheetRowLike;
};

type WorksheetCellLike = {
  value?: unknown;
  fill?: unknown;
  border?: unknown;
  font?: unknown;
  alignment?: unknown;
};

type WorksheetRowLike = {
  font?: unknown;
  alignment?: unknown;
  eachCell: (callback: (cell: WorksheetCellLike) => void) => void;
  getCell: (index: number) => WorksheetCellLike;
};

type WorkbookLike = {
  creator: string;
  lastModifiedBy: string;
  created: Date;
  modified: Date;
  addWorksheet: (name: string) => WorksheetLike;
  xlsx: {
    writeBuffer: () => Promise<ExportWorkbookBuffer>;
  };
};

export async function exportDashboardWorkbook(
  context: ExportContext,
  sections: ExportWorkbookSection[]
) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook() as WorkbookLike;
  workbook.creator = EXPORT_CREATOR;
  workbook.lastModifiedBy = context.requestedBy?.trim() || EXPORT_CREATOR;
  workbook.created = context.generatedAt;
  workbook.modified = context.generatedAt;

  const usedSheetNames = new Set<string>();
  const usedTableNames = new Set<string>();

  sections.forEach((section) =>
    addSectionSheet(workbook, section, usedSheetNames, usedTableNames)
  );
  addInfoSheet(workbook, context, usedSheetNames);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbook(buffer, buildFileName(context));
}

function addInfoSheet(
  workbook: WorkbookLike,
  context: ExportContext,
  usedSheetNames: Set<string>
) {
  const worksheet = workbook.addWorksheet(
    createUniqueSheetName("Info", usedSheetNames)
  );
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.columns = [{ width: 24 }, { width: 96 }];

  const requestedBy = context.requestedBy?.trim() || "Pending AD integration";
  const baseRows: [string, string][] = [
    ["Field", "Value"],
    ["Generated At", formatTimestamp(context.generatedAt)],
    ["Software System", context.softwareSystem],
    ["Country", context.country || "All countries"],
    ["Web-only Filter", context.webOnly ? "Enabled" : "Disabled"],
    ["Validation Date", context.validationDate || "--"],
    ["Requested By", requestedBy],
    ["SKU Count", String(context.skus.length)],
    ["SKUs", context.skus.map(sanitizeFormulaLikeText).join(", ") || "--"],
    ["Dashboard Rows", String(context.rowCount)],
    ["Visible Sections", context.visibleSections.join(", ") || "--"],
  ];

  baseRows.forEach(([field, value], rowIndex) => {
    const row = worksheet.addRow([field, value]);
    if (rowIndex === 0) {
      styleInfoHeaderRow(row);
      return;
    }

    row.alignment = { vertical: "top", wrapText: true };
  });

  if (!context.warnings.length) {
    worksheet.addRow([]);
    const warningHeader = worksheet.addRow(["Warnings", "Details"]);
    styleInfoHeaderRow(warningHeader);
    const row = worksheet.addRow(["None", "No export warnings recorded."]);
    row.alignment = { vertical: "top", wrapText: true };
    return;
  }

  worksheet.addRow([]);
  const warningHeader = worksheet.addRow(["Warnings", "Details"]);
  styleInfoHeaderRow(warningHeader);

  context.warnings.forEach((warning) => {
    const row = worksheet.addRow([
      warning.title,
      warning.details.join(", ") || "Warning recorded.",
    ]);
    row.alignment = { vertical: "top", wrapText: true };
  });
}

function addSectionSheet(
  workbook: WorkbookLike,
  section: ExportWorkbookSection,
  usedSheetNames: Set<string>,
  usedTableNames: Set<string>
) {
  const worksheet = workbook.addWorksheet(
    createUniqueSheetName(section.title, usedSheetNames)
  );
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const tableRows = section.rows.map((row) => row.map(toLiteralCellValue));
  const tableColumns = section.columns.map((column) => ({
    name: sanitizeHeader(column.header),
    filterButton: true,
  }));

  section.columns.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = resolveColumnWidth(
      column,
      tableRows,
      index
    );
  });

  if (tableRows.length) {
    worksheet.addTable({
      name: createUniqueTableName(section.key, usedTableNames),
      ref: "A1",
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleMedium2",
        showRowStripes: true,
      },
      columns: tableColumns,
      rows: tableRows,
    });

    styleSectionCells(worksheet, tableRows.length + 1, section.columns.length);
    return;
  }

  const headerRow = worksheet.addRow(section.columns.map((column) => column.header));
  styleSectionHeaderRow(headerRow);

  worksheet.addRow([]);
  const noteRow = worksheet.addRow([section.emptyMessage || "No data for current query."]);
  noteRow.getCell(1).font = { italic: true, color: { argb: "FF475569" } };
  noteRow.getCell(1).alignment = { vertical: "top", wrapText: true };
}

function styleInfoHeaderRow(row: WorksheetRowLike | undefined) {
  if (!row) return;
  row.font = { bold: true };
  row.alignment = { vertical: "middle" };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
  });
}

function styleSectionHeaderRow(row: WorksheetRowLike | undefined) {
  if (!row) return;
  row.font = { bold: true, color: { argb: "FF0F172A" } };
  row.alignment = { vertical: "middle" };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDDE6F5" },
    };
    cell.border = {
      bottom: {
        style: "thin",
        color: { argb: "FF94A3B8" },
      },
    };
  });
}

function styleSectionCells(
  worksheet: WorksheetLike,
  rowCount: number,
  columnCount: number
) {
  for (let rowNumber = 2; rowNumber <= rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.alignment = { vertical: "top", wrapText: true };
    for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
      const cell = row.getCell(columnIndex);
      if (typeof cell.value === "string") {
        cell.alignment = { vertical: "top", wrapText: true };
      }
    }
  }
}

function sanitizeHeader(value: string) {
  return value.trim() || "Value";
}

function toLiteralCellValue(value: ExportCellValue): string | number | boolean {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return sanitizeFormulaLikeText(value);
  }
  return value;
}

function sanitizeFormulaLikeText(value: string) {
  if (/^[\s\t\r]*[=+\-@]/.test(value)) {
    return `${FORMULA_GUARD_PREFIX}${value}`;
  }
  return value;
}

function resolveColumnWidth(
  column: ExportColumn,
  rows: Array<Array<string | number | boolean>>,
  columnIndex: number
) {
  const headerWidth = column.header.trim().length + 2;
  let maxWidth = Math.max(column.width ?? 10, headerWidth);

  rows.forEach((row) => {
    const value = row[columnIndex];
    const text = value === null || value === undefined ? "" : String(value);
    maxWidth = Math.max(maxWidth, Math.min(text.length + 2, 80));
  });

  return Math.min(Math.max(maxWidth, 10), 80);
}

function createUniqueSheetName(baseName: string, usedSheetNames: Set<string>) {
  const normalizedBase = sanitizeSheetName(baseName);
  let candidate = normalizedBase;
  let counter = 2;

  while (usedSheetNames.has(candidate)) {
    const suffix = ` (${counter})`;
    candidate = `${normalizedBase.slice(0, 31 - suffix.length)}${suffix}`;
    counter += 1;
  }

  usedSheetNames.add(candidate);
  return candidate;
}

function sanitizeSheetName(value: string) {
  const sanitized = value
    .replace(/[\[\]\*\/\\\:\?]/g, " ")
    .replace(/'/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return (sanitized || "Sheet").slice(0, 31);
}

function createUniqueTableName(baseName: string, usedTableNames: Set<string>) {
  const normalizedBase = sanitizeTableName(baseName);
  let candidate = normalizedBase;
  let counter = 2;

  while (usedTableNames.has(candidate)) {
    candidate = `${normalizedBase}_${counter}`;
    counter += 1;
  }

  usedTableNames.add(candidate);
  return candidate;
}

function sanitizeTableName(value: string) {
  const sanitized = value.replace(/[^A-Za-z0-9_]/g, "_");
  const withPrefix = /^[A-Za-z_]/.test(sanitized)
    ? sanitized
    : `T_${sanitized}`;
  return (withPrefix || "Table").slice(0, 250);
}

function buildFileName(context: ExportContext) {
  const datePart = formatFileTimestamp(context.generatedAt);
  const systemPart = slugifySegment(context.softwareSystem);
  const countryPart = slugifySegment(context.country || "all");
  return `sku-export-${systemPart}-${countryPart}-${datePart}.xlsx`;
}

function slugifySegment(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "all";
}

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatFileTimestamp(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}`;
}

function downloadWorkbook(buffer: ExportWorkbookBuffer, fileName: string) {
  const blobPart =
    buffer instanceof Uint8Array
      ? buffer.slice().buffer
      : buffer;
  const blob = new Blob([blobPart], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
