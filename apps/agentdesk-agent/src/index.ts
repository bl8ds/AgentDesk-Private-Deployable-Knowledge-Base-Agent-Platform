import { Mastra } from "@mastra/core";
import { PostgresStore, PgVector } from "@mastra/pg";

import { createAgentDeskAgent } from "./agents/agentdesk.js";
import { databaseUrl, warmRuntimeConfig } from "./lib/env.js";
import { buildApiRoutes } from "./routes.js";

void warmRuntimeConfig();

const connectionString = databaseUrl();

const storage = new PostgresStore({
  id: "agentdesk-pg-storage",
  connectionString,
});

const vector = new PgVector({
  id: "agentdesk-pg-vector",
  connectionString,
});

const agentdeskAgent = createAgentDeskAgent(storage);

export const mastra = new Mastra({
  agents: { agentdeskAgent },
  storage,
  vectors: { pg: vector },
  server: {
    port: Number(process.env.PORT || 4111),
    host: process.env.HOST || "0.0.0.0",
    // Free `/api/*` for agentdesk-api contracts; Mastra built-ins move under `/_mastra`.
    apiPrefix: "/_mastra",
    // Studio is not a product surface — do not enable swagger/studio for delivery.
    build: {
      swaggerUI: false,
      openAPIDocs: false,
    },
    apiRoutes: buildApiRoutes(() => vector),
  },
});