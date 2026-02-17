module.exports = async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const input = req.body;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-5.2",
      input: `Create a simple day plan based on this input:\n${JSON.stringify(input)}`
    }),
  });

  const data = await response.json();

// Try common places the Responses API may put generated text:
const text =
  data.output_text ||
  (Array.isArray(data.output) ? data.output.map(o => o?.content?.map(c => c?.text).filter(Boolean).join("")).filter(Boolean).join("\n") : "") ||
  data?.response?.output_text ||
  data?.choices?.[0]?.message?.content ||
  "";

res.status(200).json({
  result: text.trim() || "No output",
  debug: {
    hasOutputText: !!data.output_text,
    hasOutputArray: Array.isArray(data.output),
    keys: Object.keys(data || {})
  }
});

