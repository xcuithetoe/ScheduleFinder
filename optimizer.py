import json
import itertools
from datetime import datetime, timedelta

def parse_time(time_str):
    if time_str in ('To be arranged', '---'):
        return None
    # time_str e.g. "9am-9:50am", "12:30pm-1:45pm"
    start_str, end_str = time_str.split('-')
    
    def to_minutes(t_str):
        t_str = t_str.strip().lower()
        is_pm = 'pm' in t_str
        t_str = t_str.replace('am', '').replace('pm', '')
        if ':' in t_str:
            h, m = map(int, t_str.split(':'))
        else:
            h = int(t_str)
            m = 0
        if is_pm and h != 12:
            h += 12
        if not is_pm and h == 12:
            h = 0
        return h * 60 + m

    return to_minutes(start_str), to_minutes(end_str)

def get_day_indices(days_str):
    mapping = {'M': 0, 'T': 1, 'W': 2, 'R': 3, 'F': 4}
    res = []
    for d in days_str:
        if d in mapping:
            res.append(mapping[d])
    return res

def process_courses(target_courses):
    with open('cached_courses.json', 'r', encoding='utf-8') as f:
        cache = json.load(f)
    
    parsed_courses = {}
    for c_code in target_courses:
        course_data = cache[c_code]
        course_title = course_data['course']['title']
        valid_paths = []
        
        for lec in course_data['lectures']:
            # check prob
            lec_prob = ""
            if lec['status'] == 'Closed' or lec['status'].startswith('Closed'):
                lec_prob = "[Low-Probability]"
            elif lec['enrollment']:
                if (lec['enrollment']['enrolled'] / lec['enrollment']['capacity']) > 0.8:
                    lec_prob = "[Low-Probability]"
            
            lec_meetings = []
            valid_lec = True
            for m in lec['meetings']:
                times = parse_time(m['time'])
                if not times: continue
                if times[0] < 9 * 60: # before 9am
                    valid_lec = False
                days = get_day_indices(m['days'])
                for d in days:
                    lec_meetings.append({'day': d, 'start': times[0], 'end': times[1], 'type': 'Lec', 'section': lec['section_id'], 'location': m['location'], 'instructor': lec['instructor'], 'prob': lec_prob})
                    
            if not valid_lec:
                continue
                
            if not lec.get('discussions'):
                valid_paths.append({'meetings': lec_meetings, 'desc': f"{course_title} - {lec['section_id']}", 'prob': lec_prob, 'course_title': course_title})
            else:
                for dis in lec['discussions']:
                    dis_prob = ""
                    if dis['status'] == 'Closed' or dis['status'].startswith('Closed'):
                        dis_prob = "[Low-Probability]"
                    elif dis['enrollment']:
                        if (dis['enrollment']['enrolled'] / dis['enrollment']['capacity']) > 0.8:
                            dis_prob = "[Low-Probability]"
                            
                    dis_meetings = []
                    valid_dis = True
                    for m in dis['meetings']:
                        times = parse_time(m['time'])
                        if not times: continue
                        if times[0] < 9 * 60:
                            valid_dis = False
                        days = get_day_indices(m['days'])
                        for d in days:
                            dis_meetings.append({'day': d, 'start': times[0], 'end': times[1], 'type': dis['section_id'].split()[0], 'section': dis['section_id'], 'location': m['location'], 'instructor': dis['instructor'], 'prob': dis_prob})
                    
                    if valid_dis:
                        combined_prob = "[Low-Probability]" if ("[Low-Probability]" in lec_prob or "[Low-Probability]" in dis_prob) else ""
                        valid_paths.append({'meetings': lec_meetings + dis_meetings, 'desc': f"{course_title} - {lec['section_id']} & {dis['section_id']}", 'prob': combined_prob, 'course_title': course_title})
                        
        parsed_courses[c_code] = valid_paths
    return parsed_courses

def evaluate_schedule(combo):
    # combo is a list of paths (one per course)
    day_meetings = {i: [] for i in range(5)}
    total_prob = ""
    for path in combo:
        if path['prob']:
            total_prob = "[Low-Probability]"
        for m in path['meetings']:
            day_meetings[m['day']].append(m)
            
    min_gap = float('inf')
    for d, meetings in day_meetings.items():
        if len(meetings) > 4:
            return None # max 4 classes a day
        if len(meetings) > 1:
            meetings.sort(key=lambda x: x['start'])
            for i in range(len(meetings) - 1):
                m1 = meetings[i]
                m2 = meetings[i+1]
                if m1['end'] > m2['start']:
                    return None # overlap
                gap = m2['start'] - m1['end']
                if gap < 5:
                    # Note: UCLA classes end at :50, start at :00, so 10 min gap is standard and > 5.
                    return None
                min_gap = min(min_gap, gap)
                
    if min_gap == float('inf'):
        min_gap = 0
        
    return {'combo': combo, 'min_gap': min_gap, 'prob': total_prob, 'day_meetings': day_meetings}

target = ['MATH0032A', 'COMSCI0032', 'ENGR0001IT', 'ECENGR0001', 'ARCHUD0030']
courses = process_courses(target)
paths = [courses[c] for c in target]

valid_schedules = []
for combo in itertools.product(*paths):
    res = evaluate_schedule(combo)
    if res:
        valid_schedules.append(res)

valid_schedules.sort(key=lambda x: x['min_gap'], reverse=True)

with open('schedules.json', 'w') as f:
    json.dump(valid_schedules[:10], f, indent=2)

print(f"Found {len(valid_schedules)} valid schedules.")
