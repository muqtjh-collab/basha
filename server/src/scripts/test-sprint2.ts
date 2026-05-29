import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:33000/api';

const initialPermissions = {
  vehicles: { read: false, write: false, delete: false },
  customers: { read: false, write: false, delete: false },
  agents: { read: false, write: false, delete: false },
  wallets: { read: false, write: false },
  receipts: { read: false, write: false },
  roles: { read: false, write: false, delete: false },
  branches: { read: false, write: false, delete: false },
  reports: { read: false },
  audit_log: { read: false },
  settings: { read: false, write: false }
};

async function runSprint2Tests() {
  console.log('🧪 Starting Sprint 2 Security & API Integration Tests (using native fetch)...');

  // Helper to log in and get tokens + cookies
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
    const token = body.data.accessToken;
    const cookie = res.headers.get('set-cookie')?.split(';')[0] || '';
    
    return { token, cookie, user: body.data.user };
  }

  // --- 9.1 RBAC Boundary Test ---
  console.log('\nTest 9.1: Junior Agent RBAC Boundary Test...');
  try {
    // Log in as junior agent محمد الكناني (agent2@albasha.local)
    const { token } = await login('agent2@albasha.local', 'password123');

    const res = await fetch(`${API_URL}/roles`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body: any = await res.json();
    if (res.status === 403) {
      console.log('✅ Passed: Junior agent was blocked from accessing Roles API.');
      console.log('Status code:', res.status);
      console.log('Response code:', body.error?.code);
      console.log('Arabic message:', body.error?.message_ar);
    } else {
      console.error('❌ Failed: Junior agent was allowed to access Roles API. Status:', res.status, body);
    }
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
  }

  // --- 9.2 System Role Protection Test ---
  console.log('\nTest 9.2: System Role Delete Protection Test...');
  try {
    // Log in as Super Admin (admin@albasha.local)
    const { token } = await login('admin@albasha.local', 'admin123');

    // Get super_admin role ID
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'super_admin' }
    });

    if (!superAdminRole) {
      throw new Error('super_admin role not found in DB.');
    }

    const res = await fetch(`${API_URL}/roles/${superAdminRole.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body: any = await res.json();
    if (res.status === 400) {
      console.log('✅ Passed: Deleting system role was blocked.');
      console.log('Status code:', res.status);
      console.log('Response code:', body.error?.code);
      console.log('Arabic message:', body.error?.message_ar);
    } else {
      console.error('❌ Failed: Deleting system role succeeded or returned status:', res.status, body);
    }
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
  }

  // --- 9.3 Last Super Admin Protection Test ---
  console.log('\nTest 9.3: Last Super Admin Protection Test...');
  try {
    // Log in as Super Admin
    const { token } = await login('admin@albasha.local', 'admin123');

    // Find the super_admin user account
    const superAdminUser = await prisma.user.findFirst({
      where: {
        role: { name: 'super_admin' }
      }
    });

    if (!superAdminUser) {
      throw new Error('Super admin user not found in DB.');
    }

    // Attempt to suspend the last super_admin user
    const res = await fetch(`${API_URL}/users/${superAdminUser.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status: 'suspended'
      })
    });

    const body: any = await res.json();
    if (res.status === 400) {
      console.log('✅ Passed: Suspending the last remaining super admin was blocked.');
      console.log('Status code:', res.status);
      console.log('Response code:', body.error?.code);
      console.log('Arabic message:', body.error?.message_ar);
    } else {
      console.error('❌ Failed: Suspending the last super admin succeeded or returned status:', res.status, body);
    }
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
  }

  // --- 4.3 Promotion Hierarchy Test ---
  console.log('\nTest 4.3: User Promotion Hierarchy Test (Level Check)...');
  try {
    // Log in as Baghdad Branch Manager (baghdad_mgr@albasha.local, level 3)
    const { token } = await login('baghdad_mgr@albasha.local', 'password123');

    // Find junior agent 2 محمد الكناني (agent2@albasha.local)
    const agent2 = await prisma.user.findUnique({
      where: { username: 'agent2' }
    });

    // Find operations manager role (level 2)
    const opsRole = await prisma.role.findUnique({
      where: { name: 'operations_manager' }
    });

    if (!agent2 || !opsRole) {
      throw new Error('Agent or Operations Manager role not found in DB.');
    }

    // Branch manager (level 3) attempts to promote Agent 2 to Operations Manager (level 2)
    const res = await fetch(`${API_URL}/users/${agent2.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        roleId: opsRole.id
      })
    });

    const body: any = await res.json();
    if (res.status === 403) {
      console.log('✅ Passed: Promotion to higher level role was blocked.');
      console.log('Status code:', res.status);
      console.log('Response code:', body.error?.code);
      console.log('Arabic message:', body.error?.message_ar);
    } else {
      console.error('❌ Failed: Promotion of agent succeeded or returned status:', res.status, body);
    }
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
  }

  // --- 9.4 Audit Log Immutability Test ---
  console.log('\nTest 9.4: Audit Log Immutability Test...');
  try {
    // Log in as Super Admin
    const { token } = await login('admin@albasha.local', 'admin123');

    // Attempt to DELETE or POST to /api/audit-log
    const deleteRes = await fetch(`${API_URL}/audit-log`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const postRes = await fetch(`${API_URL}/audit-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'create', entityType: 'vehicle', entityId: 'some-uuid' })
    });

    if (deleteRes.status === 404 && postRes.status === 404) {
      console.log('✅ Passed: Audit Log mutations are blocked at API level (returned 404).');
    } else {
      console.error('❌ Failed: Audit Log mutations did not return 404. Delete:', deleteRes.status, 'Post:', postRes.status);
    }
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
  }

  // --- 4.4 Audit Logging Verify ---
  console.log('\nTest 4.4: Verify Audit Logging works for Role mutations...');
  try {
    // Log in as Super Admin
    const { token } = await login('admin@albasha.local', 'admin123');

    // Create a temporary role
    const createRes = await fetch(`${API_URL}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'temp_test_role',
        nameAr: 'دور اختباري مؤقت',
        level: 5,
        defaultPermissions: initialPermissions,
        description: 'Test role creation audit',
        descriptionAr: 'دور اختباري لفحص سجل النشاطات'
      })
    });

    const createBody: any = await createRes.json();
    if (createRes.status !== 201) {
      throw new Error(`Failed to create test role: ${createRes.status}`);
    }

    const newRoleId = createBody.data.id;

    // Check if audit log was written for this creation
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'role',
        entityId: newRoleId,
        action: 'create'
      }
    });

    if (logs.length > 0) {
      console.log('✅ Passed: Role creation successfully logged to Audit Log table.');
      console.log('Audit Entry Action:', logs[0].action);
      console.log('Audit Entry Entity Type:', logs[0].entityType);
    } else {
      console.error('❌ Failed: No audit log entry found for role creation.');
    }

    // Clean up role
    await prisma.role.delete({ where: { id: newRoleId } });
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('\n🏁 Sprint 2 Integration & Security Verification completed.');
  await prisma.$disconnect();
}

runSprint2Tests();
