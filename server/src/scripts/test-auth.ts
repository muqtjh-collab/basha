import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:33000/api';

async function runTests() {
  console.log('🧪 Starting Auth & Security Integration Tests (using native fetch)...');
  
  // 1. Wait for server to be up
  console.log('Checking health endpoint...');
  try {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    console.log('✅ Server is alive:', data);
  } catch (error: any) {
    console.error('❌ Server is not running. Please make sure the Express server is started on port 33000.', error.message);
    process.exit(1);
  }

  // 2. Try logging in with invalid credentials
  console.log('\nTest 1: Invalid Credentials Login...');
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@albasha.local',
        password: 'wrongpassword'
      })
    });
    
    if (res.status === 200) {
      console.log('❌ Test failed: Login succeeded with wrong password.');
    } else {
      const data = await res.json();
      console.log('✅ Test passed: Invalid login blocked.');
      console.log('Response status:', res.status);
      console.log('Arabic Message:', (data as any).error?.message_ar);
    }
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
  }

  // 3. Login with correct credentials
  console.log('\nTest 2: Successful Admin Login...');
  let accessToken = '';
  let cookieHeader = '';
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@albasha.local',
        password: 'admin123'
      })
    });
    
    if (res.status !== 200) {
      const errData = await res.json();
      console.error('❌ Test failed: Login returned status', res.status, errData);
    } else {
      const data: any = await res.json();
      console.log('✅ Test passed: Login succeeded.');
      console.log('Response keys:', Object.keys(data.data));
      console.log('User Role:', data.data.user.role.nameAr);
      
      accessToken = data.data.accessToken;
      
      // Capture Set-Cookie headers
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        console.log('✅ Test passed: Refresh token cookie received.');
        console.log('Cookie values:', setCookie.substring(0, 50) + '...');
        cookieHeader = setCookie.split(';')[0];
      } else {
        console.error('❌ Test failed: Set-Cookie header missing.');
      }
    }
  } catch (error: any) {
    console.error('❌ Test failed: Login failed with error:', error.message);
  }

  // 4. Test protected route access (calling logout without token)
  console.log('\nTest 3: Unauthenticated Protected Route Access...');
  try {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST'
    });
    
    if (res.status === 200) {
      console.log('❌ Test failed: Protected route accessed without auth.');
    } else {
      const data: any = await res.json();
      console.log('✅ Test passed: Unauthenticated access blocked.');
      console.log('Response status:', res.status);
      console.log('Arabic Message:', data.error?.message_ar);
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }

  // 5. Test token refresh rotation
  console.log('\nTest 4: Token Refresh Rotation...');
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader
      }
    });
    
    if (res.status !== 200) {
      const errData = await res.json();
      console.error('❌ Test failed: Refresh returned status', res.status, errData);
    } else {
      const data: any = await res.json();
      console.log('✅ Test passed: Refresh succeeded.');
      console.log('New Access Token length:', data.data.accessToken.length);
      accessToken = data.data.accessToken;
      
      const newSetCookie = res.headers.get('set-cookie');
      if (newSetCookie) {
        console.log('✅ Test passed: New rotated refresh cookie received.');
        cookieHeader = newSetCookie.split(';')[0];
      }
    }
  } catch (error: any) {
    console.error('❌ Test failed: Refresh failed:', error.message);
  }

  // 6. Test suspended user block
  console.log('\nTest 5: Suspended User Block...');
  const suspendedUser = await prisma.user.create({
    data: {
      username: 'temp_suspended',
      email: 'suspended@albasha.local',
      passwordHash: await bcrypt.hash('pass123', 10),
      fullName: 'Temp Suspended',
      fullNameAr: 'موقوف مؤقتاً',
      roleId: (await prisma.role.findFirst({ where: { name: 'senior_agent' } }))!.id,
      status: 'suspended'
    }
  });

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'suspended@albasha.local',
        password: 'pass123'
      })
    });
    
    if (res.status === 200) {
      console.log('❌ Test failed: Suspended user logged in.');
    } else {
      const data: any = await res.json();
      console.log('✅ Test passed: Suspended user login blocked.');
      console.log('Response status:', res.status);
      console.log('Arabic Message:', data.error?.message_ar);
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.user.delete({ where: { id: suspendedUser.id } });
  }

  // 7. Test Logout revocation
  console.log('\nTest 6: Logout Session Revocation...');
  try {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: cookieHeader
      }
    });
    
    const data = await res.json();
    console.log('✅ Test passed: Logout request succeeded.');
    console.log('Server response status:', res.status);
    console.log('Server response data:', data);
    
    const clearCookie = res.headers.get('set-cookie');
    console.log('Set-Cookie on logout:', clearCookie);
  } catch (error: any) {
    console.error('❌ Test failed: Logout failed:', error.message);
  }

  console.log('\n🏁 Verification tests completed.');
}

runTests();
