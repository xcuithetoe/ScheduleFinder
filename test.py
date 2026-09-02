import json
courses = json.load(open('cached_courses.json'))
keys = ['ENGL0085', 'ENGL0087001', 'ENGL0090', 'ENGL0091B', 'ENGL0091C', 'ENGCOMP0005W001', 'ENGCOMP0007W', 'PHILOS0005', 'PHILOS0007']
for k in keys:
    c = courses.get(k)
    title = c['course']['title']
    print(f'\nCourse: {title} ({k})')
    for lec in c.get('lectures', []):
        enr = lec.get('enrollment', {}) or {}
        enr_enrolled = enr.get('enrolled', 0)
        enr_cap = enr.get('capacity', 1)
        status = lec.get('status')
        print(f"  Instructor: {lec.get('instructor')}")
        print(f"  Status: {status}, Enrollment: {enr_enrolled}/{enr_cap}")
