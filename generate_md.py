import json

data = [
    {"name": "ENGL 85", "instructor": "Mott, C.M.", "term": "Fall 2026", "enrolled": 88, "capacity": 104, "status": "Open", "note": False, "reviews": "Mott, C.M. (Christopher Mott) is generally highly regarded by students. Reviews highlight that he is an engaging, funny, and humble professor who excels at creating a sense of community in the classroom. He is approachable and office hours are highly recommended. However, some students noted that his instructions for assignments can sometimes be unclear or contradictory, and he occasionally spends significant lecture time discussing his personal life. Overall, students found the class enjoyable with a manageable workload consisting of papers and projects rather than traditional exams."},
    {"name": "ENGL 87", "instructor": "Hyde, C.L.", "term": "Fall 2026", "enrolled": 0, "capacity": 1, "status": "Closed", "note": True, "reviews": "No Bruinwalk profile found for Hyde, C.L. (404/No results)."},
    {"name": "ENGL 90", "instructor": "Little, A.L.", "term": "Fall 2026", "enrolled": 64, "capacity": 99, "status": "Open", "note": False, "reviews": "No Bruinwalk profile found for Little, A.L. (404/No results)."},
    {"name": "ENGL 91B", "instructor": "Pradhan, P.", "term": "Fall 2026", "enrolled": 0, "capacity": 1, "status": "Closed", "note": True, "reviews": "No Bruinwalk profile found for Pradhan, P. (404/No results)."},
    {"name": "ENGL 91C", "instructor": "Grossman, J.H.", "term": "Fall 2026", "enrolled": 0, "capacity": 1, "status": "Closed", "note": True, "reviews": "No Bruinwalk profile found for Grossman, J.H. (404/No results)."},
    {"name": "ENG COMP 5W", "instructor": "Stone, B.D.", "term": "Fall 2026", "enrolled": 0, "capacity": 1, "status": "Closed", "note": True, "reviews": "No Bruinwalk profile found for Stone, B.D. (404/No results)."},
    {"name": "ENG COMP 7W", "instructor": "Davis, M.E.", "term": "Fall 2026", "enrolled": 0, "capacity": 1, "status": "Closed", "note": True, "reviews": "No Bruinwalk profile found for Davis, M.E. (404/No results)."},
    {"name": "PHILOS 5", "instructor": "Yao, V.", "term": "Fall 2026", "enrolled": 0, "capacity": 1, "status": "Closed", "note": True, "reviews": "No Bruinwalk profile found for Yao, V. (404/No results)."},
    {"name": "PHILOS 7", "instructor": "Armstrong, J.D.", "term": "Fall 2026", "enrolled": 0, "capacity": 1, "status": "Closed", "note": True, "reviews": "Armstrong, J.D. (Joshua Armstrong) is described as a fantastic, engaging, and helpful professor. Students appreciate his clear explanations of complex philosophical readings. The workload is manageable and mostly based on papers and weekly quizzes rather than heavy exams. Students highly recommend attending his lectures and office hours for better understanding of the material. There are no overwhelmingly negative points mentioned."}
]

with open(r"c:\Users\boomer\.gemini\antigravity\brain\0bf8e2ef-b6aa-43f0-a9f8-86108da4711e\scratch\batch_2.md", "w") as f:
    f.write("# Batch 2 Course Research\n\n")
    for d in data:
        f.write(f"## {d['name']}\n")
        f.write(f"**Term**: {d['term']}\n")
        f.write(f"**Instructor**: {d['instructor']}\n")
        f.write(f"**Enrollment**: {d['enrolled']}/{d['capacity']} ({d['status']})\n")
        
        if d['note']:
            f.write("> [!WARNING]\n> **Low Probability:** This course is currently >90% enrolled, closed, or waitlisted.\n\n")
            
        f.write("### Bruinwalk Reviews\n")
        f.write(f"{d['reviews']}\n\n")
