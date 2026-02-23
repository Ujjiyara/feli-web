const assert = require('assert').strict;

const API_URL = 'http://127.0.0.1:5000/api';

async function apiRequest(endpoint, method = 'GET', data = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (data) options.body = JSON.stringify(data);

  console.log(`\n-> [${method}] ${endpoint}`);
  const res = await fetch(`${API_URL}${endpoint}`, options);
  console.log(`<- [${res.status}] ${endpoint}`);
  
  // We want to capture the parsed JSON, but also avoid throwing unhandled syntax errors if not JSON.
  let json = {};
  try {
    json = await res.json();
  } catch (e) {
    if(!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  return { status: res.status, data: json };
}

async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (e) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${e.message}`);
    if (e.stack) console.log(`   Stack: ${e.stack}`);
    return false;
  }
}

async function runE2E() {
  console.log('--- Starting Rigorous API E2E Verification ---');
  let passed = 0;
  let failed = 0;

  let adminToken = '';
  let organizerToken = '';
  let participantToken = '';
  let organizerId = '';
  let eventId = '';
  let registrationId = '';
  let ticketId = '';

  const uniqueId = Date.now();

  // 1. Admin Features (Test Cases 1.2.4, 7.2.1)
  const adminP = await runTest('Admin Login', async () => {
    const res = await apiRequest('/auth/login', 'POST', {
      email: 'admin@felicity.iiit.ac.in',
      password: 'Admin@123',
      role: 'admin'
    });
    assert.equal(res.status, 200, `Admin login failed with status ${res.status}`);
    assert.ok(res.data.data.token, 'No token returned for admin');
    adminToken = res.data.data.token;
  });
  if (adminP) passed++; else failed++;

  const createOrgP = await runTest('Admin Creates Organizer', async () => {
    const res = await apiRequest('/admin/organizers', 'POST', {
      name: `Hackathon Team ${uniqueId}`,
      email: `hack${uniqueId}@clubs.felicity.iiit.ac.in`,
      category: 'Technical',
      description: 'Test Organizer for E2E'
    }, adminToken);
    assert.equal(res.status, 201, `Failed to create organizer: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.data.organizer.id);
    organizerId = res.data.data.organizer.id;
  });
  if (createOrgP) passed++; else failed++;

  // Admin gets the generated password via the API response (or we use a hardcoded one if the system default assumes something else).
  // Wait, the API response for adding organizers usually returns the generated password.
  // Actually, I'll login as the Test Organizer created in the seed instead, because I know the password: techclub@felicity.iiit.ac.in / TechClub@123
  
  const orgLoginP = await runTest('Organizer Login', async () => {
    const res = await apiRequest('/auth/login', 'POST', {
      email: 'techclub@felicity.iiit.ac.in',
      password: 'TechClub@123',
      role: 'organizer'
    });
    assert.equal(res.status, 200, `Organizer login failed: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.data.token);
    organizerToken = res.data.data.token;
  });
  if (orgLoginP) passed++; else failed++;

  // 2. Organizer Features (Test Cases 4.1, 6.4.2)
  const createEventP = await runTest('Organizer Creates Event', async () => {
    const eventStartDate = new Date();
    eventStartDate.setDate(eventStartDate.getDate() + 7); // Next week
    const eventEndDate = new Date(eventStartDate);
    eventEndDate.setHours(eventEndDate.getHours() + 2);

    const res = await apiRequest('/organizer/events', 'POST', {
      name: `E2E Hackathon ${uniqueId}`,
      description: 'Massive Coding Event',
      type: 'NORMAL',
      startDate: eventStartDate.toISOString(),
      endDate: eventEndDate.toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
      registrationFee: 0,
      registrationLimit: 100,
      eligibility: 'ALL',
      venue: 'Online',
      status: 'PUBLISHED' // publish immediately
    }, organizerToken);
    
    assert.equal(res.status, 201, `Failed to create event: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.data.event._id);
    eventId = res.data.data.event._id;
  });
  if (createEventP) passed++; else failed++;

  const publishEventP = await runTest('Organizer Publishes Event', async () => {
    const res = await apiRequest(`/organizer/events/${eventId}/publish`, 'POST', null, organizerToken);
    assert.equal(res.status, 200, `Failed to publish event: ${JSON.stringify(res.data)}`);
    assert.equal(res.data.data.event.status, 'PUBLISHED');
  });
  if (publishEventP) passed++; else failed++;

  // 3. Participant Registration (1.1.1, 1.2.1)
  const testEmail = `student_${uniqueId}@iiit.ac.in`;
  const partRegP = await runTest('Participant Registration', async () => {
    const res = await apiRequest('/auth/register', 'POST', {
      firstName: 'Test',
      lastName: 'Student',
      email: testEmail,
      password: 'password123',
      participantType: 'IIIT',
      contactNumber: '1234567890'
    });
    assert.equal(res.status, 201, `Participant reg failed: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.data.token);
    participantToken = res.data.data.token;
  });
  if (partRegP) passed++; else failed++;

  // 4. Participant Browsing & Registration (5.3.1, 5.5.1)
  const getEventsP = await runTest('Participant Lists Published Events', async () => {
    const res = await apiRequest('/events', 'GET', null, participantToken);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data.events));
    // Verify our new event is in there
    const found = res.data.data.events.find(e => e._id === eventId);
    assert.ok(found, 'Newly created published event was not found in the public feed');
  });
  if (getEventsP) passed++; else failed++;

  const regEventP = await runTest('Participant Registers for Event', async () => {
    const res = await apiRequest(`/events/${eventId}/register`, 'POST', {
      formResponses: {}
    }, participantToken);
    assert.equal(res.status, 201, `Failed to register for event: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.data.registration.id);
    registrationId = res.data.data.registration.id;
    ticketId = res.data.data.registration.ticketId;
    assert.ok(ticketId);
  });
  if (regEventP) passed++; else failed++;

  // 5. Participant Gets My Events (5.2.1)
  const myEventsP = await runTest('Participant Fetches My Events', async () => {
    const res = await apiRequest('/participant/my-events', 'GET', null, participantToken);
    assert.equal(res.status, 200, `My events fetch failed: ${JSON.stringify(res.data)}`);
    assert.ok(Array.isArray(res.data.data.upcoming));
    const found = res.data.data.upcoming.find(r => r.registrationId === registrationId);
    assert.ok(found, 'Registration not found in my-events upcoming list');
  });
  if (myEventsP) passed++; else failed++;

  // 6. Organizer Lists Participants (6.3.3)
  const orgPartP = await runTest('Organizer Lists Participants For Event', async () => {
    const res = await apiRequest(`/organizer/events/${eventId}/participants`, 'GET', null, organizerToken);
    assert.equal(res.status, 200, `Organizer participants fetch failed: ${JSON.stringify(res.data)}`);
    assert.ok(Array.isArray(res.data.data.registrations));
    assert.equal(res.data.data.registrations.length, 1, 'Should have exactly 1 registration');
    assert.equal(res.data.data.registrations[0].userId.email, testEmail);
  });
  if (orgPartP) passed++; else failed++;

  // 7. Test Fix: Participant Views Organizer Details (5.8.1)
  const partViewOrgP = await runTest('Participant Views Organizer Details', async () => {
    // Need the tech club organizer ID
    const organsRes = await apiRequest('/participant/organizers', 'GET', null, participantToken);
    const techClub = organsRes.data.data.organizers.find(o => o.email === 'techclub@felicity.iiit.ac.in' || o.name === 'Tech Club');
    assert.ok(techClub, 'Tech club not found in organizers list');
    
    const res = await apiRequest(`/participant/organizers/${techClub._id}`, 'GET', null, participantToken);
    assert.equal(res.status, 200, `Get organizer details failed: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.data.organizer);
    assert.equal(res.data.data.organizer.isActive, true, 'isActive field must be properly projected');
    assert.ok(Array.isArray(res.data.data.upcomingEvents));
  });
  if (partViewOrgP) passed++; else failed++;


  console.log(`\n--- E2E Verification Complete ---`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runE2E();
