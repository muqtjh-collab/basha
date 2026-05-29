# Sprint 5 — Agent Wallet Foundation Implementation Plan

This implementation plan outlines the structural, logic, and page-level changes to establish the agent wallet foundation in Al-Basha.

---

## 1. EXISTING WALLET SCHEMA
The current `wallets` table in `prisma/schema.prisma` is structured as follows:

```prisma
model Wallet {
  id         String       @id @default(uuid()) @db.Uuid
  agentId    String       @unique @map("agent_id") @db.Uuid
  balanceUsd Int          @default(0) @map("balance_usd") // in cents
  balanceIqd Int          @default(0) @map("balance_iqd") // in fils
  status     WalletStatus @default(active)
  createdAt  DateTime     @default(now()) @map("created_at")
  updatedAt  DateTime     @updatedAt @map("updated_at")

  agent      User         @relation(fields: [agentId], references: [id])
  transactions WalletTransaction[]
  receipts   Receipt[]

  @@map("wallets")
}
```

### Constraints & Types
- `id`: UUID (Primary Key), auto-generated.
- `agentId`: UUID, unique index (ensuring one wallet per agent).
- `balanceUsd`: Integer, stored in cents (representing USD).
- `balanceIqd`: Integer, stored in fils (representing IQD).
- `status`: Enum value (`active` or `frozen`).
- `createdAt` & `updatedAt`: Automatic database timestamps.

---

## 2. EXISTING WALLET TRANSACTIONS SCHEMA
The current `wallet_transactions` table in `prisma/schema.prisma` is structured as follows:

```prisma
model WalletTransaction {
  id            String                @id @default(uuid()) @db.Uuid
  walletId      String                @map("wallet_id") @db.Uuid
  type          WalletTransactionType
  amount        Int // positive for deposits, negative for deductions
  currency      Currency
  description   String
  descriptionAr String                @map("description_ar")
  referenceType String?               @map("reference_type") // manual, vehicle, receipt
  referenceId   String?               @map("reference_id") @db.Uuid
  performedBy   String                @map("performed_by") @db.Uuid
  createdAt     DateTime              @default(now()) @map("created_at")

  wallet        Wallet                @relation(fields: [walletId], references: [id], onDelete: Cascade)
  performer     User                  @relation(fields: [performedBy], references: [id])

  @@map("wallet_transactions")
}
```

### Constraints & Immutability
- This table must be treated as **APPEND-ONLY**.
- No `PUT`, `PATCH`, or `DELETE` API routes or operations may exist for transaction records.
- All transaction details are preserved permanently.

---

## 3. EXISTING RELATIONS
The existing relations on the `User` model (`prisma/schema.prisma`) related to wallets are:
- **`wallet`**: A one-to-one optional relation matching `User.id` to `Wallet.agentId` (`wallet Wallet?`).
- **`performedTransactions`**: A one-to-many relation matching `User.id` to `WalletTransaction.performedBy` (`performedTransactions WalletTransaction[]`).

---

## 4. MISSING COMPONENTS
The following components are currently missing and will be implemented during Sprint 5:
- **Wallet Router**: `server/src/routes/wallet.routes.ts`
- **Wallet Controller**: `server/src/controllers/walletController.ts`
- **Wallet Service**: `server/src/services/walletService.ts`
- **Validation Schemas**: `server/src/validators/sprint5.validators.ts`
- **Admin Wallets Page**: `client/src/pages/admin/WalletsList.tsx`
- **Agent Wallet Page**: `client/src/pages/agent/AgentWallet.tsx`

---

## 5. AUDITACTION ENUM ADDITIONS REQUIRED
The `AuditAction` enum currently lacks specific actions for wallet mutations. We will update the schema and run a proper Prisma migration:
- **Added Actions**:
  - `wallet_balance_added`
  - `wallet_balance_deducted`
  - `wallet_deduction_rejected`
- **Constraints**:
  - No other enum values will be added.
  - `prisma db push` is **FORBIDDEN**. A proper named migration will be generated using `npx prisma migrate dev --name add_sprint5_audit_actions`.

---

## 6. MONEY HANDLING APPROACH
Monetary operations will use integer arithmetic exclusively:
- **USD**: Stored in cents (e.g. $15.00 stored as `1500`).
- **IQD**: Stored in fils in the existing schema (e.g. 15,000 د.ع stored as `15000000` fils).
- **Rounding & Operations**: Backend will not perform division, multiplication, or rounding of money values. All operations are integer addition and subtraction.
- **Floating-point**: Floating-point (`double`, `float`) and PostgreSQL `Decimal` types are strictly prohibited.
- **Frontend Display**: Conversions and formatting happen on the frontend via shared utility functions.
  - USD displays as: `1,500.00 $`
  - IQD displays as: `15,000,000 د.ع`

---

## 7. RBAC APPROACH
Permissions are enforced at both controller and route levels:
- **`super_admin` & `operations_manager`**: Full access to view all wallets, view all transaction logs, deposit balance, and deduct balance.
- **`branch_manager`**: Read-only access to wallets and transaction logs for agents assigned to their own branch. Blocked from adding or deducting balance.
- **`senior_agent` & `junior_agent`**: Read-only access to their own wallet and their own transaction history. Blocked from viewing other agents' wallets or triggering deposits/deductions.
- **`support_staff`**: Blocked from all wallet routes (no read/write access).
- **Customer Accounts**: Blocked from all wallet routes (no read/write access).

---

## 8. AUDIT LOGGING APPROACH
Audit logs are written during mutations within try/catch blocks:
- **`wallet_balance_added`**: Logged on successful deposit.
- **`wallet_balance_deducted`**: Logged on successful deduction.
- **`wallet_deduction_rejected`**: Logged when a deduction fails due to insufficient balance.
- All logging calls are wrapped in `try/catch` to ensure database transaction completion even if the audit write encounters errors.

---

## 9. FORBIDDEN SCOPE BOUNDARIES
The following features are completely out of scope and forbidden in Sprint 5:
- Payment gateway or online payment integration.
- Customer-facing payment interfaces.
- Debts or penalties logic.
- Automatic financial blocking rules.
- Exchange-rate automation or currency conversions.
- Final financial closure workflow.
- Wallet operations triggered automatically by shipping stage changes.
- Modification of shipment status workflow.
- WhatsApp, SMS, or external messaging notifications.
- AI, OCR, or machine learning.
- Native mobile app.
- Full customer PWA.
- Advanced reports or analytics.
- Phase 2 features.
- `prisma db push`.
- `clear-db`.
- Destructive database resets.
- Sprint 6 tasks.

---

## 10. VERIFICATION PLAN

### Automated Testing
We will create and run `server/src/scripts/test-sprint5.ts` containing the following checks:
1. **Authorized Wallet View**: Verify operations_manager can request any wallet details.
2. **Agent Own Access**: Verify agent A can request own wallet details.
3. **Agent Cross-Access Block**: Verify agent A is blocked (403) from fetching agent B's wallet.
4. **Valid Deposit**: Verify deposit updates balance and writes transaction record + audit.
5. **Invalid Deposit Value**: Verify deposit of 0 or negative values is rejected with HTTP 400.
6. **Valid Deduction**: Verify deduction updates balance and writes transaction record + audit.
7. **Insufficient Balance**: Verify deduction exceeding balance is rejected with HTTP 400, balance remains unchanged, and a rejected audit is created.
8. **Deduction Atomicity**: Verify that if transaction record insertion fails, the balance update rolls back.
9. **Role Scoping Block**: Verify agent cannot deposit or deduct (403).
10. **Customer Scoping Block**: Verify customer cannot access `/agent/wallet` or `/admin/wallets`.
11. **Transaction Immutability**: Verify DELETE/PUT on transaction logs returns 404/405.
12. **RTL Arabic UI check**: Compile build and check language mapping.
13. **Audit Log Viewer Integration**: Confirm the audit log records appear in the database.
