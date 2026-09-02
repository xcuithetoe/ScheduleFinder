import os
import json
import time
import urllib.parse
from playwright.sync_api import sync_playwright

courses = [
    ("EPS SCI", "3", "EP SCI"),
    ("MCD BIO", "50", "MCD BIO"),
    ("NEUROSC", "10", "NEUROSC"),
    ("LIFESCI", "15", "LIFESCI"),
    ("GEOG", "2", "GEOG"),
    ("GEOG", "5", "GEOG"),
    ("PHYSCI", "5", "PHYSCI")
]

def run():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        for subj, num, code in courses:
            print(f"Checking SOC for {subj} {num}")
            url = f"https://sa.ucla.edu/ro/public/soc/Results?SubjectAreaName={code.replace(' ', '+')}&t=26F&s_g_cd=%25&sBy=subject&subj={code.replace(' ', '+')}&catlg={num}&cls_no=&undefined=Go&btnIsInIndex=btn_inIndex"
            page.goto(url, wait_until="networkidle", timeout=60000)
            time.sleep(3)
            
            try:
                res = page.evaluate('''async () => {
                    const shadow = document.querySelector('ucla-sa-soc-app')?.shadowRoot || document;
                    const titles = Array.from(shadow.querySelectorAll('.class-title'));
                    if(titles.length === 0) return {error: "none"};
                    let target = titles[0];
                    const btn = target.querySelector('button');
                    if (btn && btn.getAttribute('aria-expanded') !== 'true') {
                        btn.click();
                        await new Promise(r => setTimeout(r, 2000));
                    }
                    const code = target.id;
                    const container = shadow.querySelector('#' + code + '-container') || target;
                    const rows = Array.from(container.querySelectorAll('.row-fluid.data_row'));
                    let lecs = [];
                    for(let r of rows){
                        let sec = (r.querySelector('.sectionColumn')?.innerText || '').trim();
                        if(r.classList.contains('primary-row') || sec.toLowerCase().startsWith('lec')){
                            lecs.push({
                                sec: sec,
                                instr: (r.querySelector('.instructorColumn')?.innerText || '').trim(),
                                stat: (r.querySelector('.statusColumn')?.innerText || '').trim(),
                                wait: (r.querySelector('.waitlistColumn')?.innerText || '').trim()
                            });
                        }
                    }
                    return {code: code, lectures: lecs};
                }''')
                
                results[f"{subj} {num}"] = res
                
                if res and res.get('lectures'):
                    for lec in res['lectures']:
                        instr = lec.get('instr', 'No instructors')
                        if instr != 'No instructors' and instr != '':
                            print(f"  Found instructor: {instr}")
                            
                            # Bruinwalk search
                            prof_search = urllib.parse.quote(instr.split(',')[0])
                            bw_url = f"https://www.bruinwalk.com/search/?q={prof_search}"
                            page.goto(bw_url, wait_until="networkidle", timeout=60000)
                            
                            bw_res = page.evaluate('''() => {
                                const prof_links = Array.from(document.querySelectorAll('.sr-info a'));
                                if(prof_links.length > 0) {
                                    return prof_links[0].href;
                                }
                                return null;
                            }''')
                            
                            if bw_res:
                                # Build specific course URL
                                # example bw_res: https://www.bruinwalk.com/professors/richard-wong/
                                # course slug: eps-sci-3
                                course_slug = f"{subj.lower().replace(' ', '-')}-{num}"
                                # sometimes they abbreviate, let's just get the general prof reviews if course specific fails
                                prof_reviews_url = bw_res + course_slug + "/"
                                
                                page.goto(prof_reviews_url, wait_until="networkidle", timeout=60000)
                                time.sleep(2)
                                
                                reviews = page.evaluate('''() => {
                                    const container = document.querySelector('.reviews.row');
                                    if (!container) return {error: "No course specific reviews found on " + window.location.href};
                                    const cards = Array.from(container.querySelectorAll('.review.reviewcard'));
                                    return cards.map(card => {
                                        let grade = (card.querySelector('.grade-margin')?.innerText || '').replace('Grade:', '').trim();
                                        let paragraph = card.querySelector('.review-paragraph');
                                        let text = paragraph ? paragraph.innerText.trim() : "";
                                        return {grade: grade, text: text};
                                    });
                                }''')
                                
                                if type(reviews) is dict and 'error' in reviews:
                                    # Just get general reviews from the professor's main page
                                    page.goto(bw_res, wait_until="networkidle", timeout=60000)
                                    time.sleep(2)
                                    reviews = page.evaluate('''() => {
                                        const container = document.querySelector('.reviews.row');
                                        if (!container) return [];
                                        const cards = Array.from(container.querySelectorAll('.review.reviewcard'));
                                        return cards.map(card => {
                                            let grade = (card.querySelector('.grade-margin')?.innerText || '').replace('Grade:', '').trim();
                                            let paragraph = card.querySelector('.review-paragraph');
                                            let text = paragraph ? paragraph.innerText.trim() : "";
                                            return {grade: grade, text: text};
                                        });
                                    }''')
                                
                                lec['bruinwalk'] = reviews
                            else:
                                lec['bruinwalk'] = []
            except Exception as e:
                results[f"{subj} {num}"] = {"error": str(e)}

        browser.close()
        
    with open("results_batch_5.json", "w") as f:
        json.dump(results, f, indent=2)
        
run()
