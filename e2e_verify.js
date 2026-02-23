const assert = require('assert');

const API_URL = 'http://localhost:5000/api';

async function request(endpoint, method = 'GET', data = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (data) options.body = JSON.stringify(data);
  
  const res = await fetch(`${API_URL}${endpoint}`, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
}

async function runTests() {
  try {
    console.log('--- STARTING E2E VERIFICATION ---');
    
    const ts = Date.now();
    const orgEmail = `org_${ts}@iiit.ac.in`;
    const partEmail = `part_${ts}@iiit.ac.in`;
    
    console.log('Registering test accounts...');
    
    // Login as Admin to create an organizer
    const adminRes = await request('/auth/login', 'POST', { email: 'admin@felicity.iiit.ac.in', password: 'Admin@123', role: 'admin' });
    const adminToken = adminRes.data.token;
    
    const orgRegRes = await request('/admin/organizers', 'POST', {
      name: 'Test Org ' + ts,
      category: 'Technical',
      description: 'E2E Test Organizer'
    }, adminToken);
    
    const { email: generatedEmail, password: generatedPassword } = orgRegRes.data.credentials;
    
    // Login as the newly created organizer
    const orgLoginRes = await request('/auth/login', 'POST', { email: generatedEmail, password: generatedPassword, role: 'organizer' });
    const orgToken = orgLoginRes.data.token;

    const partRegRes = await request('/auth/register', 'POST', {
      firstName: 'Test',
      lastName: 'User',
      email: partEmail,
      password: 'testpassword123',
      participantType: 'IIIT',
      contactNumber: '1234567890'
    });
    const partToken = partRegRes.data.token;
    console.log('✓ Registration successful');

    // 2. Create Event with Custom Fields
    console.log('Creating event with custom fields...');
    const eventData = {
      name: 'Verification API Test Event ' + Date.now(),
      description: 'Testing the form builder',
      type: 'NORMAL',
      eligibility: 'ALL',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 172800000).toISOString(),
      registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
      customFormFields: [
        { fieldName: 'Dietary', fieldType: 'dropdown', options: ['Veg', 'Non-Veg'], required: true },
        { fieldName: 'Reason', fieldType: 'textarea', required: false }
      ]
    };
    const createRes = await request('/organizer/events', 'POST', eventData, orgToken);
    const eventId = createRes.data.event._id;
    // Publish it
    await request(`/organizer/events/${eventId}/publish`, 'POST', null, orgToken);
    console.log('✓ Event created and published successfully:', eventId);

    // 3. Participant Registration (Form Builder Verification)
    console.log('Participant registering with custom fields...');
    const regData = {
      formResponses: {
        'Dietary': 'Veg',
        'Reason': 'Just testing!'
      }
    };
    const regRes = await request(`/events/${eventId}/register`, 'POST', regData, partToken);
    assert.deepStrictEqual(regRes.data.registration.formResponses, regData.formResponses);
    console.log('✓ Participant registered successfully with form responses');

    // 4. Discussion Forum (Pin, React, Reply Verification)
    console.log('Testing Discussion Forum features...');
    // Org posts a message
    const msg1Res = await request(`/discussions/${eventId}/messages`, 'POST', { message: 'Welcome everyone!' }, orgToken);
    const msg1Id = msg1Res.data.message._id;
    
    // Org pins the message
    const pinRes = await request(`/discussions/${eventId}/messages/${msg1Id}/pin`, 'PATCH', null, orgToken);
    assert.strictEqual(pinRes.data.message.isPinned, true);
    console.log('✓ Organizer successfully pinned message');

    // Participant reacts to the message
    const reactRes = await request(`/discussions/${eventId}/messages/${msg1Id}/react`, 'POST', { emoji: '👍' }, partToken);
    assert.strictEqual(reactRes.data.message.reactions[0].emoji, '👍');
    console.log('✓ Participant successfully reacted to message');

    // Participant replies to the message
    const replyRes = await request(`/discussions/${eventId}/messages`, 'POST', { message: 'Thanks for having us!', parentId: msg1Id }, partToken);
    assert.strictEqual(replyRes.data.message.parentId, msg1Id);
    console.log('✓ Participant successfully replied to message (Threaded)');

    // 5. Merchandise Payment Approval (Tier A Verification)
    console.log('Testing Merchandise Payment Approval workflow...');
    // Create Merch Event
    const merchEventData = {
      name: 'Merch Verification Event ' + Date.now(),
      description: 'Testing merch payments',
      type: 'MERCHANDISE',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 172800000).toISOString(),
      registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
      merchandiseItems: [{ name: 'T-Shirt', price: 500, stock: 100, size: 'L' }]
    };
    const merchCreateRes = await request('/organizer/events', 'POST', merchEventData, orgToken);
    const merchEventId = merchCreateRes.data.event._id;
    await request(`/organizer/events/${merchEventId}/publish`, 'POST', null, orgToken);
    
    // Participant registers for Merch
    const merchItemId = merchCreateRes.data.event.merchandiseItems[0]._id;
    const merchRegRes = await request(`/events/${merchEventId}/register`, 'POST', {
      merchandiseOrder: {
        items: [{ itemId: merchItemId, quantity: 1 }]
      }
    }, partToken);
    const regId = merchRegRes.data.registration.id;

    // Participant uploads payment proof
    await request(`/participant/payment-proof`, 'POST', { registrationId: regId, paymentProof: 'dummy_url.png' }, partToken);

    // Organizer fetches pending payments
    const pendingRes = await request('/organizer/payments/pending', 'GET', null, orgToken);
    const pendingPayment = pendingRes.data.pendingPayments.find(p => p._id === regId);
    assert.ok(pendingPayment, 'Payment should be in pending list');
    
    // Organizer approves payment
    const approveRes = await request(`/organizer/payments/${regId}/approve`, 'PATCH', { status: 'APPROVED' }, orgToken);
    assert.strictEqual(approveRes.data.registration.merchandiseOrder.paymentApprovalStatus, 'APPROVED');
    assert.strictEqual(approveRes.data.registration.status, 'CONFIRMED');
    console.log('✓ Organizer successfully verified and approved merchandise payment');

    console.log('--- ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY! ---');

  } catch (err) {
    console.error('--- E2E VERIFICATION TEST FAILED ---');
    console.error(err);
    process.exit(1);
  }
}

runTests();
