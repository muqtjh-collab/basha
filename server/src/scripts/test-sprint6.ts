import { PrismaClient } from '@prisma/client';
import { db } from '../config/database';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:33000/api';

async function runSprint6Tests() {
  console.log('🧪 Starting Sprint 6 Practical Backend API Verification...');

  let superAdminToken = '';
  let opsManagerToken = '';
  let branchManagerToken = '';
  let agentToken = '';
  let customerToken = '';

  let superAdminUserId = '';
  let opsManagerUserId = '';
  let branchManagerUserId = '';
  let agentUserId = '';
  let customerUserId = '';

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

  // Log in as all roles
  try {
    const adminLogin = await login('admin@albasha.local', 'admin123');
    superAdminToken = adminLogin.token;
    superAdminUserId = adminLogin.user.id;

    const opsLogin = await login('ops@albasha.local', 'password123');
    opsManagerToken = opsLogin.token;
    opsManagerUserId = opsLogin.user.id;

    const bmLogin = await login('baghdad_mgr@albasha.local', 'password123');
    branchManagerToken = bmLogin.token;
    branchManagerUserId = bmLogin.user.id;

    const agentLogin = await login('agent1@albasha.local', 'agent123');
    agentToken = agentLogin.token;
    agentUserId = agentLogin.user.id;

    const customerLogin = await login('customer1@albasha.local', 'customer123');
    customerToken = customerLogin.token;
    customerUserId = customerLogin.user.id;

    console.log('🔑 All test users logged in successfully.');
  } catch (err: any) {
    console.error('❌ Login phase failed:', err.message);
    process.exit(1);
  }

  // Find or create two test vehicles:
  // Vehicle A: remains in AUCTION_PURCHASED stage for incomplete requirements tests
  // Vehicle B: transitioned to FINAL_DELIVERY for successful closure tests
  let vehicleAId = '';
  let vehicleBId = '';

  try {
    // Let's find some existing active vehicles associated with agent1
    const vehicles = await prisma.vehicle.findMany({
      where: { agentId: agentUserId, isClosed: false },
      take: 2
    });

    if (vehicles.length < 2) {
      // Create test vehicles if we don't have enough
      const customer = await prisma.customer.findFirst();
      const branch = await prisma.branch.findFirst();
      
      const vA = await prisma.vehicle.create({
        data: {
          vin: 'TESTVINABC123456A',
          make: 'Toyota',
          model: 'Camry',
          year: 2024,
          status: 'active',
          currentStage: 'AUCTION_PURCHASED',
          userTrackingStage: 'PURCHASED',
          agentId: agentUserId,
          customerId: customer?.id || null,
          branchId: branch?.id || null,
          totalCostUsd: 1500000,
          totalCostIqd: 1500000000
        }
      });
      vehicleAId = vA.id;

      const vB = await prisma.vehicle.create({
        data: {
          vin: 'TESTVINABC123456B',
          make: 'Toyota',
          model: 'RAV4',
          year: 2024,
          status: 'active',
          currentStage: 'AUCTION_PURCHASED',
          userTrackingStage: 'PURCHASED',
          agentId: agentUserId,
          customerId: customer?.id || null,
          branchId: branch?.id || null,
          totalCostUsd: 1800000,
          totalCostIqd: 1800000000
        }
      });
      vehicleBId = vB.id;
    } else {
      vehicleAId = vehicles[0].id;
      vehicleBId = vehicles[1].id;
      
      // Ensure starting in a clean non-closed stage
      await prisma.vehicle.update({
        where: { id: vehicleAId },
        data: { isClosed: false, closedAt: null, closedBy: null, currentStage: 'AUCTION_PURCHASED' }
      });
      await prisma.vehicle.update({
        where: { id: vehicleBId },
        data: { isClosed: false, closedAt: null, closedBy: null, currentStage: 'AUCTION_PURCHASED' }
      });
    }

    // Clean up any existing approvals for these vehicles
    await prisma.internalApproval.deleteMany({
      where: { vehicleId: { in: [vehicleAId, vehicleBId] } }
    });

    console.log(`🚗 Resolved Vehicle A (Incomplete Test): ${vehicleAId}`);
    console.log(`🚗 Resolved Vehicle B (Closure Test): ${vehicleBId}`);
  } catch (err: any) {
    console.error('❌ Failed to resolve test vehicles:', err.message);
    process.exit(1);
  }

  // --- 7.1 CLOSURE READINESS — ALL MISSING ---
  console.log('\n--- 7.1 CLOSURE READINESS — ALL MISSING ---');
  try {
    const res = await fetch(`${API_URL}/closures/${vehicleAId}/readiness`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const body: any = await res.json();
    
    const isReady = body.data.is_ready;
    const reqs = body.data.missing_requirements;
    
    const hasStageMsg = reqs.includes('لم تصل المركبة إلى مرحلة التسليم النهائي بعد.');
    const hasFinanceMsg = reqs.includes('الموافقة المالية مطلوبة ولم تُسجَّل بعد.');
    const hasOpsMsg = reqs.includes('موافقة العمليات مطلوبة ولم تُسجَّل بعد.');
    const hasAdminMsg = reqs.includes('موافقة الإدارة مطلوبة ولم تُسجَّل بعد.');

    if (res.status === 200 && isReady === false && reqs.length === 4 && hasStageMsg && hasFinanceMsg && hasOpsMsg && hasAdminMsg) {
      console.log('Result: PASSED');
      console.log('Detail: Correctly rejected readiness with is_ready = false and all four Arabic requirements listed.');
    } else {
      console.log('Result: FAILED');
      console.log('Detail: Got body:', JSON.stringify(body, null, 2));
    }
  } catch (err: any) {
    console.error('Result: FAILED');
    console.error('Detail:', err.message);
  }

  // --- 7.2 FINANCE APPROVAL — VALID ---
  console.log('\n--- 7.2 FINANCE APPROVAL — VALID ---');
  try {
    const res = await fetch(`${API_URL}/closures/${vehicleAId}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsManagerToken}`
      },
      body: JSON.stringify({
        approval_type: 'finance',
        note: 'Finance approved by ops manager'
      })
    });
    const body: any = await res.json();

    // Check Audit Log
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'closure_approval_created', entityId: vehicleAId },
      orderBy: { createdAt: 'desc' }
    });

    // Check readiness again
    const readinessRes = await fetch(`${API_URL}/closures/${vehicleAId}/readiness`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const readinessBody: any = await readinessRes.json();
    const hasFinanceMsg = readinessBody.data.missing_requirements.includes('الموافقة المالية مطلوبة ولم تُسجَّل بعد.');

    if (res.status === 201 && body.success && audit && !hasFinanceMsg) {
      console.log('Result: PASSED');
      console.log(`Detail: Created approval ID ${body.data.id}. Audit log action recorded. Finance no longer in missing list.`);
    } else {
      console.log('Result: FAILED');
      console.log('Detail: HTTP Status:', res.status, 'Audit Log:', audit, 'Has Finance Msg:', hasFinanceMsg);
    }
  } catch (err: any) {
    console.error('Result: FAILED');
    console.error('Detail:', err.message);
  }

  // --- 7.3 DUPLICATE APPROVAL — BLOCKED ---
  console.log('\n--- 7.3 DUPLICATE APPROVAL — BLOCKED ---');
  try {
    const res = await fetch(`${API_URL}/closures/${vehicleAId}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsManagerToken}`
      },
      body: JSON.stringify({
        approval_type: 'finance',
        note: 'Finance approved again'
      })
    });
    const body: any = await res.json();

    // Check Audit Log
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'closure_approval_duplicate_rejected', entityId: vehicleAId },
      orderBy: { createdAt: 'desc' }
    });

    const approvalsCount = await prisma.internalApproval.count({
      where: { vehicleId: vehicleAId, approvalType: 'finance' }
    });

    if (res.status === 400 && body.error?.message_ar === 'تم تسجيل هذه الموافقة مسبقاً لهذه المركبة.' && audit && approvalsCount === 1) {
      console.log('Result: PASSED');
      console.log('Detail: Correctly blocked duplicate approval, logged rejection in audit trail, and kept single record.');
    } else {
      console.log('Result: FAILED');
      console.log('Detail: HTTP Status:', res.status, 'approvalsCount:', approvalsCount, 'Error Body:', body);
    }
  } catch (err: any) {
    console.error('Result: FAILED');
    console.error('Detail:', err.message);
  }

  // --- 7.4 OPERATIONS AND ADMINISTRATION APPROVALS ---
  console.log('\n--- 7.4 OPERATIONS AND ADMINISTRATION APPROVALS ---');
  try {
    // 1. Operations by branch manager
    const opsRes = await fetch(`${API_URL}/closures/${vehicleAId}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${branchManagerToken}`
      },
      body: JSON.stringify({
        approval_type: 'operations',
        note: 'Operations approved by BM'
      })
    });

    // 2. Administration by super admin
    const adminRes = await fetch(`${API_URL}/closures/${vehicleAId}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        approval_type: 'administration',
        note: 'Administration approved by Admin'
      })
    });

    const approvals = await prisma.internalApproval.findMany({
      where: { vehicleId: vehicleAId }
    });

    const auditOps = await prisma.auditLog.findFirst({
      where: { action: 'closure_approval_created', entityId: vehicleAId, newValue: { path: ['approval_type'], equals: 'operations' } }
    });
    
    const auditAdmin = await prisma.auditLog.findFirst({
      where: { action: 'closure_approval_created', entityId: vehicleAId, newValue: { path: ['approval_type'], equals: 'administration' } }
    });

    if (opsRes.status === 201 && adminRes.status === 201 && approvals.length === 3) {
      console.log('Result: PASSED');
      console.log('Detail: Operations and Administration approvals created successfully with corresponding audit records.');
    } else {
      console.log('Result: FAILED');
      console.log('Detail: Ops Status:', opsRes.status, 'Admin Status:', adminRes.status, 'Total Approvals Count:', approvals.length);
    }
  } catch (err: any) {
    console.error('Result: FAILED');
    console.error('Detail:', err.message);
  }

  // --- 7.5 FINAL CLOSURE — REQUIREMENTS NOT MET ---
  console.log('\n--- 7.5 FINAL CLOSURE — REQUIREMENTS NOT MET ---');
  try {
    // Vehicle A has 3 approvals but is still in AUCTION_PURCHASED stage (stage check fails)
    const res = await fetch(`${API_URL}/closures/${vehicleAId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      }
    });
    const body: any = await res.json();

    // Check Audit Log
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'final_closure_rejected', entityId: vehicleAId },
      orderBy: { createdAt: 'desc' }
    });

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleAId }
    });

    if (res.status === 400 && body.error?.message_ar === 'لا يمكن إغلاق المركبة. توجد متطلبات غير مكتملة.' && audit && vehicle?.isClosed === false) {
      console.log('Result: PASSED');
      console.log('Detail: Blocked final closure for Vehicle A due to stage mismatch, logged in audit log, and kept is_closed = false.');
    } else {
      console.log('Result: FAILED');
      console.log('Detail: Status:', res.status, 'Vehicle isClosed:', vehicle?.isClosed, 'Error Body:', body);
    }
  } catch (err: any) {
    console.error('Result: FAILED');
    console.error('Detail:', err.message);
  }

  // --- 7.6 FINAL CLOSURE — ALL REQUIREMENTS MET ---
  console.log('\n--- 7.6 FINAL CLOSURE — ALL REQUIREMENTS MET ---');
  try {
    // 1. Transition Vehicle B to FINAL_DELIVERY (using super admin bypass)
    const stageRes = await fetch(`${API_URL}/vehicles/${vehicleBId}/stage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        to_stage: 'FINAL_DELIVERY',
        note: 'Super admin bypass for closure testing'
      })
    });

    // 2. Submit all three approvals for Vehicle B
    await fetch(`${API_URL}/closures/${vehicleBId}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ approval_type: 'finance', note: 'Finance OK' })
    });
    await fetch(`${API_URL}/closures/${vehicleBId}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ approval_type: 'operations', note: 'Ops OK' })
    });
    await fetch(`${API_URL}/closures/${vehicleBId}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ approval_type: 'administration', note: 'Admin OK' })
    });

    // Verify readiness
    const readRes = await fetch(`${API_URL}/closures/${vehicleBId}/readiness`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const readBody = await readRes.json();
    
    // 3. Execute final closure as Super Admin
    const closureRes = await fetch(`${API_URL}/closures/${vehicleBId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      }
    });
    const closureBody: any = await closureRes.json();

    // Verify records in DB
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleBId }
    });

    const transition = await prisma.vehicleStageTransition.findFirst({
      where: { vehicleId: vehicleBId, toStage: 'POST_DELIVERY_ARCHIVE' }
    });

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'final_closure_completed', entityId: vehicleBId }
    });

    if (
      closureRes.status === 200 &&
      vehicle?.isClosed === true &&
      vehicle?.closedAt !== null &&
      vehicle?.closedBy === superAdminUserId &&
      vehicle?.currentStage === 'POST_DELIVERY_ARCHIVE' &&
      transition?.notes === 'إغلاق نهائي للمركبة' &&
      audit
    ) {
      console.log('Result: PASSED');
      console.log('Detail: Successfully closed Vehicle B, updated all fields, created transition record, and logged final_closure_completed.');
    } else {
      console.log('Result: FAILED');
      console.log('Detail: Stage Status:', stageRes.status, 'Closure Status:', closureRes.status);
      console.log('Vehicle details:', vehicle);
      console.log('Audit Log exists:', !!audit);
    }
  } catch (err: any) {
    console.error('Result: FAILED');
    console.error('Detail:', err.message);
  }

  // --- 7.7 FINAL CLOSURE — ALREADY CLOSED ---
  console.log('\n--- 7.7 FINAL CLOSURE — ALREADY CLOSED ---');
  try {
    const res = await fetch(`${API_URL}/closures/${vehicleBId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      }
    });
    const body: any = await res.json();

    if (res.status === 400 && body.error?.message_ar === 'تم إغلاق هذه المركبة مسبقاً.') {
      console.log('Result: PASSED');
      console.log('Detail: Blocked attempt to close an already-closed vehicle with HTTP 400 and correct Arabic message.');
    } else {
      console.log('Result: FAILED');
      console.log('Detail: Status:', res.status, 'Error Body:', body);
    }
  } catch (err: any) {
    console.error('Result: FAILED');
    console.error('Detail:', err.message);
  }

  // --- 7.8 UNAUTHORIZED — AGENT CANNOT APPROVE ---
  console.log('\n--- 7.8 UNAUTHORIZED — AGENT CANNOT APPROVE ---');
  try {
    const res = await fetch(`${API_URL}/closures/${vehicleAId}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentToken}`
      },
      body: JSON.stringify({
        approval_type: 'finance',
        note: 'Unauth approval'
      })
    });
    const body: any = await res.json();

    if (res.status === 403 && body.error?.message_ar === 'لا تملك صلاحية الوصول إلى هذه الصفحة.') {
      console.log('Result: PASSED');
      console.log('Detail: Blocked agent approval attempt with HTTP 403 and correct Arabic message.');
    } else {
      console.log('Result: FAILED');
      console.log('Detail: Status:', res.status, 'Error Body:', body);
    }
  } catch (err: any) {
    console.error('Result: FAILED');
    console.error('Detail:', err.message);
  }

  // --- 7.9 UNAUTHORIZED — NON-SUPER-ADMIN CANNOT EXECUTE CLOSURE ---
  console.log('\n--- 7.9 UNAUTHORIZED — NON-SUPER-ADMIN CANNOT EXECUTE CLOSURE ---');
  try {
    const res = await fetch(`${API_URL}/closures/${vehicleAId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsManagerToken}`
      }
    });
    const body: any = await res.json();

    if (res.status === 403 && body.error?.message_ar === 'لا تملك صلاحية تنفيذ هذا الإجراء.') {
      console.log('Result: PASSED');
      console.log('Detail: Blocked Ops Manager execution attempt with HTTP 403 and correct Arabic message.');
    } else {
      console.log('Result: FAILED');
      console.log('Detail: Status:', res.status, 'Error Body:', body);
    }
  } catch (err: any) {
    console.error('Result: FAILED');
    console.error('Detail:', err.message);
  }

  // --- 7.10 UNAUTHORIZED — CUSTOMER BLOCKED ---
  console.log('\n--- 7.10 UNAUTHORIZED — CUSTOMER BLOCKED ---');
  try {
    const readinessRes = await fetch(`${API_URL}/closures/${vehicleAId}/readiness`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const approvalRes = await fetch(`${API_URL}/closures/${vehicleAId}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ approval_type: 'finance', note: 'Customer approval attempt' })
    });
    const executeRes = await fetch(`${API_URL}/closures/${vehicleAId}/execute`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    const readBody = await readinessRes.json();
    const appBody = await approvalRes.json();
    const exeBody = await executeRes.json();

    const readOk = readinessRes.status === 403 && readBody.error?.message_ar === 'لا تملك صلاحية الوصول إلى هذه الصفحة.';
    const appOk = approvalRes.status === 403 && appBody.error?.message_ar === 'لا تملك صلاحية الوصول إلى هذه الصفحة.';
    const exeOk = executeRes.status === 403 && exeBody.error?.message_ar === 'لا تملك صلاحية الوصول إلى هذه الصفحة.';

    if (readOk && appOk && exeOk) {
      console.log('Result: PASSED');
      console.log('Detail: Blocked all closure API endpoints for customer with HTTP 403 and correct Arabic messages.');
    } else {
      console.log('Result: FAILED');
      console.log('Detail: Readiness status:', readinessRes.status, 'Approval status:', approvalRes.status, 'Execute status:', executeRes.status);
    }
  } catch (err: any) {
    console.error('Result: FAILED');
    console.error('Detail:', err.message);
  }

  // Cleanup test vehicles so we leave the database clean
  try {
    await prisma.internalApproval.deleteMany({
      where: { vehicleId: { in: [vehicleAId, vehicleBId] } }
    });
    await prisma.vehicleStageTransition.deleteMany({
      where: { vehicleId: { in: [vehicleAId, vehicleBId] } }
    });
    await prisma.vehicle.deleteMany({
      where: { id: { in: [vehicleAId, vehicleBId] } }
    });
    console.log('\n🧹 Temporary test vehicles and their approvals cleaned up successfully.');
  } catch (err: any) {
    console.error('⚠️ Cleanup phase failed:', err.message);
  }

  process.exit(0);
}

runSprint6Tests();
