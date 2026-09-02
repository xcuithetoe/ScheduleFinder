import asyncio
from playwright.async_api import async_playwright

async def get_prof():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page()
        
        for name in ['Christopher Mott', 'Carrie Hyde', 'Arthur Little', 'Priyasha Pradhan', 'Jonathan Grossman', 'Bruce Stone', 'Matthew Davis', 'Vida Yao', 'Joshua Armstrong']:
            await page.goto(f"https://www.bruinwalk.com/search/?q={name.replace(' ', '+')}")
            links = await page.evaluate('''() => {
                return Array.from(document.querySelectorAll('.sr-info h1')).map(h1 => {
                    const a = h1.querySelector('a');
                    return a ? [a.innerText.trim(), a.href] : null;
                }).filter(x => x);
            }''')
            print(name, links)
        await b.close()
asyncio.run(get_prof())
