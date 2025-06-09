const { getStore } = require('@netlify/blobs');

// This is a simplified test to see if the Netlify environment
// provides the context for Blobs automatically.
exports.handler = async () => {
  console.log('--- Starting Simplified Blobs Debug ---');

  try {
    // Relying on the Netlify environment to provide context automatically.
    // No manual siteID or token.
    console.log('Attempting to get store "debug-store" with automatic context...');
    const store = getStore('debug-store');
    console.log('getStore() call succeeded.');

    const testKey = `debug-simple-${Date.now()}`;
    await store.setJSON(testKey, { status: 'ok', timestamp: new Date().toISOString() });
    console.log(`setJSON() with key "${testKey}" succeeded.`);

    const data = await store.get(testKey, { type: 'json' });
    console.log(`get() with key "${testKey}" succeeded. Data:`, data);

    await store.delete(testKey);
    console.log(`delete() with key "${testKey}" succeeded.`);

    console.log('--- Simplified Blobs Debug Succeeded ---');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Netlify Blobs connection is working correctly with automatic context.' }),
    };
  } catch (error) {
    console.error('--- Simplified Blobs Debug Failed ---');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to connect to Netlify Blobs with automatic context.',
        details: {
          name: error.name,
          message: error.message,
        },
      }),
    };
  }
};
