const { getStore } = require('@netlify/blobs');

// This function is a definitive test to see if environment variables
// are available at runtime and can be used to connect to Blobs.
exports.handler = async () => {
  console.log('--- Starting Definitive Environment Test ---');

  // Log all available environment variable keys to see what the function can access.
  console.log('Available process.env keys:', Object.keys(process.env).join(', '));

  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_ACCESS_TOKEN;

  console.log('Value of NETLIFY_SITE_ID:', siteID ? `Exists (Length: ${siteID.length})` : 'undefined');
  console.log('Value of NETLIFY_ACCESS_TOKEN:', token ? `Exists (Length: ${token.length})` : 'undefined');

  if (!siteID || !token) {
    const errorMessage = 'Required environment variables for Blobs are missing from process.env.';
    console.error(errorMessage);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: errorMessage, available_vars: Object.keys(process.env) }),
    };
  }

  try {
    console.log(`Attempting to get store "debug-store" with siteID: "${siteID}" and a token.`);
    const store = getStore('debug-store', { siteID, token });
    console.log('getStore() call succeeded.');

    const testKey = `definitive-test-${Date.now()}`;
    await store.setJSON(testKey, { status: 'ok' });
    console.log(`setJSON() succeeded.`);

    await store.delete(testKey);
    console.log(`delete() succeeded.`);

    console.log('--- Definitive Environment Test Succeeded ---');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Netlify Blobs connection confirmed with environment variables.' }),
    };
  } catch (error) {
    console.error('--- Definitive Environment Test Failed ---');
    console.error('Error details:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to connect to Netlify Blobs even with explicit credentials.',
        details: { name: error.name, message: error.message },
      }),
    };
  }
};
