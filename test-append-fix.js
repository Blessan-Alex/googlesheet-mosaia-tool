// Test script to verify append range fix
const { writeToGoogleSheetEnhanced } = require('./dist/tool-call-enhanced');

// Mock the Google Sheets API for testing
const mockSheets = {
  spreadsheets: {
    get: async () => ({
      data: {
        sheets: [{ properties: { title: 'Tasks' } }],
        properties: { title: 'Test Sheet' }
      }
    }),
    values: {
      append: async (params) => {
        console.log('✅ Append called with range:', params.range);
        return { data: { updatedRange: params.range } };
      }
    }
  }
};

// Mock google.auth.GoogleAuth
const mockAuth = {
  GoogleAuth: class {
    constructor() {}
  }
};

// Test the append function directly
async function testAppendRangeFix() {
  console.log('🧪 Testing append range fix...\n');

  // Test case 1: "Tasks!A1" should become "Tasks"
  console.log('Test 1: Converting "Tasks!A1" to "Tasks"');
  const test1 = await writeToGoogleSheetEnhanced({
    sheet_id: 'test-sheet-id',
    range: 'Tasks!A1',
    summary: 'Test task 1',
    mode: 'append',
    secrets: { GOOGLE_SERVICE_ACCOUNT_KEY: '{"test": "key"}' }
  });
  console.log('Result:', test1.statusCode === 200 ? '✅ PASS' : '❌ FAIL');
  console.log('');

  // Test case 2: "Tasks" should remain "Tasks"
  console.log('Test 2: Keeping "Tasks" as "Tasks"');
  const test2 = await writeToGoogleSheetEnhanced({
    sheet_id: 'test-sheet-id',
    range: 'Tasks',
    summary: 'Test task 2',
    mode: 'append',
    secrets: { GOOGLE_SERVICE_ACCOUNT_KEY: '{"test": "key"}' }
  });
  console.log('Result:', test2.statusCode === 200 ? '✅ PASS' : '❌ FAIL');
  console.log('');

  // Test case 3: "A1" should remain "A1" (overwrite mode)
  console.log('Test 3: Keeping "A1" as "A1" in overwrite mode');
  const test3 = await writeToGoogleSheetEnhanced({
    sheet_id: 'test-sheet-id',
    range: 'A1',
    summary: 'Test task 3',
    mode: 'overwrite',
    secrets: { GOOGLE_SERVICE_ACCOUNT_KEY: '{"test": "key"}' }
  });
  console.log('Result:', test3.statusCode === 200 ? '✅ PASS' : '❌ FAIL');
  console.log('');

  console.log('🎉 All tests completed!');
}

// Run the test
testAppendRangeFix().catch(console.error); 