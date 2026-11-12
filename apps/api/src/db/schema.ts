// The app's tables, as Drizzle definitions. The SQL that creates them lives in src/db/migrations.ts (the database module);
// keep the two in step. Design: docs/project/db_design.md. Tables of other requirements (patients, reports, ...) are not here yet.
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Reference: sex codes used by tags and option sets (M = Male, F = Female).
export const sexes = sqliteTable('sexes', {
  code: text('code').primaryKey().notNull(),
  label: text('label').notNull(),
  title: text('title').notNull()
});

// Signing doctors. Also the editors of abbreviation rules: user_subject links a radiologist to the signed-in user (JWT sub).
export const radiologists = sqliteTable('radiologists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  qualification: text('qualification').notNull(),
  designation: text('designation').notNull(),
  registrationNo: text('registration_no').notNull().unique(),
  userSubject: text('user_subject').unique(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// One abbreviation rule per tag. code is unique and case-insensitive (COLLATE NOCASE is in the SQL).
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  organ: text('organ').notNull(),
  sexCode: text('sex_code').references(() => sexes.code),
  findingsText: text('findings_text').notNull(),
  impressionText: text('impression_text'),
  impressionKey: text('impression_key'),
  reportOrder: integer('report_order'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// Option sets of a tag: side, calyx, size_range, grade, sex. Each row is one value of its set.
export const tagOptions = sqliteTable('tag_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  code: text('code'),
  minValue: real('min_value'),
  maxValue: real('max_value'),
  sexCode: text('sex_code').references(() => sexes.code),
  findingsText: text('findings_text'),
  impressionText: text('impression_text'),
  impressionKey: text('impression_key')
});

// Versions and audit of rule changes: one row per saved change (version 1 is the creation, old_* are NULL then).
export const tagRuleHistory = sqliteTable('tag_rule_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tagId: integer('tag_id').notNull().references(() => tags.id),
  changedBy: integer('changed_by').notNull().references(() => radiologists.id),
  changedAt: text('changed_at').notNull(),
  version: integer('version').notNull(),
  changeSummary: text('change_summary').notNull(),
  oldFindingsText: text('old_findings_text'),
  newFindingsText: text('new_findings_text'),
  oldImpressionText: text('old_impression_text'),
  newImpressionText: text('new_impression_text'),
  ruleBefore: text('rule_before'),
  ruleAfter: text('rule_after')
});

// Patient header (WI-025, REQ-267). Keep in step with the 0002 migration in src/db/migrations.ts (the CHECK constraints live there).
export const patients = sqliteTable('patients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uhid: text('uhid').notNull().unique(),
  name: text('name').notNull(),
  sexCode: text('sex_code').notNull().references(() => sexes.code),
  createdAt: text('created_at').notNull()
});

// status draft = no Sr. No; issued/cancelled = Sr. No set once and never reused (decisions 2026-11-12).
export const reports = sqliteTable('reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  status: text('status').notNull().default('draft'),
  ageText: text('age_text').notNull(),
  referredBy: text('referred_by'),
  reportDate: text('report_date').notNull(),
  srNo: integer('sr_no').unique(),
  radiologistId: integer('radiologist_id').notNull().references(() => radiologists.id),
  issuedAt: text('issued_at'),
  createdAt: text('created_at').notNull()
});

// One row, name 'report_sr_no'. last_value is the highest number ever issued.
export const srNoCounter = sqliteTable('sr_no_counter', {
  name: text('name').primaryKey().notNull(),
  lastValue: integer('last_value').notNull().default(0)
});

export type Sex = typeof sexes.$inferSelect;
export type Radiologist = typeof radiologists.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type TagOption = typeof tagOptions.$inferSelect;
export type TagRuleHistory = typeof tagRuleHistory.$inferSelect;
