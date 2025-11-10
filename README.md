# SKU Data Checker

SKU Data Checker is a lightweight Next.js app for bulk validating product metadata across Melaleuca markets. Paste any number of SKUs, pick the context (country, system, culture, channel), and review normalized results right in the browser or export them to CSV for downstream tools.

## Features

- Modern Next.js App Router stack with TypeScript and Tailwind CSS (light/dark switcher included)
- Bulk SKU submission with duplicate filtering and live status counters
- Serverless API route that calls the DataForge endpoint with concurrency + TLS handling
- Tabular results that surface core merchandising details (pricing, kit info, channel availability)
- One-click CSV export mirroring the table data

## Getting Started

```bash
pnpm install   # or npm install / yarn
pnpm dev       # starts Next.js dev server on http://localhost:3000
```

Environment variables are not required for development; the DataForge API URL is hard-coded in `app/api/sku-info/route.ts`. If your environment requires a corporate CA, set `ALLOW_INSECURE_TLS=true` when running the dev server to skip certificate validation.

## Scripts

| Command        | Description                         |
| -------------- | ----------------------------------- |
| `pnpm dev`     | Run Next.js in development mode     |
| `pnpm build`   | Production build with Turbopack     |
| `pnpm start`   | Serve the production build          |
| `pnpm lint`    | (Optional) add your linting command |

## Project Structure

- `app/page.tsx` – main UI with the form, status cards, and results table
- `app/api/sku-info/route.ts` – server action that fetches SKU data
- `app/globals.css` – Tailwind base styles
- `tailwind.config.js` & `postcss.config.js` – styling pipeline config

## Deployment

The app is optimized for platforms that support Next.js (Vercel, Netlify, Azure Static Web Apps, etc.). Ensure the environment variable `ALLOW_INSECURE_TLS` is configured appropriately for the target network.
