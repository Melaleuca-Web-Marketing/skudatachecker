# SKU Data Dashboard

Next.js + TypeScript app that renders a sectioned dashboard for SKUs: descriptions, details, channel availability, pricing, points, kits, and more. The table supports per-section expand/collapse, section visibility toggles, and a sticky SKU column to keep identifiers in view while scrolling.

## Features
- `/api/dashboard` endpoint that returns placeholder data for the UI
- Paste multiple SKUs, dedupe, and fetch a single response covering all sections
- Per-section expand/collapse with summaries; sticky SKU column for horizontal scrolling
- Section visibility toggles to hide/show data groups

## Getting Started
```bash
npm install
npm run dev    # http://localhost:3000 (or 3001 if 3000 is busy)
npm run build
npm run start  # http://localhost:3001
```

### Environment (.env.local)
Optional base path when hosting under a subfolder (example):
```
NEXT_PUBLIC_BASE_PATH=/skudatachecker
```
When running in production under a subfolder, open the app at `/skudatachecker`.

## API
`POST /api/dashboard`
```json
{
  "skus": ["117", "5048"],
  "asOfDate": null,
  "channelId": null,
  "channelTypeId": null,
  "availableOnly": 0,
  "languageId": null
}
```
Response:
```json
{
  "rows": [
    {
      "sku": "70391",
      "description": [ ... ],
      "details": [ ... ],
      "channelAvailability": [ ... ],
      "pricing": [ ... ],
      "productPoints": [ ... ],
      "kitDetails": [ ... ],
      "businessRules": [ ... ],
      "skuCounters": [ ... ]
    }
  ],
  "meta": { "rowCount": 1 }
}
```
Each section is returned as an array to support multiple countries/channels/price types.

## UI Usage
1) Paste SKUs (separated by commas, spaces, or new lines).
2) Click **Search** to generate the dashboard.
3) Use section headers to expand/collapse columns; use the visibility toggles to hide/show sections.

## Project Structure
- `app/page.tsx` – dashboard UI (SKU input, toggles, table)
- `app/api/dashboard/route.ts` – placeholder API for multi-section SKU data
- `app/layout.tsx`, `app/globals.css` – layout and global styles

## Notes
- The API currently returns placeholder data. This will be replaced with an external data API when it becomes available.
