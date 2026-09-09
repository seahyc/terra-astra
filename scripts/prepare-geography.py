"""Reproducible star samples from the downloaded geographic sources; seed 260909."""
from pathlib import Path
import json,math,random,array
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parents[1]; SRC=P/'data-source';OUT=P/'public/data';OUT.mkdir(parents=True,exist_ok=True)
rng=random.Random(260909); stats={}
def sphere(lon,lat,r=1.00002):
 a,b=math.radians(lon),math.radians(lat)
 return [r*math.cos(b)*math.sin(a),r*math.sin(b),r*math.cos(b)*math.cos(a)]
def save(name,values,stride):
 a=array.array('f',values)
 if __import__('sys').byteorder!='little':a.byteswap()
 (OUT/(name+'.bin')).write_bytes(a.tobytes());stats[name]={'count':len(values)//stride,'stride':stride,'bytes':len(a)*4}
def point(out,lon,lat,brightness=1,size=2,r=1.00002):out.extend(sphere(lon,lat,r)+[brightness,size,rng.random()*math.tau])
def rings(g):
 if g['type']=='Polygon':return g['coordinates']
 if g['type']=='MultiPolygon':return [r for p in g['coordinates'] for r in p]
 return []
land=json.load(open(SRC/'land.geojson'));mask=Image.new('L',(1440,720));draw=ImageDraw.Draw(mask)
for f in land['features']:
 g=f['geometry'];polys=[g['coordinates']] if g['type']=='Polygon' else g['coordinates']
 for poly in polys:
  for k,r in enumerate(poly):draw.polygon([((x+180)*4,(90-y)*4) for x,y in r],fill=255 if k==0 else 0)
landstars=[]
for i in range(155000):
 lon=rng.uniform(-180,180);lat=math.degrees(math.asin(rng.uniform(-1,1)))
 if mask.getpixel((min(1439,int((lon+180)*4)),min(719,int((90-lat)*4)))):
  point(landstars,lon,lat,rng.uniform(.16,.50),rng.uniform(1.0,2.3))
save('land',landstars,6)
coast=[];lines=[]
for f in land['features']:
 for ring in rings(f['geometry']):
  for a,b in zip(ring,ring[1:]):
   if abs(b[0]-a[0])>180:continue
   dist=math.hypot((b[0]-a[0])*math.cos(math.radians(a[1])),b[1]-a[1]);n=max(1,math.ceil(dist/.24))
   prev=None
   for k in range(n+1):
    t=k/n;x=a[0]+(b[0]-a[0])*t;y=a[1]+(b[1]-a[1])*t
    point(coast,x,y,rng.uniform(.45,.95),rng.uniform(1.3,2.8),1.00008)
    pos=sphere(x,y,1.000065)
    if prev is not None:lines.extend(prev+pos)
    prev=pos
save('coast',coast,6);save('coast-lines',lines,3)
# Night-light samples are from a historical, grayscale 2016 composite, not population.
im=Image.open(SRC/'nightlights.jpg').convert('L');w,h=im.size;pix=im.load();night=[]
for y in range(h):
 lat=90-(y+.5)*180/h
 if lat < -60:continue
 for x in range(w):
  v=pix[x,y]
  if v<25:continue
  prob=min(.95,((v-22)/180)**.72)*math.cos(math.radians(lat))
  if rng.random()<prob:
   lon=(x+rng.random())*360/w-180;la=90-(y+rng.random())*180/h
   point(night,lon,la,.3+.7*min(1,v/210),1.2+2.3*(v/255)**1.5,1.00012)
save('lights',night,6)
cs=json.load(open(SRC/'countries.geojson'));border=[];seen=set()
for f in cs['features']:
 for ring in rings(f['geometry']):
  for a,b in zip(ring,ring[1:]):
   if abs(b[0]-a[0])>180:continue
   key=tuple(sorted((tuple(round(v,4) for v in a),tuple(round(v,4) for v in b))))
   if key in seen:continue
   seen.add(key);border.extend(sphere(*a,1.00007)+sphere(*b,1.00007))
save('borders',border,3)
# More detailed Southeast Asia coastlines for the approach; city streets are separate.
sgsrc=json.load(open(SRC/'singapore-source.geojson'));regional=[];sg=[]
for f in sgsrc['features']:
 for ring in rings(f['geometry']):
  for a,b in zip(ring,ring[1:]):
   if all(90<x<116 and -11<y<15 for x,y in [a,b]):
    regional.extend(sphere(*a,1.000008)+sphere(*b,1.000008))
    if all(103.5<x<104.2 and 1.1<y<1.6 for x,y in [a,b]):
     n=max(1,math.ceil(math.dist(a,b)/.0006))
     for k in range(n):
      t=k/n;point(sg,a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,.50,1.8,1.000012)
save('regional-lines',regional,3);save('singapore-coast',sg,6)
osm=json.load(open(SRC/'singapore-osm.json'));streets=[];streetstars=[];namemap={};segments=0
for way in osm['elements']:
 g=way.get('geometry',[]);tags=way.get('tags',{});kind=tags.get('highway','');major=kind in ['motorway','trunk','primary','secondary']
 if tags.get('name'):namemap[tags['name']]=True
 for a,b in zip(g,g[1:]):
  x,y=a['lon'],a['lat'];xx,yy=b['lon'],b['lat']
  if not all(103.79<lo<103.925 and 1.25<la<1.365 for lo,la in [(x,y),(xx,yy)]):continue
  streets.extend(sphere(x,y,1.000014)+sphere(xx,yy,1.000014));segments+=1
  n=max(1,math.ceil(math.hypot(xx-x,yy-y)/.00015))
  for k in range(n):
   if rng.random()>(.78 if major else .5):continue
   t=(k+rng.random())/n
   point(streetstars,x+(xx-x)*t,y+(yy-y)*t,rng.uniform(.40,.95) if major else rng.uniform(.25,.65),rng.uniform(1.3,2.7),1.000018)
save('singapore-streets',streets,3);save('singapore-stars',streetstars,6)
manifest={'schema':1,'seed':260909,'prepared':'2026-09-09','layers':stats,'streetWays':len(osm['elements']),'streetSegments':segments,'streetNames':len(namemap),'nightlightsYear':2016,'sources':[{'name':'Natural Earth','url':'https://www.naturalearthdata.com/','license':'Public domain','use':'Global and regional geography'},{'name':'NASA Earth Observatory / Black Marble 2016','url':'https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/','credit':'NASA Earth Observatory images by Joshua Stevens, using Suomi NPP VIIRS data from Miguel Roman, NASA GSFC','use':'Artistically sampled historical night-light intensity; not population'},{'name':'OpenStreetMap contributors','url':'https://www.openstreetmap.org/copyright','license':'ODbL','use':'Singapore street geometry, retrieved 2026-09-09'}],'humanLayer':'Fictional authored stories; no real people or live locations'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(stats,indent=2))
