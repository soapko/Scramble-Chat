const { getStore } = require('@netlify/blobs');

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
    
    // Try to get the store
    const store = getStore('test-store');
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
