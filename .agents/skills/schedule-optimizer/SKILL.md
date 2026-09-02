---
name: schedule-optimizer
description: >-
  Takes in complete course schedule data and outputs optimal weekly schedules by maximizing time between classes, avoiding overlaps, and enforcing daily class limits. Use this skill when the user asks to generate, optimize, or rank potential schedules from UCLA SOC data.
---

# Schedule Optimizer Skill

This skill guides the agent in taking raw or formatted course schedule data (such as that output by the `ucla-schedule-of-classes` skill) and generating optimal, conflict-free weekly schedules.

## 1. Constraints & Metrics

When generating schedules, you must strictly adhere to the following metrics:

1. **No Overlaps**: There may be no time overlap between any two classes (lectures, discussions, labs, seminars) in a single day.
2. **Maximum 4 Classes a Day**: A "class" is defined as a single meeting session (e.g., one lecture meeting, or one discussion meeting). Do not schedule more than 4 meetings on any given day.
3. **Maximize Time Between Classes**: Ensure there is a minimum gap of 5 minutes between consecutive classes. Rank the schedules by the **minimum time gap** across the entire week (larger minimum gaps are ranked higher). Note that UCLA classes ending at `:50` and starting at the next hour (e.g., 9:50 AM to 10:00 AM) constitute a 10-minute gap, which satisfies the 5-minute minimum constraint.
4. **No Early Classes**: No classes may start earlier than 9:00 AM.
5. **Low-Probability Tracking**: Any section that is **completely full (closed)** or **>80% enrolled** must be flagged as "Low-Probability". Schedules containing any of these sections must still be included in the rankings, but clearly labeled as low-probability.

## 2. Processing Steps for the Agent

1. **Extract Data**: Parse the provided schedule data (which will follow the Presentation Standards of the UCLA SOC skill) into structured components (Lectures, Discussions, Labs).
2. **Filter**: Immediately eliminate any sections that start before 9:00 AM.
3. **Determine Probability**: Calculate the enrollment percentage for each section. If `(enrolled / capacity) > 0.8` or the class is closed, mark it as `[Low-Probability]`.
4. **Generate Combinations**: For each course, select one valid path (e.g., Lecture + associated Discussion). Cross-multiply these selections across all requested courses to form complete weekly schedules.
   - *Tip: If there are many combinations, consider writing a quick Python scratch script to generate and rank the combinations programmatically.*
5. **Validate & Score**:
   - Discard schedules with overlaps.
   - Discard schedules with >4 classes on any single day.
   - Calculate the minimum gap (in minutes) between any two classes on the same day.
   - Rank valid schedules descending by their minimum gap.

## 3. Output Presentation Standard

Format your final output exactly as follows for the user:

### Summary of Findings
Briefly note any impossible combinations (e.g., mandatory lectures that overlap) and state if all potential schedules are low-probability due to high enrollment.

### Rank 1: [Descriptive Title] (e.g., The Balanced Optimizer)
**Minimum Gap:** [X] minutes

**Schedule Breakdown:**
* **[Course Name] ([Section Type]):** [Day(s)] [Start] – [End] | [Location] | [Instructor] *(Note if [Low-Probability] and why)*
* ... (list all required meetings)

**Daily Summary:**
* **Monday ([N] classes):** [Times]. Minimum gap: [Y] mins.
* **Tuesday ([N] classes):** [Times]. Minimum gap: [Y] mins.
* ... (only list days with classes)

*(Repeat for Rank 2, Rank 3, etc. Present at least 3 distinct schedules if possible.)*
