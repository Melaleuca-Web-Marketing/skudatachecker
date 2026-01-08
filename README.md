# SKU Data Dashboard

Next.js + TypeScript app that queries a SQL Server source (USPProd_Sandbox) and renders a sectioned dashboard for SKUs: descriptions, details, channel availability, pricing, points, kits, and more. The table supports per-section expand/collapse, section visibility toggles, and a sticky SKU column to keep identifiers in view while scrolling.

## Features
- Live SQL Server-backed `/api/dashboard` endpoint (no mock data required)
- Paste multiple SKUs, dedupe, and run a single query against all sections
- Per-section expand/collapse with summaries; sticky SKU column for horizontal scrolling
- Section visibility toggles to hide/show data groups
- Works with SQL auth or Windows (NTLM) auth; configurable connection settings

## Getting Started
```bash
npm install
npm run dev    # http://localhost:3000
```

### Environment (.env.local)
Configure SQL Server access. Example using SQL auth:
```
DB_WINDOWS_AUTH=false
DB_HOST=localhost\SQLEXPRESS
DB_PORT=1433
DB_NAME=USPProd_Sandbox
DB_USER=dashboard_user
DB_PASSWORD=TempPwd!234
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true
DB_USE_NAMED_PIPE=false
```
For Windows auth, set `DB_WINDOWS_AUTH=true` and (if needed) `DB_DOMAIN`, `DB_USER`, `DB_PASSWORD`. Ensure the SQL instance is reachable over TCP (enable TCP/IP and set a port).

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
      "businessRules": [ ... ],   // currently empty until a source is provided
      "skuCounters": [ ... ]      // currently empty until a source is provided
    }
  ],
  "meta": { "rowCount": 1 }
}
```
Each section is returned as an array to support multiple countries/channels/price types.

## UI Usage
1) Paste SKUs (separated by commas, spaces, or new lines).
2) Click **Search** to query the database.
3) Use section headers to expand/collapse columns; use the visibility toggles to hide/show sections.

## Project Structure
- `app/page.tsx` – dashboard UI (SKU input, toggles, table)
- `app/api/dashboard/route.ts` – SQL-backed API for multi-section SKU data
- `lib/db.ts` – SQL Server connection helper (supports SQL or Windows auth)
- `app/layout.tsx`, `app/globals.css` – layout and global styles

## Notes
- Business rules and SKU counters are placeholders until a data source/table is provided.
- If the SQL instance uses a non-default port, set `DB_PORT` accordingly. Ensure TCP/IP is enabled on SQLEXPRESS.
