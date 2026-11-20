/**
 * Compliance strategy for the agent runtime (read-only).
 * Admin writes compliance_settings through agentdesk-api; the agent caches it briefly.
 */
import pg from "pg";
import { databaseUrl } from "./database";

export type ComplianceSettings = {
  refuseWithoutEvidence: boolean;
  refusalTemplate: string;
  lowConfidenceHint: string;
};

const DEFAULT_SETTINGS: ComplianceSettings = {
  refuseWithoutEvidence: true,
  refusalTemplate:
    "抱歉，当前知识库中没有足够依据回答这个问题。请补充相关资料后再试，或联系管理员。",
  lowConfidenceHint: "以上内容仅供参考，请结合原始资料核实。",
};

type Cache = { at: number; value: ComplianceSettings };
let cache: Cache | null = null;
const TTL_MS = 15_000;

async function loadFromDB(): Promise<ComplianceSettings> {
  const pool = new pg.Pool({ connectionString: databaseUrl(), max: 1 });
  try {
    const { rows } = await pool.query(
      `SELECT refuse_without_evidence, refusal_template, low_confidence_hint
       FROM compliance_settings WHERE id = 1`,
    );
    if (!rows.length) return DEFAULT_SETTINGS;
    const r = rows[0] as Record<string, unknown>;
    return {
      refuseWithoutEvidence: r.refuse_without_evidence !== false,
      refusalTemplate:
        String(r.refusal_template || "").trim() || DEFAULT_SETTINGS.refusalTemplate,
      lowConfidenceHint: String(r.low_confidence_hint || "").trim(),
    };
  } catch {
    // Migration not applied yet: keep the safe default (refuse without evidence).
    return DEFAULT_SETTINGS;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function getComplianceSettings(): Promise<ComplianceSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = await loadFromDB();
  cache = { at: Date.now(), value };
  return value;
}
