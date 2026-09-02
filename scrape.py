import asyncio
from playwright.async_api import async_playwright
import json

instructors = [
    ("ENGL0085", "Christopher Mott"),
    ("ENGL0087001", "Carrie Hyde"),
    ("ENGL0090", "Arthur Little"),
    ("ENGL0091B", "Priyasha Pradhan"),
    ("ENGL0091C", "Jonathan Grossman"),
    ("ENGCOMP0005W001", "Bruce Stone"),
    ("ENGCOMP0007W", "Matthew Davis"),
    ("PHILOS0005", "Vida Yao"),
    ("PHILOS0007", "Joshua Armstrong")
]

async def scrape_reviews():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        all_reviews = {}
        for course_id, instructor in instructors:
            last_name = instructor.split()[-1]
            print(f"Searching for {instructor}...")
            await page.goto(f"https://www.bruinwalk.com/search/?q={last_name}")
            
            # check if there's a professor result
            prof_link = await page.evaluate('''() => {
                const links = Array.from(document.querySelectorAll('a'));
                const profs = links.filter(a => a.href.includes('/professors/') && !a.href.endsWith('/professors/'));
                if(profs.length > 0) return profs[0].href;
                return null;
            }''')
            
            if not prof_link:
                print(f"No Bruinwalk page found for {instructor}")
                continue
                
            print(f"Found {instructor} at {prof_link}")
            
            # Now we need to get the specific course reviews
            # Actually Bruinwalk groups by professor, we can just get all reviews for the professor
            # But the skill says "navigate to https://www.bruinwalk.com/professors/{professor-slug}/{course-slug}/"
            # Let's get the slug
            prof_slug = prof_link.split('/professors/')[1].split('/')[0]
            
            # We don't know the exact course slug for Bruinwalk. We can just extract all courses from the professor's main page and match.
            await page.goto(prof_link)
            
            course_link = await page.evaluate(f'''(course_id) => {{
                // Try to find the course link
                const links = Array.from(document.querySelectorAll('.course-list-item a'));
                // Just return all course links so we can match in Python
                return links.map(a => a.href);
            }}''', course_id)
            
            # The Bruinwalk course slugs are like "engl-85", "engl-90", "philos-5"
            # Let's deduce the subject and number from course_id
            subject = course_id.split('00')[0].lower() # engl, engcomp, philos
            if subject == 'engcomp': subject = 'eng-comp'
            
            # Find the number
            import re
            m = re.search(r'00(\w+)', course_id)
            number = m.group(1).lower() if m else ''
            
            expected_slug = f"{subject}-{number}"
            if expected_slug.endswith('001'):
                expected_slug = expected_slug[:-3] # for 87001 -> 87
            
            target_url = None
            for cl in course_link:
                if expected_slug in cl.lower():
                    target_url = cl
                    break
                    
            if not target_url:
                # Just use the first one if only one exists or None
                print(f"Course {expected_slug} not found for {instructor} on Bruinwalk")
                continue
                
            print(f"Target URL: {target_url}")
            await page.goto(target_url)
            
            # get pagination
            total_pages = await page.evaluate('''() => {
              const paginationLinks = Array.from(document.querySelectorAll('.pagination a'));
              const pageNums = paginationLinks
                .map(a => parseInt(a.innerText.trim(), 10))
                .filter(n => !isNaN(n));
              return pageNums.length > 0 ? Math.max(...pageNums) : 1;
            }''')
            
            reviews = []
            for i in range(1, total_pages + 1):
                await page.goto(f"{target_url}?page={i}")
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
            
            title = course_id # Ideally CourseName-Professor
            key = f"{course_id}-{instructor}"
            all_reviews[key] = reviews
            print(f"Extracted {len(reviews)} reviews for {key}")
            
        with open('Bruinwalk_Reviews.json', 'w') as f:
            json.dump(all_reviews, f, indent=2)
            
        await browser.close()

asyncio.run(scrape_reviews())
