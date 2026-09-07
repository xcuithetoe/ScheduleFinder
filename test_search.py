import json
import re

with open("course_info.json", "r", encoding="utf-8") as f:
    data = json.load(f)

courses_list = []
for code, cdata in data.items():
    title = cdata.get("course", {}).get("title", "")
    dept = ""
    if cdata.get("lectures"):
        dept = cdata["lectures"][0].get("department", "")
    courses_list.append({
        "code": code,
        "title": title,
        "department": dept
    })

# Key format: [DEPT][0-9]{4}[SUFFIX]
key_regex = re.compile(r'^([A-Z&]+)(\d{4})([A-Z0-9]*)$')

def normalize_query(q):
    return re.sub(r'[^a-zA-Z0-9]', '', q).upper()

def search_courses(query):
    q_raw = query.strip()
    q_norm = normalize_query(q_raw)
    
    # Check if format like "CLASSIC 10" or "COM LIT 2CW"
    # Split by spaces or numbers
    m = re.search(r'([A-Za-z\s&]+?)\s*(\d+[A-Za-z0-9]*)', q_raw)
    parsed_code_variants = []
    if m:
        dept_str = normalize_query(m.group(1))
        num_str = m.group(2).upper()
        # Extract number digits and suffix
        num_m = re.match(r'(\d+)([A-Z0-9]*)', num_str)
        if num_m:
            digits = num_m.group(1).zfill(4)
            suffix = num_m.group(2)
            padded = f"{dept_str}{digits}{suffix}"
            parsed_code_variants.append(padded)
            
    matches = []
    for c in courses_list:
        code = c["code"]
        title = c["title"]
        dept = c["department"]
        
        # 1. Exact match on code variant
        if code in parsed_code_variants:
            matches.append((100, c))
            continue
            
        # 2. Exact match on normalized code
        code_norm = normalize_query(code)
        if code_norm == q_norm:
            matches.append((95, c))
            continue
            
        # 3. Code starts with or contains
        if code_norm.startswith(q_norm):
            matches.append((80, c))
            continue
            
        # 4. Title match
        if q_raw.lower() in title.lower():
            matches.append((70, c))
            continue
            
        # 5. Department match
        if q_raw.lower() in dept.lower() and len(q_raw) > 3:
            matches.append((50, c))
            continue

    matches.sort(key=lambda x: (-x[0], x[1]["code"]))
    return [m[1] for m in matches]

# Test queries
test_queries = [
    "CLASSIC 10",
    "ARCHUD 30",
    "ART 31A",
    "COM LIT 2CW",
    "COMLIT 2BW",
    "PHILOS 7",
    "Discovering Greeks",
    "Medieval Art",
    "classic0010"
]

for tq in test_queries:
    results = search_courses(tq)
    print(f"Query: '{tq}' -> {len(results)} matches. Top: {results[0] if results else 'None'}")
