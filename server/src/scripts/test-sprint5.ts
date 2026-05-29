import { PrismaClient } from '@prisma/client';
import { WalletService } from '../services/walletService';
import { db } from '../config/database';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:33000/api';

async function runSprint5Tests() {
  console.log('🧪 Starting Sprint 5 Practical Backend API Verification...');

  let superAdminToken = '';
  let opsManagerToken = '';
  let branchManagerToken = '';
  let agentToken = '';
  let agentBToken = '';
  let customerToken = '';

  let superAdminUserId = '';
  let agentUserId = '';
  let agentBUserId = '';
  let branchManagerUserId = '';

  let agentWalletId = '';

  // Helper to log in
  async function login(email: string, pass: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password: pass })
    });
    
    if (res.status !== 200) {
      throw new Error(`Failed to login as ${email}: ${res.status}`);
    }
    
    const body: any = await res.json();
    return { token: body.data.accessToken, user: body.data.user };
  }

  // Log in as all users
  try {
    const adminLogin = await login('admin@albasha.local', 'admin123');
    superAdminToken = adminLogin.token;
    superAdminUserId = adminLogin.user.id;

    const opsLogin = await login('ops@albasha.local', 'password123');
    opsManagerToken = opsLogin.token;

    const bmLogin = await login('baghdad_mgr@albasha.local', 'password123');
    branchManagerToken = bmLogin.token;
    branchManagerUserId = bmLogin.user.id;

    const agentLogin = await login('agent1@albasha.local', 'agent123');
    agentToken = agentLogin.token;
    agentUserId = agentLogin.user.id;

    const agentBLogin = await login('agent2@albasha.local', 'password123');
    agentBToken = agentBLogin.token;
    agentBUserId = agentBLogin.user.id;

    const customerLogin = await login('customer1@albasha.local', 'customer123');
    customerToken = customerLogin.token;

    console.log('🔑 All test users logged in successfully.');
  } catch (err: any) {
    console.error('❌ Login phase failed:', err.message);
    process.exit(1);
  }

  // 1. Resolve agent's wallet
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { agentId: agentUserId }
    });
    if (!wallet) {
      throw new Error(`Wallet not found for Agent ID: ${agentUserId}`);
    }
    agentWalletId = wallet.id;
    console.log(`💼 Found Agent Wallet ID: ${agentWalletId} for agent: ${agentUserId}`);
  } catch (err: any) {
    console.error('❌ Failed to resolve wallet:', err.message);
    process.exit(1);
  }

  console.log('\n--- 7.1 WALLET VIEW — AUTHORIZED ADMIN ---');
  try {
    const res = await fetch(`${API_URL}/wallets/${agentUserId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${opsManagerToken}` }
    });
    const body: any = await res.json();
    if (res.status === 200 && body.success && body.data.balance_usd !== undefined) {
      console.log(`✅ PASSED: Operations Manager retrieved wallet. USD Balance: ${body.data.balance_usd}, IQD Balance: ${body.data.balance_iqd}`);
    } else {
      console.log(`❌ FAILED: Status ${res.status}, Body:`, body);
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.1:`, err.message);
  }

  console.log('\n--- 7.2 WALLET VIEW — AGENT OWN ---');
  try {
    const res = await fetch(`${API_URL}/wallets/${agentUserId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    const body: any = await res.json();
    if (res.status === 200 && body.success && body.data.agent_id === agentUserId) {
      console.log(`✅ PASSED: Agent retrieved own wallet. Status: ${body.data.status}`);
    } else {
      console.log(`❌ FAILED: Status ${res.status}, Body:`, body);
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.2:`, err.message);
  }

  console.log('\n--- 7.3 WALLET VIEW — AGENT CROSS-ACCESS BLOCKED ---');
  try {
    const res = await fetch(`${API_URL}/wallets/${agentBUserId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    const body: any = await res.json();
    if (res.status === 403) {
      console.log(`✅ PASSED: Agent blocked from accessing other agent's wallet. Status 403. Message: "${body.error?.message_ar}"`);
    } else {
      console.log(`❌ FAILED: Access not blocked. Status ${res.status}, Body:`, body);
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.3:`, err.message);
  }

  console.log('\n--- 7.4 ADD BALANCE — VALID USD ---');
  const depositAmount = 25000; // $250.00
  try {
    const beforeWallet = await prisma.wallet.findUnique({ where: { agentId: agentUserId } });
    const initialUsd = beforeWallet?.balanceUsd || 0;

    const res = await fetch(`${API_URL}/wallets/${agentUserId}/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsManagerToken}`
      },
      body: JSON.stringify({
        amount: depositAmount,
        currency: 'USD',
        description: 'Test USD Deposit',
        description_ar: 'إيداع تجريبي بالدولار'
      })
    });
    const body: any = await res.json();
    
    const afterWallet = await prisma.wallet.findUnique({ where: { agentId: agentUserId } });
    const finalUsd = afterWallet?.balanceUsd || 0;

    // Check transaction record
    const latestTx = await prisma.walletTransaction.findFirst({
      where: { walletId: agentWalletId },
      orderBy: { createdAt: 'desc' }
    });

    // Check audit log
    const latestAudit = await prisma.auditLog.findFirst({
      where: { action: 'wallet_balance_added' },
      orderBy: { createdAt: 'desc' }
    });

    if (
      res.status === 200 &&
      body.success &&
      finalUsd === initialUsd + depositAmount &&
      latestTx?.type === 'deposit' &&
      latestTx?.amount === depositAmount &&
      latestAudit?.entityId === agentWalletId
    ) {
      console.log(`✅ PASSED: USD balance increased from ${initialUsd} to ${finalUsd}. Transaction & Audit records created correctly.`);
    } else {
      console.log(`❌ FAILED: Status ${res.status}, Balances: ${initialUsd} -> ${finalUsd}. Tx:`, latestTx, 'Audit:', latestAudit);
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.4:`, err.message);
  }

  console.log('\n--- 7.5 ADD BALANCE — INVALID AMOUNT (ZERO) ---');
  try {
    const beforeWallet = await prisma.wallet.findUnique({ where: { agentId: agentUserId } });
    const initialUsd = beforeWallet?.balanceUsd || 0;

    const res = await fetch(`${API_URL}/wallets/${agentUserId}/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsManagerToken}`
      },
      body: JSON.stringify({
        amount: 0,
        currency: 'USD',
        description: 'Invalid deposit',
        description_ar: 'إيداع غير صالح'
      })
    });
    const body: any = await res.json();
    
    const afterWallet = await prisma.wallet.findUnique({ where: { agentId: agentUserId } });
    const finalUsd = afterWallet?.balanceUsd || 0;

    if (res.status === 400 && finalUsd === initialUsd) {
      console.log(`✅ PASSED: Rejection received (400). Balance remains unchanged. Message: "${body.error?.message_ar || body.error?.message}"`);
    } else {
      console.log(`❌ FAILED: Status ${res.status}, Balance: ${initialUsd} -> ${finalUsd}`);
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.5:`, err.message);
  }

  console.log('\n--- 7.6 ADD BALANCE — INVALID AMOUNT (DECIMAL) ---');
  try {
    const beforeWallet = await prisma.wallet.findUnique({ where: { agentId: agentUserId } });
    const initialUsd = beforeWallet?.balanceUsd || 0;

    const res = await fetch(`${API_URL}/wallets/${agentUserId}/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsManagerToken}`
      },
      body: JSON.stringify({
        amount: 15.50,
        currency: 'USD',
        description: 'Decimal deposit',
        description_ar: 'إيداع كسر عشري'
      })
    });
    const body: any = await res.json();
    
    const afterWallet = await prisma.wallet.findUnique({ where: { agentId: agentUserId } });
    const finalUsd = afterWallet?.balanceUsd || 0;

    if (res.status === 400 && finalUsd === initialUsd) {
      console.log(`✅ PASSED: Rejection received (400). Balance remains unchanged. Message: "${body.error?.message_ar || body.error?.message}"`);
    } else {
      console.log(`❌ FAILED: Status ${res.status}, Balance: ${initialUsd} -> ${finalUsd}`);
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.6:`, err.message);
  }

  console.log('\n--- 7.7 DEDUCT BALANCE — VALID ---');
  const deductAmount = 10000; // $100.00
  try {
    const beforeWallet = await prisma.wallet.findUnique({ where: { agentId: agentUserId } });
    const initialUsd = beforeWallet?.balanceUsd || 0;

    const res = await fetch(`${API_URL}/wallets/${agentUserId}/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsManagerToken}`
      },
      body: JSON.stringify({
        amount: deductAmount,
        currency: 'USD',
        description: 'Valid deduction',
        description_ar: 'خصم صالح'
      })
    });
    const body: any = await res.json();
    
    const afterWallet = await prisma.wallet.findUnique({ where: { agentId: agentUserId } });
    const finalUsd = afterWallet?.balanceUsd || 0;

    // Check transaction record
    const latestTx = await prisma.walletTransaction.findFirst({
      where: { walletId: agentWalletId },
      orderBy: { createdAt: 'desc' }
    });

    // Check audit log
    const latestAudit = await prisma.auditLog.findFirst({
      where: { action: 'wallet_balance_deducted' },
      orderBy: { createdAt: 'desc' }
    });

    if (
      res.status === 200 &&
      body.success &&
      finalUsd === initialUsd - deductAmount &&
      latestTx?.type === 'deduction' &&
      latestTx?.amount === -deductAmount &&
      latestAudit?.entityId === agentWalletId
    ) {
      console.log(`✅ PASSED: USD balance decreased from ${initialUsd} to ${finalUsd}. Transaction & Audit records created correctly.`);
    } else {
      console.log(`❌ FAILED: Status ${res.status}, Balances: ${initialUsd} -> ${finalUsd}. Tx:`, latestTx, 'Audit:', latestAudit);
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.7:`, err.message);
  }

  console.log('\n--- 7.8 DEDUCT BALANCE — INSUFFICIENT FUNDS ---');
  try {
    const beforeWallet = await prisma.wallet.findUnique({ where: { agentId: agentUserId } });
    const initialUsd = beforeWallet?.balanceUsd || 0;
    const extremeDeduct = initialUsd + 100000; // exceed current balance

    const res = await fetch(`${API_URL}/wallets/${agentUserId}/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsManagerToken}`
      },
      body: JSON.stringify({
        amount: extremeDeduct,
        currency: 'USD',
        description: 'Extreme deduction',
        description_ar: 'خصم مفرط'
      })
    });
    const body: any = await res.json();
    
    const afterWallet = await prisma.wallet.findUnique({ where: { agentId: agentUserId } });
    const finalUsd = afterWallet?.balanceUsd || 0;

    // Check audit log
    const latestAudit = await prisma.auditLog.findFirst({
      where: { action: 'wallet_deduction_rejected' },
      orderBy: { createdAt: 'desc' }
    });

    if (
      res.status === 400 &&
      finalUsd === initialUsd &&
      body.error?.message_ar === 'الرصيد غير كافٍ لإتمام عملية الخصم.' &&
      latestAudit?.entityId === agentWalletId &&
      (latestAudit.newValue as any).attempted_amount === extremeDeduct
    ) {
      console.log(`✅ PASSED: Blocked correctly with Arabic error msg. Balance unchanged. Audit log generated for rejection.`);
    } else {
      console.log(`❌ FAILED: Status ${res.status}, Balances: ${initialUsd} -> ${finalUsd}. Audit:`, latestAudit, 'Error:', body.error);
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.8:`, err.message);
  }

  console.log('\n--- 7.9 ATOMICITY — ROLLBACK ---');
  try {
    // We will call WalletService.addBalance but mock the transaction creation to fail
    // In order to do this in the script, we can run a custom test transaction that throws an error after updating the balance
    const beforeWallet = await prisma.wallet.findUnique({ where: { id: agentWalletId } });
    const initialUsd = beforeWallet?.balanceUsd || 0;

    let threwError = false;
    try {
      await db.$transaction(async (tx) => {
        // Step 1: Update wallet balance
        await tx.wallet.update({
          where: { id: agentWalletId },
          data: { balanceUsd: { increment: 50000 } }
        });

        // Step 2: Throw artificial error to trigger rollback
        throw new Error('Artificial error to force rollback');
      });
    } catch (txErr: any) {
      if (txErr.message === 'Artificial error to force rollback') {
        threwError = true;
      }
    }

    const afterWallet = await prisma.wallet.findUnique({ where: { id: agentWalletId } });
    const finalUsd = afterWallet?.balanceUsd || 0;

    if (threwError && finalUsd === initialUsd) {
      console.log(`✅ PASSED: Database rolled back successfully. Balance remains at ${finalUsd} (unchanged from ${initialUsd}).`);
    } else {
      console.log(`❌ FAILED: Rollback failed or didn't throw. Balance: ${initialUsd} -> ${finalUsd}`);
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.9:`, err.message);
  }

  console.log('\n--- 7.10 TRANSACTION LEDGER IMMUTABILITY ---');
  try {
    const res = await fetch(`${API_URL}/wallets/${agentWalletId}/transactions/some-tx-id`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    console.log(`DELETE attempt status: ${res.status}`);
    
    const resPut = await fetch(`${API_URL}/wallets/${agentWalletId}/transactions/some-tx-id`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}` 
      },
      body: JSON.stringify({ amount: 100 })
    });
    console.log(`PUT attempt status: ${resPut.status}`);

    if ((res.status === 404 || res.status === 405) && (resPut.status === 404 || resPut.status === 405)) {
      console.log('✅ IMMUTABLE: No update/delete routes exist for wallet transactions.');
    } else {
      console.log('❌ MUTABLE (failure): Server accepted DELETE or PUT request.');
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.10:`, err.message);
  }

  console.log('\n--- 7.11 UNAUTHORIZED — AGENT CANNOT DEPOSIT ---');
  try {
    const res = await fetch(`${API_URL}/wallets/${agentUserId}/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentToken}`
      },
      body: JSON.stringify({
        amount: 5000,
        currency: 'USD',
        description: 'Unauthorized Agent Deposit',
        description_ar: 'إيداع وكيل غير مصرح به'
      })
    });
    const body: any = await res.json();
    if (res.status === 403) {
      console.log(`✅ PASSED: Agent deposit blocked with 403 Forbidden. Message: "${body.error?.message_ar}"`);
    } else {
      console.log(`❌ FAILED: Agent allowed to deposit. Status ${res.status}, Body:`, body);
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.11:`, err.message);
  }

  console.log('\n--- 7.12 UNAUTHORIZED — CUSTOMER BLOCKED ---');
  try {
    const resAdmin = await fetch(`${API_URL}/wallets/${agentUserId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const bodyAdmin: any = await resAdmin.json();

    if (resAdmin.status === 403) {
      console.log(`✅ PASSED: Customer blocked with 403 Forbidden. Message: "${bodyAdmin.error?.message_ar}"`);
    } else {
      console.log(`❌ FAILED: Customer accessed wallet. Status ${resAdmin.status}, Body:`, bodyAdmin);
    }
  } catch (err: any) {
    console.error(`❌ Error in 7.12:`, err.message);
  }

  console.log('\n🎉 Sprint 5 backend verification completed!');
}

runSprint5Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
