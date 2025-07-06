const axios = require('axios');

// Test configuration - Use your actual sheet ID
const TEST_CONFIG = {
  sheet_id: "1efj3u3zsHzFfVAvQAySjIemJpHtbsqBvLg3rXCUUpjE", // Your actual sheet ID
  base_url: "http://localhost:3000/write"
};

// Test cases
const testCases = [
  {
    name: "Basic Overwrite Test",
    payload: {
      sheet_id: TEST_CONFIG.sheet_id,
      range: "A1",
      summary: "Enhanced tool test - " + new Date().toISOString()
    },
    expected: "Should overwrite cell A1"
  },
  {
    name: "Append Mode Test",
    payload: {
      sheet_id: TEST_CONFIG.sheet_id,
      range: "Sheet1",
      summary: "Appended row - " + new Date().toISOString(),
      mode: "append"
    },
    expected: "Should add to next empty row"
  },
  {
    name: "Insert Mode Test",
    payload: {
      sheet_id: TEST_CONFIG.sheet_id,
      range: "A5",
      summary: "Inserted row - " + new Date().toISOString(),
      mode: "insert"
    },
    expected: "Should insert new row at A5"
  },
  {
    name: "Invalid Range Test",
    payload: {
      sheet_id: TEST_CONFIG.sheet_id,
      range: "INVALID_RANGE",
      summary: "This should fail"
    },
    expected: "Should return validation error"
  },
  {
    name: "Missing Sheet ID Test",
    payload: {
      range: "A1",
      summary: "This should fail"
    },
    expected: "Should return missing sheet_id error"
  },
  {
    name: "Missing Summary Test",
    payload: {
      sheet_id: TEST_CONFIG.sheet_id,
      range: "A1"
    },
    expected: "Should return missing summary error"
  }
];

async function runTest(testCase) {
  console.log(`\n🧪 Running: ${testCase.name}`);
  console.log(`📋 Expected: ${testCase.expected}`);
  console.log(`📤 Payload:`, JSON.stringify(testCase.payload, null, 2));

  try {
    const response = await axios.post(TEST_CONFIG.base_url, testCase.payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ SUCCESS (${response.status})`);
    console.log(`📥 Response:`, JSON.stringify(response.data, null, 2));

    // Extract key information
    if (response.data.message) {
      console.log(`💬 Message: ${response.data.message}`);
    }
    if (response.data.updatedRange) {
      console.log(`📍 Updated Range: ${response.data.updatedRange}`);
    }
    if (response.data.mode) {
      console.log(`🔧 Mode: ${response.data.mode}`);
    }
    if (response.data.timestamp) {
      console.log(`⏰ Timestamp: ${response.data.timestamp}`);
    }

    return { success: true, data: response.data };

  } catch (error) {
    console.log(`❌ FAILED`);
    
    if (error.response) {
      console.log(`📥 Error Response (${error.response.status}):`, JSON.stringify(error.response.data, null, 2));
      
      // Check for enhanced error messages
      if (error.response.data.help) {
        console.log(`💡 Help: ${error.response.data.help}`);
      }
      if (error.response.data.setupSteps) {
        console.log(`🔧 Setup Steps:`);
        error.response.data.setupSteps.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step}`);
        });
      }
      if (error.response.data.examples) {
        console.log(`📝 Examples:`);
        error.response.data.examples.forEach(example => {
          console.log(`   • ${example}`);
        });
      }
      
      return { success: false, error: error.response.data };
    } else {
      console.log(`🌐 Network Error: ${error.message}`);
      return { success: false, error: { error: error.message } };
    }
  }
}

async function runAllTests() {
  console.log('🚀 Enhanced Google Sheets Tool Test Suite');
  console.log('==========================================');
  console.log(`📊 Running ${testCases.length} test cases`);
  console.log(`📋 Test Sheet ID: ${TEST_CONFIG.sheet_id}`);
  console.log(`🌐 Endpoint: ${TEST_CONFIG.base_url}`);

  const results = {
    total: testCases.length,
    passed: 0,
    failed: 0,
    details: []
  };

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test ${i + 1}/${testCases.length}`);
    
    const result = await runTest(testCase);
    
    results.details.push({
      name: testCase.name,
      success: result.success,
      data: result.data || result.error
    });

    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log('================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.total}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  // Detailed results
  console.log(`\n📋 DETAILED RESULTS`);
  console.log('===================');
  results.details.forEach((detail, index) => {
    const status = detail.success ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${detail.name}`);
  });

  return results;
}

// Check if server is running by testing the actual endpoint
async function checkServer() {
  try {
    // Try a simple POST request to the /write endpoint with valid data
    const testPayload = {
      sheet_id: TEST_CONFIG.sheet_id,
      range: "A1",
      summary: "Server test"
    };
    
    await axios.post(TEST_CONFIG.base_url, testPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    console.log('✅ Server is running and responding on /write endpoint');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running on port 3000');
      console.log('💡 Start the server with: npm run start:dev');
    } else if (error.response) {
      // If we get a response (even an error), the server is running
      console.log('✅ Server is running and responding');
      console.log(`📡 Response status: ${error.response.status}`);
      
      // If it's a 400 or 500 error, that's expected for test data
      if (error.response.status === 400 || error.response.status === 500) {
        console.log('💡 Server is working (test payload correctly rejected)');
        return true;
      }
    } else {
      console.log('❌ Server check failed:', error.message);
    }
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking server status...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('\n🚀 To start testing:');
    console.log('1. Start the server: npm run start:dev');
    console.log('2. Run this test: node test-enhanced.js');
    return;
  }

  console.log('\n🎯 Starting enhanced tool tests...');
  await runAllTests();
}

// Run the tests
main().catch(console.error); 