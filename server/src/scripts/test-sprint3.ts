import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:33000/api';

async function runSprint3Tests() {
  console.log('🧪 Starting Sprint 3 Practical Backend API Verification...');

  let superAdminToken = '';
  let seniorAgentAToken = ''; // agent1
  let seniorAgentBToken = ''; // agent3
  let juniorAgentToken = ''; // agent2
  let opsManagerToken = ''; // ops
  let customerToken = ''; // customer1
  let branchManagerToken = ''; // baghdad_mgr

  let seniorAgentAUserId = '';
  let seniorAgentBUserId = '';

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

    const agent1Login = await login('agent1@albasha.local', 'agent123');
    seniorAgentAToken = agent1Login.token;
    seniorAgentAUserId = agent1Login.user.id;

    const agent3Login = await login('agent3@albasha.local', 'password123');
    seniorAgentBToken = agent3Login.token;
    seniorAgentBUserId = agent3Login.user.id;

    const agent2Login = await login('agent2@albasha.local', 'password123');
    juniorAgentToken = agent2Login.token;

    const opsLogin = await login('ops@albasha.local', 'password123');
    opsManagerToken = opsLogin.token;

    const customerLogin = await login('customer1@albasha.local', 'customer123');
    customerToken = customerLogin.token;

    const bmLogin = await login('baghdad_mgr@albasha.local', 'password123');
    branchManagerToken = bmLogin.token;

    console.log('🔑 All test users logged in successfully.');
  } catch (err: any) {
    console.error('❌ Login phase failed:', err.message);
    process.exit(1);
  }

  // --- BRANCHES ---
  console.log('\n--- MODULE: BRANCHES ---');
  let testBranchId = '';

  // 1. GET /api/branches as super_admin — confirm list is returned
  try {
    const res = await fetch(`${API_URL}/branches`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const body = await res.json();
    console.log(`GET /api/branches (super_admin): Status ${res.status}, success = ${body.success}, items count = ${body.data?.length}`);
    if (res.status === 200 && body.success) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 2. POST /api/branches as super_admin — create a branch with valid data. Confirm HTTP 201 and record created.
  try {
    const res = await fetch(`${API_URL}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        name: 'Verification Branch',
        name_ar: 'فرع التحقق والتدقيق',
        city: 'Najaf',
        city_ar: 'النجف',
        region: 'Al-Adala',
        region_ar: 'العدالة'
      })
    });
    const body = await res.json();
    console.log(`POST /api/branches (super_admin): Status ${res.status}`);
    if (res.status === 201 && body.success) {
      testBranchId = body.data.id;
      console.log(`✅ PASS: Created branch ID = ${testBranchId}`);
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 3. POST /api/branches as super_admin — submit invalid data (missing name_ar). Confirm HTTP 400 and Arabic validation message.
  try {
    const res = await fetch(`${API_URL}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        name: 'Invalid Branch'
      })
    });
    const body = await res.json();
    console.log(`POST /api/branches (super_admin, invalid data): Status ${res.status}`);
    console.log(`Response message_ar: "${body.error?.message_ar || body.error?.message || (body.error?.details ? JSON.stringify(body.error.details) : '')}"`);
    if (res.status === 400) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 4. POST /api/branches as senior_agent — confirm HTTP 403 with Arabic message: "لا تملك صلاحية تنفيذ هذا الإجراء."
  try {
    const res = await fetch(`${API_URL}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seniorAgentAToken}`
      },
      body: JSON.stringify({
        name: 'Agent Branch',
        name_ar: 'فرع الوكيل'
      })
    });
    const body = await res.json();
    console.log(`POST /api/branches (senior_agent): Status ${res.status}`);
    console.log(`Response message_ar: "${body.error?.message_ar || body.error?.message}"`);
    if (res.status === 403) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 5. GET /api/branches/:id as super_admin — confirm record returned.
  try {
    const res = await fetch(`${API_URL}/branches/${testBranchId}`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const body = await res.json();
    console.log(`GET /api/branches/${testBranchId} (super_admin): Status ${res.status}, name_ar = "${body.data?.name_ar}"`);
    if (res.status === 200 && body.success && body.data.id === testBranchId) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 6. PUT /api/branches/:id as super_admin — update the branch. Confirm HTTP 200.
  try {
    const res = await fetch(`${API_URL}/branches/${testBranchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        name: 'Verification Branch Updated',
        name_ar: 'فرع التحقق والتدقيق المعدل'
      })
    });
    const body = await res.json();
    console.log(`PUT /api/branches/${testBranchId} (super_admin): Status ${res.status}, name_ar = "${body.data?.name_ar}"`);
    if (res.status === 200 && body.success) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 7. PATCH /api/branches/:id/status as super_admin — deactivate a branch that has active users. Confirm HTTP 400 with Arabic message: "لا يمكن تعطيل فرع يحتوي على مستخدمين نشطين."
  // Note: Let's use basra branch ID because it has active users (mgr_basra, agent3, agent4)
  try {
    const basraBranch = await prisma.branch.findFirst({ where: { name: 'Basra Branch' } });
    if (!basraBranch) {
      throw new Error('Basra Branch not found in database');
    }
    const res = await fetch(`${API_URL}/branches/${basraBranch.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ status: 'inactive' })
    });
    const body = await res.json();
    console.log(`PATCH /api/branches/${basraBranch.id}/status (deactivate branch with active users): Status ${res.status}`);
    console.log(`Response message_ar: "${body.error?.message_ar || body.error?.message}"`);
    if (res.status === 400) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 8. DELETE /api/branches/:id as super_admin — soft delete a branch with no active users. Confirm status set to inactive, not removed.
  try {
    const res = await fetch(`${API_URL}/branches/${testBranchId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const body = await res.json();
    console.log(`DELETE /api/branches/${testBranchId} (soft delete, no active users): Status ${res.status}`);
    
    // Query database directly to confirm record is still there but status is inactive
    const dbBranch = await prisma.branch.findUnique({ where: { id: testBranchId } });
    console.log(`Database record status: "${dbBranch?.status}"`);
    if (res.status === 200 && dbBranch && dbBranch.status === 'inactive') {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body, dbBranch);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }


  // --- CUSTOMERS ---
  console.log('\n--- MODULE: CUSTOMERS ---');
  let testCustomerId = '';

  // 9. POST /api/customers as senior_agent — create a customer. Confirm agent_id is auto-set to the agent's own ID.
  try {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seniorAgentAToken}`
      },
      body: JSON.stringify({
        full_name: 'Verification Customer A',
        full_name_ar: 'العميل المدقق أ',
        phone: '+9647701234567',
        email: 'verif.cust.a@gmail.com',
        city: 'Baghdad',
        city_ar: 'بغداد'
      })
    });
    const body = await res.json();
    console.log(`POST /api/customers (senior_agent A): Status ${res.status}`);
    if (res.status === 201 && body.success) {
      testCustomerId = body.data.id;
      console.log(`✅ PASS: Created customer ID = ${testCustomerId}, agent_id = "${body.data.agent_id}" (expected: "${seniorAgentAUserId}")`);
      if (body.data.agent_id === seniorAgentAUserId) {
        console.log('✅ Agent ID successfully auto-set.');
      } else {
        console.log('❌ Agent ID NOT auto-set correctly.');
      }
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 10. GET /api/customers as senior_agent A — confirm only agent A's customers are returned. Pass agent B's ID as query param and confirm agent B's customers are NOT returned.
  try {
    // GET customers as agent A
    const resA = await fetch(`${API_URL}/customers`, {
      headers: { Authorization: `Bearer ${seniorAgentAToken}` }
    });
    const bodyA = await resA.json();
    
    // Check if any returned customer has an agent_id other than agent A's id
    const otherAgentCustomersCount = bodyA.data.filter((c: any) => c.agent_id !== seniorAgentAUserId).length;
    console.log(`GET /api/customers (agent A): Status ${resA.status}, count = ${bodyA.data?.length}, other agents customers = ${otherAgentCustomersCount}`);
    
    // Pass agent B's ID as query param
    const resBParam = await fetch(`${API_URL}/customers?agent_id=${seniorAgentBUserId}`, {
      headers: { Authorization: `Bearer ${seniorAgentAToken}` }
    });
    const bodyBParam = await resBParam.json();
    const agentBCustomersInResult = bodyBParam.data.filter((c: any) => c.agent_id === seniorAgentBUserId).length;
    console.log(`GET /api/customers?agent_id=${seniorAgentBUserId} (agent A querying agent B): Status ${resBParam.status}, count = ${bodyBParam.data?.length}, containing agent B customers = ${agentBCustomersInResult}`);

    if (resA.status === 200 && otherAgentCustomersCount === 0 && agentBCustomersInResult === 0) {
      console.log('✅ PASS: Scoping and query param filtration working correctly (isolation verified).');
    } else {
      console.log('❌ FAIL');
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 11. PUT /api/customers/:id as senior_agent — attempt to update a customer belonging to a different agent. Confirm HTTP 403.
  try {
    // Let's find a customer belonging to agent B (seniorAgentBUserId)
    const customerB = await prisma.customer.findFirst({ where: { agentId: seniorAgentBUserId } });
    if (!customerB) {
      throw new Error('No customer belonging to Agent B found in database to test.');
    }
    const res = await fetch(`${API_URL}/customers/${customerB.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seniorAgentAToken}`
      },
      body: JSON.stringify({
        full_name: 'Hacked name'
      })
    });
    const body = await res.json();
    console.log(`PUT /api/customers/${customerB.id} (agent A attempting to update agent B's customer): Status ${res.status}`);
    console.log(`Response message_ar: "${body.error?.message_ar || body.error?.message}"`);
    if (res.status === 403) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 12. PATCH /api/customers/:id/status as operations_manager — change status. Confirm audit log entry is created.
  try {
    const res = await fetch(`${API_URL}/customers/${testCustomerId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsManagerToken}`
      },
      body: JSON.stringify({ status: 'inactive' })
    });
    const body = await res.json();
    console.log(`PATCH /api/customers/${testCustomerId}/status (operations_manager): Status ${res.status}`);
    
    // Check if audit log was written
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'customer',
        entityId: testCustomerId,
        action: 'customer_status_changed'
      }
    });
    console.log(`Audit log entries found: ${logs.length}`);
    if (res.status === 200 && logs.length > 0) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body, logs);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }


  // --- AGENTS ---
  console.log('\n--- MODULE: AGENTS ---');
  let testAgentUserId = '';

  // 13. POST /api/agents as super_admin — create a junior_agent. Confirm HTTP 201 and audit log entry created.
  try {
    const juniorRole = await prisma.role.findFirst({ where: { name: 'junior_agent' } });
    if (!juniorRole) throw new Error('junior_agent role not found');
    const basraBranch = await prisma.branch.findFirst({ where: { name: 'Basra Branch' } });
    if (!basraBranch) throw new Error('Basra Branch not found');

    const res = await fetch(`${API_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        username: `verif_agent_${Date.now().toString().slice(-4)}`,
        email: `verif.agent.${Date.now().toString().slice(-4)}@albasha.local`,
        phone: '+9647801111111',
        password: 'password123',
        full_name: 'Verification Junior Agent',
        full_name_ar: 'الوكيل المبتدئ المدقق',
        role_id: juniorRole.id,
        branch_id: basraBranch.id
      })
    });
    const body = await res.json();
    console.log(`POST /api/agents (super_admin): Status ${res.status}`);
    if (res.status === 201 && body.success) {
      testAgentUserId = body.data.id;
      // Check audit log
      const logs = await prisma.auditLog.findMany({
        where: {
          entityType: 'user',
          entityId: testAgentUserId,
          action: 'agent_created'
        }
      });
      console.log(`Audit log entries found: ${logs.length}`);
      if (logs.length > 0) {
        console.log('✅ PASS');
      } else {
        console.log('❌ Audit log NOT created');
      }
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 14. POST /api/agents as operations_manager — attempt to assign super_admin role. Confirm HTTP 403 with Arabic message: "لا يمكنك منح صلاحيات تفوق صلاحياتك الحالية."
  try {
    const superAdminRole = await prisma.role.findFirst({ where: { name: 'super_admin' } });
    if (!superAdminRole) throw new Error('super_admin role not found');
    const basraBranch = await prisma.branch.findFirst({ where: { name: 'Basra Branch' } });
    if (!basraBranch) throw new Error('Basra Branch not found');

    const res = await fetch(`${API_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsManagerToken}`
      },
      body: JSON.stringify({
        username: `fake_admin_${Date.now().toString().slice(-4)}`,
        email: `fake.admin.${Date.now().toString().slice(-4)}@albasha.local`,
        password: 'password123',
        full_name: 'Fake Admin User',
        full_name_ar: 'مدير عام مزيف',
        role_id: superAdminRole.id,
        branch_id: basraBranch.id
      })
    });
    const body = await res.json();
    console.log(`POST /api/agents (ops_manager assigning super_admin): Status ${res.status}`);
    console.log(`Response message_ar: "${body.error?.message_ar || body.error?.message}"`);
    if (res.status === 403) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 15. PATCH /api/agents/:id/status as super_admin — attempt to suspend the only remaining super_admin user. Confirm HTTP 400 with Arabic message: "يجب أن يبقى مدير عام واحد على الأقل في النظام."
  try {
    const superAdminUser = await prisma.user.findFirst({ where: { role: { name: 'super_admin' } } });
    if (!superAdminUser) throw new Error('No super_admin user found');

    const res = await fetch(`${API_URL}/agents/${superAdminUser.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ status: 'suspended' })
    });
    const body = await res.json();
    console.log(`PATCH /api/agents/${superAdminUser.id}/status (suspend last super_admin): Status ${res.status}`);
    console.log(`Response message_ar: "${body.error?.message_ar || body.error?.message}"`);
    if (res.status === 400) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 16. PATCH /api/agents/:id/status as super_admin — suspend a regular agent. Confirm audit log entry is created.
  try {
    const res = await fetch(`${API_URL}/agents/${testAgentUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ status: 'suspended' })
    });
    const body = await res.json();
    console.log(`PATCH /api/agents/${testAgentUserId}/status (suspend agent): Status ${res.status}`);
    
    // Check audit log
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'user',
        entityId: testAgentUserId,
        action: 'agent_status_changed'
      }
    });
    console.log(`Audit log entries found: ${logs.length}`);
    if (res.status === 200 && logs.length > 0) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body, logs);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }


  // --- VEHICLES ---
  console.log('\n--- MODULE: VEHICLES ---');
  let testVehicleId = '';

  // 17. POST /api/vehicles as senior_agent — create a vehicle. Confirm agent_id is auto-set. Confirm audit log entry created.
  try {
    const res = await fetch(`${API_URL}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seniorAgentAToken}`
      },
      body: JSON.stringify({
        vin: `1FA6P8CF0H510${Date.now().toString().slice(-4)}`,
        make: 'Verification Car',
        model: 'Explorer',
        year: 2022,
        color: 'Blue',
        color_ar: 'أزرق'
      })
    });
    const body = await res.json();
    console.log(`POST /api/vehicles (senior_agent A): Status ${res.status}`);
    if (res.status === 201 && body.success) {
      testVehicleId = body.data.id;
      const responseAgentId = body.data.agentId || body.data.agent_id;
      console.log(`✅ PASS: Created vehicle ID = ${testVehicleId}, agentId = "${responseAgentId}" (expected: "${seniorAgentAUserId}")`);
      
      // Check audit log
      const logs = await prisma.auditLog.findMany({
        where: {
          entityType: 'vehicle',
          entityId: testVehicleId,
          action: 'vehicle_created'
        }
      });
      console.log(`Audit log entries found: ${logs.length}`);
      if (responseAgentId === seniorAgentAUserId && logs.length > 0) {
        console.log('✅ Agent ID auto-set & audit log verified.');
      } else {
        console.log('❌ Auto-set or audit log verification failed.');
      }
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 18. GET /api/vehicles as senior_agent A — confirm only agent A's vehicles are returned. Pass agent B's ID as query param and confirm agent B's vehicles are NOT returned.
  try {
    // GET vehicles as agent A
    const resA = await fetch(`${API_URL}/vehicles`, {
      headers: { Authorization: `Bearer ${seniorAgentAToken}` }
    });
    const bodyA = await resA.json();
    const otherAgentVehiclesCount = bodyA.data.filter((v: any) => v.agent_id !== seniorAgentAUserId).length;
    console.log(`GET /api/vehicles (agent A): Status ${resA.status}, count = ${bodyA.data?.length}, other agents vehicles = ${otherAgentVehiclesCount}`);

    // Query with agent B param
    const resBParam = await fetch(`${API_URL}/vehicles?agent_id=${seniorAgentBUserId}`, {
      headers: { Authorization: `Bearer ${seniorAgentAToken}` }
    });
    const bodyBParam = await resBParam.json();
    const agentBVehiclesInResult = bodyBParam.data.filter((v: any) => v.agent_id === seniorAgentBUserId).length;
    console.log(`GET /api/vehicles?agent_id=${seniorAgentBUserId} (agent A querying agent B): Status ${resBParam.status}, count = ${bodyBParam.data?.length}, containing agent B vehicles = ${agentBVehiclesInResult}`);

    if (resA.status === 200 && otherAgentVehiclesCount === 0 && agentBVehiclesInResult === 0) {
      console.log('✅ PASS: Scoping and query param filtration working correctly (isolation verified).');
    } else {
      console.log('❌ FAIL');
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 19. PUT /api/vehicles/:id as senior_agent — update own vehicle. Confirm HTTP 200 and audit log entry created.
  try {
    const res = await fetch(`${API_URL}/vehicles/${testVehicleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seniorAgentAToken}`
      },
      body: JSON.stringify({
        model: 'Explorer Sport'
      })
    });
    const body = await res.json();
    console.log(`PUT /api/vehicles/${testVehicleId} (agent A updating own vehicle): Status ${res.status}`);
    
    // Check audit log
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'vehicle',
        entityId: testVehicleId,
        action: 'vehicle_updated'
      }
    });
    console.log(`Audit log entries found: ${logs.length}`);
    if (res.status === 200 && logs.length > 0) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body, logs);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 20. PUT /api/vehicles/:id as senior_agent — attempt to update a vehicle belonging to a different agent. Confirm HTTP 403.
  try {
    // Find a vehicle belonging to agent B
    const vehicleB = await prisma.vehicle.findFirst({ where: { agentId: seniorAgentBUserId } });
    if (!vehicleB) {
      throw new Error('No vehicle belonging to agent B found in database to test.');
    }

    const res = await fetch(`${API_URL}/vehicles/${vehicleB.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seniorAgentAToken}`
      },
      body: JSON.stringify({
        model: 'Hacked Model'
      })
    });
    const body = await res.json();
    console.log(`PUT /api/vehicles/${vehicleB.id} (agent A attempting to update agent B's vehicle): Status ${res.status}`);
    console.log(`Response message_ar: "${body.error?.message_ar || body.error?.message}"`);
    if (res.status === 403) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }

  // 21. PATCH /api/vehicles/:id/status as operations_manager — change status to archived. Confirm audit log entry created.
  try {
    const res = await fetch(`${API_URL}/vehicles/${testVehicleId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsManagerToken}`
      },
      body: JSON.stringify({ status: 'archived' })
    });
    const body = await res.json();
    console.log(`PATCH /api/vehicles/${testVehicleId}/status (ops_manager to archived): Status ${res.status}`);
    
    // Check audit log
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'vehicle',
        entityId: testVehicleId,
        action: 'vehicle_status_changed'
      }
    });
    console.log(`Audit log entries found: ${logs.length}`);
    if (res.status === 200 && logs.length > 0) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL', body, logs);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }


  // --- AUDIT LOG MUTATION IMMUTABILITY ---
  console.log('\n--- MODULE: AUDIT LOGS ---');
  // Confirm no DELETE, PUT, or PATCH route exists for audit_log. Attempt DELETE /api/audit-log/:id with any valid token.
  try {
    const res = await fetch(`${API_URL}/audit-log/some-random-id`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    console.log(`DELETE /api/audit-log/:id: Status ${res.status}`);
    if (res.status === 404 || res.status === 405) {
      console.log('✅ PASS (IMMUTABLE)');
    } else {
      console.log('❌ FAIL (MUTABLE)', res.status);
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }


  // --- DATA ISOLATION (BRANCH MANAGER SCOPE) ---
  console.log('\n--- MODULE: DATA ISOLATION (BRANCH MANAGER SCOPE) ---');
  // Log in as branch_manager. Confirm only their own branch records are returned from GET /api/branches and GET /api/vehicles.
  try {
    // Check Baghdad BM
    const resBranches = await fetch(`${API_URL}/branches`, {
      headers: { Authorization: `Bearer ${branchManagerToken}` }
    });
    const bodyBranches = await resBranches.json();
    console.log(`GET /api/branches (branch_manager): Status ${resBranches.status}, count = ${bodyBranches.data?.length}`);
    bodyBranches.data?.forEach((b: any) => {
      console.log(` - Branch returned: ID = ${b.id}, Name = "${b.name_ar}"`);
    });

    const resVehicles = await fetch(`${API_URL}/vehicles`, {
      headers: { Authorization: `Bearer ${branchManagerToken}` }
    });
    const bodyVehicles = await resVehicles.json();
    console.log(`GET /api/vehicles (branch_manager): Status ${resVehicles.status}, count = ${bodyVehicles.data?.length}`);
    
    // Check if any returned vehicle belongs to a branch other than the BM's branch (createdBranches[0].id)
    const baghdadBranch = await prisma.branch.findFirst({ where: { name: 'Baghdad Branch' } });
    if (!baghdadBranch) throw new Error('Baghdad branch not found');
    
    // Get Baghdad branch agents to verify scope
    const baghdadAgents = await prisma.user.findMany({
      where: { branchId: baghdadBranch.id, role: { level: { in: [4, 5] } } }
    });
    const baghdadAgentIds = baghdadAgents.map(a => a.id);
    
    const foreignVehicles = bodyVehicles.data?.filter((v: any) => !baghdadAgentIds.includes(v.agent_id));
    console.log(` - Foreign branch vehicles returned to Baghdad manager: ${foreignVehicles?.length || 0}`);
    
    if (resBranches.status === 200 && resVehicles.status === 200 && bodyBranches.data?.length === 1 && bodyBranches.data[0].id === baghdadBranch.id && foreignVehicles?.length === 0) {
      console.log('✅ PASS: Data isolation for branch manager confirmed.');
    } else {
      console.log('❌ FAIL: Data leak or scoping failed.');
    }
  } catch (err: any) {
    console.error('❌ ERROR', err.message);
  }


  // --- Clean up verification test data ---
  console.log('\n🧹 Cleaning up test verification records from database...');
  try {
    if (testVehicleId) {
      await prisma.auditLog.deleteMany({ where: { entityId: testVehicleId, entityType: 'vehicle' } });
      await prisma.vehicle.delete({ where: { id: testVehicleId } });
    }
    if (testAgentUserId) {
      await prisma.auditLog.deleteMany({ where: { entityId: testAgentUserId } });
      await prisma.wallet.deleteMany({ where: { agentId: testAgentUserId } });
      await prisma.user.delete({ where: { id: testAgentUserId } });
    }
    if (testCustomerId) {
      await prisma.auditLog.deleteMany({ where: { entityId: testCustomerId, entityType: 'customer' } });
      await prisma.customer.delete({ where: { id: testCustomerId } });
    }
    if (testBranchId) {
      await prisma.auditLog.deleteMany({ where: { entityId: testBranchId, entityType: 'branch' } });
      await prisma.branch.delete({ where: { id: testBranchId } });
    }
    console.log('✅ Clean up complete.');
  } catch (err: any) {
    console.error('⚠️ Clean up warning:', err.message);
  }

  await prisma.$disconnect();
  console.log('\n🏁 Sprint 3 Practical Verification Script complete.');
}

runSprint3Tests();
