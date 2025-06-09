const { getStore } = require('@netlify/blobs');

// This is a hardcoded test to confirm the credentials are the only issue.
exports.handler = async () => {
  console.log('--- Starting Hardcoded Credentials Test ---');

  const siteID = 'da58c02b-0367-40d6-8fc0-73da7f4d418b';
  const token = 'nfp_A2VqK6bYNWwEJ2WoAfptm2jegWMA3s25b969';

  console.log('Using hardcoded siteID and token.');

  try {
    const store = getStore('debug-store', { siteID, token });
    console.log('getStore() call succeeded.');

    const testKey = `hardcoded-test-${Date.now()}`;
    await store.setJSON(testKey, { status: 'ok' });
    console.log(`setJSON() succeeded.`);

    await store.delete(testKey);
    console.log(`delete() succeeded.`);

    console.log('--- Hardcoded Credentials Test Succeeded ---');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Netlify Blobs connection confirmed with hardcoded credentials.' }),
    };
  } catch (error) {
    console.error('--- Hardcoded Credentials Test Failed ---');
    console.error('Error details:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to connect to Netlify Blobs even with hardcoded credentials.',
        details: { name: error.name, message: error.message },
      }),
    };
  }
};
