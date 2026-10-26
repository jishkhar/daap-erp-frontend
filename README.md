# ERP — Frontend

The staff portal, platform-admin area and public pages for the [ERP](../README.md). Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4.
The look (design tokens, shell, components in `src/components/ui`) was taken from the reference UI; **all screens and data access are ERP-native** and talk to
the backend's `/api/v1/*` (staff) and `/api/platform/*` (DAAP platform admin) endpoints.

> This Next.js version differs from what many tools and docs assume. Before changing framework-level code, read the bundled docs in
> `node_modules/next/dist/docs/` (see `AGENTS.md`).

## Run

```bash
npm install
npm run dev            # http://localhost:3000
```

The backend must be running (default `http://localhost:8000`); override with `NEXT_PUBLIC_API_BASE_URL`.
Sign in at `/portal/login` with **company code + email + password** (a tenant is created by a platform admin in the separate `admin-ecommerce` app).

## What's here

| Area | Route | Backed by |
|---|---|---|
| Dashboard | `/portal/dashboard` | orders + low-stock inventory |
| Orders (+ detail: fulfil, cancel, record payment, collect COD, bind IMEIs) | `/portal/orders` | `/api/v1/orders`, `/payments` |
| Products (+ receive stock) | `/portal/products` | `/api/v1/products`, `/inventory` |
| Customers (+ activity timeline) | `/portal/customers` | `/api/v1/customers` |
| Sales channels: Online · POS · WhatsApp (+ API keys) | `/portal/channels/{online,pos,whatsapp}` | orders by channel, `/api/v1/channel-clients` |
| Analytics / Reports | `/portal/analytics` | orders (revenue by channel / branch / day) |
| Procurement: suppliers (+ statement, pay), requests, purchase orders (approve, receive goods with freight & IMEIs, return) | `/portal/procurement` | `/api/v1/purchase-*`, `/suppliers`, `/goods-receipts` |
| Finance: overview, expenses, GST tax invoices, gateway reconciliation, journal & period lock | `/portal/finance` | `/api/v1/finance/*` |
| Financial reports: P&L (by branch / channel), branch × channel, balance sheet, GST, product margin, aging | `/portal/analytics` → *Financial reports* | `/api/v1/finance/reports/*` |
| Settings, Team & Access, Roles & Permissions, Activity log, Online Storefront | `/portal/settings/*` | tenant, users, roles, audit-logs, channel keys |

**Not built yet (shown in the sidebar, but say so on the page):** WhatsApp Inbox, WhatsApp Automation, Discounts — they depend on later backend phases.
Growth is listed but disabled. **Workforce** (Attendance, Check-in/out, My Leave, Holidays, Team Attendance, Leave Requests) runs on the ERP's
`/api/v1/attendance` and `/api/v1/leave`; rules live in Settings > Attendance and holidays. Plan: `../docs/attendance_leave.md`. Portal only --
the till has no attendance.

## Conventions

- `src/lib/erp.ts` — typed API helper (`erp()`, `useErpQuery()`), money helpers (`formatMoney`, `toMinor`: amounts are integer minor units), channel metadata
  (UI labels Online / POS / WhatsApp for the API codes `online` / `pos` / `whatsapp`).
- `src/lib/staffAuth.ts` — sign-in, silent token refresh, `useStaffSession()`, and `hasPermission()` which maps sidebar pages onto the API's `module:action` permissions.
  Hiding a menu item is a convenience only; the server enforces every permission and branch scope.
- The **branch switcher** (top bar) only narrows what list pages request; access itself is decided server-side from the person's role grants.
- Browser-only state (session, sidebar collapse) is read with `useSyncExternalStore` (`src/lib/useStorageValue.ts`), not effects, so server and client markup always agree.

Product reviews now appear in ERP Feedback with product/customer/order details and branch/rating filters. See [Product reviews](../docs/PRODUCT_REVIEWS.md) for eligibility, API contracts and testing.

Customer store-credit balances remain available at `/api/v1/customers/{id}/store-credit` for refunds and payment redemption.
