# UCLA End-to-End Course Data Scraping Workflow

This workflow details the complete end-to-end procedure for converting a list of course titles or course codes into a comprehensive, structured course database (`course_info.json`) using direct UCLA Registrar Schedule of Classes (SOC) AJAX requests.

---

## 1. Overview & Architecture

Unlike fragile browser DOM scrapers, this workflow interacts directly with the UCLA Registrar's underlying AJAX endpoints:
- **`GetCourseSummary`**: Retrieves lecture sections, meeting times, locations, instructors, real-time enrollment numbers, waitlist metrics, and discussion section rosters.
- **`ClassDetail`**: Extracts full course catalog descriptions, GE Foundation categories, Writing II and Diversity requirements, academic level, grading basis, enforced/warning requisites, and direct links to ASUCLA Bookstore & UCLA Library Reserves.
- **`ClassDetailTooltip`**: Queries every lecture and discussion section to extract visual warning/info button indicators (`⚠️ Class Requisite Warning`, `ℹ️ Class Requisite Information`), section-level enrollment restrictions (e.g. `New Transfers Only`, `Art Majors`), and orientation hold release notes.
- **Effective Discussion Restrictions Roll-up**: Automatically evaluates whether all open discussion sections are restricted, preventing students from being misled by an "Open" lecture when no unrestricted discussion seats exist.

---

## 2. Input Specifications

The workflow accepts course titles in any of the following standard formats:
1. **Catalog String with Department Name**:  
   `Architecture and Urban Design (ARCH&UD) 30 - Introduction to Architectural Studies`
2. **Subject Abbreviation and Catalog Number with Title**:  
   `Art 31A - Rise of Modernism in Global Context`  
   `COM LIT 2CW - Survey of Literature: Age of Enlightenment to 20th Century`
3. **Simple Subject Code and Number**:  
   `PHYSICS 1A`  
   `Physics 1AH`  
   `MATH 32A`  
   `CLASSIC M75`
4. **Normalized SOC Code**:  
   `ARCHUD0030`, `PHYSICS0001A`

---

## 3. Step-by-Step Execution

### Step 1: Input Normalization & Subject Mapping
1. Parse the input string into `(Subject, CatalogNumber, Title)`.
2. Normalize the catalog number to the Registrar's 8-character convention:
   - Standard 1–3 digit courses are zero-padded to 4 digits (e.g. `1A` $\rightarrow$ `0001A`, `30` $\rightarrow$ `0030`).
   - Cross-listed / honors courses with `M` prefixes or suffixes are normalized (e.g. `M75` $\rightarrow$ `0075  M `).
3. Map department aliases to official SOC subject codes (e.g. `Art` $\rightarrow$ `ART`, `Asian` $\rightarrow$ `ASIAN`, `Italian` $\rightarrow$ `ITALIAN`, `Computer Science` $\rightarrow$ `COM SCI`).

### Step 2: Retrieve Search Models & Token Generation
1. Fetch the subject index page:
   ```text
   GET https://sa.ucla.edu/ro/Public/SOC/Results?t={term}&s_g_cd=%25&sBy=subject&subj={subject}&catlg=&cls_no=&undefined=Go&btnIsInIndex=btn_inIndex
   ```
2. Extract the model dictionary registered via `AddToCourseData(cid, model)`.
3. If no pre-registered model exists, construct the token manually:
   - `Token = base64(CatalogNumber.ljust(8) + Path)`
   - Where `Path = SubjectAreaCode + CatalogNumber.strip()`.

### Step 3: Fetch Lectures via `GetCourseSummary`
1. Request:
   ```text
   GET https://sa.ucla.edu/ro/Public/SOC/Results/GetCourseSummary?model={json}&FilterFlags={"enrollment_status":"O,W,C,X,T,S","advanced":"y"}&_={timestamp}
   ```
2. Parse each primary row (`primary-row data_row`):
   - Section ID (e.g. `Lec 1`, `Lec 2`), Class ID, Class Number.
   - Status (`Open`, `Waitlist`, `Closed`), spots left, capacity, enrolled.
   - Meeting days, times, buildings, and rooms.
   - Instructors and TAs.
   - Warning/Info indicator button classes (`icon-warning-sign`, `icon-info-sign`, `icon-lock`) and screen-reader labels.

### Step 4: Fetch Full Metadata via `ClassDetail`
1. For each lecture, call:
   ```text
   GET https://sa.ucla.edu/ro/Public/SOC/Results/ClassDetail?term_cd={term}&subj_area_cd={subject}&crs_catlg_no={catalog_padded}&class_id={class_id}&class_no={class_no}
   ```
2. Parse inner template (`<template id="ucla-sa-soc-app">`):
   - Course description, department website, textbooks URL, library reserves URL.
   - GE Foundation categories, GE Lab/Demo credit, Writing II status, Diversity status.
   - Final exam schedule (date, day of week, 3-hour time window, location).
   - Requisites table (course name, minimum grade, pre/co-requisite flag, enforced vs warning).

### Step 5: Fetch Discussion Sections & Section-Level Restrictions
1. Query `GetCourseSummary` with `IsRoot = False` and `Path = {lec_class_id}_{course_path}`.
2. For every discussion row:
   - Extract discussion section ID (e.g. `Dis 1A`, `Dis 1B`), status, seats, days, times, room, and TA.
   - Extract the `infoColumn` button indicator (`warning` vs `info` vs `none`).
   - **Selective Tooltip Optimization**: Inspect if the section row contains an indicator badge icon (`icon-warning-sign`, `icon-info-sign`, `icon-lock`).
     - **If badge present**: Query `ClassDetailTooltip`:
       ```text
       GET https://sa.ucla.edu/ro/Public/SOC/Results/ClassDetailTooltip?term_cd={term}&subj_area_cd={subject}&crs_catlg_no={catalog_padded}&class_id={disc_class_id}&class_no={class_no}
       ```
       Extract section-level enrollment restrictions (`Section: New Transfers Only`, `Class: Department Consent`, etc.), section-specific class notes, and requisites.
     - **If no badge**: Default to empty restrictions and skip the network call, eliminating ~70% of redundant HTTP requests.

### Step 6: Compute Effective Restrictions & Output
1. Check if all discussion sections or all *currently open* discussion sections have restrictions:
   - `has_restricted_discussions`: Boolean flag.
   - `all_open_discussions_restricted`: Boolean flag (critical check).
   - `open_discussions_restrictions`: List of restrictions actively gating available seats.
2. Atomically output and merge into the target JSON file (`course_info.json`).

### Step 7: Anti-Rate-Limiting, Session State & Fault Tolerance
1. **Token Bucket Rate Limiter**: Enforce a strict global rate limit of **3.5 req/s** across all threads.
2. **Session Initialization**: Run `init_session()` to acquire `ASP.NET_SessionId` and F5 BIG-IP WAF cookies before parallel querying.
3. **Adaptive Backoff**: Retry on HTTP 429, 503, or 529 with exponential backoff and random jitter.
4. **Atomic Checkpoints**: Write updates to a `.tmp` file and replace atomically after each course to protect against data corruption or lost progress.

---

## 4. Running the Scraper

### CLI Commands:
```bash
# Scrape specific courses by title or code
python scripts/scrape_courses.py "Physics 1A" "Architecture and Urban Design (ARCH&UD) 30 - Introduction to Architectural Studies"

# Scrape from a text file containing course titles
python scripts/scrape_courses.py --input courses.txt --output course_info.json --term 26F

# Adjust concurrent worker threads (default: 6)
python scripts/scrape_courses.py -i courses.txt -w 8

# Fast Enrollment Update Mode (Enrollment Period Refresh):
# Updates ONLY enrollment, waitlist, and seat counts for lectures & discussions in-place,
# recomputes discussion restriction flags, and skips all heavy metadata/tooltips.
python scripts/scrape_courses.py --update-enrollment "Physics 1A" "ARCH&UD 30"

# Refresh enrollment for ALL courses currently stored in course_info.json:
python scripts/scrape_courses.py --update-enrollment
```

### Python API Usage:
```python
from scripts.scrape_courses import scrape_courses_pipeline, update_enrollment_pipeline

# Full Scrape (New Courses)
courses = [
    "Physics 1A",
    "Physics 1AH",
    "ARCH&UD 30 - Introduction to Architectural Studies"
]
data = scrape_courses_pipeline(courses, term="26F", output_file="course_info.json", max_workers=6)

# Fast Enrollment Refresh (Only changes status/seats/waitlist & re-evaluates restriction roll-ups)
update_enrollment_pipeline(courses, term="26F", output_file="course_info.json", max_workers=6)

# Or refresh ALL existing courses in the file:
update_enrollment_pipeline(term="26F", output_file="course_info.json", max_workers=8)
```

---

## 5. Output Schema

The output JSON file structure maps course codes to comprehensive course records:

```json
{
  "PHYSICS0001A": {
    "course": {
      "title": "1A - Physics for Scientists and Engineers: Mechanics",
      "course_code": "PHYSICS0001A"
    },
    "lectures": [
      {
        "section_id": "Lec 1",
        "indicator": "warning",
        "indicator_label": "Class Requisite Warning",
        "instructor": "Corbin, B.",
        "status": "Open",
        "units": "5.0",
        "enrollment": {
          "enrolled": 161,
          "capacity": 170,
          "spots_left": 9
        },
        "meetings": [
          {
            "days": "TR",
            "time": "8am-9:50am",
            "location": "Physics and Astronomy Building 1425"
          }
        ],
        "final_exam": {
          "date": "December 8, 2026",
          "day": "Tuesday",
          "time": "11:30am-2:30pm",
          "location": "Check back on 11/23/2026 for location"
        },
        "ge_categories": [
          "Foundations of Scientific Inquiry—Physical Sciences"
        ],
        "ge_lab_demo": true,
        "writing_ii": false,
        "diversity": false,
        "requisites": [
          {
            "course": "Mathematics 31A",
            "min_grade": "C-",
            "is_prereq": true,
            "is_coreq": false,
            "type": "Enforced"
          }
        ],
        "effective_discussion_restrictions": {
          "distinct_restrictions": [],
          "has_restricted_discussions": false,
          "all_discussions_restricted": false,
          "all_open_discussions_restricted": false,
          "open_discussions_restrictions": []
        },
        "discussions": [
          {
            "section_id": "Dis 1A",
            "indicator": "info",
            "indicator_label": "Class Requisite Information",
            "instructor": "TA",
            "status": "Open",
            "enrollment": { "enrolled": 21, "capacity": 22, "spots_left": 1 },
            "meetings": [
              { "days": "W", "time": "9am-9:50am", "location": "Knudsen Hall 1200B" }
            ],
            "class_id": "318001201",
            "class_no": "001",
            "restrictions": { "section": null, "class": null, "raw": [] },
            "class_notes": [],
            "grade_type": "Non-Graded"
          }
        ]
      }
    ]
  }
}
```
