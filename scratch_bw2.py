import urllib.request
import re
import json

targets = [
    ("EPS SCI 3", "https://www.bruinwalk.com/professors/tina-treude/eps-sci-3/"),
    ("MCD BIO 50", "https://www.bruinwalk.com/professors/yurim-lee-lee/mcd-bio-50/"),
    ("NEUROSC 10", "https://www.bruinwalk.com/professors/elena-nicole-dominguez/neurosc-10/"),
    ("LIFESCI 15", "https://www.bruinwalk.com/professors/jay-phelan/lifesci-15/"),
    ("GEOG 2", "https://www.bruinwalk.com/professors/gawain-antell/geog-2/"),
    ("GEOG 5", "https://www.bruinwalk.com/professors/kyle-c-cavanaugh/geog-5/"),
    ("PHYSCI 5", "https://www.bruinwalk.com/professors/joseph-esdin/physci-5/")
]

def clean_html(raw_html):
    cleanr = re.compile('<.*?>')
    return re.sub(cleanr, '', raw_html).strip()

results = {}
for course, url in targets:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req).read().decode('utf-8')
        
        # split by reviewcard
        cards = resp.split('class="review reviewcard"')
        reviews = []
        for card in cards[1:]:
            # extract text from <div class="review-paragraph">
            match = re.search(r'<div class="review-paragraph[^>]*>(.*?)</div>', card, re.DOTALL)
            text = clean_html(match.group(1)) if match else ""
            
            # extract grade
            grade_match = re.search(r'<div class="grade-margin[^>]*>(.*?)</div>', card, re.DOTALL)
            grade = clean_html(grade_match.group(1)).replace('Grade:', '').strip() if grade_match else ""
            
            # extract quarter
            q_match = re.search(r'<div class="term[^>]*>(.*?)</div>', card, re.DOTALL)
            quarter = clean_html(q_match.group(1)).replace('Quarter:', '').strip() if q_match else ""
            
            reviews.append({
                "quarter": quarter,
                "grade": grade,
                "text": text
            })
        
        results[course] = reviews
    except Exception as e:
        # Maybe 404
        results[course] = [{"error": str(e)}]

with open("bw_final.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("Done")
