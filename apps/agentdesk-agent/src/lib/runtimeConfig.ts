/**
 * AI runtime settings — model URLs/keys from Postgres (agentdesk-admin).
 * Embedding dimension is ops-only: EMBEDDING_DIMENSION (default 1536, max 2000 for pgvector HNSW).
 */
import { createDecipheriv } from "node:crypto";
import pg from "pg";
import { databaseUrl } from "./database";

export type RuntimeAI = {
  chatBaseURL: string;
  chatModel: string;
  chatApiKey: string;
  embeddingBaseURL: string;
  embeddingModel: string;
  embeddingDimension: number;
  embeddingApiKey: string;
  visionBaseURL: string;
  visionModel: string;
  visionApiKey: string;
  retrievalTopK: number;
  snippetMaxChars: number;
};

export class AiSettingsNotConfiguredError extends Error {
  constructor(detail?: string) {
    super(
      detail ||
        "模型服务尚未配置。请在管理后台「模型配置」中完成设置后重试。",
    );
    this.name = "AiSettingsNotConfiguredError";
  }
}

type Cache = { at: number; value: RuntimeAI };
let cache: Cache | null = null;
const TTL_MS = 15_000;

type Secrets = {
  chat_api_key?: string;
  embedding_api_key?: string;
  vision_api_key?: string;
};

const HNSW_MAX_DIM = 2000;
const DEFAULT_EMBEDDING_DIM = 1536;

/** Ops-only; changing requires rebuild of the vector index. */
export function embeddingDimensionFromEnv(): number {
  const raw = (process.env.EMBEDDING_DIMENSION || "").trim();
  const n = raw ? Number(raw) : DEFAULT_EMBEDDING_DIM;
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    throw new Error(
      `EMBEDDING_DIMENSION must be a positive integer (got ${JSON.stringify(raw || String(DEFAULT_EMBEDDING_DIM))})`,
    );
  }
  if (n > HNSW_MAX_DIM) {
    throw new Error(
      `EMBEDDING_DIMENSION ${n} exceeds pgvector HNSW max ${HNSW_MAX_DIM}`,
    );
  }
  return n;
}

function parseKey(material: string): Buffer {
  const s = material.trim();
  if (!s) {
    throw new Error(
      "CONFIG_ENCRYPTION_KEY is required to decrypt AI settings (same key as agentdesk-api)",
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(s)) return Buffer.from(s, "hex");
  try {
    const b = Buffer.from(s, "base64");
    if (b.length === 32) return b;
  } catch {
    /* fallthrough */
  }
  if (Buffer.byteLength(s) === 32) return Buffer.from(s, "utf8");
  throw new Error("CONFIG_ENCRYPTION_KEY must be 32 bytes");
}

function openSealed(keyMaterial: string, sealed: string): Secrets {
  if (!sealed) return {};
  const key = parseKey(keyMaterial);
  const raw = Buffer.from(sealed, "base64");
  const nonce = raw.subarray(0, 12);
  const data = raw.subarray(12);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  const tag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(0, data.length - 16);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as Secrets;
}

function requireField(label: string, value: string): string {
  const v = value.trim();
  if (!v) {
    throw new AiSettingsNotConfiguredError(`模型配置缺少「${label}」，请在管理后台补全后保存。`);
  }
  return v;
}

async function loadFromDB(): Promise<RuntimeAI> {
  const encKey = (process.env.CONFIG_ENCRYPTION_KEY || "").trim();
  if (!encKey) {
    throw new AiSettingsNotConfiguredError(
      "服务端加密密钥未配置，无法读取模型密钥。请联系运维排查。",
    );
  }

  const embeddingDimension = embeddingDimensionFromEnv();

  const pool = new pg.Pool({ connectionString: databaseUrl(), max: 1 });
  try {
    const { rows } = await pool.query(
      `SELECT chat_base_url, chat_model,
              embedding_base_url, embedding_model,
              vision_base_url, vision_model,
              retrieval_top_k, snippet_max_chars, secrets_ciphertext
       FROM runtime_ai_settings WHERE id = 1`,
    );
    if (!rows.length) {
      throw new AiSettingsNotConfiguredError();
    }
    const r = rows[0] as Record<string, unknown>;
    const secrets = openSealed(encKey, String(r.secrets_ciphertext || ""));

    const chatBaseURL = requireField(
      "对话接口地址",
      String(r.chat_base_url || ""),
    ).replace(/\/$/, "");
    const chatModel = requireField("对话模型", String(r.chat_model || ""));
    const chatApiKey = requireField("对话 API Key", secrets.chat_api_key || "");

    const embeddingBaseURL = requireField(
      "向量接口地址",
      String(r.embedding_base_url || ""),
    ).replace(/\/$/, "");
    const embeddingModel = requireField(
      "向量模型",
      String(r.embedding_model || ""),
    );
    const embeddingApiKey = requireField(
      "向量 API Key",
      secrets.embedding_api_key || "",
    );

    const visionBaseURL = requireField(
      "视觉接口地址",
      String(r.vision_base_url || ""),
    ).replace(/\/$/, "");
    const visionModel = requireField("视觉模型", String(r.vision_model || ""));
    const visionApiKey = requireField(
      "视觉 API Key",
      secrets.vision_api_key || "",
    );

    const retrievalTopK = Math.max(1, Number(r.retrieval_top_k) || 4);
    const snippetMaxChars = Math.max(80, Number(r.snippet_max_chars) || 240);

    return {
      chatBaseURL,
      chatModel,
      chatApiKey,
      embeddingBaseURL,
      embeddingModel,
      embeddingDimension,
      embeddingApiKey,
      visionBaseURL,
      visionModel,
      visionApiKey,
      retrievalTopK,
      snippetMaxChars,
    };
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function getRuntimeAI(): Promise<RuntimeAI> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = await loadFromDB();
  cache = { at: Date.now(), value };
  return value;
}

export function invalidateRuntimeAICache() {
  cache = null;
}