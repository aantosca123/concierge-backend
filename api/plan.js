module.exports = async function handler(req, res) {
  // CORS (helps browser tools like Hoppscotch; iOS doesn't need it, but fine)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const input = req.body || {};
    const city = String(input.city || "Boston");
    const date = String(input.date || "today");
    const vibe = String(input.vibe || "walkable, coffee, bookstores, light culture, not exhausting");

    const schemaHint = {
      title: "Simple day plan — City (date)",
      summary: "One sentence summary of the vibe.",
      blocks: [
        {
          time: "9:00–10:15",
          title: "Coffee + easy start (Neighborhood)",
          details: ["Bullet 1", "Bullet 2"]
        }
      ],
      tips: ["Tip 1", "Tip 2"]
    };

    const prompt = `
Return ONLY valid JSON (no markdown, no backticks).
Match this exact schema:
${JSON.stringify(schemaHint, null, 2)}

Rules:
- 5–8 blocks
- Times should be realistic and sequential
- Make it walkable and not exhausting
- Use the provided city/date/vibe

Inputs:
city=${city}
date=${date}
vibe=${vibe}
`.trim();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        input: prompt
      })
    });

    const data = await response.json();

    // Pull text from common Responses API shapes
    const text =
      data.output_text ||
      (Array.isArray(data.output)
        ? data.output
            .map(o => (o?.content || []).map(c => c?.text || "").join(""))
            .join("\n")
        : "") ||
      "";

    // Try to parse JSON from the model output
    let plan;
    try {
      plan = JSON.parse(text);
    } catch {
      // Fallback: return raw text if JSON parsing fails
      return res.status(200).json({
        result: "No structured JSON returned. Here is the raw output:",
        raw: text.trim(),
        debug: { statusFromOpenAI: response.status, keys: Object.keys(data || {}) }
      });
    }

    // Minimal validation
    if (!plan || !plan.title || !Array.isArray(plan.blocks)) {
      return res.status(200).json({
        result: "JSON returned, but schema was wrong.",
        raw: plan,
        debug: { statusFromOpenAI: response.status }
      });
    }

    return res.status(200).json(plan);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
};
