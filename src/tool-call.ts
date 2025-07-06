import { google } from 'googleapis';



/**
 * Writes a summary or data to a specified Google Sheet and range.
 * @param payload - Contains sheet_id, range, summary, and secrets (GOOGLE_SERVICE_ACCOUNT_KEY)
 */
export async function writeToGoogleSheet(payload: { sheet_id: string; range: string; summary: string; secrets: { GOOGLE_SERVICE_ACCOUNT_KEY: string } }): Promise<any> {
  console.log('=== GOOGLE SHEETS TOOL CALL STARTED ===');
  console.log('Payload received:', JSON.stringify(payload, null, 2));

  const { sheet_id, range, summary, secrets } = payload;

  // Validate required parameters
  if (!sheet_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'sheet_id is required' })
    };
  }
  if (!range) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'range is required' })
    };
  }
  if (!summary) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'summary is required' })
    };
  }
  const serviceAccountKey = secrets.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Google service account key not configured. Please set GOOGLE_SERVICE_ACCOUNT_KEY in Mosaia dashboard.' })
    };
  }

  let credentials;
  try {
    credentials = JSON.parse(serviceAccountKey);
    // Fix for escaped newlines in .env
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    // Debug log
    console.log('Loaded credentials:', credentials);
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.' })
    };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // Write the summary to the specified range
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: sheet_id,
      range: range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[summary]]
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully wrote summary to Google Sheet.',
        updatedRange: response.data.updatedRange
      })
    };
  } catch (error) {
    console.error('Error writing to Google Sheet:', error);
    let errorMessage = 'An unknown error occurred while writing to Google Sheets.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error('Google Sheets error message:', errorMessage);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage })
    };
  }
}
