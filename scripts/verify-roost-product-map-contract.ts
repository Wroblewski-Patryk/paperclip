import path from "node:path";
import { pathToFileURL } from "node:url";
import { createTransportEnvelope } from "../server/src/services/roost-product-map-publisher.js";
import { roostBridgePortfolioProjectionSchema } from "../packages/shared/src/index.js";

const apiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const roostRoot = process.env.ROOST_ROOT ?? path.resolve(process.cwd(), "..", "Roost");

async function main() {
  const response = await fetch(`${apiBase}/api/companies/${companyId}/softwarehouse/portfolio-projection/v1`);
  if (!response.ok) throw new Error(`Paperclip projection load failed with ${response.status}`);
  const source = roostBridgePortfolioProjectionSchema.parse(await response.json());
  const publishedAt = new Date().toISOString();
  const envelope = createTransportEnvelope(source, publishedAt);
  const moduleUrl = pathToFileURL(path.join(roostRoot, "src/modules/product-map/product-map-projection.service.ts")).href;
  const contract = await import(moduleUrl) as {
    parseProductMapProjectionPacket: (value: unknown) => unknown;
    parseProjectionEnvelope: (value: unknown, now?: Date) => unknown;
  };
  const packetValid = Boolean(contract.parseProductMapProjectionPacket(envelope.packet));
  const envelopeValid = Boolean(contract.parseProjectionEnvelope(envelope, new Date(Date.parse(publishedAt) + 1_000)));
  console.log(JSON.stringify({ packetValid, envelopeValid, schemaVersion: envelope.schemaVersion, rawSecretOutput: false }, null, 2));
  if (!packetValid || !envelopeValid) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
