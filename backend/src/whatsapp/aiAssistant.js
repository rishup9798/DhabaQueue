import "dotenv/config";

const AI_BASE_URL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";

export function isAiEnabled() {
  return Boolean(process.env.AI_API_KEY);
}

export async function extractIntakeDetails(message) {
  const systemPrompt = `You extract two fields from a restaurant customer's WhatsApp message.

Return ONLY valid JSON:
{"name":"Ramesh","partySize":4}

Rules:
- name must be the customer's actual name if clearly provided, otherwise null
- partySize must be the number of people if clearly provided, otherwise null
- understand natural language, Hindi, Hinglish, and English
- never guess
- partySize must be an integer between 1 and 30
- do not add markdown or explanations`;

  try {
    const data = await callAi(systemPrompt, message);
    const parsed = JSON.parse(cleanJson(data));

    return {
      name:
        typeof parsed.name === "string" && parsed.name.trim()
          ? parsed.name.trim().slice(0, 60)
          : null,
      partySize:
        Number.isInteger(parsed.partySize) &&
        parsed.partySize >= 1 &&
        parsed.partySize <= 30
          ? parsed.partySize
          : null,
    };
  } catch (err) {
    console.error("Hosted AI intake extraction failed:", err.message);
    return { name: null, partySize: null };
  }
}

export async function answerGeneralQuestion(
  message,
  { restaurantName, queueLength, avgWaitMinutes }
) {
  const systemPrompt = `You are a WhatsApp assistant for ${restaurantName}.

Only use these facts:
- ${queueLength} parties are currently waiting
- average wait is about ${avgWaitMinutes} minutes

If the customer asks something you don't know, say you are not sure and tell them to ask restaurant staff.
Understand Hindi, Hinglish, and English.
Keep the response friendly and under 2 short sentences.`;

  try {
    return await callAi(systemPrompt, message);
  } catch (err) {
    console.error("Hosted AI general question failed:", err.message);
    return `I can help you join the queue. Reply with your name to get started, or "status" if you're already in line.`;
  }
}

async function callAi(systemPrompt, userMessage) {
  if (!process.env.AI_API_KEY) {
    throw new Error("AI_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI API returned ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from AI provider");
    }

    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

function cleanJson(value) {
  return value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
