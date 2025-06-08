const { getSignals } = require('./_shared/signaling-store');

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract roomId and userId from path parameters
    const pathParts = event.path.split('/');
    const roomId = pathParts[pathParts.length - 2];
    const userId = pathParts[pathParts.length - 1];

    if (!roomId || !userId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing roomId or userId in path' })
      };
    }

    // Get signals using shared store
    const { offers, answers } = await getSignals(roomId, userId);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        offers,
        answers,
        roomId,
        userId
      })
    };

  } catch (error) {
    console.error('Error retrieving WebRTC signals:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to retrieve signals',
        offers: [],
        answers: []
      })
    };
  }
};
