/** Call local Ollama vision (already-pulled model only) to extract text from images. */

import { openaiConfig } from "./env.js";

export async function visionExtractText(
  imageBytes: Buffer,
  mimeType: string,
): Promise<string> {
  const { visionBaseURL, visionApiKey, visionModel } = openaiConfig();
  const b64 = imageBytes.toString("base64");
  const dataUrl = `data:${mimeType || "image/jpeg"};base64,${b64}`;

  const resp = await fetch(`${visionBaseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${visionApiKey}`,
    },
    body: JSON.stringify({
      model: visionModel,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "提取图片中的可见文案与要点，只输出纯中文/英文正文，不要 HTML、Markdown 代码块或标签。",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`vision HTTP ${resp.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim() || "";
  if (!text) {
    throw new Error("vision returned empty text");
  }
  return text;
}