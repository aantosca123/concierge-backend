module.exports = async function handler(req, res) {
  // ---- CORS (so browser tools like Hoppscotch work) ----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const input = req.body ?? {};

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        input: `Create a simple day plan based on this input:\n${JSON.stringify(
          input
        )}`,
      }),
    });

    const data = await response.json();

    // Try common places the Responses API may put generated text:
    const text =
      data?.output_text ||
      (Array.isArray(data?.output)
        ? data.output
            .map((o) =>
              (o?.content || [])
                .map((c) => c?.text)
                .filter(Boolean)
                .join("")
            )
            .filter(Boolean)
            .join("\n")
        : "") ||
      data?.response?.output_text ||
      data?.choices?.[0]?.message?.content ||
      "";

    return res.status(200).json({
      result: (text || "").trim() || "No output",
      debug: {
        statusFromOpenAI: response.status,
        hasOutputText: !!data?.output_text,
        hasOutputArray: Array.isArray(data?.output),
        keys: Object.keys(data || {}),
        errorFromOpenAI: data?.error || null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: String(err),
    });
  }
};
