# DB design
Target DB: SQLite 3
Constraints: snake_case plural table names · ids INTEGER PRIMARY KEY (AUTOINCREMENT); reference tables use a TEXT code · timestamps TEXT ISO-8601 UTC (created_at, updated_at) · dates TEXT YYYY-MM-DD · no soft delete · single clinic, no tenancy · rule changes audited in tag_rule_history · 3NF · PRAGMA foreign_keys=ON
Sources: docs/project/intent.md, REQ-266..REQ-274 (req.md, mock.md), docs/mock walkthrough (screens S01 Patient details, S02 Enter tags, S03 Report), source documents Abbreviation Rules v4, 127/128 whole-abdomen reports, 129 sample report
Tables: db_design_tables.csv (Status: New = proposed by Claude · Feedback = open feedback to apply or answer · Final = accepted)

## Columns
### sexes
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| code | TEXT | No | | PK | PK | | M or F |
| label | TEXT | No | | | | | Male, Female |
| title | TEXT | No | | | | | MR., MRS. |

### radiologists
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | INTEGER | No | autoincrement | PK | PK | | |
| name | TEXT | No | | | | | Dr. Pankaj Singhal |
| qualification | TEXT | No | | | | | MD Radio Diagnosis |
| designation | TEXT | No | | | | | Senior Consultant |
| registration_no | TEXT | No | | UQ | UQ | | HMC - HN004918 |
| created_at | TEXT | No | now | | | | |
| updated_at | TEXT | No | now | | | | |

### tags
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | INTEGER | No | autoincrement | PK | PK | | |
| code | TEXT | No | | UQ | UQ | Case-insensitive match (COLLATE NOCASE) | Tag typed, e.g. Li, P, PR |
| organ | TEXT | No | | | | | Organ or finding group |
| sex_code | TEXT | Yes | NULL | FK -> sexes.code | | NULL = both sexes | Sex-specific tag (PR male, O/ROP/LOP female) |
| findings_text | TEXT | No | | | | | Findings wording |
| impression_text | TEXT | Yes | NULL | | | | Impression, if defined |
| impression_key | TEXT | Yes | NULL | | Yes | | Key used by suppression rule, e.g. hepatomegaly |
| report_order | INTEGER | Yes | NULL | | | | Position in report (open: typing vs fixed order) |
| created_at | TEXT | No | now | | | | |
| updated_at | TEXT | No | now | | | | |

### tag_options
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | INTEGER | No | autoincrement | PK | PK | | |
| tag_id | INTEGER | No | | FK -> tags.id | Yes | on delete cascade | |
| kind | TEXT | No | | | | check in (size_range, calyx, side) | Option type |
| code | TEXT | Yes | NULL | | | unique (tag_id, kind, code) | u, um, m, lm, l; L, R |
| min_value | REAL | Yes | NULL | | | check min_value <= max_value | size_range lower bound |
| max_value | REAL | Yes | NULL | | | | size_range upper bound |
| sex_code | TEXT | Yes | NULL | FK -> sexes.code | | | Range set per sex (open) |
| findings_text | TEXT | Yes | NULL | | | | Wording or wording part for the option (grade, calyx name) |
| impression_text | TEXT | Yes | NULL | | | | e.g. Mild hepatomegaly |
| impression_key | TEXT | Yes | NULL | | | | |

### impression_suppressions
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| tag_id | INTEGER | No | | PK, FK -> tags.id | PK | on delete cascade | Tag that removes impressions (DS) |
| suppressed_key | TEXT | No | | PK | PK | | impression_key removed |

### tag_rule_history
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | INTEGER | No | autoincrement | PK | PK | | |
| tag_id | INTEGER | No | | FK -> tags.id | Yes | | |
| changed_by | INTEGER | No | | FK -> radiologists.id | | | |
| changed_at | TEXT | No | now | | | | |
| old_findings_text | TEXT | Yes | NULL | | | | NULL on create |
| new_findings_text | TEXT | Yes | NULL | | | | |
| old_impression_text | TEXT | Yes | NULL | | | | |
| new_impression_text | TEXT | Yes | NULL | | | | |

### patients
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | INTEGER | No | autoincrement | PK | PK | | |
| uhid | TEXT | No | | UQ | UQ | | UHID NO |
| name | TEXT | No | | | | | |
| sex_code | TEXT | No | | FK -> sexes.code | | | Drives MR./MRS. and sex tags |
| created_at | TEXT | No | now | | | | |

### reports
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | INTEGER | No | autoincrement | PK | PK | | |
| patient_id | INTEGER | No | | FK -> patients.id | Yes | | |
| age_text | TEXT | No | | | | | Age as entered (Age/Sex field) |
| referred_by | TEXT | Yes | NULL | | | | |
| report_date | TEXT | No | today | | Yes | | YYYY-MM-DD, shown d-MMM-yy |
| sr_no | TEXT | Yes | NULL | UQ | UQ | | Sr. No (generated or typed: open) |
| radiologist_id | INTEGER | No | | FK -> radiologists.id | | | Signing doctor |
| created_at | TEXT | No | now | | | | |

### report_tags
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | INTEGER | No | autoincrement | PK | PK | | |
| report_id | INTEGER | No | | FK -> reports.id | Yes | on delete cascade; unique (report_id, position) | |
| position | INTEGER | No | | | | | Typing order |
| raw_input | TEXT | No | | | | | As typed, e.g. Li15.30 |
| tag_id | INTEGER | Yes | NULL | FK -> tags.id | | NULL when unknown | |
| option_id | INTEGER | Yes | NULL | FK -> tag_options.id | | | Chosen grade or calyx |
| size_value | REAL | Yes | NULL | | | | Size or measurement typed |
| status | TEXT | No | ok | | | check in (ok, unknown, rejected) | rejected = tag of the other sex or size not covered |

### report_findings
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| report_id | INTEGER | No | | PK, FK -> reports.id | PK | on delete cascade | |
| line_no | INTEGER | No | | PK | PK | | Order in report |
| report_tag_id | INTEGER | Yes | NULL | FK -> report_tags.id | | | Source tag |
| text | TEXT | No | | | | | Findings wording as issued |

### report_impressions
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| report_id | INTEGER | No | | PK, FK -> reports.id | PK | on delete cascade | |
| line_no | INTEGER | No | | PK | PK | | |
| report_tag_id | INTEGER | Yes | NULL | FK -> report_tags.id | | NULL for the normal sentence | |
| text | TEXT | No | | | | | Impression as issued |
