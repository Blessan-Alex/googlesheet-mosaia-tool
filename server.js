require('dotenv').config();
// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { writeToGoogleSheetEnhanced } = require('./dist/tool-call-enhanced');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Google Sheets Tool is running.' });
});

// POST /write endpoint
app.post('/write', async (req, res) => {
  const { sheet_id, range, summary, mode, secrets } = req.body;

  // Improved parameter validation
  const missing = [];
  if (!sheet_id) missing.push('sheet_id');
  if (!range) missing.push('range');
  if (!summary) missing.push('summary');
  if (!mode) missing.push('mode');
  if (!secrets || !secrets.GOOGLE_SERVICE_ACCOUNT_KEY) missing.push('secrets.GOOGLE_SERVICE_ACCOUNT_KEY');

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required parameter(s): ${missing.join(', ')}`,
      help: 'Please provide all required parameters.'
    });
  }

  try {
    const result = await writeToGoogleSheetEnhanced({ sheet_id, range, summary, mode, secrets });
    let body = result.body;
    try { body = JSON.parse(body); } catch (e) {}
    res.status(result.statusCode || 200).json(body);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Local development server running on port ${PORT}`);
  console.log('POST to /write with JSON: { "sheet_id": "...", "range": "...", "summary": "...", "mode": "...", "secrets": { "GOOGLE_SERVICE_ACCOUNT_KEY": "..." } }');
});