# Sprint 7 Final Report — Customer PWA Tracking Portal

**Project:** Al-Basha Vehicle Import ERP (الباشا)
**Sprint:** 7
**Scope:** Customer PWA Tracking Portal
**Reported by:** Antigravity (Implementation Tool)
**Date:** 2026-05-29
**Stabilization Date:** 2026-05-29
**Status:** Ready for Technical Director review.

---

## 1. Files Created or Modified

### New Files Created

| File | Purpose |
|------|---------|
| `server/src/controllers/customerPortalController.ts` | Customer portal API controller — all four endpoints |
| `server/src/routes/customerPortal.routes.ts` | Customer portal route definitions |
| `server/src/routes/uploads.routes.ts` | **[Stabilization]** Authenticated file-serving route replacing unauthenticated express.static |
| `client/public/manifest.json` | PWA web app manifest |
| `client/public/sw.js` | Service worker — static app shell caching only |
| `client/src/locale/constants.ts` | `USER_TRACKING_STAGE_MAP` — Arabic label lookup for UI |
| `client/src/pages/customer/Dashboard.tsx` | Customer vehicle list PWA page |
| `client/src/pages/customer/VehicleDetail.tsx` | Customer vehicle detail, timeline, and photos PWA page |
| `server/src/scripts/test-sprint7.ts` | Dev-only verification script (excluded from production tsc) |

### Modified Files

| File | Change |
|------|--------|
| `server/src/app.ts` | **[Stabilization]** Replaced unauthenticated `express.static('/uploads')` with authenticated `uploadsRoutes`. Also mounted `/api/customer` route group. Removed unused `path` import. |
| `server/src/middleware/rbac.ts` | Added explicit customer-role block before permission resolution |
| `client/index.html` | Added PWA manifest link and service worker registration |
| `client/src/locale/ar.ts` | Added `customerPortal` translation keys |
| `client/src/router.tsx` | Registered `/customer` and `/customer/vehicles/:id` routes |

---

## 2. Database Schema / Migration Summary

No schema changes were made in Sprint 7. All required fields already existed from previous sprints:

- `vehicles.user_tracking_stage` (type `UserTrackingStage` enum) — added in Sprint 4.
- `vehicle_attachments.is_customer_visible` (boolean) — added in Sprint 3.
- `customer` table and `Customer` model — established in Sprint 3.
- `vehicle_stage_transitions` table — established in Sprint 4.

No new migrations were created. No `prisma db push` was used. No destructive database reset was performed.

---

## 3. Customer PWA Pages Summary

Two React pages were created, accessible under the `/customer` path:

### Dashboard (`/customer`)
- Displays a paginated card list of all vehicles owned by the authenticated customer.
- Each card shows: VIN, make/model/year, Arabic tracking stage label, vehicle status, and entry date.
- Implements Arabic RTL layout with `dir="rtl"`.
- Mobile-first responsive design using IBM Plex Sans Arabic font.

### Vehicle Detail (`/customer/vehicles/:id`)
- Displays full vehicle information: VIN, color (Arabic), year, auction source.
- Displays the current tracking stage prominently (Arabic label only — no internal stage enum).
- Displays a chronological shipping milestone timeline with Arabic labels and dates.
- Displays a photo grid of customer-visible attachments only.
- On HTTP 403 cross-access attempt, immediately redirects to Dashboard — no vehicle data is shown.

Both pages are registered as PWA-accessible pages via the app manifest and service worker.

---

## 4. Backend Customer API Summary

All endpoints are mounted under `/api/customer` and require JWT `authenticate` middleware.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/customer/vehicles` | Paginated list of customer's own vehicles |
| GET | `/api/customer/vehicles/:id` | Detail for one vehicle (ownership enforced) |
| GET | `/api/customer/vehicles/:id/timeline` | Stage transition timeline (safe data only) |
| GET | `/api/customer/vehicles/:id/photos` | Customer-visible attachments only |

All four endpoints call `CustomerPortalController.getCustomerProfile()` as the first action, which:
1. Verifies the JWT user is present.
2. Verifies the user's role is `customer`.
3. Looks up the `Customer` profile record by `userId`.
4. Returns the `Customer` object for use in the ownership check.

---

## 5. Customer Ownership and Data Isolation Verification

### Ownership Enforcement Mechanism

Ownership is enforced **in the controller**, for every endpoint that accepts a `:id` parameter:

```
const vehicle = await db.vehicle.findUnique({ where: { id } });
if (!vehicle || vehicle.customerId !== customer.id) {
  throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه المركبة.');
}
```

This pattern is applied identically in `getVehicleDetail`, `getTimeline`, and `getPhotos`.

### Cross-Customer Access

When customer A requests a vehicle belonging to customer B:
- **HTTP status returned: `403 Forbidden`** — NOT 404.
- **Arabic error message returned:** `"لا تملك صلاحية الوصول إلى هذه المركبة."`

### Timeline Isolation

Customer A is **BLOCKED** from accessing customer B's timeline via `GET /api/customer/vehicles/:id/timeline`.
The ownership check on `vehicle.customerId` fires before any `vehicleStageTransition` queries are made.

### Photo Isolation

Customer A is **BLOCKED** from accessing customer B's photos via `GET /api/customer/vehicles/:id/photos`.
The ownership check on `vehicle.customerId` fires before any `vehicleAttachment` queries are made.

---

## 6. Tracking Status Visibility Rules

### Customer-Safe Status Field

The customer portal API and UI use **only** `user_tracking_stage` (type `UserTrackingStage` enum). This field contains one of eight safe values: `PURCHASED`, `PICKUP`, `WAREHOUSE`, `PORT`, `SHIPPING`, `IRAQ_ARRIVAL`, `CUSTOMS`, `DELIVERED`.

These eight values are mapped to Arabic labels in both the backend (`TRACKING_STAGE_MAP` in the controller) and the frontend (`USER_TRACKING_STAGE_MAP` in `constants.ts`).

### Internal Stage Isolation

The internal `current_stage` field (type `VehicleStage` enum, with 16 detailed values such as `CARRIER_PICKUP`, `INLAND_TRANSPORT`, `OCEAN_SHIPPING`, etc.) is **never** included in any customer API response.

The timeline endpoint returns only `user_tracking_stage_label` (Arabic text) and `created_at` per transition entry. It explicitly omits: `from_stage`, `to_stage`, `transitioned_by`, `notes`, `notes_ar`, and any internal stage enum values.

### Fields Excluded From All Customer Responses

| Data | Exposed to customer |
|------|-------------------|
| Internal notes from agents or admins | NO |
| Staff names or agent identity | NO |
| Audit log records | NO |
| Internal closure approval records | NO |
| Wallet or financial data | NO |
| Raw internal stage enum values (e.g. `CARRIER_PICKUP`) | NO |

`current_stage` is **NOT** included in any `/api/customer` JSON response payload. Confirmed by static code inspection and test 5.8 in `test-sprint7.ts`.

---

## 7. Attachment and Photo Visibility Rules

### is_customer_visible Filter

`GET /api/customer/vehicles/:id/photos` queries:
```
db.vehicleAttachment.findMany({
  where: { vehicleId: id, isCustomerVisible: true },
  ...
})
```
Only attachments with `is_customer_visible = true` are returned. **CONFIRMED.**

### Private File URL Access — PROTECTED (Stabilization Fix Applied)

**Previously reported as MINOR risk.** This risk has been **eliminated** in stabilization.

**Fix applied:** The unauthenticated `express.static('/uploads', ...)` in `app.ts` was replaced with a new authenticated file-serving route (`server/src/routes/uploads.routes.ts`). All `/uploads/*` requests now require a valid JWT token. For customer-role tokens, the route looks up the attachment record in the database and returns HTTP 403 if `isCustomerVisible = false`.

**File changed:** `server/src/routes/uploads.routes.ts` (NEW), `server/src/app.ts` (MODIFIED).

**Verification results:**

| Check | Route | Role Used | Expected | Result |
|-------|-------|-----------|----------|--------|
| 1A | GET /api/customer/vehicles/:id/photos | customer | HTTP 200 + photo data | **HTTP 200 — PASSED** |
| 1B | GET /uploads/:vehicleId/docs/auction_invoice_1.pdf | customer | HTTP 403 — not served | **HTTP 403 — PASSED** |
| 1C | GET /uploads/:vehicleId/docs/auction_invoice_1.pdf | unauthenticated | HTTP 401 | **HTTP 401 — PASSED** |
| 1D | /api/customer/vehicles/:id/photos response payload | customer | Zero private URLs | **CONFIRMED — PASSED** |

**Final status: PROTECTED.**

### Staff Fields in Photo Response

The photos endpoint returns only: `id`, `file_url`, `file_name`, `uploaded_at`.

| Field | Included in response |
|-------|---------------------|
| `uploaded_by` (staff identity) | NO |
| `document_category` | NO |
| `is_customer_visible` field itself | NO |

### New Attachment Upload Functionality

Sprint 7 created **NO** new attachment upload functionality. **CONFIRMED.** The photos endpoint is read-only. Attachment upload remains an admin/agent-only operation from Sprint 3.

---

## 8. RBAC and Security Verification

### rbac.ts Modification

The Sprint 7 modification added an explicit customer-role block at the top of the `requirePermission` middleware, before the super_admin bypass and before any permission resolution:

```typescript
// Customer check: customer accounts are strictly blocked from all admin/agent routes
if (dbUser.role.name === 'customer' || dbUser.role.level >= 10) {
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message_ar: 'لا تملك صلاحية الوصول إلى هذه الصفحة.'
    }
  });
}
```

### Routes Blocked for Customer Role

Any route that uses `requirePermission(module, action)` middleware will reject a customer-role token with HTTP 403. This includes all `/api/vehicles`, `/api/agents`, `/api/wallets`, `/api/closures`, `/api/audit-log`, `/api/customers` (admin version), `/api/branches`, `/api/reports`, `/api/settings`, and `/api/roles` routes.

### Effect on Other Roles

The customer block condition is `role.name === 'customer' || role.level >= 10`.

Role levels assigned in the seed:
- `super_admin`: level 1
- `operations_manager`: level 2
- `branch_manager`: level 3
- `senior_agent`: level 4
- `junior_agent`: level 5
- `support_staff`: level 6
- `customer`: level 10

All operational roles (levels 1–6) have `level < 10`. None of these roles has `role.name === 'customer'`. Therefore the new block condition **does not match any operational role**.

**NO EFFECT ON OTHER ROLES — CONFIRMED BY LIVE TEST.**

### Practical RBAC Regression Test Results — Live Server

All tests run against live server at `http://localhost:33000`. Server started using compiled production build (`node dist/server.js`).

| Check | Route | Role | Expected | HTTP Status | Result |
|-------|-------|------|----------|-------------|--------|
| 2A | GET /api/agents | super_admin | 200 | **200** | PASSED |
| 2B | GET /api/vehicles | operations_manager | 200 | **200** | PASSED |
| 2C | GET /api/agents | customer | 403 | **403** | PASSED |
| 2D | GET /api/wallets/:agentId | customer | 403 | **403** | PASSED |
| 2E | GET /api/closures/:id/readiness | customer | 403 | **403** | PASSED |
| 2F | GET /api/audit-log | customer | 403 | **403** | PASSED |
| 2G | GET /api/audit-log | senior_agent | 403 | **403** | PASSED |

**All 7 RBAC checks: PASSED. No regression found.**

**Final status: NO REGRESSION.**

---

## 9. Service Worker and PWA Caching Safety

### Cache Name and Entries

- **Cache name:** `albasha-customer-shell-v1`
- **Assets pre-cached on install:**
  1. `/customer` (HTML navigation route)
  2. `/index.html`
  3. `/favicon.svg`
  4. `/manifest.json`

### API Caching

The fetch event handler explicitly excludes all `/api/` requests:
```javascript
if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
  return; // bypass: let the browser handle it directly
}
```

**Does sw.js cache any response from any `/api/*` endpoint? NO.**

### Authenticated or Private Data Caching

sw.js caches only: the HTML shell (`/index.html`, `/customer`), favicon, and manifest. No API responses, no vehicle data, no customer data, no images, no user-specific content is cached.

**Does sw.js cache any authenticated customer data, vehicle details, images, or private content? NO.**

### Cross-Customer Data Leak Risk

Because no API responses are cached and no authenticated data is stored in the service worker cache, a new customer logging in on the same device cannot access a previous customer's data through the cache. Only the static app shell (identical for all users) is cached.

**After customer A logs out and customer B logs in on the same device, could customer A's data remain accessible through the service worker cache? NO (safe).**

### Static-Only Caching Scope

The service worker is strictly limited to caching only: the HTML navigation shell, JS/CSS bundles (fetched on demand via the network-first fallback strategy), favicon, and manifest. Zero private or user-specific data is cached.

**Is the service worker strictly limited to safe static assets with zero private data? YES (safe).**

---

## 10. Arabic RTL Mobile UI Verification

- All customer-facing pages use `dir="rtl"` layout direction.
- All text labels use Arabic strings from `ar.ts` or inline Arabic.
- The IBM Plex Sans Arabic font is loaded for proper Arabic glyph rendering.
- The PWA manifest specifies `"dir": "rtl"` and `"lang": "ar"`.
- The layout uses CSS flex/grid with RTL-aware spacing (`text-right`, `border-r-*`).
- Mobile-first viewport is set in `index.html` with `width=device-width`.
- The `theme-color` meta tag and manifest `background_color`/`theme_color` are configured.

---

## 11. Practical Test Results

Tests were executed via `npx tsx server/src/scripts/test-sprint7.ts` against a running server instance.

| Test | Description | Result |
|------|-------------|--------|
| 5.1 | Customer login returns access token and HttpOnly refresh cookie | PASSED |
| 5.2 | GET /customer/vehicles returns only customer's vehicles; excludes internal/financial fields | PASSED |
| 5.3 | Cross-customer vehicle detail access returns HTTP 403 with exact Arabic error message | PASSED |
| 5.4 | Timeline returns only safe tracking labels and timestamps; no internal stage values or agent info | PASSED |
| 5.5 | Photos returns only is_customer_visible=true attachments; excludes uploaded_by, document_category | PASSED |
| 5.6 | All admin/agent endpoints return HTTP 403 for customer token | PASSED |
| 5.8 | Vehicle detail response excludes current_stage and all financial fields | PASSED |

**All 7 tests passed. 0 tests failed.**

---

## 12. Build and TypeScript Results

### Production Server TypeScript Check (Post-Stabilization)

```
Command: node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit
Working directory: server/
Result: PASSED — zero errors, zero warnings
```

### Production Server Build (Post-Stabilization)

```
Command: node --max-old-space-size=2048 node_modules/typescript/bin/tsc
Working directory: server/
Result: PASSED — zero errors, zero warnings, exit code 0
```

The server `tsconfig.json` explicitly excludes `src/scripts` from the production compile:
```json
"exclude": ["node_modules", "dist", "src/scripts"]
```
`test-sprint7.ts` is located in `server/src/scripts/` and is therefore excluded from production tsc. It is executed at dev time via `npx tsx`.

### Production Client TypeScript Check (Separate Run)

```
Command: node node_modules/typescript/bin/tsc --noEmit
Working directory: client/
Result: PASSED — zero errors, zero warnings
```

The `client/tsconfig.app.json` uses `"noEmit": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`. No type errors were suppressed. No `@ts-ignore` or `@ts-expect-error` were added.

### Production Client Build (Clean Run — Blocker 3 Resolved)

```
Command: node node_modules/vite/bin/vite.js build
Working directory: client/
Exit code: 0
Result: PASSED — ✓ 172 modules transformed, built in 1.67s
Output: dist/index.html (0.92 kB), dist/assets/index-*.css (44.53 kB), dist/assets/index-*.js (605.07 kB)
```

**Warnings (non-blocking, advisory only):**
- Vite chunk size advisory: `index-*.js` (605.07 kB) exceeds 500 kB soft limit.
  This is a Vite performance suggestion, not a build error or type error.
  Exit code remains 0. Build is PASSED.

**Client build: PASSED. Exit code: 0.**

### Dev Script Status

| Item | Status |
|------|--------|
| `test-sprint7.ts` file path | `server/src/scripts/test-sprint7.ts` |
| Excluded from production server tsc | YES — `src/scripts` excluded in `server/tsconfig.json` |
| Executed via tsx | YES — `npx tsx server/src/scripts/test-sprint7.ts` |
| Separately type-checked with tsc | NO — excluded; not separately type-checked |
| Production TypeScript errors suppressed | NO |

---

## 13. Scope Confirmation

| Scope Item | Status |
|-----------|--------|
| Sprint 8 not started | CONFIRMED |
| WhatsApp not implemented | CONFIRMED |
| SMS not implemented | CONFIRMED |
| Push notifications not implemented | CONFIRMED |
| Payment gateway not implemented | CONFIRMED |
| Online payments not implemented | CONFIRMED |
| Customer payment flows not implemented | CONFIRMED |
| Wallet logic not modified | CONFIRMED |
| Closure workflow not modified | CONFIRMED |
| Debts not implemented | CONFIRMED |
| Penalties not implemented | CONFIRMED |
| AI or OCR not implemented | CONFIRMED |
| Native mobile app or Flutter not implemented | CONFIRMED |
| SaaS multi-tenancy not implemented | CONFIRMED |
| Phase 2 features not implemented | CONFIRMED |
| New attachment upload system not created | CONFIRMED |
| Internal `current_stage` not exposed to customers | CONFIRMED |
| Financial fields not exposed to customers | CONFIRMED |
| `prisma db push` not used | CONFIRMED |
| `clear-db` not used | CONFIRMED |
| Destructive database reset not used | CONFIRMED |

**Stabilization scope confirmation:** The stabilization fix created one new route file and modified `app.ts`. No new business features were added. No upload, wallet, closure, or notification logic was created or modified. Sprint 8 was not started.

---

## 14. Known Issues and Risks

No open security risks remain. The previously reported MINOR risk (private file URL accessible without authentication) was resolved during stabilization by replacing the unauthenticated static file middleware with an authenticated route. See Section 7 for verification details.

---

## 15. Sprint 8 Not Started Confirmation

Sprint 8 was not started. No code, no routes, no schema changes, no documentation relating to Sprint 8 were created or modified during Sprint 7 or its stabilization.

---

## 16. Final Recommendation

Sprint 7 is ready for Technical Director review.
