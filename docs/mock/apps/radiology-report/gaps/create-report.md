# Gaps: Create a report from two tags

1. **Screen codes.** The spec has no screen codes. The walkthrough uses S01 Patient details, S02 Enter tags, S03 Report. Please confirm.
2. **Sr. No** (REQ-267): the spec does not say whether it is generated or typed. Shown as `data-not-defined` on S01.
3. **Input channel** (REQ-268): typed line in an app or chat (WhatsApp screenshot) is open. The mock shows one tag field with an Add tag button.
4. **Other organ lines.** The sample report shows lines for organs with no tag typed (bladder, prostate, kidney, free fluid, lymph nodes). The spec does not say how those appear for a partial tag list. The mock shows only the two typed tags.
5. **Review before issue and output format** (REQ-273): not defined. Shown as a Not defined alert on the report step.
6. **Liver size range** (REQ-270): which size range set is male or female is open. Li15.30 gives "mildly enlarged" as in the sample report, for a male patient.

## Walkthrough notes (not spec gaps)
- "2 values" in the request was taken as two tags: Li15.30 and P.
- Patient fields are shown filled with sample data; typing is not simulated.
- The liver and pancreas wording is copied from the sample report (129) and the whole-abdomen report (127).
