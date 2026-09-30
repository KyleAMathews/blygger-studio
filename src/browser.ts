declare const location: { origin: string };
import { BlyggerClient } from "../sdk/dist/browser.js";
import { sdkRequest } from "./sdk-request.ts";

const client = new BlyggerClient({ baseUrl: location.origin });
Object.assign(globalThis, { blygger: client, studioRequest: (path: string, options?: RequestInit) => sdkRequest(client, path, options) });
