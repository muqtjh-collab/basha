import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:33000/api';

async function runSprint4Tests() {
  console.log('🧪 Starting Sprint 4 Practical Backend API Verification...');

  let superAdminToken = '';
  let opsManagerToken = '';
  let branchManagerToken = '';
  let agentToken = '';
  let customerToken = '';

  let superAdminUserId = '';
  let branchManagerUserId = '';

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

    const customerLogin = await login('customer1@albasha.local', 'customer123');
    customerToken = customerLogin.token;

    console.log('🔑 All test users logged in successfully.');
  } catch (err: any) {
    console.error('❌ Login phase failed:', err.message);
    process.exit(1);
  }

  // Find or create a test vehicle to perform transitions on
  let vehicleId = '';
  try {
    // 1. Fetch branch manager details to find their branchId
    const bmUser = await prisma.user.findFirst({
      where: { email: 'baghdad_mgr@albasha.local' }
    });
    if (!bmUser || !bmUser.branchId) {
      throw new Error('Branch manager baghdad_mgr@albasha.local or their branchId not found.');
    }

    // 2. Query for an agent in the branch manager's branch
    const testAgent = await prisma.user.findFirst({
      where: {
        role: { name: { in: ['junior_agent', 'senior_agent'] } },
        branchId: bmUser.branchId
      }
    });
    if (!testAgent) {
      throw new Error(`No agent found in branch ${bmUser.branchId}`);
    }

    // 3. Find a customer linked to this agent or any customer
    const testCustomer = await prisma.customer.findFirst({
      where: { agentId: testAgent.id }
    }) || await prisma.customer.findFirst();

    if (!testCustomer) {
      throw new Error('No customers found in database.');
    }

    const testBranchId = bmUser.branchId;

    const randomVin = Array.from({ length: 17 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]).join("");

    const res = await fetch(`${API_URL}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        vin: randomVin,
        make: 'Sprint4 Test Car',
        model: 'Explorer',
        year: 2024,
        color: 'Black',
        color_ar: 'أسود',
        lot_number: 'LOT778899',
        auction_source: 'copart',
        purchase_price_usd: 1500000,
        auction_fees_usd: 65000,
        shipping_fees_usd: 120000,
        other_fees_usd: 25000,
        agent_id: testAgent.id,
        customer_id: testCustomer.id,
        branch_id: testBranchId,
        notes: 'Verification test vehicle'
      })
    });

    const body = await res.json();
    if (res.status === 201 && body.success) {
      vehicleId = body.data.id;
      console.log(`🚗 Created test vehicle ID = ${vehicleId} with initial stage AUCTION_PURCHASED`);
    } else {
      throw new Error(`Failed to create test vehicle: ${JSON.stringify(body)}`);
    }
  } catch (err: any) {
    console.error('❌ Vehicle creation failed:', err.message);
    process.exit(1);
  }

  // --- TRANSITIONS & SCOPING VERIFICATION ---
  console.log('\n--- VERIFYING STAGE TRANSITIONS & SCOPE CONTROLS ---');

  // Test 1: Agent tries to transition stage. Should fail (403 Forbidden).
  try {
    const res = await fetch(`${API_URL}/vehicles/${vehicleId}/stage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentToken}`
      },
      body: JSON.stringify({
        to_stage: 'VEHICLE_RELEASED',
        note: 'Should fail'
      })
    });
    const body = await res.json();
    console.log(`Test 1 (Agent Transition): Status ${res.status}`);
    if (res.status === 403) {
      console.log('✅ PASS: Agent transition blocked correctly.');
    } else {
      console.log('❌ FAIL:', body);
    }
  } catch (err: any) {
    console.error('❌ Test 1 Error:', err.message);
  }

  // Test 2: Standard manager (Branch Manager) tries non-sequential stage transition.
  // Current: AUCTION_PURCHASED. Targets: CARRIER_PICKUP (should skip VEHICLE_RELEASED).
  // Expected: 400 Bad Request / Sequence violation.
  try {
    const res = await fetch(`${API_URL}/vehicles/${vehicleId}/stage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${branchManagerToken}`
      },
      body: JSON.stringify({
        to_stage: 'CARRIER_PICKUP',
        note: 'Should fail sequence validation'
      })
    });
    const body = await res.json();
    console.log(`Test 2 (Manager Non-Sequential): Status ${res.status}`);
    if (res.status === 400 && body.error?.code === 'INVALID_TRANSITION') {
      console.log('✅ PASS: Non-sequential manager transition rejected correctly.');
    } else {
      console.log('❌ FAIL:', body);
    }
  } catch (err: any) {
    console.error('❌ Test 2 Error:', err.message);
  }

  // Test 3: Standard manager (Branch Manager) transitions to immediate next stage (VEHICLE_RELEASED).
  // Expected: 200 OK.
  try {
    const res = await fetch(`${API_URL}/vehicles/${vehicleId}/stage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${branchManagerToken}`
      },
      body: JSON.stringify({
        to_stage: 'VEHICLE_RELEASED',
        note: 'Moving to stage 2 sequentially'
      })
    });
    const body = await res.json();
    console.log(`Test 3 (Manager Sequential): Status ${res.status}`);
    if (res.status === 200 && body.success && body.data.current_stage === 'VEHICLE_RELEASED') {
      console.log('✅ PASS: Manager sequential transition succeeded.');
    } else {
      console.log('❌ FAIL:', body);
    }
  } catch (err: any) {
    console.error('❌ Test 3 Error:', err.message);
  }

  // Test 4: Super admin triggers override (non-sequential bypass).
  // Current: VEHICLE_RELEASED. Target: OCEAN_SHIPPING.
  // Expected: 200 OK (with override notes indicator).
  try {
    const res = await fetch(`${API_URL}/vehicles/${vehicleId}/stage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        to_stage: 'OCEAN_SHIPPING',
        note: 'Urgent override for validation'
      })
    });
    const body = await res.json();
    console.log(`Test 4 (Super Admin Override): Status ${res.status}`);
    if (res.status === 200 && body.success && body.data.current_stage === 'OCEAN_SHIPPING') {
      console.log('✅ PASS: Super admin bypass succeeded.');
    } else {
      console.log('❌ FAIL:', body);
    }
  } catch (err: any) {
    console.error('❌ Test 4 Error:', err.message);
  }

  // Test 5: Verify history retrieval.
  // Expected: 200 OK containing initial creation sequence transitions.
  try {
    const res = await fetch(`${API_URL}/vehicles/${vehicleId}/stages`, {
      headers: {
        Authorization: `Bearer ${branchManagerToken}`
      }
    });
    const body = await res.json();
    console.log(`Test 5 (Get History): Status ${res.status}, history count = ${body.data?.length}`);
    if (res.status === 200 && body.success && body.data.length >= 2) {
      const firstTransition = body.data[0];
      const secondTransition = body.data[1];

      console.log(`- Step 1: ${firstTransition.from_stage} -> ${firstTransition.to_stage} by ${firstTransition.transitioned_by?.full_name}`);
      console.log(`- Step 2: ${secondTransition.from_stage} -> ${secondTransition.to_stage} by ${secondTransition.transitioned_by?.full_name}`);
      
      if (
        firstTransition.to_stage === 'VEHICLE_RELEASED' &&
        secondTransition.to_stage === 'OCEAN_SHIPPING' &&
        secondTransition.note?.includes('[تجاوز إداري: super_admin]')
      ) {
        console.log('✅ PASS: Stage history retrieved and values are correct.');
      } else {
        console.log('❌ FAIL: Stage values incorrect.');
      }
    } else {
      console.log('❌ FAIL:', body);
    }
  } catch (err: any) {
    console.error('❌ Test 5 Error:', err.message);
  }

  // Test 6: Verify Database transactions & Audit logging matches.
  console.log('\n--- VERIFYING AUDIT LOG ENTRIES IN POSTGRES ---');
  try {
    const completedAudit = await prisma.auditLog.findFirst({
      where: {
        entityId: vehicleId,
        action: 'stage_transition_completed'
      },
      orderBy: { createdAt: 'desc' }
    });

    const rejectedAudit = await prisma.auditLog.findFirst({
      where: {
        entityId: vehicleId,
        action: 'stage_transition_rejected'
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Completed audit found: ${!!completedAudit}`);
    console.log(`Rejected audit found: ${!!rejectedAudit}`);

    if (completedAudit && rejectedAudit) {
      console.log('✅ PASS: Audit logging written successfully.');
    } else {
      console.log('❌ FAIL: Audit log entry missing in db.');
    }
  } catch (err: any) {
    console.error('❌ Test 6 Error:', err.message);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test vehicle...');
  try {
    await prisma.vehicleStageTransition.deleteMany({ where: { vehicleId } });
    await prisma.vehicle.delete({ where: { id: vehicleId } });
    console.log('✅ Test vehicle cleaned up successfully.');
  } catch (err: any) {
    console.error('⚠️ Cleanup failed:', err.message);
  }

  console.log('\n🏁 Sprint 4 Verification Completed.');
  process.exit(0);
}

runSprint4Tests().catch((err) => {
  console.error('❌ Unhandled testing exception:', err);
  process.exit(1);
});
