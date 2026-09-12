import "dotenv/config";

const OLLAMA_API_URL = "http://127.0.0.1:11434/api/chat";
const OLLAMA_MODEL = "llama3.2:3b";

export function isAiEnabled() {
  return true;
}

export async function extractIntakeDetails(message) {
  const systemPrompt = `You extract two fields from a restaurant customer's WhatsApp message.

Return ONLY valid JSON:
{"name":"Ramesh","partySize":4}

Rules:
- name must be the customer's actual name if clearly provided, otherwise null
- partySize must be the number of people if clearly provided, otherwise null
- never guess
- partySize must be an integer between 1 and 30
- do not add markdown
- do not add explanations`;

  try {
    const data = await callOllama(systemPrompt, message);
    const cleaned = data.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

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
    console.error("Local AI intake extraction failed:", err.message);
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

Keep the response friendly and under 2 short sentences.`;

  try {
    return await callOllama(systemPrompt, message);
  } catch (err) {
    console.error("Local AI general question failed:", err.message);
    return `I can help you join the queue. Reply with your name to get started, or "status" if you're already in line.`;
  }
}

async function callOllama(systemPrompt, userMessage) {
  const response = await fetch(OLLAMA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      options: {
        temperature: 0,
      },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Ollama API returned ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  if (!data.message?.content) {
    throw new Error("No content returned from Ollama");
  }

  return data.message.content.trim();
}