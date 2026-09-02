---
name: schedule-widget-generator
description: >-
  Takes in a ranked list of potential schedules (such as those output by the schedule-optimizer skill) and creates an interactive, minimalist week block calendar HTML widget using generative UI. Use this skill when the user asks to visualize schedules as a calendar.
---

# Schedule Widget Generator Skill

This skill instructs the agent on how to render a clean, interactive block calendar in HTML for course schedules.

## 1. Prerequisites

Before using this skill, you must have the potential schedules formatted according to the `schedule-optimizer` skill (or similar), with explicit start/end times and days (M, T, W, R, F) for every class session.

## 2. Generating the Widget

You must use the `write_to_file` tool to create an HTML file in the artifact directory. 

1. Create a `write_to_file` request for a `.html` file. Set `UserFacing: true`.
2. Structure the HTML using Tailwind CSS via the Antigravity gstatic CDN (`<script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>`).
3. Embed an interactive widget layout that includes:
   - A header with a title and a descriptive sub-header for the currently selected schedule.
   - A set of buttons to toggle between the different schedules.
   - A calendar grid spanning Monday to Friday, from 9:00 AM to 6:00 PM.
4. Use absolute positioning inside the columns for the class blocks:
   - Total minute span = 9 hours (540 minutes, from 9:00 AM to 6:00 PM).
   - Top offset % = `((startMinute - 540) / 540) * 100` (assuming `startMinute` is minutes from midnight).
   - Height % = `(duration / 540) * 100`.
5. Write inline JavaScript to store the schedule data array and dynamically update the DOM columns based on the selected schedule button.

## 3. Embedding the Widget

After writing the HTML file, present the widget to the user inline by including an `<agent-embed>` tag in your final response:
`<agent-embed src="file:///<path_to_artifact>"></agent-embed>`
