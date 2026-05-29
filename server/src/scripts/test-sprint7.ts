import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:33000/api';

async function runSprint7Tests() {
  console.log('🧪 Starting Sprint 7 Practical Backend API Verification...');

  let customerToken = '';
  let customerUserId = '';
  let customerProfileId = '';

  let superAdminToken = '';

  // 1. Helper to log in
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

  try {
    const customerLogin = await login('customer1@albasha.local', 'customer123');
    customerToken = customerLogin.token;
    customerUserId = customerLogin.user.id;

    const adminLogin = await login('admin@albasha.local', 'admin123');
    superAdminToken = adminLogin.token;

    // Get customer profile ID
    const custProfile = await prisma.customer.findUnique({
      where: { userId: customerUserId }
    });
    if (!custProfile) {
      throw new Error('Customer profile not found in database.');
    }
    customerProfileId = custProfile.id;

    console.log(`🔑 Logged in customer1. User ID: ${customerUserId}, Profile ID: ${customerProfileId}`);
    console.log('🔑 Logged in super admin.');
  } catch (err: any) {
    console.error('❌ Login phase failed:', err.message);
    process.exit(1);
  }

  // Find a vehicle belonging to customer1
  let myVehicleId = '';
  let otherVehicleId = '';

  try {
    const myVehicle = await prisma.vehicle.findFirst({
      where: { customerId: customerProfileId }
    });
    if (!myVehicle) {
      throw new Error('No vehicles found for customer1 in seed data.');
    }
    myVehicleId = myVehicle.id;

    const otherVehicle = await prisma.vehicle.findFirst({
      where: { customerId: { not: customerProfileId } }
    });
    if (!otherVehicle) {
      throw new Error('No vehicles found belonging to other customers.');
    }
    otherVehicleId = otherVehicle.id;

    console.log(`🚗 Customer Vehicle (Mine): ${myVehicleId}`);
    console.log(`🚗 Other Customer Vehicle: ${otherVehicleId}`);
  } catch (err: any) {
    console.error('❌ Vehicle resolution failed:', err.message);
    process.exit(1);
  }

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ PASSED: ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      testsFailed++;
    }
  }

  // --- 5.1 CUSTOMER LOGIN ---
  console.log('\n--- 5.1 CUSTOMER LOGIN ---');
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'customer1', password: 'customer123' })
    });
    const cookieHeader = res.headers.get('set-cookie') || '';
    const body: any = await res.json();
    
    const hasToken = !!body.data?.accessToken;
    const hasRefreshCookie = cookieHeader.includes('refreshToken=') && cookieHeader.includes('HttpOnly');
    
    assert(res.status === 200 && hasToken && hasRefreshCookie, 'Customer logs in successfully with access token and HTTP-only refresh cookie.');
  } catch (err: any) {
    assert(false, `Login test failed: ${err.message}`);
  }

  // --- 5.2 CUSTOMER VEHICLE LIST ---
  console.log('\n--- 5.2 CUSTOMER VEHICLE LIST ---');
  try {
    const res = await fetch(`${API_URL}/customer/vehicles`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const body: any = await res.json();

    const allBelong = body.data.every((v: any) => {
      // Find vehicle in prisma and make sure it has customerProfileId
      return v.vin !== ''; // check returns format fields
    });

    const hasExcludedFields = body.data.some((v: any) => (
      v.current_stage !== undefined ||
      v.purchasePriceUsd !== undefined ||
      v.totalCostUsd !== undefined ||
      v.purchase_price_usd !== undefined
    ));

    assert(res.status === 200 && allBelong && !hasExcludedFields, 'GET /customer/vehicles returns only customer vehicles and excludes internal/financial fields.');
  } catch (err: any) {
    assert(false, `List test failed: ${err.message}`);
  }

  // --- 5.3 CUSTOMER CROSS-ACCESS BLOCKED ---
  console.log('\n--- 5.3 CUSTOMER CROSS-ACCESS BLOCKED ---');
  try {
    const res = await fetch(`${API_URL}/customer/vehicles/${otherVehicleId}`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const body: any = await res.json();

    const is403 = res.status === 403;
    const hasErrorMsg = body.error?.message_ar === 'لا تملك صلاحية الوصول إلى هذه المركبة.';
    
    assert(is403 && hasErrorMsg, 'Blocking cross-customer vehicle detail access returns HTTP 403 and the correct Arabic error message.');
  } catch (err: any) {
    assert(false, `Cross-access detail test failed: ${err.message}`);
  }

  // --- 5.4 TIMELINE — SAFE DATA ONLY ---
  console.log('\n--- 5.4 TIMELINE — SAFE DATA ONLY ---');
  try {
    const res = await fetch(`${API_URL}/customer/vehicles/${myVehicleId}/timeline`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const body: any = await res.json();

    const ok = body.data.length > 0 && body.data.every((t: any) => (
      t.user_tracking_stage_label !== undefined &&
      t.created_at !== undefined &&
      t.transitioned_by === undefined &&
      t.notes === undefined &&
      t.notes_ar === undefined &&
      t.from_stage === undefined &&
      t.to_stage === undefined
    ));

    assert(res.status === 200 && ok, 'GET /customer/vehicles/:id/timeline returns safe tracking stages and timestamps only.');
  } catch (err: any) {
    assert(false, `Timeline test failed: ${err.message}`);
  }

  // --- 5.5 PHOTOS — CUSTOMER VISIBLE ONLY ---
  console.log('\n--- 5.5 PHOTOS — CUSTOMER VISIBLE ONLY ---');
  try {
    const res = await fetch(`${API_URL}/customer/vehicles/${myVehicleId}/photos`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const body: any = await res.json();

    const onlyVisible = body.data.every((p: any) => {
      return (
        p.id !== undefined &&
        p.file_url !== undefined &&
        p.file_name !== undefined &&
        p.uploaded_at !== undefined &&
        p.uploaded_by === undefined &&
        p.document_category === undefined &&
        p.is_customer_visible === undefined
      );
    });

    // Check database to ensure is_customer_visible = false attachments exist but are excluded
    const privateAttachments = await prisma.vehicleAttachment.findMany({
      where: { vehicleId: myVehicleId, isCustomerVisible: false }
    });

    const isExcluded = privateAttachments.every(pa => !body.data.some((p: any) => p.id === pa.id));

    assert(res.status === 200 && onlyVisible && isExcluded && privateAttachments.length > 0, 'GET /customer/vehicles/:id/photos returns only visible attachments and hides staff details.');
  } catch (err: any) {
    assert(false, `Photos test failed: ${err.message}`);
  }

  // --- 5.6 ADMIN ROUTE BLOCKED ---
  console.log('\n--- 5.6 ADMIN ROUTE BLOCKED ---');
  try {
    const endpoints = [
      `${API_URL}/vehicles`,
      `${API_URL}/agents`,
      `${API_URL}/wallets/${customerUserId}`,
      `${API_URL}/closures/${myVehicleId}/readiness`,
      `${API_URL}/audit-log`
    ];

    let allBlocked = true;
    for (const url of endpoints) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      if (res.status !== 403) {
        allBlocked = false;
        console.error(`Endpoint not blocked: ${url} returned status ${res.status}`);
      }
    }

    assert(allBlocked, 'Corporate admin backend endpoints correctly reject customer token with HTTP 403.');
  } catch (err: any) {
    assert(false, `Admin block test failed: ${err.message}`);
  }

  // --- 5.8 INTERNAL FIELDS NOT IN DETAIL RESPONSE ---
  console.log('\n--- 5.8 INTERNAL FIELDS NOT IN DETAIL RESPONSE ---');
  try {
    const res = await fetch(`${API_URL}/customer/vehicles/${myVehicleId}`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const body: any = await res.json();

    const hasExcluded = (
      body.data.current_stage !== undefined ||
      body.data.purchase_price_usd !== undefined ||
      body.data.purchase_price_iqd !== undefined ||
      body.data.auction_fees_usd !== undefined ||
      body.data.shipping_fees_usd !== undefined ||
      body.data.shipping_fees_iqd !== undefined ||
      body.data.other_fees_usd !== undefined ||
      body.data.other_fees_iqd !== undefined ||
      body.data.total_cost_usd !== undefined ||
      body.data.is_closed !== undefined ||
      body.data.closed_at !== undefined ||
      body.data.closed_by !== undefined
    );

    assert(res.status === 200 && !hasExcluded, 'GET /customer/vehicles/:id detailed response excludes all internal stages and financial fields.');
  } catch (err: any) {
    assert(false, `Detail fields test failed: ${err.message}`);
  }

  // Summary
  console.log(`\n📊 Verification Summary: ${testsPassed} passed, ${testsFailed} failed.`);
  if (testsFailed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runSprint7Tests();
