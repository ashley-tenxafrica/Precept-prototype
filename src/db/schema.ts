import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});

export const organisations = sqliteTable('organisations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const organisationMembers = sqliteTable('organisation_members', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  orgId: text('org_id').notNull(),
  role: text('role').notNull(),
});

export const assessmentItems = sqliteTable('assessment_items', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  title: text('title').notNull(),
  status: text('status').notNull(), // 'draft', 'interview', 'review', 'approved', 'rejected'
  assuranceRating: text('assurance_rating'), // 'High', 'Reasonable', 'Limited', 'Very Limited'
  extractedData: text('extracted_data'), // JSON string
  evidenceText: text('evidence_text'), // Injected PDF text
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  actor: text('actor').notNull(), // user id or system
  action: text('action').notNull(),
  entity: text('entity').notNull(), // table name
  details: text('details'),
  timestamp: text('timestamp').default('CURRENT_TIMESTAMP'),
});
