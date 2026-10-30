import concurrent.futures, json, re, urllib.request
from pathlib import Path
from html import unescape

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://om-food-five.vercel.app'
def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=45) as response:
        return response.read()
html = fetch(BASE + '/products').decode()
cards = re.findall(r'<article class="product-card">(.*?)</article>', html, re.S)
products = []
assets = {}
for card in cards:
    image = unescape(re.search(r'<img src="([^"]+)"', card)[1])
    name = unescape(re.search(r'<h3>(.*?)</h3>', card)[1])
    slug = re.search(r'href="/products/([^"]+)"', card)[1]
    description = unescape(re.search(r'<p>(.*?)</p>', card)[1])
    local = '/images/' + slug + ('.webp' if '.webp' in image else '.jpg')
    assets[local] = BASE + image if image.startswith('/') else image
    products.append(dict(slug=slug, name=name, description=description, image=local, family='Garlic' if 'garlic' in slug else 'Onion', form='Flakes / Kibbled' if 'flakes' in slug else 'Minced' if 'minced' in slug else 'Granules' if 'granules' in slug else 'Powder', published=True, code='', sizes='', origin='', shelfLife='', packaging='', specifications=[], treatments=[], applications=['Seasoning blends','Sauces & condiments','Food manufacturing'], source=BASE+'/products/'+slug))
assets['/images/hero.webp'] = BASE + '/images/hero-ingredients.webp'
assets['/images/hero-mobile.webp'] = BASE + '/images/hero-ingredients-mobile.webp'
assets['/images/garlic.jpg'] = BASE + '/images/hero-garlic-dried.jpg'
assets['/images/onion-detail.jpg'] = BASE + '/assets/dehydrated-onion-mfOgcn41.jpg'
def download(pair):
    path,url = pair
    dest=ROOT/'public'/path.lstrip('/')
    dest.parent.mkdir(parents=True,exist_ok=True)
    try:
        dest.write_bytes(fetch(url))
        return path
    except Exception as error:
        return f'{path}: {error}'
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    for result in executor.map(download,assets.items()): print(result)
(ROOT/'app'/'source-products.json').write_text(json.dumps(products,indent=2),encoding='utf-8')
(ROOT/'source-provenance.json').write_text(json.dumps({'source':BASE,'products':products,'assets':assets,'enquiry':'Existing /contact form retained at original origin; no submission code changed.','whatsapp':'918140712205'},indent=2),encoding='utf-8')
print('Imported',len(products),'products')
