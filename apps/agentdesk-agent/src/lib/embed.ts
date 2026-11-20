/** OpenAI-compatible embeddings via HTTP (baseURL + apiKey from admin DB). */

import { openaiConfig } from "./env.js";

const EMBED_BATCH_SIZE = 16;
const EMBED_TIMEOUT_MS = 120_000;

async function embedBatch(texts: string[]): Promise<number[][]> {
  const { embeddingBaseURL, embeddingApiKey, embeddingModel, embeddingDimension } =
    openaiConfig();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);
  try {
    const resp = await fetch(`${embeddingBaseURL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${embeddingApiKey}`,
      },
      body: JSON.stringify({
        model: embeddingModel,
        input: texts,
        // Matryoshka / truncated dims (pgvector HNSW max 2000)
        dimensions: embeddingDimension,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`embeddings HTTP ${resp.status}: ${errText.slice(0, 500)}`);
    }

    const data = (await resp.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
    };
    const rows = data.data ?? [];
    if (rows.length !== texts.length) {
      throw new Error(
        `embeddings count mismatch: got ${rows.length}, expected ${texts.length}`,
      );
    }
    return rows
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((r) => {
        if (!Array.isArray(r.embedding) || r.embedding.length === 0) {
          throw new Error("embeddings response missing vector");
        }
        return r.embedding;
      });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `embeddings timed out after ${EMBED_TIMEOUT_MS / 1000}s (batch size ${texts.length})`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const vectors = await embedBatch(batch);
    out.push(...vectors);
  }
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}