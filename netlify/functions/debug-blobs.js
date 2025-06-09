const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  console.log('--- Starting Blobs Debug ---');

  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_ACCESS_TOKEN;

  console.log('Runtime NETLIFY_SITE_ID:', siteID ? `"${siteID}"` : 'undefined');
  console.log('Runtime NETLIFY_ACCESS_TOKEN:', token ? `Exists (Length: ${token.length})` : 'undefined');

  if (!siteID || !token) {
    const errorMessage = 'Required environment variables (NETLIFY_SITE_ID, NETLIFY_ACCESS_TOKEN) are missing.';
    console.error(errorMessage);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: errorMessage }),
    };
  }

  try {
    console.log('Attempting to get store "debug-store"...');
    const store = getStore('debug-store', { siteID, token });
    console.log('getStore() call succeeded.');

    const testKey = `debug-${Date.now()}`;
    await store.setJSON(testKey, { status: 'ok' });
    console.log(`setJSON() with key "${testKey}" succeeded.`);

    const data = await store.get(testKey, { type: 'json' });
    console.log(`get() with key "${testKey}" succeeded. Data:`, data);

    await store.delete(testKey);
    console.log(`delete() with key "${testKey}" succeeded.`);

    console.log('--- Blobs Debug Succeeded ---');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Netlify Blobs connection is working correctly.' }),
    };
  } catch (error) {
    console.error('--- Blobs Debug Failed ---');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to connect to Netlify Blobs.',
        details: {
          name: error.name,
          message: error.message,
        },
      }),
    };
  }
};
