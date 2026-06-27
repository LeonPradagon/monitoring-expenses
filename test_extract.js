const text = `Raw content: *   Role: Nanalys, a smart financial assistant.
    *   Task: Convert natural language messages into JSON format.

    Let's try to be helpful but strictly JSON:
    \`{ "intent": "greeting", "entity": null, "action": "none" }\`

    "halo" doesn't fit these.

    \`\`\`json
    {
      "intent": "greeting",
      "message": "halo",
      "action": "none"
    }
    \`\`\`

    However, in a real-world LLM implementation for a financial bot, if the user just says "hello", the bot should probably respond in natural language *unless* the system prompt explicitly forbids it. But the prompt says "Your task is to change... into JSON".
`;

function extractJSON(content) {
  // First try to extract from a json code block
  const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1]);
  }

  // Fallback: extract the largest possible JSON by matching balanced braces.
  // Actually, a simpler way is to find the LAST valid JSON in the string.
  // Let's just find all { ... } blocks and parse the last valid one.
  const regex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g; // Simple nested brace matching (depth 1)
  
  // A better fallback is to just match the first { to the last } and try to parse.
  // If it fails, we fall back to a more sophisticated method or error.
  
  // Let's just use greedy match from first { to last }, but it failed.
  // Let's try non-greedy matching from { to }
  const matches = content.match(/\{[\s\S]*?\}/g);
  if (matches) {
     for (let i = matches.length - 1; i >= 0; i--) {
        try {
           return JSON.parse(matches[i]);
        } catch (e) {
           // ignore
        }
     }
  }
  
  throw new Error("No valid JSON found");
}

console.log(extractJSON(text));
