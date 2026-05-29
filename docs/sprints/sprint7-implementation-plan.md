# Sprint 7 — Customer PWA Tracking Portal Implementation Plan

This implementation plan details the strategy for building the read-only Customer PWA Tracking Portal in Sprint 7.

## State Assessment (Task 1)

### 1.1 Customer Authentication State
- **Corporate Seed Data:** A customer user account is successfully seeded.
  - Username: `customer1`
  - Email: `customer1@albasha.local`
  - Password: `customer123`
  - Role: `customer` (associated with role ID for `customer` role which has level 10)
- **Login Page:** The frontend login page (`client/src/pages/auth/Login.tsx`) is fully operational and correctly redirects customers (role = `customer`) to `/customer`.
- **Session/Auth Guard:** The client-side `CustomerLayout` (`client/src/components/layouts/CustomerLayout.tsx`) enforces session verification. If the user is unauthenticated, they are redirected to `/auth/login`. If their role is not `customer`, they are redirected to `/admin` or `/agent` layouts.
- **Cookies & Access Tokens:** The backend authentication service correctly sets the `refreshToken` in an HTTP-only cookie and returns the `accessToken` in the JSON response payload.
- **Conclusion:** **FULLY WORKING**.

### 1.2 Existing Customer PWA State
- **Routes:** The route `/customer` points to `CustomerDashboard` (`client/src/pages/customer/Dashboard.tsx`), which is currently a static hardcoded layout.
- **Pages:** `/customer/vehicles/:id`, `/customer/notifications`, and `/customer/profile` point to standard placeholder page components in `client/src/router.tsx`.
- **PWA Configuration:** No PWA `manifest.json` exists in `client/public/`, and no service worker registration is configured.
- **Conclusion:** **PARTIALLY WORKING** (Guards/layouts are ready, but customer pages are static placeholders and PWA configuration is completely missing).

### 1.3 Vehicle Attachment State
- **Schema:** The `vehicle_attachments` table exists in `schema.prisma`.
- **Customer Visibility:** The `is_customer_visible` boolean field exists (`@default(false)`).
- **Seeded Records:** Yes, the seed script (`seed.ts`) inserts one attachment with `isCustomerVisible: true` (external photo) and one with `isCustomerVisible: false` (purchase invoice) for every vehicle.
- **Conclusion:** **EXISTS AND SEEDED**.

### 1.4 User Tracking Stage State
- **Schema:** The field `user_tracking_stage` exists on the `Vehicle` model in `schema.prisma` and is typed as the `UserTrackingStage` enum.
- **Populated Data:** All 20 seeded vehicles are populated with correct tracking stages corresponding to their shipping progress (e.g. `PURCHASED`, `PICKUP`, `WAREHOUSE`, etc.).
- **Conclusion:** **EXISTS AND SEEDED**.

### 1.5 Schema Change Requirement
- **Conclusion:** **NO SCHEMA CHANGES REQUIRED**. The current database schema fully supports the Sprint 7 requirements.

### 1.6 Conflict Detection
- No route or database schema conflicts exist. We will implement customer PWA backend APIs under `/api/customer` routes, avoiding any conflict with existing admin vehicle routes.

---

## User Review Required

> [!NOTE]
> Offline shell caching: The service worker will implement a minimal shell caching strategy suitable for a standalone web application. Cache headers will be configured in dev/prod.

---

## Open Questions

There are no unresolved open questions. The requirements and boundaries for customer tracking data isolation, field exclusion, and layout requirements are fully specified.

---

## Proposed Changes

We will introduce backend endpoints, frontend views, and PWA configurations.

### 1. PWA Shell Configuration

#### [NEW] [manifest.json](file:///d:/xxxxx/client/public/manifest.json)
Create the PWA web app manifest with the following configuration:
- `name`: "الباشا للاستيراد"
- `short_name`: "الباشا"
- `dir`: "rtl"
- `lang`: "ar"
- `display`: "standalone"
- `start_url`: "/customer"
- `background_color`: "#0B1528" (navy matching brand)
- `theme_color`: "#1E2A38"
- Icons mapping configuration.

#### [NEW] [sw.js](file:///d:/xxxxx/client/public/sw.js)
Create a lightweight service worker to cache the static application shell (e.g., HTML, CSS, JavaScript) to ensure the tracking portal is offline-capable.

#### [MODIFY] [index.html](file:///d:/xxxxx/client/index.html)
- Link the manifest in the HTML head.
- Register the service worker inside a `<script>` tag.

---

### 2. Backend Customer APIs

#### [NEW] [customerPwa.routes.ts](file:///d:/xxxxx/server/src/routes/customerPwa.routes.ts)
Declare customer-specific API endpoints under the `/api/customer` prefix:
- `GET /vehicles`: Fetches list of vehicles owned by the authenticated customer.
- `GET /vehicles/:id`: Fetches detailed tracking info of a specific vehicle.
- `GET /vehicles/:id/photos`: Fetches customer-visible photos for a specific vehicle.

#### [NEW] [customerPwaController.ts](file:///d:/xxxxx/server/src/controllers/customerPwaController.ts)
Implement endpoint controllers ensuring strict ownership validation and data isolation.

#### [MODIFY] [app.ts](file:///d:/xxxxx/server/src/app.ts)
Mount customer routes:
```typescript
import customerPwaRoutes from './routes/customerPwa.routes';
app.use('/api/customer', customerPwaRoutes);
```

---

### 3. Frontend Customer UI

#### [MODIFY] [ar.ts](file:///d:/xxxxx/client/src/locale/ar.ts)
Add user tracking stage constants and customer dashboard error messages.

#### [MODIFY] [Dashboard.tsx](file:///d:/xxxxx/client/src/pages/customer/Dashboard.tsx)
Build a dynamic customer dashboard displaying cards for vehicles belonging to the customer, with stage indicators and timestamps.

#### [NEW] [VehicleDetail.tsx](file:///d:/xxxxx/client/src/pages/customer/VehicleDetail.tsx)
Create a new mobile-first detail view showing vehicle specs, the current shipping stage milestone, a chronological safe-history timeline (excluding staff names and internal notes), and a grid of customer-visible photos.

#### [MODIFY] [router.tsx](file:///d:/xxxxx/client/src/router.tsx)
Update `/customer/vehicles/:id` route to map to the new customer `<VehicleDetail />` component.

---

## Verification Plan

### Automated Tests
We will execute the build commands and run the dev script verification:
- `cd server && npx prisma validate`
- `cd server && npx prisma migrate status`
- `cd server && npx tsc --noEmit`
- `cd server && npm run build`
- `cd client && npx tsc --noEmit`
- `cd client && npm run build`

### Manual and Integration Verification
We will verify that:
1. Logged-in customer A can only see vehicle records belonging to customer A.
2. Direct access to `/api/customer/vehicles/:id` belonging to customer B returns `403 Forbidden` with the message `"لا تملك صلاحية الوصول إلى هذه المركبة."`.
3. Customer cannot access `/api/vehicles`, `/api/agents`, `/api/wallets`, `/api/closures`, or `/api/audit-log`.
4. Response payloads do not expose financial fields or internal stage names.
