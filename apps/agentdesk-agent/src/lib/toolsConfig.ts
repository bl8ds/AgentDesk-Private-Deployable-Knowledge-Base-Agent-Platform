/**
 * Agent tool definitions — read-only mirror of agentdesk-api's `agent_tools`.
 * Admins edit tools in the console; the agent caches them briefly (same model
 * as compliance/AI settings). Falls back to built-ins if migration is missing.
 */
import pg from "pg";
import { databaseUrl } from "./database";

export type ParamDef = {
  type?: "string" | "number" | "integer" | "boolean" | "array";
  description?: string;
  enum?: string[];
};

export type InputSchema = {
  type?: string;
  properties?: Record<string, ParamDef>;
  required?: string[];
};

export type ToolDef = {
  id?: string;
  name: string;
  label?: string;
  description?: string;
  kind: "builtin" | "http";
  config: Record<string, unknown>;
  input_schema: InputSchema;
  enabled?: boolean;
};

const FALLBACK_BUILTINS: ToolDef[] = [
  {
    name: "current_time",
    label: "当前时间",
    description: "返回服务端当前日期与时间（ISO 8601 与时区）。",
    kind: "builtin",
    config: { builtin: "current_time" },
    input_schema: { type: "object", properties: {} },
    enabled: true,
  },
  {
    name: "knowledge_search",
    label: "知识库检索",
    description: "按关键词对知识库做一次额外向量检索，返回带出处的片段。",
    kind: "builtin",
    config: { builtin: "knowledge_search" },
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "检索关键词" },
        top_k: { type: "number", description: "返回片段数量，默认 3" },
      },
      required: ["query"],
    },
    enabled: true,
  },
];

type Cache = { at: number; value: ToolDef[] };
let cache: Cache | null = null;
const TTL_MS = 15_000;

function parseRow(row: Record<string, unknown>): ToolDef {
  let config: Record<string, unknown> = {};
  let schema: InputSchema = { type: "object", properties: {} };
  try {
    const c = row.config;
    if (typeof c === "string") config = JSON.parse(c);
    else if (c && typeof c === "object") config = c as Record<string, unknown>;
  } catch {
    /* keep empty config */
  }
  try {
    const s = row.input_schema;
    if (typeof s === "string") schema = JSON.parse(s);
    else if (s && typeof s === "object") schema = s as InputSchema;
  } catch {
    /* keep empty schema */
  }
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    label: String(row.label ?? ""),
    description: String(row.description ?? ""),
    kind: row.kind === "builtin" ? "builtin" : "http",
    config,
    input_schema: schema,
    enabled: row.enabled !== false,
  };
}

async function loadFromDB(): Promise<ToolDef[]> {
  const pool = new pg.Pool({ connectionString: databaseUrl(), max: 1 });
  try {
    const { rows } = await pool.query(
      `SELECT id, name, label, description, kind, config, input_schema, enabled
       FROM agent_tools WHERE enabled = TRUE ORDER BY kind ASC, name ASC`,
    );
    if (!rows.length) return FALLBACK_BUILTINS;
    return rows
      .map((r) => parseRow(r as Record<string, unknown>))
      .filter((t) => Boolean(t.name));
  } catch {
    // Migration not applied yet: built-ins still work.
    return FALLBACK_BUILTINS;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function getEnabledTools(): Promise<ToolDef[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = await loadFromDB();
  cache = { at: Date.now(), value };
  return value;
}

export function invalidateToolsCache() {
  cache = null;
}
