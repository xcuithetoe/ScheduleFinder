# Generate Schedules Workflow

This workflow describes how to optimize and rank weekly class schedules using course data from UCLA Schedule of Classes.

## Steps

1. **Prepare Course Schedule Data**:
   - Ensure course listings are present in `cached_courses.json` or defined in `args.json` / `new_courses.json`.
   - Data should specify lecture sections, meeting times, days, and linked discussion sections.

2. **Run Schedule Optimizer**:
   ```bash
   python optimizer.py
   ```
   - Filters out any classes starting before 9:00 AM.
   - Enforces a maximum of 4 class meetings per day.
   - Discards schedules with overlapping class times.
   - Flags sections with enrollment >80% or closed status as `[Low-Probability]`.
   - Ranks all valid non-conflicting schedules by maximizing the minimum time gap between classes throughout the week.
   - Outputs ranked schedule combinations to `schedules.json`.

3. **Generate Text & Markdown Summaries**:
   ```bash
   python gen_output.py
   ```
   - Formats the ranked schedules into human-readable daily schedules with gap analysis and professor details.
   - Saves output to `summary.md`.

4. **Generate Interactive HTML Calendar Widget**:
   - Uses the `schedule-widget-generator` skill to render an interactive HTML week block calendar (stored in `artifacts/`).
   - Allows toggling between Rank 1, Rank 2, and alternative schedules with color-coded course blocks.
