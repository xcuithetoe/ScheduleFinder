import json

def format_time(mins):
    h = mins // 60
    m = mins % 60
    ampm = "am" if h < 12 else "pm"
    h_12 = h if h <= 12 else h - 12
    if h_12 == 0:
        h_12 = 12
    return f"{h_12}:{m:02d}{ampm}"
    
with open('schedules.json', 'r') as f:
    schedules = json.load(f)

html_template = """<!DOCTYPE html>
<html>
<head>
<script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
<style>
  .calendar-col { position: relative; height: 540px; border-left: 1px solid #e5e7eb; }
  .class-block { position: absolute; left: 4px; right: 4px; border-radius: 4px; padding: 4px; font-size: 0.75rem; overflow: hidden; color: white;}
  .color-0 { background-color: #3b82f6; }
  .color-1 { background-color: #10b981; }
  .color-2 { background-color: #f59e0b; }
  .color-3 { background-color: #ef4444; }
  .color-4 { background-color: #8b5cf6; }
</style>
</head>
<body class="p-4 font-sans bg-white">
  <div class="max-w-4xl mx-auto">
    <div class="mb-4">
      <h2 class="text-xl font-bold">Schedule Visualizer</h2>
      <p id="schedule-desc" class="text-gray-600 text-sm"></p>
    </div>
    
    <div class="mb-4 flex space-x-2 overflow-x-auto pb-2">
      <!-- buttons injected here -->
      <div id="buttons-container"></div>
    </div>
    
    <div class="border border-gray-200 rounded">
      <div class="grid grid-cols-6 border-b border-gray-200 bg-gray-50">
        <div class="p-2 text-center text-sm font-semibold text-gray-500">Time</div>
        <div class="p-2 text-center text-sm font-semibold text-gray-700">Mon</div>
        <div class="p-2 text-center text-sm font-semibold text-gray-700">Tue</div>
        <div class="p-2 text-center text-sm font-semibold text-gray-700">Wed</div>
        <div class="p-2 text-center text-sm font-semibold text-gray-700">Thu</div>
        <div class="p-2 text-center text-sm font-semibold text-gray-700">Fri</div>
      </div>
      
      <div class="grid grid-cols-6">
        <div class="relative" style="height: 540px;">
          <!-- time labels -->
          <div class="absolute w-full text-right pr-2 text-xs text-gray-400" style="top: 0%;">9 AM</div>
          <div class="absolute w-full text-right pr-2 text-xs text-gray-400" style="top: 11.11%;">10 AM</div>
          <div class="absolute w-full text-right pr-2 text-xs text-gray-400" style="top: 22.22%;">11 AM</div>
          <div class="absolute w-full text-right pr-2 text-xs text-gray-400" style="top: 33.33%;">12 PM</div>
          <div class="absolute w-full text-right pr-2 text-xs text-gray-400" style="top: 44.44%;">1 PM</div>
          <div class="absolute w-full text-right pr-2 text-xs text-gray-400" style="top: 55.55%;">2 PM</div>
          <div class="absolute w-full text-right pr-2 text-xs text-gray-400" style="top: 66.66%;">3 PM</div>
          <div class="absolute w-full text-right pr-2 text-xs text-gray-400" style="top: 77.77%;">4 PM</div>
          <div class="absolute w-full text-right pr-2 text-xs text-gray-400" style="top: 88.88%;">5 PM</div>
          <div class="absolute w-full text-right pr-2 text-xs text-gray-400" style="top: 100%;">6 PM</div>
        </div>
        
        <div id="col-0" class="calendar-col"></div>
        <div id="col-1" class="calendar-col"></div>
        <div id="col-2" class="calendar-col"></div>
        <div id="col-3" class="calendar-col"></div>
        <div id="col-4" class="calendar-col"></div>
      </div>
    </div>
  </div>

  <script>
    const schedules = SCHEDULES_DATA;
    
    function renderSchedule(index) {
        document.querySelectorAll('.calendar-col').forEach(el => el.innerHTML = '');
        
        const schedule = schedules[index];
        document.getElementById('schedule-desc').innerText = `Rank ${index + 1}: Min Gap ${schedule.min_gap} mins ${schedule.prob}`;
        
        let colorIdx = 0;
        const courseColors = {};
        
        schedule.combo.forEach(course => {
            if (!(course.course_title in courseColors)) {
                courseColors[course.course_title] = colorIdx++;
            }
            const colorClass = `color-${courseColors[course.course_title] % 5}`;
            
            course.meetings.forEach(m => {
                const col = document.getElementById(`col-${m.day}`);
                if (!col) return;
                
                const startMins = m.start - 540; // 9am is 540
                const duration = m.end - m.start;
                
                const topPct = (startMins / 540) * 100;
                const heightPct = (duration / 540) * 100;
                
                const div = document.createElement('div');
                div.className = `class-block ${colorClass}`;
                div.style.top = `${topPct}%`;
                div.style.height = `${heightPct}%`;
                
                const title = course.course_title.split('-')[0].trim();
                div.innerHTML = `<div class="font-bold">${title} (${m.type})</div><div>${m.location}</div>`;
                col.appendChild(div);
            });
        });
        
        document.querySelectorAll('.sched-btn').forEach((btn, idx) => {
            if (idx === index) {
                btn.className = "sched-btn px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium";
            } else {
                btn.className = "sched-btn px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300";
            }
        });
    }
    
    const btnContainer = document.getElementById('buttons-container');
    schedules.forEach((s, idx) => {
        const btn = document.createElement('button');
        btn.innerText = `Rank ${idx + 1}`;
        btn.onclick = () => renderSchedule(idx);
        btn.className = "sched-btn px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300";
        btnContainer.appendChild(btn);
    });
    
    if (schedules.length > 0) renderSchedule(0);
  </script>
</body>
</html>
"""

html_content = html_template.replace('SCHEDULES_DATA', json.dumps(schedules[:3]))

with open('widget.html', 'w') as f:
    f.write(html_content)

md_out = "### Summary of Findings\n"
md_out += "Successfully generated combinations for all 5 requested courses. Many sections are heavily enrolled or closed, so schedules may contain [Low-Probability] sections.\n\n"

for i, sched in enumerate(schedules[:3]):
    md_out += f"### Rank {i+1}: Schedule Option {i+1}\n"
    md_out += f"**Minimum Gap:** {sched['min_gap']} minutes\n\n"
    md_out += "**Schedule Breakdown:**\n"
    
    for path in sched['combo']:
        prob_str = f" *(Note: {path['prob']})*" if path['prob'] else ""
        title = path['course_title']
        
        # Group meetings by section to display compactly
        sections = {}
        for m in path['meetings']:
            key = (m['section'], m['type'], m['location'], m['instructor'], m['start'], m['end'])
            if key not in sections:
                sections[key] = []
            sections[key].append(m['day'])
            
        for k, days in sections.items():
            day_strs = ['M', 'T', 'W', 'R', 'F']
            days_str = "".join([day_strs[d] for d in sorted(days)])
            start_f = format_time(k[4])
            end_f = format_time(k[5])
            md_out += f"* **{title} ({k[1]} {k[0]}):** {days_str} {start_f} - {end_f} | {k[2]} | {k[3]}{prob_str}\n"
            
    md_out += "\n**Daily Summary:**\n"
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    for d, meetings in sched['day_meetings'].items():
        if not meetings: continue
        d_name = day_names[int(d)]
        count = len(meetings)
        times = []
        for m in sorted(meetings, key=lambda x: x['start']):
            times.append(f"{format_time(m['start'])}-{format_time(m['end'])}")
        
        min_gap_day = "N/A"
        if count > 1:
            sorted_m = sorted(meetings, key=lambda x: x['start'])
            min_gap_day = min((sorted_m[j+1]['start'] - sorted_m[j]['end']) for j in range(count-1))
            
        md_out += f"* **{d_name} ({count} classes):** {', '.join(times)}. Minimum gap: {min_gap_day} mins.\n"
    md_out += "\n"
    
with open('summary.md', 'w') as f:
    f.write(md_out)
