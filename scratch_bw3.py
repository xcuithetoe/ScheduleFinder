import urllib.request
import re

targets = {
    "EPS SCI 3": "https://www.bruinwalk.com/professors/tina-treude/eps-sci-3/",
    "LIFESCI 15": "https://www.bruinwalk.com/professors/jay-phelan/lifesci-15/",
    "GEOG 5": "https://www.bruinwalk.com/professors/kyle-c-cavanaugh/geog-5/",
    "PHYSCI 5": "https://www.bruinwalk.com/professors/joseph-esdin/physci-5/"
}

for name, url in targets.items():
    print("---", name, "---")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req).read().decode('utf-8')
        cards = resp.split('class="review reviewcard"')[1:]
        for i, c in enumerate(cards[:2]):
            p_start = c.find('class="review-paragraph"')
            if p_start != -1:
                p_start = c.find('>', p_start) + 1
                p_end = c.find('</div>', p_start)
                text = c[p_start:p_end]
                text = re.sub('<[^>]+>', '', text).strip()
                print(f"Review {i+1}: {text[:200]}...")
    except Exception as e:
        print("Error", e)
