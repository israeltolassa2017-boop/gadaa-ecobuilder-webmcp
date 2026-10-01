// netlify/functions/chat.js
// AI backend for Gadaa Roots waiting list
// Calls Nebius Token Factory with NVIDIA Nemotron models

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse the user message
  let message;
  try {
    const body = JSON.parse(event.body);
    message = body.message;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  if (!message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No message provided' }) };
  }

  // Get environment variables (set in Netlify dashboard)
  const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;
  const NEBIUS_API_URL = process.env.NEBIUS_API_URL || 'https://api.studio.nebius.ai/v1/chat/completions';
  const NEBIUS_MODEL = process.env.NEBIUS_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct';

  if (!NEBIUS_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  // System prompt — shapes the AI's personality and knowledge
  const systemPrompt = `You are the Gadaa Eco Builder AI assistant. You help users learn about the UNESCO-recognised Oromo Gadaa system, environmental restoration, and reforestation in Ethiopia.

Key facts you know:
- Gadaa Eco Builder is a project that teaches the Gadaa system through gamification while funding real tree planting in Oromia, Ethiopia.
- The project has cleared over 10 km of roadside and planted over 1,500 native trees.
- It is documented on UNDRR PreventionWeb and IUCN PANORAMA.
- The Gadaa system has seven stages: Dabballee (0-8), Follee (9-16), Qondaala (17-24), Kuusa (25-32), Raaba (33-40), Gadaa (41-48), Yuuba (49+).
- 10 points = 1 real tree. Users earn points by signing up, checking in, and tapping the sprout.
- Haadha Siinqee is a women's authority on peacebuilding and conflict resolution.
- The founder is Israel Tolessa Hinkossa from Ethiopia.

Answer questions clearly and warmly. Keep responses under 150 words.`;

  try {
    const response = await fetch(NEBIUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NEBIUS_API_KEY}`
      },
      body: JSON.stringify({
        model: NEBIUS_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Nebius error:', errText);
      return { statusCode: 500, body: JSON.stringify({ error: 'AI service unavailable' }) };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response from AI.';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    console.error('Function error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong' }) };
  }
};
