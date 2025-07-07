const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  endpoints: {
    write: '/write',
    listSheets: '/list-sheets', // Future enhancement
    createSheet: '/create-sheet' // Future enhancement
  },
  testData: {
    sheet_id: '1efj3u3zsHzFfVAvQAySjIemJpHtbsqBvLg3rXCUUpjE',
    range: 'Sheet1!A1',
    summary: `Test summary written by Mosaia tool at ${new Date().toISOString()}`
  }
};

// Helper function to make HTTP requests
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testWriteToSheet() {
  console.log('\n🧪 Testing: Write to Google Sheet');
  console.log('=' .repeat(50));
  
  try {
    const testData = {
      ...TEST_CONFIG.testData,
      mode: 'overwrite',
      secrets: { GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'dummy' }
    };

    const response = await makeRequest(
      `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.write}`,
      { method: 'POST' },
      testData
    );

    console.log(`Status Code: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));

    if (response.statusCode === 200) {
      console.log('✅ Write test PASSED');
      return true;
    } else {
      console.log('❌ Write test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ Write test FAILED with error:', error.message);
    return false;
  }
}

async function testInvalidSheetId() {
  console.log('\n🧪 Testing: Invalid Sheet ID');
  console.log('=' .repeat(50));
  
  try {
    const testData = {
      ...TEST_CONFIG.testData,
      sheet_id: 'invalid-sheet-id',
      mode: 'overwrite',
      secrets: { GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'dummy' }
    };

    const response = await makeRequest(
      `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.write}`,
      { method: 'POST' },
      testData
    );

    console.log(`Status Code: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));

    if (response.statusCode === 500) {
      console.log('✅ Invalid sheet ID test PASSED (expected error)');
      return true;
    } else {
      console.log('❌ Invalid sheet ID test FAILED (should have returned error)');
      return false;
    }
  } catch (error) {
    console.log('❌ Invalid sheet ID test FAILED with error:', error.message);
    return false;
  }
}

async function testMissingParameters() {
  console.log('\n🧪 Testing: Missing Parameters');
  console.log('=' .repeat(50));
  
  const base = {
    mode: 'overwrite',
    secrets: { GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'dummy' }
  };
  
  const testCases = [
    { name: 'Missing sheet_id', data: { ...base, range: TEST_CONFIG.testData.range, summary: TEST_CONFIG.testData.summary } },
    { name: 'Missing range', data: { ...base, sheet_id: TEST_CONFIG.testData.sheet_id, summary: TEST_CONFIG.testData.summary } },
    { name: 'Missing summary', data: { ...base, sheet_id: TEST_CONFIG.testData.sheet_id, range: TEST_CONFIG.testData.range } },
    { name: 'Missing mode', data: { ...base, sheet_id: TEST_CONFIG.testData.sheet_id, range: TEST_CONFIG.testData.range, summary: TEST_CONFIG.testData.summary } },
    { name: 'Missing secrets', data: { sheet_id: TEST_CONFIG.testData.sheet_id, range: TEST_CONFIG.testData.range, summary: TEST_CONFIG.testData.summary, mode: 'overwrite' } }
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    // Remove the field to simulate missing
    const data = { ...testCase.data };
    if (testCase.name.includes('sheet_id')) delete data.sheet_id;
    if (testCase.name.includes('range')) delete data.range;
    if (testCase.name.includes('summary')) delete data.summary;
    if (testCase.name.includes('mode')) delete data.mode;
    if (testCase.name.includes('secrets')) delete data.secrets;
    
    try {
      const response = await makeRequest(
        `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.write}`,
        { method: 'POST' },
        data
      );

      console.log(`\n${testCase.name}:`);
      console.log(`Status Code: ${response.statusCode}`);
      console.log('Response:', JSON.stringify(response.body, null, 2));

      if (response.statusCode === 400) {
        console.log(`✅ ${testCase.name} test PASSED (expected validation error)`);
      } else {
        console.log(`❌ ${testCase.name} test FAILED (should have returned 400)`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} test FAILED with error:`, error.message);
      allPassed = false;
    }
  }

  return allPassed;
}

async function testServerHealth() {
  console.log('\n🧪 Testing: Server Health Check');
  console.log('=' .repeat(50));
  
  try {
    const response = await makeRequest(
      `${TEST_CONFIG.baseUrl}/`,
      { method: 'GET' }
    );

    console.log(`Status Code: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));

    if (response.statusCode === 200 && response.body && response.body.status === 'ok') {
      console.log('✅ Health check PASSED');
      return true;
    } else {
      console.log('❌ Health check FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ Health check FAILED with error:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Google Sheets Tool Tests');
  console.log('='.repeat(60));
  console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
  console.log(`Test Sheet ID: ${TEST_CONFIG.testData.sheet_id}`);
  console.log(`Test Range: ${TEST_CONFIG.testData.range}`);
  console.log('='.repeat(60));

  let passCount = 0;
  let total = 4;

  if (await testServerHealth()) passCount++;
  if (await testWriteToSheet()) passCount++;
  if (await testInvalidSheetId()) passCount++;
  if (await testMissingParameters()) passCount++;

  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`Passed: ${passCount}/${total}`);
  if (passCount === total) {
    console.log('🎉 All tests PASSED!');
  } else {
    console.log('⚠️  Some tests FAILED. Please check the errors above.');
  }
}

runAllTests();

module.exports = {
  runAllTests,
  testWriteToSheet,
  testInvalidSheetId,
  testMissingParameters,
  testServerHealth
}; 