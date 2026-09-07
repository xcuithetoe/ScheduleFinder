import json

with open("course_info.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for code in ["CLASSIC0010", "ARCHUD0030", "ART0031A", "ARTARC0010", "ARTHIS0021", "ENGL0090"]:
    if code in data:
        c = data[code]
        print(f"=== {code}: {c['course']['title']} ===")
        for lec in c.get("lectures", []):
            print("  Lec restr:", lec.get("restrictions"))
            print("  Eff disc:", lec.get("effective_discussion_restrictions"))
            for d in lec.get("discussions", [])[:2]:
                print("   ", d.get("section_id"), d.get("status"), d.get("restrictions"))
