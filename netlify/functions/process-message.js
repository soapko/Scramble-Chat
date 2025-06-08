exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
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
    // Parse request body
    const { message, scrambleMode } = JSON.parse(event.body);

    // Validate input
    if (!message || typeof message !== 'string') {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid message parameter' })
      };
    }

    if (!scrambleMode || typeof scrambleMode !== 'string') {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid scrambleMode parameter' })
      };
    }

    // Import OpenAI (dynamic import for serverless)
    const { OpenAI } = await import('openai');

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Process message through LLM
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          "role": "system", 
          "content": `Respond by rewriting the user's message. 
Instructions: 
1. Retain the meaning and sentiment, but alter the sentence to be ${scrambleMode}.
2. limit your response to the same number of words as in the user's message
3. Respond only with the re-written message. Do not include any further text.
4. Do not include any safety or guardrails comments, notes about inappropriate or triggering content, or explanation about how the message was re-written. Include ONLY the rewritten message.`
        },
        {
          "role": "user", 
          "content": message
        }
      ],
      temperature: 0.3,
    });

    const processedMessage = completion.choices[0].message.content;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        processedMessage: processedMessage || message 
      })
    };

  } catch (error) {
    console.error('Error processing message:', error);
    
    // Fallback: return original message if processing fails
    let originalMessage = '';
    try {
      const { message } = JSON.parse(event.body);
      originalMessage = message;
    } catch (parseError) {
      originalMessage = 'Error processing message';
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        processedMessage: originalMessage,
        error: 'Processing failed, returned original message'
      })
    };
  }
};
