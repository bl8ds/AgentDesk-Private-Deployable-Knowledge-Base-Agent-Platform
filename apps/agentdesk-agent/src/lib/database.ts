/** Infrastructure-only: Postgres URL for Mastra storage/vectors + runtime_ai_settings. */

export function databaseUrl(): string {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_CONNECTION_STRING?.trim() ||
    "";
  if (!url) {
    return "postgres://127.0.0.1:5432/agentdesk";
  }
  return url;
}

export function assertDatabaseUrlConfigured(): void {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_CONNECTION_STRING?.trim() ||
    "";
  if (!url) {
    throw new Error(
      "DATABASE_URL or POSTGRES_CONNECTION_STRING is required (agentdesk Postgres)",
    );
  }
}