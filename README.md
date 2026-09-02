# ScheduleFinder 🗓️

An end-to-end UCLA course schedule optimization suite, Bruinwalk professor review scraper, and interactive weekly calendar visualizer. ScheduleFinder provides both an interactive React + Vite web interface, algorithmic Python optimization pipelines, and specialized AI Agent skills & workflows designed for pair-programming assistants.

---

## 🌟 High-Level Overview

ScheduleFinder solves the complex combinatorial problem of building a university class schedule by automating three core pillars:

1. **Course Data Ingestion & SOC Scraping**:
   - Interfaces directly with the UCLA Registrar Schedule of Classes (SOC).
   - Extracts lectures, linked discussion sections, real-time seat availability, waitlists, instructors, and meeting times from Shadow DOM web components.
   - Automatically maintains a persistent local cache (`cached_courses.json`) to avoid redundant network overhead.

2. **Bruinwalk Professor Review Intelligence**:
   - Scrapes student reviews and ratings across all paginated pages from Bruinwalk.
   - Normalizes reviews into a standard JSON schema and persists them to `Bruinwalk_Reviews.json`.
   - Generates structured 5-point syntheses (Overall Reception, Lectures & Resources, Workload, Exams/Grading, Demeanor/Tips).

3. **Schedule Permutation & Optimization Engine**:
   - Generates all valid combinations of lectures and attached discussions across requested courses.
   - Strictly enforces rules: zero overlapping times, no classes starting before 9:00 AM, and maximum 4 classes per day.
   - Identifies high-risk/closed sections (>80% full) as `[Low-Probability]`.
   - Optimizes and ranks schedules by maximizing the minimum time gap between classes throughout the week.

4. **Interactive UI & Visual Calendars**:
   - Modern React + TypeScript + Tailwind CSS web application for exploring and filtering schedules.
   - Generative UI week block calendar widgets (standalone HTML in `artifacts/`) allowing instant toggling between schedule ranks with color-coded course blocks.

---

## 📁 Repository Structure

```text
ScheduleFinder/
├── .agents/                                # AI Agent configurations and extensions
│   ├── skills/                             # Custom agent skills
│   │   ├── bruinwalk-reviews/              # Scrapes & caches Bruinwalk reviews
│   │   │   ├── scripts/
│   │   │   │   ├── extract_page_reviews.js # DOM extraction script for review cards
│   │   │   │   └── save_reviews.py         # Incremental JSON persistence helper
│   │   │   └── SKILL.md                    # Skill definition & guidelines
│   │   ├── schedule-optimizer/             # Algorithmic scheduling rules & rankings
│   │   │   └── SKILL.md
│   │   ├── schedule-widget-generator/      # Generative UI calendar block widget
│   │   │   └── SKILL.md
│   │   └── ucla-schedule-of-classes/       # UCLA SOC Shadow DOM scraper
│   │       ├── references/                 # Term code reference table
│   │       │   └── term_codes.md
│   │       ├── scripts/
│   │       │   └── extract_course_sections.js # SOC shadow DOM parser
│   │       └── SKILL.md
│   └── workflows/                          # Standard operating runbooks
│       ├── bruinwalk-reviews.md            # Bruinwalk review scraping runbook
│       ├── generate-schedules.md           # Schedule optimization runbook
│       ├── ucla-soc-lookup.md              # UCLA SOC query runbook
│       └── web-app.md                      # Frontend development runbook
│
├── artifacts/                              # Generated visual artifacts & reports
│   ├── schedules.html                      # Interactive block calendar widget
│   ├── schedule_widget.html                # Generative UI calendar component
│   ├── test_schedules.html                 # Calendar verification widget
│   └── learning_proposal.md                # System documentation artifact
│
├── src/                                    # React + TypeScript Web Application
│   ├── assets/                             # Logos and SVGs
│   ├── components/                         # UI components (Header, FormatGuide, etc.)
│   ├── tests/                              # Unit tests (Vitest)
│   │   ├── csvParser.test.ts
│   │   └── scheduler.test.ts
│   ├── utils/                              # Scheduling & parsing utility algorithms
│   │   ├── csvParser.ts
│   │   ├── sampleData.ts
│   │   └── scheduler.ts
│   ├── App.tsx                             # Main application view
│   ├── App.css                             # Component styling
│   ├── types.ts                            # Core TypeScript data schemas
│   └── main.tsx                            # React root entry point
│
├── Data & Caches:                          # Local JSON caches and scraped datasets
│   ├── cached_courses.json                 # Cached UCLA SOC course section data
│   ├── Bruinwalk_Reviews.json              # Standardized professor & course reviews
│   ├── scraped_reviews_full.json           # Raw scraped review records
│   ├── schedules.json                      # Output of generated & ranked schedules
│   ├── summary.md                          # Formatted schedule summary report
│   └── args.json / new_courses.json        # Course input definitions
│
├── Python & JS Scripts:                    # Optimization & Data Processing scripts
│   ├── optimizer.py                        # Core combinatorial schedule optimization
│   ├── gen_output.py                       # Generates formatted markdown summaries
│   ├── scrape.py / scrape2.py              # Bruinwalk & SOC web scraping helpers
│   ├── get_info.py / extract_links.py      # Instructor resolution & link extraction
│   └── MATH_script.js                      # Course extraction scripts
│
├── package.json                            # Node dependencies and npm scripts
├── tsconfig.json                           # TypeScript configuration
├── vite.config.ts                          # Vite bundler configuration
└── README.md                               # Project documentation
```

---

## 🚀 How to Get Started

### 1. Prerequisites

- **Node.js**: `v18.0.0` or higher
- **Python**: `3.10` or higher
- **Git**: Configured with your GitHub SSH or HTTPS credentials

---

### 2. Setup on a New Laptop

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone git@github.com:xcuithetoe/ScheduleFinder.git
cd ScheduleFinder

# Install frontend dependencies
npm install
```

---

### 3. Running the React Web Application

```bash
# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to view the interactive schedule cleaner interface.

To run the automated frontend unit tests:
```bash
npm test
```

To create a production build:
```bash
npm run build
```

---

### 4. Running the Python Schedule Optimizer

To generate conflict-free, optimal schedules from the course dataset:

```bash
# 1. Run combinatorial optimizer
python optimizer.py

# 2. Generate structured markdown summary
python gen_output.py
```

Results will be generated in `schedules.json` and `summary.md`.

---

### 5. Working with AI Pair Programming Assistants (Antigravity / Gemini)

This repository includes workspace skills and workflows in `.agents/`:

- **Bruinwalk Reviews (`.agents/skills/bruinwalk-reviews`)**: Scrapes and synthesizes student reviews.
- **Schedule Optimizer (`.agents/skills/schedule-optimizer`)**: Evaluates schedule constraints and ranks options by time gap.
- **Schedule Widget Generator (`.agents/skills/schedule-widget-generator`)**: Renders interactive HTML calendar blocks.
- **UCLA SOC Lookup (`.agents/skills/ucla-schedule-of-classes`)**: Direct integration with UCLA's Schedule of Classes.

When working in Antigravity or any compatible AI coding agent, these skills are automatically discovered from the `.agents/` directory.

---

## 📊 Data & Cache Schemas

### `cached_courses.json`
Stores course offerings from UCLA SOC. Keyed by course code:
```json
{
  "COMSCI0032": {
    "course": {
      "course_code": "COMSCI0032",
      "title": "32 - Introduction to Computer Science II"
    },
    "lectures": [
      {
        "section_id": "Lec 1",
        "instructor": "Huang, B.K.",
        "status": "Open",
        "enrollment": { "enrolled": 114, "capacity": 240, "spots_left": 126 },
        "waitlist": { "taken": 0, "capacity": 30 },
        "meetings": [{ "days": "T", "time": "4pm-5:50pm", "location": "Young Hall CS76" }],
        "discussions": [ ... ]
      }
    ]
  }
}
```

### `Bruinwalk_Reviews.json`
Standardized professor reviews keyed by `"{CourseName}-{Professor}"`:
```json
{
  "MATH 32A-Richard Wong": [
    {
      "review_id": "12345",
      "date": "Jan. 31, 2023",
      "quarter": "Fall 2022",
      "grade": "A",
      "verified_reviewer": true,
      "covid_review": false,
      "helpful_count": 8,
      "unhelpful_count": 0,
      "review_text": "Detailed student feedback..."
    }
  ]
}
```

---

## ⚖️ Optimization Constraints

- **No Overlaps**: Zero time overlap between any lecture, discussion, or lab sessions.
- **Daily Cap**: Maximum of 4 meetings on any given day.
- **No Early Classes**: All classes must start at or after 9:00 AM.
- **Gap Maximization**: Schedulers rank combinations by the largest minimum time gap across the week (minimum 5-minute gap enforced).
- **Probability Tagging**: Sections with >80% capacity or closed status are tagged `[Low-Probability]`.

---

## 📄 License
Private project / Academic use.
