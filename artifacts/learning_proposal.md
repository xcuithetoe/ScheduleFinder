# Bruinwalk Reviews Workflow Improvement Proposal

## Challenges Encountered & Resolutions

During the search for the Math 32A professors, I encountered three main challenges:

1. **JSON Syntax Errors in the Cache File**:
   - **Challenge**: The local `cached_courses.json` file contained syntax errors (stray brackets, missing closing braces), which caused Python's `json.load()` to fail with a `JSONDecodeError`.
   - **Resolution**: I manually inspected the file content around the error locations using shell commands/file viewing tools and fixed the JSON structure using the file modification tool before attempting to parse it again.

2. **Resolving UCLA SOC Names to Bruinwalk Profiles**:
   - **Challenge**: The UCLA Schedule of Classes stores instructor names in a "Last, F." format (e.g., "Ma, S.", "Kan, K."). When directly plugging these into Bruinwalk search queries or URLs, Bruinwalk often fails to find them, or returns 404 pages (especially if they are new faculty or postdocs).
   - **Resolution**: I performed web searches using queries like `"UCLA" math "Kan"` to discover the professors' full names (e.g., "Kai Fung Kan"). I then used the full name to search Bruinwalk and construct the correct professor URL slug. For professors who did not have a profile, I verified the 404 page and safely marked their reviews as `null`.

3. **PowerShell Quote Escaping with Complex JSON**:
   - **Challenge**: When trying to pass a complex, multi-line JSON object inline through a PowerShell `python -c "..."` command to save the extracted reviews, the shell threw parsing and escaping errors due to the nested quotes.
   - **Resolution**: I wrote the Python script to a temporary file (`scratch/save_kan.py`) first, and then executed the file directly. This avoided all inline quote-escaping issues.

---

## Proposed Changes to the `/bruinwalk-reviews` Skill

To prevent these issues from slowing down future agents, I propose updating the `c:\Users\boomer\Desktop\schedule_cleaner\.agents\skills\bruinwalk-reviews\SKILL.md` file with the following additions:

### [MODIFY] `c:\Users\boomer\Desktop\schedule_cleaner\.agents\skills\bruinwalk-reviews\SKILL.md`

**Additions to Section 1 (URL Construction & Target Identification):**
- Add instructions detailing that if the agent receives an instructor name in the "Last, F." format, it **must** first perform a web search to discover the professor's full name before constructing the Bruinwalk URL or searching Bruinwalk.
- Add a fallback instruction: If a professor returns a 404 page on Bruinwalk or has no search results (common for new faculty/postdocs), explicitly note this and return `null` rather than endlessly searching.

**Additions to Section 4 (Standardized JSON Schema & Storage):**
- Add a warning regarding inline command execution: Instruct the agent to save multi-line data to a temporary Python script in the `scratch/` directory and execute that script when calling `scripts/save_reviews.py`, rather than attempting to pass complex JSON strings inline via PowerShell commands.

## Do you approve these updates to the skill? 
Once you approve, I will update the `SKILL.md` file with these new instructions.
