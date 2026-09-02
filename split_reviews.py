import json
import os

with open(r'c:\Users\boomer\Desktop\schedule_cleaner\scraped_reviews_full.json', encoding='utf-8') as f:
    d = json.load(f)

keys = ['Molina - lbr-std-10', 'Treude - eps-sci-3', 'Dominguez - neurosc-10', 'Phelan - lifesci-15', 'Cavanaugh - geog-5', 'Esdin - physci-5', 'ENGL0085-Mott, C.M.', 'PHILOS0007-Armstrong, J.D.']
for k in keys:
    safe_k = k.replace(' ', '_').replace('-', '').replace(',', '').replace('.', '')
    with open(f'{safe_k}.txt', 'w', encoding='utf-8') as f2:
        reviews = d[k].get('reviews', []) if isinstance(d[k], dict) else d[k]
        for r in reviews:
            text = r.get('review_text', '') if isinstance(r, dict) else r
            f2.write(text + '\n---\n')
