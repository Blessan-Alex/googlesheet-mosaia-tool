import { google } from 'googleapis';

interface EnhancedPayload {
  sheet_id: string;
  range: string;
  summary: string;
  mode?: 'overwrite' | 'append' | 'insert';
  secrets: { GOOGLE_SERVICE_ACCOUNT_KEY: string };
}

/**
 * Enhanced Google Sheets tool with better error handling and multiple write modes
 */
export async function writeToGoogleSheetEnhanced(payload: EnhancedPayload): Promise<any> {
  console.log('=== ENHANCED GOOGLE SHEETS TOOL CALL STARTED ===');
  console.log('Payload received:', JSON.stringify(payload, null, 2));

  const { sheet_id, range, summary, mode = 'overwrite', secrets } = payload;

  // Enhanced validation with helpful error messages
  const validationResult = validateInputs(sheet_id, range, summary, secrets);
  if (validationResult.error) {
    return validationResult;
  }

  let credentials;
  try {
    credentials = JSON.parse(secrets.GOOGLE_SERVICE_ACCOUNT_KEY);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    console.log('✅ Credentials loaded successfully');
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.',
        help: 'Make sure your service account key is properly formatted as a single-line JSON string in the Mosaia dashboard.'
      })
    };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // First, verify sheet access and get sheet info
    const sheetInfo = await verifySheetAccess(sheets, sheet_id);
    if (sheetInfo.error) {
      return sheetInfo;
    }

    // Validate range format
    const rangeValidation = validateRangeFormat(range, sheetInfo.sheetNames);
    if (rangeValidation.error) {
      return rangeValidation;
    }

    // Provide guidance for append mode
    if (mode === 'append' && range.includes('!') && !range.includes(':')) {
      console.log(`Note: Converting range "${range}" to sheet name for append mode`);
    }

    // Write data based on mode
    let response;
    switch (mode) {
      case 'append':
        response = await appendToSheet(sheets, sheet_id, range, summary);
        break;
      case 'insert':
        response = await insertIntoSheet(sheets, sheet_id, range, summary);
        break;
      case 'overwrite':
      default:
        response = await overwriteSheet(sheets, sheet_id, range, summary);
        break;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully ${mode}ed data to Google Sheet.`,
        updatedRange: response.data.updatedRange,
        mode: mode,
        sheetName: sheetInfo.sheetNames[0],
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error in enhanced Google Sheets tool:', error);
    return handleGoogleSheetsError(error);
  }
}

/**
 * Validate all inputs with helpful error messages
 */
function validateInputs(sheet_id: string, range: string, summary: string, secrets: any) {
  if (!sheet_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: 'sheet_id is required',
        help: 'Provide the Google Sheet ID from the URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit'
      })
    };
  }

  if (!range) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: 'range is required',
        help: 'Use A1 notation like "Sheet1!A1" or "A1" for the first sheet'
      })
    };
  }

  if (!summary) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: 'summary is required',
        help: 'Provide the data you want to write to the sheet'
      })
    };
  }

  if (!secrets.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Google service account key not configured',
        help: 'Set GOOGLE_SERVICE_ACCOUNT_KEY in Mosaia dashboard. Make sure the sheet is shared with your service account email.',
        setupSteps: [
          '1. Get your service account email from the JSON key',
          '2. Share your Google Sheet with that email',
          '3. Set the JSON key in Mosaia dashboard'
        ]
      })
    };
  }

  return { error: null };
}

/**
 * Verify sheet access and get sheet information
 */
async function verifySheetAccess(sheets: any, sheet_id: string) {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheet_id,
      ranges: [],
      includeGridData: false
    });

    const sheetNames = response.data.sheets?.map((sheet: any) => sheet.properties?.title) || [];
    
    return {
      error: null,
      sheetNames,
      sheetTitle: response.data.properties?.title
    };
  } catch (error: any) {
    if (error.code === 403) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: 'Access denied to Google Sheet',
          help: 'The service account does not have access to this sheet.',
          solution: 'Share the sheet with your service account email or make it publicly editable.',
          serviceAccountEmail: 'Check your service account JSON for the client_email field'
        })
      };
    } else if (error.code === 404) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Google Sheet not found',
          help: 'The sheet ID is invalid or the sheet has been deleted.',
          solution: 'Check the sheet ID in the URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit'
        })
      };
    }
    throw error;
  }
}

/**
 * Validate range format and suggest corrections
 */
function validateRangeFormat(range: string, sheetNames: string[]) {
  // Basic A1 notation validation
  const a1Pattern = /^[A-Za-z]+\d+(?::[A-Za-z]+\d+)?$/;
  const sheetRangePattern = /^[^!]+![A-Za-z]+\d+(?::[A-Za-z]+\d+)?$/;
  const sheetNamePattern = /^[^!]+$/; // Just sheet name without range

  if (!a1Pattern.test(range) && !sheetRangePattern.test(range) && !sheetNamePattern.test(range)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Invalid range format',
        help: 'Use A1 notation like "A1", "B5", "A1:B10", "Sheet1!A1", or just "Sheet1" for append mode',
        examples: [
          'A1 - Single cell',
          'B5 - Single cell', 
          'A1:B10 - Range of cells',
          'Sheet1!A1 - Specific sheet and cell',
          'Tasks - Sheet name (for append mode)',
          'Data!A1 - Sheet named "Data"'
        ],
        availableSheets: sheetNames
      })
    };
  }

  return { error: null };
}

/**
 * Append data to the next empty row
 */
async function appendToSheet(sheets: any, sheet_id: string, range: string, summary: string) {
  // For append mode, we need to convert the range to a proper append format
  // If range is "SheetName!A1", convert to "SheetName!A:A" or just "SheetName"
  let appendRange = range;
  
  // If range contains a specific cell (like "Tasks!A1"), extract just the sheet name
  if (range.includes('!')) {
    const sheetName = range.split('!')[0];
    appendRange = sheetName;
  }
  
  console.log(`Appending to range: ${appendRange}`);
  
  return await sheets.spreadsheets.values.append({
    spreadsheetId: sheet_id,
    range: appendRange,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[summary]]
    }
  });
}

/**
 * Insert data without overwriting existing content
 */
async function insertIntoSheet(sheets: any, sheet_id: string, range: string, summary: string) {
  // Parse range to get row number
  const rowMatch = range.match(/(\d+)/);
  const rowNumber = rowMatch ? parseInt(rowMatch[1]) : 1;

  // Insert a new row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheet_id,
    requestBody: {
      requests: [{
        insertDimension: {
          range: {
            sheetId: 0, // Assuming first sheet
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber
          },
          inheritFromBefore: false
        }
      }]
    }
  });

  // Write data to the new row
  return await sheets.spreadsheets.values.update({
    spreadsheetId: sheet_id,
    range: range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[summary]]
    }
  });
}

/**
 * Overwrite existing content (default behavior)
 */
async function overwriteSheet(sheets: any, sheet_id: string, range: string, summary: string) {
  return await sheets.spreadsheets.values.update({
    spreadsheetId: sheet_id,
    range: range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[summary]]
    }
  });
}

/**
 * Handle Google Sheets API errors with helpful messages
 */
function handleGoogleSheetsError(error: any) {
  let errorMessage = 'An unknown error occurred while writing to Google Sheets.';
  let help = '';

  if (error.code === 403) {
    errorMessage = 'Permission denied. The service account cannot access this sheet.';
    help = 'Share the sheet with your service account email or make it publicly editable.';
  } else if (error.code === 404) {
    errorMessage = 'Sheet not found. The sheet ID is invalid.';
    help = 'Check the sheet ID in the URL.';
  } else if (error.code === 400) {
    errorMessage = 'Invalid request. Check your range format.';
    help = 'Use A1 notation like "A1" or "Sheet1!A1".';
  } else if (error.message) {
    errorMessage = error.message;
  }

  return {
    statusCode: 500,
    body: JSON.stringify({ 
      error: errorMessage,
      help: help,
      code: error.code
    })
  };
}

// Export the original function for backward compatibility
export async function writeToGoogleSheet(payload: { sheet_id: string; range: string; summary: string; secrets: { GOOGLE_SERVICE_ACCOUNT_KEY: string } }): Promise<any> {
  return writeToGoogleSheetEnhanced({ ...payload, mode: 'overwrite' });
} 