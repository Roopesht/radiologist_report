// The app's SQL migrations (run in order by migrate.ts; never edit an applied migration, add a new one).
// Design: docs/project/db_design.md (SQLite 3). Work item WI-024 (REQ-266): abbreviation rules.
// Deviations from the design, recorded in docs/workitems/WI-024/impl.md: radiologists.user_subject (links the JWT user to a
// radiologist), tag_options.kind also allows grade and sex (REQ-266 acceptance 2), and tag_rule_history has version,
// change_summary, rule_before and rule_after so that option changes are audited too.
import type { Migration } from './migrate';

const abbreviationRules = `
CREATE TABLE sexes (code TEXT PRIMARY KEY NOT NULL, label TEXT NOT NULL, title TEXT NOT NULL);
INSERT INTO sexes (code, label, title) VALUES ('M', 'Male', 'MR.'), ('F', 'Female', 'MRS.');
CREATE TABLE radiologists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, qualification TEXT NOT NULL, designation TEXT NOT NULL, registration_no TEXT NOT NULL UNIQUE, user_subject TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE tags (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL COLLATE NOCASE UNIQUE, organ TEXT NOT NULL, sex_code TEXT REFERENCES sexes(code), findings_text TEXT NOT NULL, impression_text TEXT, impression_key TEXT, report_order INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX tags_impression_key_idx ON tags (impression_key);
CREATE TABLE tag_options (id INTEGER PRIMARY KEY AUTOINCREMENT, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, kind TEXT NOT NULL CHECK (kind IN ('size_range', 'calyx', 'side', 'grade', 'sex')), code TEXT, min_value REAL, max_value REAL, sex_code TEXT REFERENCES sexes(code), findings_text TEXT, impression_text TEXT, impression_key TEXT, CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value), UNIQUE (tag_id, kind, code));
CREATE INDEX tag_options_tag_idx ON tag_options (tag_id);
CREATE TABLE tag_rule_history (id INTEGER PRIMARY KEY AUTOINCREMENT, tag_id INTEGER NOT NULL REFERENCES tags(id), changed_by INTEGER NOT NULL REFERENCES radiologists(id), changed_at TEXT NOT NULL, version INTEGER NOT NULL, change_summary TEXT NOT NULL, old_findings_text TEXT, new_findings_text TEXT, old_impression_text TEXT, new_impression_text TEXT, rule_before TEXT, rule_after TEXT, UNIQUE (tag_id, version));
CREATE INDEX tag_rule_history_tag_idx ON tag_rule_history (tag_id);
`;

export const rulesMigrations: Migration[] = [{ id: '0001_abbreviation_rules', sql: abbreviationRules }];

// WI-025 (REQ-267): patient header. Sr. No is assigned at issue (decisions 2026-11-12), never on a draft.
// Designs: docs/project/db_design.md (patients, reports) and docs/project/db_design_proposal_sr_no.md (status, issued_at, sr_no_counter).
const patientReport = `
CREATE TABLE patients (id INTEGER PRIMARY KEY AUTOINCREMENT, uhid TEXT NOT NULL UNIQUE, name TEXT NOT NULL, sex_code TEXT NOT NULL REFERENCES sexes(code), created_at TEXT NOT NULL);
CREATE TABLE reports (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL REFERENCES patients(id), status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')), age_text TEXT NOT NULL, referred_by TEXT, report_date TEXT NOT NULL, sr_no INTEGER UNIQUE, radiologist_id INTEGER NOT NULL REFERENCES radiologists(id), issued_at TEXT, created_at TEXT NOT NULL, CHECK ((status = 'draft' AND sr_no IS NULL) OR (status IN ('issued', 'cancelled') AND sr_no IS NOT NULL)));
CREATE INDEX reports_patient_idx ON reports (patient_id);
CREATE INDEX reports_report_date_idx ON reports (report_date);
CREATE TABLE sr_no_counter (name TEXT PRIMARY KEY NOT NULL, last_value INTEGER NOT NULL DEFAULT 0);
INSERT INTO sr_no_counter (name, last_value) VALUES ('report_sr_no', 0);
`;

export const reportsMigrations: Migration[] = [{ id: '0002_patient_report_header', sql: patientReport }];
