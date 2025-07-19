// Simple test for the enhanced database tool (no fallback data)
import { databaseQueryTool } from './lib/tools/database.js';

async function testDatabaseTool() {
  console.log('Testing enhanced database tool with email-based security (no fallback data)...');

  try {
    // Test 1: Valid email with customer query (should return database error)
    console.log('\n--- Test 1: Customer query with valid email (should return database error) ---');
    const customerResult = await databaseQueryTool.execute({
      type: 'customer',
      email: 'john@example.com'
    });
    console.log('Customer result:', JSON.stringify(customerResult, null, 2));

    // Test 2: Valid email with order query (should return database error)
    console.log('\n--- Test 2: Order query with valid email (should return database error) ---');
    const orderResult = await databaseQueryTool.execute({
      type: 'order',
      email: 'jane@example.com'
    });
    console.log('Order result:', JSON.stringify(orderResult, null, 2));

    // Test 3: Invalid email should fail
    console.log('\n--- Test 3: Invalid email should fail ---');
    try {
      const invalidResult = await databaseQueryTool.execute({
        type: 'customer',
        email: 'invalid-email'
      });
      console.log('This should not succeed:', invalidResult);
    } catch (error) {
      console.log('Expected error for invalid email:', error.message);
    }

    // Test 4: Missing email should fail
    console.log('\n--- Test 4: Missing email should fail ---');
    try {
      const missingEmailResult = await databaseQueryTool.execute({
        type: 'customer'
      });
      console.log('This should not succeed:', missingEmailResult);
    } catch (error) {
      console.log('Expected error for missing email:', error.message);
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabaseTool();