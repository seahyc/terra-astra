import urllib.request,urllib.parse,pathlib,concurrent.futures,json
p=pathlib.Path('/workspace/sites/terra-astra/data-source');p.mkdir(exist_ok=True)
urls={
'nightlights.jpg':'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144897/BlackMarble_2016_01deg_gray.jpg',
'countries.geojson':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
'singapore-source.geojson':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson'}
def get(k,u):
 try:
  b=urllib.request.urlopen(u,timeout=45).read();(p/k).write_bytes(b);print(k,len(b),flush=True)
 except Exception as e:print(k,type(e).__name__,str(e),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:list(ex.map(lambda kv:get(*kv),urls.items()))
q='[out:json][timeout:25];way["highway"]["highway"!~"footway|path|steps|cycleway|service"](1.265,103.795,1.345,103.91);out geom;'
for host in ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']:
 try:
  req=urllib.request.Request(host,data=urllib.parse.urlencode({'data':q}).encode(),headers={'Content-Type':'application/x-www-form-urlencoded','User-Agent':'TerraAstraPrototype/0.1 (geographic art study)'})
  b=urllib.request.urlopen(req,timeout=35).read();d=json.loads(b)
  if 'elements' in d:
   (p/'singapore-osm.json').write_bytes(b);print('Singapore OSM ways',len(d['elements']),flush=True);break
 except Exception as e: print('Streets source',type(e).__name__,str(e),flush=True)
