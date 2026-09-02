# Bruinwalk Course & Professor Reviews Workflow

This workflow describes the procedure for searching, scraping, standardizing, and persisting student reviews from Bruinwalk.

## Steps

1. **Check Local Cache (MANDATORY)**:
   - Always check `Bruinwalk_Reviews.json` in the root workspace first.
   - Keys follow the format: `"{CourseName}-{Professor}"` (e.g., `"MATH 32A-Richard Wong"`, `"MATH 32A-Kai Fung Kan"`).
   - If the course-professor pair exists, use the cached reviews directly.

2. **Instructor Name Resolution**:
   - For abbreviations (e.g. "Ma, S."), search to resolve full faculty name.
   - Slugify instructor and course name for Bruinwalk URL format:
     `https://www.bruinwalk.com/professors/{professor-slug}/{course-slug}/`

3. **Multi-Page Review Extraction**:
   - Use Chrome DevTools MCP (`navigate_page`, `evaluate_script`) with `.agents/skills/bruinwalk-reviews/scripts/extract_page_reviews.js`.
   - Iterate across all pagination pages (`?page=1`, `?page=2`, etc.).
   - Extract review ID, date, quarter, grade received, verified reviewer status, COVID tag, helpful/unhelpful counts, and review text.

4. **Persist to Local Storage**:
   - Merge newly scraped reviews into `Bruinwalk_Reviews.json` using `save_reviews.py` without losing existing records.

5. **Synthesize Reviews**:
   - Generate a 5-section review summary:
     1. Overall Reception
     2. Lectures & Resources
     3. Course Structure & Workload
     4. Exams & Grading
     5. Professor Demeanor & Tips for Success
