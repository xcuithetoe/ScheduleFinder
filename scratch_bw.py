import os
import json
import time
import urllib.parse
from playwright.sync_api import sync_playwright

profs = [
    ("EPS SCI 3", ["Treude", "Mainzer"]),
    ("MCD BIO 50", ["Lee", "P Lee"]),
    ("NEUROSC 10", ["Dominguez", "E N Dominguez"]),
    ("LIFESCI 15", ["Phelan", "J P Phelan"]),
    ("GEOG 2", ["Antell", "G Antell"]),
    ("GEOG 5", ["Cavanaugh", "K C Cavanaugh"]),
    ("PHYSCI 5", ["Esdin", "J Esdin"])
]

def run():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        for course, names in profs:
            course_results = []
            for name in names:
                print(f"Searching Bruinwalk for {name}")
                search_query = urllib.parse.quote(name)
                bw_url = f"https://www.bruinwalk.com/search/?q={search_query}"
                page.goto(bw_url, wait_until="domcontentloaded", timeout=60000)
                
                prof_link = page.evaluate('''() => {
                    const l = document.querySelector('a.professor-name');
                    return l ? l.href : null;
                }''')
                
                if prof_link:
                    print(f"Found prof link: {prof_link}")
                    page.goto(prof_link, wait_until="networkidle", timeout=60000)
                    time.sleep(2)
                    reviews = page.evaluate('''() => {
                        const container = document.querySelector('.reviews.row');
                        if (!container) return [];
                        const cards = Array.from(container.querySelectorAll('.review.reviewcard'));
                        return cards.map(card => {
                            let grade = (card.querySelector('.grade-margin')?.innerText || '').replace('Grade:', '').trim();
                            let termDivs = Array.from(card.querySelectorAll('.qtaken-flex-container > div'));
                            let quarter = '';
                            termDivs.forEach(d => {
                                if (d.innerText.includes('Quarter:')) quarter = d.innerText.replace('Quarter:', '').trim();
                            });
                            let courseDiv = card.querySelector('.course-name');
                            let courseName = courseDiv ? courseDiv.innerText.trim() : '';
                            
                            let paragraph = card.querySelector('.review-paragraph');
                            let text = paragraph ? paragraph.innerText.trim() : "";
                            return {course: courseName, quarter: quarter, grade: grade, text: text};
                        });
                    }''')
                    course_results.append({
                        "instructor": name,
                        "reviews": reviews
                    })
                    break # Found the prof, no need to try alternative names
                else:
                    course_results.append({
                        "instructor": name,
                        "reviews": []
                    })
            results[course] = course_results
        
        browser.close()
        
    with open("bw_results.json", "w") as f:
        json.dump(results, f, indent=2)
        
run()
