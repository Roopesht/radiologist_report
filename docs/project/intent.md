# Intent

## Purpose
Let the radiologist type short tags (e.g. Li15.30, P, S, L, C, R) and get a complete ultrasound report with findings and impression, expanded using the abbreviation rules.

## Goals
- G1: Short tags expand into correct report wording and impression every time
- G2: Reports match the current signed report format (header, findings, impression, signature)
- G3: Radiologist can produce a normal whole-abdomen report in a few keystrokes (to confirm)
- G4: Abbreviation rules are kept in one place and applied consistently (to confirm)

## Not goals
- No diagnosis by AI: only the radiologist's tags are expanded; no image interpretation
- No medico-legal validity: reports carry "Not valid for medico legal purposes"

## Success
- Each tag, including side, size grade and measurement options, gives the correct wording and impression
- The output looks like the existing signed reports
- The radiologist is the primary user (to confirm: review before issue)
