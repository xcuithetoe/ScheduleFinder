import asyncio
from playwright.async_api import async_playwright
import json

courses = [
    ("ENGL0085-Mott, C.M.", "https://www.bruinwalk.com/professors/christopher-m-mott/engl-85/"),
    ("ENGL0087001-Hyde, C.L.", "https://www.bruinwalk.com/professors/carrie-hyde/engl-87/"),
    ("ENGL0090-Little, A.L.", "https://www.bruinwalk.com/professors/arthur-little/engl-90/"),
    ("ENGL0091B-Pradhan, P.", "https://www.bruinwalk.com/professors/priyasha-pradhan/engl-91b/"),
    ("ENGL0091C-Grossman, J.H.", "https://www.bruinwalk.com/professors/jonathan-grossman/engl-91c/"),
    ("ENGCOMP0005W001-Stone, B.D.", "https://www.bruinwalk.com/professors/bruce-stone/engcomp-5w/"),
    ("ENGCOMP0007W-Davis, M.E.", "https://www.bruinwalk.com/professors/matthew-davis/engcomp-7w/"),
    ("PHILOS0005-Yao, V.", "https://www.bruinwalk.com/professors/vida-yao/philos-5/"),
    ("PHILOS0007-Armstrong, J.D.", "https://www.bruinwalk.com/professors/joshua-armstrong/philos-7/")
]

async def scrape_exact():
    all_reviews = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        for key, url in courses:
            print(f"Fetching {url}")
            resp = await page.goto(url)
            
            if resp.status == 404:
                print(f"404 for {url}")
                continue
                
            total_pages = await page.evaluate('''() => {
              const paginationLinks = Array.from(document.querySelectorAll('.pagination a'));
              const pageNums = paginationLinks
                .map(a => parseInt(a.innerText.trim(), 10))
                .filter(n => !isNaN(n));
              return pageNums.length > 0 ? Math.max(...pageNums) : 1;
            }''')
            
            reviews = []
            for i in range(1, total_pages + 1):
                await page.goto(f"{url}?page={i}")
                page_reviews = await page.evaluate('''() => {
                  const container = document.querySelector('.reviews.row');
                  if (!container) return [];
                  const cards = Array.from(container.querySelectorAll('.review.reviewcard'));
                  return cards.map(card => {
                    const id = card.getAttribute('data-id') || null;
                    let quarter = null;
                    const termDivs = card.querySelectorAll('.qtaken-flex-container > div');
                    termDivs.forEach(d => {
                      if (d.innerText.includes('Quarter:')) {
                        quarter = d.innerText.replace('Quarter:', '').trim();
                      }
                    });
                    let grade = null;
                    const gradeDiv = card.querySelector('.grade-margin');
                    if (gradeDiv) {
                      grade = gradeDiv.innerText.replace('Grade:', '').trim();
                    }
                    const dateEl = card.querySelector('.date');
                    const date = dateEl ? dateEl.innerText.trim() : null;
                    const verified = !!card.querySelector('.verified-tag');
                    const covid = card.innerText.includes('COVID-19');
                    const upvoteEl = card.querySelector('.upvote-value');
                    const downvoteEl = card.querySelector('.downvote-value');
                    const helpful = upvoteEl ? parseInt(upvoteEl.innerText.trim(), 10) : 0;
                    const unhelpful = downvoteEl ? parseInt(downvoteEl.innerText.trim(), 10) : 0;
                    const paragraphArea = card.querySelector('.review-paragraph');
                    let reviewText = "";
                    if (paragraphArea) {
                      const ps = Array.from(paragraphArea.querySelectorAll('p'));
                      if (ps.length > 0) {
                        reviewText = ps.map(p => p.innerText.trim()).join('\\n\\n');
                      } else {
                        reviewText = paragraphArea.innerText.trim();
                      }
                    }
                    return {
                      review_id: id,
                      date: date,
                      quarter: quarter,
                      grade: grade,
                      verified_reviewer: verified,
                      covid_review: covid,
                      helpful_count: isNaN(helpful) ? 0 : helpful,
                      unhelpful_count: isNaN(unhelpful) ? 0 : unhelpful,
                      review_text: reviewText
                    };
                  });
                }''')
                reviews.extend(page_reviews)
            
            all_reviews[key] = reviews
            print(f"Extracted {len(reviews)} reviews for {key}")
            
        with open('Bruinwalk_Reviews.json', 'w') as f:
            json.dump(all_reviews, f, indent=2)
            
        await browser.close()

asyncio.run(scrape_exact())
