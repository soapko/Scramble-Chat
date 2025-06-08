const { getStore } = require('@netlify/blobs');

// Force redeploy to pick up environment variables - 2025-06-08
exports.handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    console.log('Testing Netlify Blobs...');
    console.log('Available environment variables:');
    console.log('NETLIFY_SITE_ID:', process.env.NETLIFY_SITE_ID);
    console.log('NETLIFY_SITE_URL:', process.env.NETLIFY_SITE_URL);
    console.log('NETLIFY_ACCOUNT_SLUG:', process.env.NETLIFY_ACCOUNT_SLUG);
    
    // Try to get the store with manual configuration
    const siteID = process.env.NETLIFY_SITE_ID || 'da58c02b-0367-40d6-8fc0-73da7f4d418b';
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    
    console.log('Trying with manual siteID:', siteID);
    console.log('Token available:', !!token);
    const store = getStore('test-store', { siteID, token });
    console.log('Store created successfully');
    
    // Try to write a test blob
    const testKey = `test-${Date.now()}`;
    const testData = { message: 'Hello Blobs!', timestamp: Date.now() };
    
    await store.setJSON(testKey, testData);
    console.log('Test data written successfully');
    
    // Try to read it back
    const retrievedData = await store.get(testKey, { type: 'json' });
    console.log('Test data retrieved:', retrievedData);
    
    // Try to list blobs
    const { blobs } = await store.list();
    console.log('Found', blobs.length, 'blobs in store');
    
    // Clean up
    await store.delete(testKey);
    console.log('Test data cleaned up');
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Netlify Blobs working perfectly!',
        blobCount: blobs.length,
        testData: retrievedData
      })
    };
    
  } catch (error) {
    console.error('Blobs test failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false,
        error: error.message,
        errorType: error.constructor.name
      })
    };
  }
};
