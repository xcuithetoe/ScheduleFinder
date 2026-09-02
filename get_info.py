import json
courses = ['ARCHUD0030', 'DESMA0010', 'ARTHIS0029', 'ETHNMUS0030', 'FILMTV0006A', 'GJSTDS0025M', 'GJSTDS0050AM', 'CLASSIC0010', 'COMLIT0004DW001', 'COMLIT0004DW']
data = json.load(open('cached_courses.json'))
for c in courses:
    course = data.get(c)
    if not course: continue
    title = course['course']['title']
    print(f'Course: {title} ({c})')
    for lec in course.get('lectures', []):
        instr = lec.get('instructor', 'Unknown')
        enr = lec.get('enrollment') or {}
        cap = enr.get('capacity', 1) or 1
        enrolled = enr.get('enrolled', 0)
        enr_pct = enrolled / cap
        status = lec.get('status')
        waitlist = lec.get('waitlist') or {}
        waitlist_taken = waitlist.get('taken', 0)
        waitlist_cap = waitlist.get('capacity', 0)
        print(f'  Lec: {lec.get("section_id")}, Instr: {repr(instr)}, Status: {status}, Enrolled: {enrolled}/{cap} ({enr_pct*100:.1f}%), Waitlist: {waitlist_taken}/{waitlist_cap}')
