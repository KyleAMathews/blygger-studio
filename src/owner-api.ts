import { contractApp } from "./contract/app.ts";
import { verifySession } from "./auth.ts";
import { api } from "./api.ts";
import { importerApi } from "./importer/api.ts";
import { mentionsApi } from "./mentions/api.ts";
import spec from "../openapi.json";
import { readApi } from "./read-api.ts";

export const ownerApi = contractApp();
ownerApi.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (!(await verifySession(c.env, c.req.header("cookie")))) return c.json({ error: "unauthorized" }, 401);
  return next();
});
ownerApi.route("/", api);
ownerApi.route("/", importerApi);
ownerApi.route("/", mentionsApi);
ownerApi.route("/", readApi);

ownerApi.get("/openapi.json", (c) => c.json(spec));
