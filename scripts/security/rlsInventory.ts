import fs from 'node:fs';
import path from 'node:path';

export interface TableMetadata {
  rlsEnabled: boolean;
  policies: Set<string>;
  triggers: Set<string>;
  files: Set<string>;
}

export interface RlsInventory {
  tables: Record<string, TableMetadata>;
  functions: Set<string>;
}

const CREATE_TABLE = new RegExp(String.raw`^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\.\"]+)`, 'gim');
const ENABLE_RLS = new RegExp(String.raw`^\s*ALTER\s+TABLE\s+([\w\.\"]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY`, 'gim');
const CREATE_POLICY = new RegExp(String.raw`^\s*CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+([\w\.\"]+)`, 'gim');
const CREATE_TRIGGER = new RegExp(String.raw`CREATE\s+TRIGGER\s+"?([\w-]+)"?[\s\S]+?\sON\s+([\w\.\"]+)`, 'gim');
const CREATE_FUNCTION = new RegExp(String.raw`^\s*CREATE\s+OR\s+REPLACE\s+FUNCTION\s+([\w\.\"]+)`, 'gim');

function normalizeIdentifier(identifier: string): string {
  const withoutQuotes = identifier.replace(/"/g, '').toLowerCase();
  const parts = withoutQuotes.split('.');
  return parts.length === 2 ? parts[1] : parts[0];
}

function ensureTable(tables: Record<string, TableMetadata>, table: string, fileName: string): TableMetadata {
  const key = normalizeIdentifier(table);
  if (!tables[key]) {
    tables[key] = {
      rlsEnabled: false,
      policies: new Set<string>(),
      triggers: new Set<string>(),
      files: new Set<string>(),
    };
  }
  tables[key].files.add(fileName);
  return tables[key];
}

function readSqlFiles(migrationsDir: string): Array<{ fileName: string; contents: string }> {
  const resolved = path.resolve(migrationsDir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Supabase migrations directory does not exist: ${resolved}`);
  }

  return fs
    .readdirSync(resolved)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((fileName) => ({
      fileName,
      contents: fs.readFileSync(path.join(resolved, fileName), 'utf8'),
    }));
}

export function buildRlsInventory(migrationsDir = path.join(process.cwd(), 'supabase/migrations')): RlsInventory {
  const tables: Record<string, TableMetadata> = {};
  const functions = new Set<string>();

  for (const { fileName, contents } of readSqlFiles(migrationsDir)) {
    for (const match of contents.matchAll(CREATE_TABLE)) {
      ensureTable(tables, match[1], fileName);
    }

    for (const match of contents.matchAll(ENABLE_RLS)) {
      ensureTable(tables, match[1], fileName).rlsEnabled = true;
    }

    for (const match of contents.matchAll(CREATE_POLICY)) {
      ensureTable(tables, match[2], fileName).policies.add(match[1]);
    }

    for (const match of contents.matchAll(CREATE_TRIGGER)) {
      ensureTable(tables, match[2], fileName).triggers.add(match[1]);
    }

    for (const match of contents.matchAll(CREATE_FUNCTION)) {
      const normalized = normalizeIdentifier(match[1]);
      functions.add(normalized);
    }
  }

  return { tables, functions };
}

export function serializeInventory(inventory: RlsInventory) {
  return {
    tables: Object.entries(inventory.tables).reduce<Record<string, { rlsEnabled: boolean; policies: string[]; triggers: string[] }>>(
      (acc, [table, meta]) => {
        acc[table] = {
          rlsEnabled: meta.rlsEnabled,
          policies: Array.from(meta.policies).sort(),
          triggers: Array.from(meta.triggers).sort(),
        };
        return acc;
      },
      {}
    ),
    functions: Array.from(inventory.functions).sort(),
  };
}
