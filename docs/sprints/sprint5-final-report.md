# Sprint 5 — Agent Wallet Foundation Final Report

**Date Completed:** May 28, 2026  
**Sprint Status:** Sprint 5 is ready for Technical Director review.

---

## 2. STATE ASSESSMENT SUMMARY
Before Sprint 5, the wallet-related structure consisted of a database schema layout established in Sprint 3. The `Wallet` and `WalletTransaction` models were defined in `schema.prisma`, and zero-balance wallet records were initialized structurally upon agent account creation. However, there were no APIs, services, or pages handling financial transactions, scoping validations, or balance updates.

During Sprint 5, we implemented:
- A new Prisma migration extending the `AuditAction` enum with exact audit action values.
- A transactional, type-safe backend `WalletService` utilizing integer-only math to prevent floating-point inaccuracies.
- Zod schemas validating integer deposits and deductions.
- Authenticated, RBAC-protected, and geographically scoped API routes under `/api/wallets`.
- Right-to-Left (RTL) Arabic pages for Admin Wallet Management (`/admin/wallets`) and read-only Agent Wallet details (`/agent/wallet`) powered by a shared locale dictionary and a unified currency formatting utility.
- Full audit logging for successful additions, deductions, and rejected transactions.

---

## 3. FILES CREATED OR MODIFIED
The files created or modified during Sprint 5 are:

### `server/`
- `[NEW]` [walletService.ts](file:///d:/xxxxx/server/src/services/walletService.ts) — Encapsulates database transaction-wrapped ledger and balance mutations.
- `[NEW]` [walletController.ts](file:///d:/xxxxx/server/src/controllers/walletController.ts) — Controller handling request/response lifecycle and localized responses.
- `[NEW]` [wallet.routes.ts](file:///d:/xxxxx/server/src/routes/wallet.routes.ts) — Declares `/api/wallets` endpoints and maps them to controllers under auth/RBAC guards.
- `[NEW]` [sprint5.validators.ts](file:///d:/xxxxx/server/src/validators/sprint5.validators.ts) — Zod schemas verifying deposit and deduct request shapes.
- `[MODIFY]` [app.ts](file:///d:/xxxxx/server/src/app.ts) — Registered wallet routes.

### `client/`
- `[NEW]` [WalletsList.tsx](file:///d:/xxxxx/client/src/pages/admin/WalletsList.tsx) — RTL Arabic interface for admins to search agents, filter by branch/status, view transactions, and perform deposits/deductions.
- `[NEW]` [AgentWallet.tsx](file:///d:/xxxxx/client/src/pages/agent/AgentWallet.tsx) — RTL Arabic read-only panel showing an agent's own balance and filtered transactions (hiding performer details).
- `[MODIFY]` [router.tsx](file:///d:/xxxxx/client/src/router.tsx) — Mapped path `/admin/wallets` and `/agent/wallet` to their respective pages.
- `[MODIFY]` [Sidebar.tsx](file:///d:/xxxxx/client/src/components/common/Sidebar.tsx) — Integrated conditional sidebar links with permission checks.

### `prisma/`
- `[MODIFY]` [schema.prisma](file:///d:/xxxxx/server/prisma/schema.prisma) — Appended `wallet_balance_added`, `wallet_balance_deducted`, and `wallet_deduction_rejected` values to the `AuditAction` enum.
- `[NEW]` [20260528203620_add_wallet_audit_actions](file:///d:/xxxxx/server/prisma/migrations/20260528203620_add_wallet_audit_actions/migration.sql) — Migration file declaring SQL ALTER TYPE actions.

### `docs/`
- `[MODIFY]` [sprint5-final-report.md](file:///d:/xxxxx/docs/sprints/sprint5-final-report.md) — This document.

---

## 4. DATABASE MIGRATION SUMMARY
The applied database migration is:
- **`20260528203620_add_wallet_audit_actions`**: Alters `AuditAction` to include `wallet_balance_added`, `wallet_balance_deducted`, and `wallet_deduction_rejected`.

### Prisma Command Executions

1. **`cd server && npx prisma validate`**
   - **Output:**
     ```
     Environment variables loaded from .env
     Prisma schema loaded from prisma\schema.prisma
     The schema at prisma\schema.prisma is valid 🚀
     ```
   - **Result:** PASSED

2. **`cd server && npx prisma generate`**
   - **Output:**
     ```
     Environment variables loaded from .env
     Prisma schema loaded from prisma\schema.prisma

     ✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 158ms
     ```
   - **Result:** PASSED

3. **`cd server && npx prisma migrate status`**
   - **Output:**
     ```
     Environment variables loaded from .env
     Prisma schema loaded from prisma\schema.prisma
     Datasource "db": PostgreSQL database "albasha", schema "public" at "localhost:45432"

     5 migrations found in prisma/migrations

     Database schema is up to date!
     ```
   - **Result:** PASSED

* **`prisma db push` usage:** NOT used.
* **`clear-db` usage:** NOT used.
* **Destructive reset usage:** None.

---

## 5. WALLET SERVICE SUMMARY
- **`addBalance` Logic & Validation**:
  - Validates amount is a positive integer (> 0). Validates currency is "USD" or "IQD".
  - Within a single transaction: increments `balance_usd`/`balance_iqd` on the wallet, inserts a `deposit` transaction log with reference data (if present), and returns the updated wallet.
- **`deductBalance` Logic & Validation**:
  - Validates amount is a positive integer (> 0). Validates currency is "USD" or "IQD".
  - Runs a pre-check: if current balance < amount, creates a rejected audit log via a separate process and throws a 400 error.
  - Within a single transaction: decrements the balance, checks that the final balance >= 0, inserts a `deduction` transaction log, and returns the updated wallet.
- **Negative Balance Prevention**: Checked at service-level before database execution, and protected via an additional post-decrement safety constraint inside the transaction boundary.
- **Atomicity and Rollback**: All wallet balances and transaction insertions execute within a transaction block (`$transaction`). If ledger insertion fails, the database rollback triggers automatically.
- **Rejected Deduction Handling**: Handled via `wallet_deduction_rejected` audit log creation (wrapped in try/catch to avoid interrupting the main flow).

---

## 6. BACKEND API SUMMARY
- **`GET /api/wallets/:agentId`**
  - **Permission:** `wallets:read`
  - **Behavior:** Returns balances/status. Enforces scoping (Super Admin/Ops can read any; Branch Manager can read agents in own branch; Agent can only read own).
- **`GET /api/wallets/:agentId/transactions`**
  - **Permission:** `wallets:read`
  - **Behavior:** Returns paginated transactions ordered by `created_at DESC`. Applies same scoping as GET wallet.
- **`POST /api/wallets/:agentId/deposit`**
  - **Permission:** `wallets:write`
  - **Behavior:** Validates payload against `depositSchema`. Only accessible to `super_admin` and `operations_manager`. Logs `wallet_balance_added` audit event.
- **`POST /api/wallets/:agentId/deduct`**
  - **Permission:** `wallets:write`
  - **Behavior:** Validates payload against `deductSchema`. Only accessible to `super_admin` and `operations_manager`. Logs `wallet_balance_deducted` (or `wallet_deduction_rejected`) audit event.

* **UPDATE / DELETE Endpoint Check**: No PUT, PATCH, or DELETE routes exist for transaction records. The ledger is strictly append-only.

---

## 7. FRONTEND UI SUMMARY
- **Admin Wallet Page (`/admin/wallets`)**: Protected by RBAC. Shows all agents. Admins can search by name, filter by branch/status, select an agent, perform deposits/deductions (with Zod validated forms), and view transaction history. All labels, messages, and validation errors are in Arabic.
- **Agent Wallet Page (`/agent/wallet`)**: Protected by RBAC. Agent sees their own wallet balances and paginated transaction history.
- **Shared Monetary Formatting**: Uses a central formatter module. Stored values are formatted as:
  - **USD**: `1,500.00 $` (cents to USD representation).
  - **IQD**: `1,500,000 د.ع` (fils to IQD representation).
- **Agent View Restriction**: The "منفذ العملية" (performer) column is completely hidden from agents.
- **RTL Arabic Support**: All pages are formatted dynamically with Right-to-Left styling (`dir="rtl"`).

---

## 8. RBAC WALLET PERMISSIONS BY ROLE
The permission matrix configured in `seed.ts` and enforced via `requirePermission` middleware is as follows:

| Role | wallets:read | wallets:write |
| :--- | :---: | :---: |
| super_admin | YES | YES |
| operations_manager | YES | YES |
| branch_manager | YES | NO |
| senior_agent | YES | NO |
| junior_agent | YES | NO |
| support_staff | NO | NO |
| customer accounts | NO | NO |

### Endpoint Access Verification
- **5a. Can `operations_manager` call `POST /api/wallets/:agentId/deposit`?** YES.
- **5b. Can `operations_manager` call `POST /api/wallets/:agentId/deduct`?** YES.
- **5c. Can `senior_agent` access `GET /api/wallets/:ownAgentId` to view their own wallet only?** YES (cross-agent wallet reads are blocked with HTTP 403).
- **5d. Is `senior_agent` blocked from deposit and deduct APIs with HTTP 403 and an Arabic error message?** YES (returns HTTP 403 and message: `"ليس لديك صلاحية للوصول إلى هذه الصفحة"`).
- **5e. Is any customer account blocked from all wallet API endpoints with HTTP 403?** YES.
- **5f. Is direct URL access to `/admin/wallets` blocked for agents and customers showing the Arabic message: "لا تملك صلاحية الوصول إلى هذه الصفحة."?** YES (checked on frontend via page-level layout guards, displaying `ar.wallets.unauthorizedPage`).

---

## 9. IQD MONEY HANDLING AND DISPLAY BEHAVIOR
- **Stored Unit**: Fils (stored as integer).
- **API Input Format**: Integer in fils. For example, if an admin deposits 15,000 dinars, the API receives the integer `15000000` (15,000 * 1,000 fils) in the request body amount field.
- **UI Input and Labels**: The frontend amount input field prompts the user in fils. The field label is dynamically set to: `المبلغ (بالفلس)` (Amount (in fils)) when IQD is selected. The placeholder displays `مثال: 1500`. The admin enters the amount directly in fils.
- **Conversion Point**: There is no arithmetic conversion performed on the input when sending it to the API. Both UI and API handle fils directly. 
- **Display Formatting**: The formatting and conversion back to whole dinars for display is performed in `client/src/utils/formatCurrency.ts` within the `formatIQD` function. It takes the database value (in fils), divides it by 1,000, rounds it to the nearest whole integer using `Math.round`, and formats it with thousands separators using `Intl.NumberFormat`.
- **Concrete Display Example**: If the database stores `15000000` fils, it is displayed as `15,000 د.ع`.
- **Arithmetic Integrity**: All wallet operations (deposits, deductions, balance mutations) across backend controllers, services, database tables, Zod validators, and frontend forms use integer-only arithmetic. Floating-point arithmetic is strictly avoided.

---

## 10. REJECTED DEDUCTION AUDIT LOG PERSISTENCE
- **3a. Audit Log Creation**: A `wallet_deduction_rejected` audit log is persistently written to the database whenever a deduction attempt fails due to insufficient balance.
- **3b. Transaction Isolation**: The `AuditService.logAction` call for `wallet_deduction_rejected` is executed outside/before any database transaction block. Thus, when the service rejects the deduction and throws a 400 error, the audit log remains persistently saved in the database and is never rolled back.
- **3c. Ledger Verification**: No `wallet_transactions` record is created for a rejected deduction.
- **3d. Balance Immutability**: The wallet balance remains completely unchanged.
- **3e. Practical Verification**: Tested and verified under test scenario 7.8: attempting to deduct funds exceeding the balance returns HTTP 400 with the localized error message *"الرصيد غير كافٍ لإتمام عملية الخصم."*, leaves the wallet balances completely unchanged, inserts no ledger record, and successfully persists a `wallet_deduction_rejected` audit log in the database.

---

## 11. BUILD AND TYPESCRIPT COMPILATION RESULTS
- **Production app `tsc` check**: Passed with zero compiler errors.
- **Production compile (`npm run build` equivalent)**: Passed with zero errors.
- **Dev-only script exclusion**: Production TypeScript compilation (`node node_modules/typescript/bin/tsc`) excludes `src/scripts` via `tsconfig.json`.
- **Execution of test-sprint5.ts**: Executed dynamically via `npx tsx` and not separately checked by production `tsc`.
- **Error suppression**: No production TypeScript errors were suppressed.

---

## 12. SCOPE CONFIRMATION
- Sprint 6 not started: **CONFIRMED**
- Payment gateway not implemented: **CONFIRMED**
- Online payments not implemented: **CONFIRMED**
- Customer payment flows not implemented: **CONFIRMED**
- Debts not implemented: **CONFIRMED**
- Penalties not implemented: **CONFIRMED**
- Automatic financial blocking not implemented: **CONFIRMED**
- Exchange-rate automation not implemented: **CONFIRMED**
- Financial closure workflow not implemented: **CONFIRMED**
- Wallet operations not triggered by stage changes: **CONFIRMED**
- WhatsApp not implemented: **CONFIRMED**
- SMS not implemented: **CONFIRMED**
- AI or OCR not implemented: **CONFIRMED**
- Native mobile app not implemented: **CONFIRMED**
- Full customer PWA not implemented: **CONFIRMED**
- Advanced analytics not implemented: **CONFIRMED**
- Phase 2 features not implemented: **CONFIRMED**
- `prisma db push` not used: **CONFIRMED**
- `clear-db` not used: **CONFIRMED**
- Destructive database reset not used: **CONFIRMED**

---

## 13. SPRINT 6 CONFIRMATION
- Sprint 6 was not started.
- No forbidden features were implemented.

---

## 14. FINAL RECOMMENDATION
Sprint 5 is ready for Technical Director review.

---

## 15. FOOTER
Sprint 5 final report updated by Antigravity.  
Awaiting Technical Director review and Sprint 6 approval.
