import { writeFileSync } from "node:fs";
import { contractApp } from "../src/contract/app.ts";
import { routes } from "../src/contract/routes.ts";

const app = contractApp();
app.openAPIRegistry.registerComponent("securitySchemes", "ownerSession", { type: "apiKey", in: "cookie", name: "blyg_session" });
for (const r of Object.values(routes)) app.openAPIRegistry.registerPath({ ...r, path: "/api" + r.path });
const spec = app.getOpenAPI31Document({ openapi: "3.1.0", info: { title: "Blygger Studio API", version: "1.0.0", description: "Private authoring and reading API. Protocol files remain a separate public interface." }, servers: [{ url: "http://localhost:8787" }] });
writeFileSync(`${import.meta.dirname}/../openapi.json`, JSON.stringify(spec, null, 2) + "\n");
