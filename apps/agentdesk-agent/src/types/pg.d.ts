declare module "pg" {
  export class Pool {
    constructor(config?: { connectionString?: string; max?: number });
    query(
      text: string,
      params?: unknown[],
    ): Promise<{ rows: Record<string, unknown>[] }>;
    end(): Promise<void>;
  }
  const pg: { Pool: typeof Pool };
  export default pg;
}