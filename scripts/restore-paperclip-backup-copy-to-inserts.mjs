#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { constants as zlibConstants, createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const STATEMENT_BREAKPOINT = "-- paperclip statement breakpoint 69f6f3f1-42fd-46a6-bf17-d1d85f8f3900";
const BATCH_ROWS = Number(process.env.PAPERCLIP_RESTORE_BATCH_ROWS ?? 500);

const backupFile = process.argv[2] || process.env.PAPERCLIP_RESTORE_FILE;
const connectionString = process.env.DATABASE_URL;

if (!backupFile) {
  console.error("Usage: DATABASE_URL=... node scripts/restore-paperclip-backup-copy-to-inserts.mjs <backup.sql.gz>");
  process.exit(2);
}
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(2);
}

const requireFromDbPackage = createRequire(resolve("packages/db/package.json"));
const postgres = requireFromDbPackage("postgres");
const sql = postgres(connectionString, { max: 1, idle_timeout: 20, connect_timeout: 30 });

let statementCount = 0;
let copyBlockCount = 0;
let copyRowCount = 0;

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function decodeCopyField(value) {
  if (value === "\\N") return null;
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = value[++i];
    if (next === undefined) {
      out += "\\";
    } else if (next === "b") {
      out += "\b";
    } else if (next === "f") {
      out += "\f";
    } else if (next === "n") {
      out += "\n";
    } else if (next === "r") {
      out += "\r";
    } else if (next === "t") {
      out += "\t";
    } else if (next === "v") {
      out += "\v";
    } else {
      out += next;
    }
  }
  return out;
}

function parseCopyStatement(statement) {
  const lines = statement.split(/\r?\n/);
  const copyLineIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--")) return false;
    return true;
  });
  if (copyLineIndex === -1) return null;

  const copyLine = lines[copyLineIndex].trim();
  if (!copyLine.startsWith("COPY ")) return null;

  const match = /^COPY\s+(.+?)\s+\((.+)\)\s+FROM stdin;$/s.exec(copyLine);
  if (!match) {
    throw new Error(`Unsupported COPY statement: ${copyLine.slice(0, 200)}`);
  }

  const identifiers = [...copyLine.matchAll(/"((?:[^"]|"")+)"/g)].map((m) => m[1].replaceAll('""', '"'));
  if (identifiers.length < 3) {
    throw new Error(`Could not parse COPY identifiers: ${copyLine.slice(0, 200)}`);
  }

  const [schemaName, tableName, ...columns] = identifiers;
  const dataLines = lines.slice(copyLineIndex + 1);
  const terminatorIndex = dataLines.findIndex((line) => line === "\\.");
  if (terminatorIndex === -1) {
    throw new Error(`COPY block for ${schemaName}.${tableName} is missing terminator.`);
  }

  return {
    qualifiedTable: `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`,
    columns,
    rows: dataLines.slice(0, terminatorIndex),
  };
}

async function insertCopyRows(copy) {
  copyBlockCount += 1;
  const columnSql = copy.columns.map(quoteIdentifier).join(", ");
  const columnCount = copy.columns.length;
  const decodedRows = [];

  const flush = async () => {
    if (decodedRows.length === 0) return;
    const values = [];
    const tuples = decodedRows.map((row) => {
      const placeholders = row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    await sql.unsafe(
      `INSERT INTO ${copy.qualifiedTable} (${columnSql}) VALUES ${tuples.join(", ")}`,
      values,
    );
    copyRowCount += decodedRows.length;
    if (copyRowCount % 10000 === 0) {
      console.log(`restored copy rows: ${copyRowCount}`);
    }
    decodedRows.length = 0;
  };

  for (const line of copy.rows) {
    const row = line.split("\t").map(decodeCopyField);
    if (row.length !== columnCount) {
      throw new Error(
        `COPY row width mismatch for ${copy.qualifiedTable}: expected ${columnCount}, got ${row.length}`,
      );
    }
    decodedRows.push(row);
    if (decodedRows.length >= BATCH_ROWS) await flush();
  }
  await flush();
}

async function executeStatement(statement) {
  const trimmed = statement.trim();
  if (!trimmed) return;
  const copy = parseCopyStatement(trimmed);
  if (copy) {
    await insertCopyRows(copy);
    return;
  }
  await sql.unsafe(trimmed);
  statementCount += 1;
  if (statementCount % 100 === 0) {
    console.log(`executed statements: ${statementCount}`);
  }
}

async function main() {
  const raw = createReadStream(backupFile);
  const input = backupFile.endsWith(".gz")
    ? raw.pipe(createGunzip({ finishFlush: zlibConstants.Z_SYNC_FLUSH }))
    : raw;
  input.setEncoding("utf8");
  const reader = createInterface({ input, crlfDelay: Infinity });
  let lines = [];
  let inCopyStatement = false;

  try {
    for await (const line of reader) {
      if (!inCopyStatement && /^COPY\s+.+\s+FROM stdin;$/.test(line.trim())) {
        inCopyStatement = true;
      } else if (inCopyStatement && line === "\\.") {
        inCopyStatement = false;
      }

      if (!inCopyStatement && line === STATEMENT_BREAKPOINT) {
        const statement = lines.join("\n");
        lines = [];
        await executeStatement(statement);
      } else {
        lines.push(line);
      }
    }
    await executeStatement(lines.join("\n"));
    console.log(JSON.stringify({ ok: true, statementCount, copyBlockCount, copyRowCount }, null, 2));
  } finally {
    reader.close();
    input.destroy();
    raw.destroy();
    await sql.end();
  }
}

main().catch(async (error) => {
  try {
    await sql.end();
  } catch {
    // ignore
  }
  console.error(error);
  process.exit(1);
});
