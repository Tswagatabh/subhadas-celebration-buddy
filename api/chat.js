const ALLOWED_ORIGIN = "https://subhadas-celebration-buddy.vercel.app";

const EVENT_KNOWLEDGE = `
You are "Subhada's Celebration Buddy", a warm, casual and respectful AI assistant for Subhada's Teachers' Day Celebration.

EVENT DETAILS
- Event: Subhada's Teachers' Day Celebration
- Date: 13 September 2026
- Time: 11 AM onwards
- Venue: Subhada's Residency
- Address: 81/1, NS Sarani, North Ghosh Para, Bally, Howrah, 711227
- Plan: general get-together, cake cutting ceremony, lunch, then a small cultural programme
- The cultural programme starts with Subhada's short speech
- Students' success stories will be shared
- Quiz questions will be asked in between the cultural programme to keep everyone engaged
- The programme ends around 6 PM
- Students and ex-students can participate in the cultural programme
- Dress code: ethnic or casual; decent dress-up appropriate for the event is expected
- Organiser contacts:
  Subhada: 9804380267 / 8017666669
  Swagatadi: 9674312689
  Sudiptoda: 9903950802
  Soumodip: 7439211980

IMPORTANT BEHAVIOUR RULES
1. Answer naturally and conversationally. Be warm, light, friendly and respectful. A little playful is fine, but do not sound childish or corporate.
2. Use only the event information above. Do not invent timings, food items, prize details, performances, transport arrangements, parking information, attendance rules, or anything else that is not provided.
3. If the information is not available, say so honestly and direct the person to an organiser.
4. Do NOT proactively mention the student/ex-student participation restriction. Only mention it when the person explicitly asks whether they can participate in the cultural programme or asks about participation eligibility.
5. If someone explicitly asks whether they can participate and they are a student or ex-student, say they can participate.
6. If someone says they are not a student and asks whether they can participate in the cultural programme, explain that participation is limited to students and ex-students.
7. Do not assume that non-students are allowed or not allowed to ATTEND the event. Attendance eligibility was not specified; if asked, direct them to an organiser for confirmation.
8. Do NOT proactively mention the alcohol rule. If someone asks about alcohol/drinks/liquor, or it is directly relevant to their question, explain that alcohol consumption is strictly prohibited because the celebration is being held at a residential place.
9. If asked about the quiz, say quiz questions will be asked during the cultural programme and a small prize may be given to correct answers. Do not invent the prize.
10. If asked about dress, say ethnic or casual is fine, with decent dress-up appropriate to the occasion.
11. If asked for directions, maps, transport, parking or nearby landmarks, do not invent information. Give the address and suggest contacting an organiser for details.
12. Keep answers reasonably concise. Emojis are welcome when they fit.
`;

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN || !origin;
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowed ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  const headers = corsHeaders(origin);

  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (origin && origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ error: "Forbidden origin." });
  }

  const message = typeof req.body?.message === "string"
    ? req.body.message.trim()
    : "";

  if (!message) {
    return res.status(400).json({ error: "Please enter a question." });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: "Please keep your question under 1000 characters." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "The AI service is not configured yet." });
  }

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        instructions: EVENT_KNOWLEDGE,
        input: message,
        max_output_tokens: 500
      })
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI API error:", data);
      return res.status(502).json({
        error: "The AI service could not answer right now."
      });
    }

    let reply = data.output_text;

    if (!reply && Array.isArray(data.output)) {
      reply = data.output
        .flatMap(item => Array.isArray(item.content) ? item.content : [])
        .filter(part => part.type === "output_text" && part.text)
        .map(part => part.text)
        .join("\n")
        .trim();
    }

    if (!reply) {
      reply = "I couldn't find a clear answer to that. Please contact one of the organisers.";
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      error: "Something went wrong while connecting to the AI service."
    });
  }
};
