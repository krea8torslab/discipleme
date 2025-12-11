const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Gemini API Key is missing.");
}

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// Base function for Gemini requests
export async function getGeminiContent(prompt) {
  if (!API_KEY) {
    return "Error: API Key is missing. Please set VITE_GEMINI_API_KEY in your .env file.";
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API Error:", errorData);
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    } else {
        return "Sorry, the AI returned an unexpected response format.";
    }

  } catch (error) {
    console.error("AI Request Failed:", error);
    return "Sorry, I couldn't connect to the AI right now.";
  }
}

export async function getVerseInsight(reference, text) {
  const prompt = `Provide a brief, 2-sentence theological insight or practical application for the Bible verse ${reference}: "${text}". Keep it encouraging and simple for a general Christian audience.`;
  return await getGeminiContent(prompt);
}

export async function getVersePrayer(reference, text) {
  const prompt = `Write a short, heartfelt, 1-2 sentence prayer based on the Bible verse ${reference}: "${text}". The prayer should help the user apply this verse to their daily life. Start with "Lord" or "Heavenly Father".`;
  return await getGeminiContent(prompt);
}