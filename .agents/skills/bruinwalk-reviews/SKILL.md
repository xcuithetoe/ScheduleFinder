---
name: bruinwalk-reviews
description: >-
  Scrapes, standardizes, saves locally to Bruinwalk_Reviews.json, and summarizes student course reviews from Bruinwalk for a specific professor and course.
  Always checks local cached reviews in Bruinwalk_Reviews.json before searching online to avoid redundant requests.
---

# Bruinwalk Course & Professor Review Workflow

This workflow guides the agent through checking local pre-existing reviews first, fetching all pages of student reviews from Bruinwalk if not cached, organizing them into a standardized JSON structure, persisting them immediately in `Bruinwalk_Reviews.json` under `{CourseName}-{Professor}`, and synthesizing a comprehensive review summary.

---

## 1. Local Storage & Cache Check (MANDATORY FIRST STEP)

**Always check local storage before performing any web search or scraping:**
1. **Check Existing File**: Check if `Bruinwalk_Reviews.json` exists in the workspace root directory (`c:\Users\boomer\Desktop\schedule_cleaner\Bruinwalk_Reviews.json`).
2. **Key Format**: Search for the target course and professor formatted as `{CourseName}-{Professor}` (e.g., `"MATH 32A-Richard Wong"`, `"MATH 32A-Kai Fung Kan"`).
3. **Reuse Cached Data**: If reviews for the professor and course already exist in `Bruinwalk_Reviews.json` (and the user has not explicitly requested a fresh refresh), **load and use the cached reviews directly**. Do NOT search or scrape online.
4. **Scrape Only When Missing**: Only proceed to Step 2 (URL Construction & Scraping) if the professor/course is not found in the local cache.

---

## 2. URL Construction & Target Identification

Bruinwalk URLs for professor-specific course reviews follow this pattern:
```text
https://www.bruinwalk.com/professors/{professor-slug}/{course-slug}/
```

### Instructor Name Resolution & Missing Profiles
- If you receive an instructor name in the UCLA SOC format of "Last, F." (e.g., "Ma, S."), you **must** first perform a web search (e.g., `"UCLA" math "Ma"`) to discover their full name.
- If a professor's profile returns a 404 page on Bruinwalk or yields no search results (which is common for new faculty or postdocs), explicitly note this and return `null`. Do not endlessly search.

### Examples:
- **Richard Wong - MATH 32A**: `https://www.bruinwalk.com/professors/richard-wong/math-32a/`
- **Carey Nachenberg - COM SCI 32**: `https://www.bruinwalk.com/professors/carey-nachenberg/cs-32/`
- **Pagination**: Append `?page={pageNumber}` to fetch subsequent review pages (e.g. `?page=2`, `?page=3`).

---

## 3. Scraping Procedure with Chrome DevTools MCP

Because Bruinwalk dynamically populates review content, use `chrome-devtools-mcp` to ensure all DOM elements are rendered properly.

### Step 1: Open Target Page
Use `new_page` or `navigate_page` to go to the base URL:
```json
{
  "pageId": 4,
  "url": "https://www.bruinwalk.com/professors/{professor-slug}/{course-slug}/"
}
```

### Step 2: Determine Pagination Count
Evaluate JavaScript in the page to find the total number of review pages:
```javascript
() => {
  const paginationLinks = Array.from(document.querySelectorAll('.pagination a'));
  const pageNums = paginationLinks
    .map(a => parseInt(a.innerText.trim(), 10))
    .filter(n => !isNaN(n));
  return pageNums.length > 0 ? Math.max(...pageNums) : 1;
}
```

### Step 3: Extract Reviews Across All Pages
For each page `page = 1 ... totalPages`:
1. Navigate using `navigate_page` with `?page={page}`.
2. Run the extraction script in [`scripts/extract_page_reviews.js`](./scripts/extract_page_reviews.js) via `evaluate_script`:
```javascript
() => {
  const container = document.querySelector('.reviews.row');
  if (!container) return [];
  const cards = Array.from(container.querySelectorAll('.review.reviewcard'));
  return cards.map(card => {
    const id = card.getAttribute('data-id') || null;
    let quarter = null;
    const termDivs = card.querySelectorAll('.qtaken-flex-container > div');
    termDivs.forEach(d => {
      if (d.innerText.includes('Quarter:')) {
        quarter = d.innerText.replace('Quarter:', '').trim();
      }
    });
    let grade = null;
    const gradeDiv = card.querySelector('.grade-margin');
    if (gradeDiv) {
      grade = gradeDiv.innerText.replace('Grade:', '').trim();
    }
    const dateEl = card.querySelector('.date');
    const date = dateEl ? dateEl.innerText.trim() : null;
    const verified = !!card.querySelector('.verified-tag');
    const covid = card.innerText.includes('COVID-19');
    const upvoteEl = card.querySelector('.upvote-value');
    const downvoteEl = card.querySelector('.downvote-value');
    const helpful = upvoteEl ? parseInt(upvoteEl.innerText.trim(), 10) : 0;
    const unhelpful = downvoteEl ? parseInt(downvoteEl.innerText.trim(), 10) : 0;
    const paragraphArea = card.querySelector('.review-paragraph');
    let reviewText = "";
    if (paragraphArea) {
      const ps = Array.from(paragraphArea.querySelectorAll('p'));
      if (ps.length > 0) {
        reviewText = ps.map(p => p.innerText.trim()).join('\n\n');
      } else {
        reviewText = paragraphArea.innerText.trim();
      }
    }
    return {
      review_id: id,
      date: date,
      quarter: quarter,
      grade: grade,
      verified_reviewer: verified,
      covid_review: covid,
      helpful_count: isNaN(helpful) ? 0 : helpful,
      unhelpful_count: isNaN(unhelpful) ? 0 : unhelpful,
      review_text: reviewText
    };
  });
}
```

---

## 4. Standardized JSON Schema & Local Persistence (MANDATORY AFTER FETCHING)

**Mandatory Local Persistence**: Each time new reviews are extracted from Bruinwalk, you **MUST immediately save them locally** in `Bruinwalk_Reviews.json` at the root of the workspace (`c:\Users\boomer\Desktop\schedule_cleaner\Bruinwalk_Reviews.json`). Never discard or return reviews without updating this file.

### Schema Definition
```json
{
  "{CourseName}-{Professor}": [
    {
      "review_id": "string | null",
      "date": "string (e.g. 'Jan. 31, 2023')",
      "quarter": "string (e.g. 'Fall 2022')",
      "grade": "string (e.g. 'A', 'B+', 'NR')",
      "verified_reviewer": "boolean",
      "covid_review": "boolean",
      "helpful_count": "number",
      "unhelpful_count": "number",
      "review_text": "string"
    }
  ]
}
```

### Updating `Bruinwalk_Reviews.json`
Run [`scripts/save_reviews.py`](./scripts/save_reviews.py) or execute equivalent logic in Python to merge without losing prior courses or duplicating review IDs. 
**Important**: When executing this via shell, do not pass complex or multi-line JSON directly inline via PowerShell commands (e.g. `python -c "..."`) as this often causes quote-escaping errors. Instead, write your Python logic and JSON data to a temporary script in the `scratch/` directory and execute that script.

---

## 5. Review Synthesis & Summary Guidelines

When presenting the summary of student reviews to the user, ensure all pages are synthesized into the following structured sections:

1. **Overall Reception**: General sentiment, teaching rating, and whether students recommend the professor.
2. **Lectures & Resources**: Organization, slides, annotated notes, recordings, lecture pace, and clarity.
3. **Course Structure & Workload**:
   - Homework policy (mandatory vs. optional)
   - Discussion sections & collaborative quizzes
   - Special assignments / projects / challenge reports
4. **Exams & Grading**:
   - Exam difficulty vs. practice materials
   - Partial credit generosity
   - Alternative grading schemes / dropping lowest exams / grade curves
5. **Professor Demeanor & Tips for Success**: Approachability, office hour helpfulness, and key advice from former students.
