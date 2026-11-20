/**
 * Runtime AI config facade — values come ONLY from admin DB settings.
 * Infrastructure env (DATABASE_URL / CONFIG_ENCRYPTION_KEY / PORT) stays in process env.
 */
import { databaseUrl, assertDatabaseUrlConfigured } from "./database";
import {
  AiSettingsNotConfiguredError,
  getRuntimeAI,
  type RuntimeAI,
} from "./runtimeConfig";

export { databaseUrl, assertDatabaseUrlConfigured };
export { AiSettingsNotConfiguredError };

export type ResolvedModel = {
  id: `${string}/${string}`;
  url: string;
  apiKey: string;
};

let snapshot: RuntimeAI | null = null;
let lastError: Error | null = null;
let refreshPromise: Promise<void> | null = null;

function kickRefresh() {
  if (refreshPromise) return;
  refreshPromise = getRuntimeAI()
    .then((v) => {
      snapshot = v;
      lastError = null;
    })
    .catch((err: unknown) => {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Do not keep a stale successful snapshot forever after admin clears config;
      // only clear when the error is "not configured".
      if (err instanceof AiSettingsNotConfiguredError) {
        snapshot = null;
      }
    })
    .finally(() => {
      refreshPromise = null;
    });
}

function requireSnapshot(): RuntimeAI {
  kickRefresh();
  if (snapshot) return snapshot;
  throw (
    lastError ||
    new AiSettingsNotConfiguredError(
      "模型服务尚未配置。请在管理后台「模型配置」中完成设置后重试。",
    )
  );
}

/** Sync view of DB settings (warmed at boot; refreshed every ~15s). */
export function openaiConfig() {
  const r = requireSnapshot();
  return {
    baseURL: r.chatBaseURL,
    apiKey: r.chatApiKey,
    chatModel: r.chatModel,
    embeddingBaseURL: r.embeddingBaseURL,
    embeddingApiKey: r.embeddingApiKey,
    embeddingModel: r.embeddingModel,
    embeddingDimension: r.embeddingDimension,
    visionBaseURL: r.visionBaseURL,
    visionApiKey: r.visionApiKey,
    visionModel: r.visionModel,
  };
}

export function resolveChatModel(_think = false): ResolvedModel {
  const { baseURL, apiKey, chatModel } = openaiConfig();
  const modelId = chatModel;
  if (!modelId) {
    throw new AiSettingsNotConfiguredError(
      "未配置对话模型，请在管理后台「模型配置」中设置。",
    );
  }
  if (!apiKey) {
    throw new AiSettingsNotConfiguredError(
      "未配置对话密钥，请在管理后台「模型配置」中设置。",
    );
  }
  return {
    id: `openai/${modelId}` as `${string}/${string}`,
    url: baseURL,
    apiKey,
  };
}

export function requireApiKey(): string {
  const { apiKey } = openaiConfig();
  if (!apiKey) {
    throw new AiSettingsNotConfiguredError(
      "未配置对话密钥，请在管理后台「模型配置」中设置。",
    );
  }
  return apiKey;
}

/** Vector index name is infrastructure, not a vendor model. */
export const VECTOR_INDEX = process.env.VECTOR_INDEX_NAME || "agentdesk_chunks";

export function retrievalTopK(): number {
  return requireSnapshot().retrievalTopK;
}

export function snippetMax(): number {
  return requireSnapshot().snippetMaxChars;
}

export const DEFAULT_RESOURCE_ID =
  process.env.DEFAULT_RESOURCE_ID || "agentdesk-default";

/** Warm DB settings cache at process start — fail loud if admin has not configured. */
export async function warmRuntimeConfig(): Promise<void> {
  try {
    snapshot = await getRuntimeAI();
    lastError = null;
    console.info("[agentdesk-agent] AI settings loaded from runtime_ai_settings");
  } catch (err) {
    snapshot = null;
    lastError = err instanceof Error ? err : new Error(String(err));
    console.error(
      "[agentdesk-agent] AI settings not ready:",
      lastError.message,
    );
  }
}