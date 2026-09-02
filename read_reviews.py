import json

def main():
    with open(r'c:\Users\boomer\Desktop\schedule_cleaner\scraped_reviews_full.json', 'r', encoding='utf-8') as f:
        d = json.load(f)
    
    keys = ['Molina - lbr-std-10', 'Treude - eps-sci-3', 'Dominguez - neurosc-10', 'Phelan - lifesci-15', 'Cavanaugh - geog-5', 'Esdin - physci-5', 'ENGL0085-Mott, C.M.', 'PHILOS0007-Armstrong, J.D.']
    
    with open('reviews_output.txt', 'w', encoding='utf-8') as out:
        for k in keys:
            out.write(f'\n================= {k} =================\n')
            reviews = d[k].get('reviews', []) if isinstance(d[k], dict) else d[k]
            for i, r in enumerate(reviews):
                text = r.get('text', r) if isinstance(r, dict) else r
                out.write(f'Review {i+1}: {text}\n')
                out.write('---\n')

if __name__ == '__main__':
    main()
