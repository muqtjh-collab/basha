# Sprint 6 Implementation Plan — Internal Operations and Closure Readiness Foundation

This plan describes the implementation of vehicle internal approvals, closure readiness checks, final closure execution, RBAC scoping rules, audit logging, and the frontend Arabic RTL vehicle detail closure panel.

## User Review Required

> [!IMPORTANT]
> - **Append-only approvals**: Approvals are permanent, append-only records. No update or delete operations are exposed.
> - **Super Admin Restriction**: Only a user with the role `super_admin` can execute the final vehicle closure.
> - **Geographical Scoping**: Branch managers can only view or approve vehicle closures belonging to agents within their own branch.
> - **Wallet & Stage Safety**: Wallet logic and shipment status transition logic remain completely untouched.

## Open Questions

> [!NOTE]
> No outstanding questions exist; all requirements are fully specified and role mappings have been validated.

## Proposed Changes

---

### Database Layer

#### [MODIFY] [schema.prisma](file:///d:/xxxxx/server/prisma/schema.prisma)
- Add new `ApprovalType` enum with values: `finance`, `operations`, `administration`.
- Add `InternalApproval` model to act as the permanent approval ledger.
- Add fields to the `Vehicle` model:
  - `isClosed` (Boolean, default `false`)
  - `closedAt` (DateTime, optional)
  - `closedBy` (UUID, optional)
- Update relations on `User` and `Vehicle` to reference the approvals.
- Add new `AuditAction` values:
  - `closure_approval_created`
  - `closure_approval_duplicate_rejected`
  - `final_closure_completed`
  - `final_closure_rejected`

---

### Backend Service & Validation Layer

#### [NEW] [closureService.ts](file:///d:/xxxxx/server/src/services/closureService.ts)
- **`getClosureReadiness(vehicleId, requestingUser)`**: Retrieves details, checks scope, stage sequence eligibility (`FINAL_DELIVERY` or `POST_DELIVERY_ARCHIVE`), and checks presence of each approval type.
- **`createApproval(vehicleId, approvalType, performedBy, note?)`**: Inserts approval record, prevents duplicates, enforces role mappings:
  - `finance`: `super_admin`, `operations_manager`
  - `operations`: `super_admin`, `operations_manager`, `branch_manager`
  - `administration`: `super_admin`
- **`executeFinalClosure(vehicleId, performedBy)`**: Executed by `super_admin` only, changes vehicle status, sets `currentStage` to `POST_DELIVERY_ARCHIVE`, creates transition record, and logs `final_closure_completed` or `final_closure_rejected` dynamically.

#### [NEW] [sprint6.validators.ts](file:///d:/xxxxx/server/src/validators/sprint6.validators.ts)
- Zod schemas `createApprovalSchema` and `finalClosureSchema` with Arabic error messages.

---

### API Routes & Controllers

#### [NEW] [closureController.ts](file:///d:/xxxxx/server/src/controllers/closureController.ts)
- Implements endpoint handlers that interface with `ClosureService`. Returns localized Arabic error messages.

#### [NEW] [closure.routes.ts](file:///d:/xxxxx/server/src/routes/closure.routes.ts)
- Declares endpoints:
  - `GET /api/closures/:vehicleId/readiness`
  - `POST /api/closures/:vehicleId/approvals`
  - `GET /api/closures/:vehicleId/approvals`
  - `POST /api/closures/:vehicleId/execute`
- Wraps them in `authenticate` and `requirePermission` middleware.

#### [MODIFY] [app.ts](file:///d:/xxxxx/server/src/app.ts)
- Registers closure routes under `/api/closures`.

---

### Frontend RTL Arabic User Interface

#### [MODIFY] [ar.ts](file:///d:/xxxxx/client/src/locale/ar.ts)
- Add central translation dictionary block for `closures` containing all titles, labels, buttons, dialog prompts, tooltips, and success/error messages in Arabic.

#### [MODIFY] [VehicleDetail.tsx](file:///d:/xxxxx/client/src/pages/common/VehicleDetail.tsx)
- Embed a new **Closure Section** at the bottom of the page.
- Render readiness status card, approvals checklist, approval registration form (inline dropdown + note field), and the final closure execution button.
- Restrict visibility dynamically based on user role and geographic branch scope.

## Verification Plan

### Automated Tests
1. Verify database schema compatibility:
   ```bash
   cd server && npx.cmd prisma validate
   cd server && npx.cmd prisma migrate status
   cd server && npx.cmd prisma generate
   ```
2. Build and Typecheck Verification:
   ```bash
   cd server && npx.cmd tsc --noEmit
   cd server && npm run build
   cd client && npx.cmd tsc --noEmit
   ```

### Manual Verification Scenarios
- Perform the 15 detailed verification checks specified in the Task 7 instructions (from incomplete stage assessment to agent blocks, audit log verification, and final closure confirmation).
