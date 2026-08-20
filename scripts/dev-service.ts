#!/usr/bin/env -S node --import tsx
import {
  listLocalServiceRegistryRecords,
  removeLocalServiceRegistryRecord,
  retainLiveLocalServiceRegistryRecords,
  terminateLocalService,
} from "../server/src/services/local-service-supervisor.ts";
import { bootstrapRepoManagedDevServiceEnv, repoRoot } from "./dev-service-profile.ts";

bootstrapRepoManagedDevServiceEnv(repoRoot);

function toDisplayLines(records: Awaited<ReturnType<typeof listLocalServiceRegistryRecords>>) {
  return records.map((record) => {
    const childPid = typeof record.metadata?.childPid === "number" ? ` child=${record.metadata.childPid}` : "";
    const url = typeof record.metadata?.url === "string" ? ` url=${record.metadata.url}` : "";
    return `${record.serviceName} pid=${record.pid}${childPid} cwd=${record.cwd}${url}`;
  });
}

const command = process.argv[2] ?? "list";
const registeredRecords = await listLocalServiceRegistryRecords({
  profileKind: "paperclip-dev",
  metadata: { repoRoot },
});
const records = await retainLiveLocalServiceRegistryRecords(registeredRecords);

if (command === "list") {
  if (records.length === 0) {
    console.log("No Paperclip dev services registered for this repo.");
    process.exit(0);
  }
  for (const line of toDisplayLines(records)) {
    console.log(line);
  }
  process.exit(0);
}

if (command === "stop") {
  if (records.length === 0) {
    console.log("No Paperclip dev services registered for this repo.");
    process.exit(0);
  }
  for (const record of records) {
    await terminateLocalService(record);
    await removeLocalServiceRegistryRecord(record.serviceKey);
    console.log(`Stopped ${record.serviceName} (pid ${record.pid})`);
  }
  process.exit(0);
}

console.error(`Unknown dev-service command: ${command}`);
process.exit(1);
