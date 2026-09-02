import re
html = open('mott.html', encoding='utf-16').read()
links = re.findall(r'href="(/professors/[^"]+)"', html)
print(set(links))
