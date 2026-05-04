import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("sqlite.db");

// Optimize SQLite for performance and concurrency
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = normal");

export const db = drizzle(sqlite, { schema });

export function initDb() {
  // Simple table creation for POC instead of full migrations
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS organisations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS organisation_members (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      org_id TEXT NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assessment_items (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      assurance_rating TEXT,
      extracted_data TEXT,
      evidence_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function logAuditEvent(actor: string, action: string, entity: string, details: string) {
  sqlite.prepare(`
    INSERT INTO audit_logs (id, actor, action, entity, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), actor, action, entity, details);
}

export function seedData() {
  const orgCount = sqlite.prepare("SELECT count(*) as count FROM organisations").get() as { count: number };
  if (orgCount.count > 0) return; // Already seeded

  // Seed User
  const userId = "u1";
  sqlite.prepare("INSERT INTO users (id, name, email) VALUES (?, ?, ?)").run(userId, "John Cato", "john@acme.com");

  // Seed Org
  const orgId = "o1";
  sqlite.prepare("INSERT INTO organisations (id, name) VALUES (?, ?)").run(orgId, "Acme Manufacturing");

  // Seed Member
  sqlite.prepare("INSERT INTO organisation_members (id, user_id, org_id, role) VALUES (?, ?, ?, ?)").run("m1", userId, orgId, "owner");

  // Seed Items
  const item1Id = "i1";
  sqlite.prepare("INSERT INTO assessment_items (id, org_id, title, status, assurance_rating, extracted_data) VALUES (?, ?, ?, ?, ?, ?)").run(
    item1Id, orgId, "Marketing Email Campaigns", "review", "Limited", 
    JSON.stringify({ 
      basis_met: true, 
      s9_met: true, 
      s10_met: false, 
      reasoning: "S10 Minimality failed due to excessive demographic fields collected for simple newsletter signup." 
    })
  );

  const item2Id = "i2";
  sqlite.prepare("INSERT INTO assessment_items (id, org_id, title, status, assurance_rating, extracted_data) VALUES (?, ?, ?, ?, ?, ?)").run(
    item2Id, orgId, "Customer Order Fulfillment", "approved", "High", 
    JSON.stringify({ 
      basis_met: true, 
      s9_met: true, 
      s10_met: true, 
      reasoning: "Data retention perfectly aligns with SARS tax requirements." 
    })
  );

  // Seed Audit Logs
  logAuditEvent("System", "seed", "database", "Seeded demo database");
  logAuditEvent(userId, "item.created", "assessment_items", `Item ${item1Id} created`);
  logAuditEvent(userId, "item.created", "assessment_items", `Item ${item2Id} created`);
  logAuditEvent(userId, "item.approved_by_user", "assessment_items", `Item ${item2Id} approved`);
}
