# UCLA Schedule of Classes (SOC) Lookup Workflow

This workflow details how to query course offerings, lecture/discussion times, room locations, instructor names, and seat availability from the UCLA Registrar's Schedule of Classes.

## Steps

1. **Check Local Cache**:
   - Inspect `cached_courses.json` for the requested course code (e.g., `MATH0032A`, `COMSCI0032`).
   - If present and up-to-date, load directly from JSON.

2. **Construct SOC Query URL**:
   - Format:
     `https://sa.ucla.edu/ro/public/soc/Results?SubjectAreaName={SubjectName}&t={TermCode}&s_g_cd=%25&sBy=subject&subj={SubjectCode}&catlg=&cls_no=&undefined=Go&btnIsInIndex=btn_inIndex`
   - Term codes: `26F` (Fall 2026), `26W` (Winter 2026), `26S` (Spring 2026), `261` (Summer Session A). Full list in `.agents/skills/ucla-schedule-of-classes/references/term_codes.md`.

3. **DOM Extraction via Chrome DevTools MCP**:
   - Navigate to the page.
   - Run `.agents/skills/ucla-schedule-of-classes/scripts/extract_course_sections.js` within the Shadow DOM component (`<ucla-sa-soc-app>`).
   - Parses sections, discussion attachments, enrollment status (`Open`/`Waitlist`/`Closed`), enrolled vs capacity numbers, and meeting days/times/rooms.

4. **Cache & Export**:
   - Update `cached_courses.json` with the structured course object.
   - Output structured JSON matching standard schema.
