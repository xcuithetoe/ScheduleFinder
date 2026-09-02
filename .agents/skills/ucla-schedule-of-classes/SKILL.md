---
name: ucla-schedule-of-classes
description: >-
  Look up and record course offerings, lecture times, discussion section schedules, instructor details, 
  seat availability, enrollment caps, and waitlist status from the UCLA Registrar's Schedule of Classes (SOC). 
  Use when the user asks for UCLA class schedules, open seats, lecture/discussion times, or term course info.
---

# UCLA Schedule of Classes (SOC) Course Lookup & Availability Skill

This skill guides the agent in navigating the UCLA Registrar's Schedule of Classes (SOC) to look up course offerings, extract lecture and discussion meeting times, check room locations, instructor assignments, and live seat/waitlist availability. The output must be returned as a strict JSON block to ensure machine readability.

---

## 1. Term Code & URL Construction

UCLA SOC uses term codes formatted as `YY[Term]`:
* `F` = Fall Quarter (e.g., `26F` for Fall 2026)
* `W` = Winter Quarter (e.g., `26W` for Winter 2026, `27W` for Winter 2027)
* `S` = Spring Quarter (e.g., `26S` for Spring 2026, `27S` for Spring 2027)
* `1` = Summer Sessions (e.g., `261` for Summer 2026 Session A)
* `2` = Summer Quarter (e.g., `262` for Summer 2026)

See [references/term_codes.md](./references/term_codes.md) for full term references.

### Direct Search URL Format:
```text
https://sa.ucla.edu/ro/public/soc/Results?SubjectAreaName={SubjectName}&t={TermCode}&s_g_cd=%25&sBy=subject&subj={SubjectCode}&catlg=&cls_no=&undefined=Go&btnIsInIndex=btn_inIndex
```

---

## 2. Local Cache Check & Storage

Before scraping UCLA SOC web pages:
1. **Check Cache**: Check if `cached_courses.json` exists in the workspace root directory and contains data for the target course(s) (keyed by `course_code`, e.g., `"CLASSIC0010"`, `"LING0001"`). If pre-existing data is found, return/use it directly without navigating to the website.
2. **Scrape & Save**: If data for the requested course is missing from `cached_courses.json`, proceed with the Scraping Procedure below. Once retrieved, immediately append/update `cached_courses.json` with the newly fetched course schedule object so it is preserved for future requests.

---

## 3. Scraping Procedure with Chrome DevTools MCP

The UCLA SOC web application renders inside a Shadow DOM Web Component (`<ucla-sa-soc-app>`). To interact with the page and extract full section details:

### Step 1: Navigate to the Target SOC Page
Use `navigate_page` with the appropriate URL.

### Step 2: Extract Data
Run the extraction script in [scripts/extract_course_sections.js](./scripts/extract_course_sections.js) via `evaluate_script`. This script automatically expands the course and all discussion sections, parses the data, and returns a strict JSON object.

---

## 4. Presentation Standards

When presenting course schedules to the user, you MUST output the raw JSON block returned by the extraction script. This ensures the data can be reliably fed into other data processing algorithms. 

Example Output:
```json
{
  "course": {
    "course_code": "COMSCI0032",
    "title": "32 - Introduction to Computer Science II"
  },
  "lectures": [
    {
      "section_id": "Lec 1",
      "instructor": "Huang, B.K.",
      "status": "Open",
      "enrollment": {
        "enrolled": 114,
        "capacity": 240,
        "spots_left": 126
      },
      "waitlist": {
        "taken": 0,
        "capacity": 30
      },
      "meetings": [
        {
          "days": "T",
          "time": "4pm-5:50pm",
          "location": "Young Hall CS76"
        }
      ],
      "discussions": [
        {
          "section_id": "Dis 1A",
          "instructor": "TA",
          "status": "Open",
          "enrollment": {
            "enrolled": 37,
            "capacity": 60,
            "spots_left": 23
          },
          "waitlist": {
            "taken": 0,
            "capacity": 10
          },
          "meetings": [
            {
              "days": "F",
              "time": "12pm-1:50pm",
              "location": "Fowler Museum at UCLA A103B"
            }
          ]
        }
      ]
    }
  ]
}
```
