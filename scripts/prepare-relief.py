"""Prepare globe-scale ETOPO 2022 relief and reproducible, interpretive stellar volume.
Requires Python, numpy, scipy and Pillow. Raw TIFF is cached in ignored data-source/.
"""
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlencode
from PIL import Image
import numpy as np
from scipy.ndimage import map_coordinates
import json, hashlib, io

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/data'; RAW=ROOT/'data-source'; RAW.mkdir(exist_ok=True)
W,H=2880,1440
URL='https://gis.ngdc.noaa.gov/arcgis/rest/services/DEM_mosaics/DEM_all/ImageServer/exportImage'
PARAMS={'bbox':'-180,-90,180,90','bboxSR':4326,'size':f'{W},{H}','imageSR':4326,'format':'tiff','pixelType':'F32','interpolation':'RSP_BilinearInterpolation','compression':'LZ77','renderingRule':json.dumps({'rasterFunction':'none'}),'mosaicRule':json.dumps({'where':"Name='ETOPO_2022_v1_60s_surface'"}),'adjustAspectRatio':'false','f':'image'}
cache=RAW/'etopo-2022-globe.tif'
if not cache.exists():
 with urlopen(URL+'?'+urlencode(PARAMS),timeout=180) as response: raw=response.read()
 if raw[:1]==b'{': raise RuntimeError(raw.decode())
 image=Image.open(io.BytesIO(raw)); assert image.size==(W,H) and image.mode=='F',(image.size,image.mode)
 cache.write_bytes(raw)
height=np.array(Image.open(cache),dtype=np.float64)
assert height.shape==(H,W)
valid=np.isfinite(height)&(height>-12000)&(height<10000)
assert valid.mean()>.995, 'ETOPO export is missing data'
height[~valid]=0
client_grid=height.reshape(H//2,2,W//2,2).mean(axis=(1,3))
np.rint(client_grid).astype('<i2').tofile(OUT/'relief-grid.bin')
rng=np.random.default_rng(260913)
def sample(lon,lat):
 return map_coordinates(height,[(90-lat)/180*H-.5,(lon+180)/360*W-.5],order=1,mode='nearest')
def radius(h):
 return 1+np.where(h>=0,.078*np.maximum(h,0).__pow__(.72)/8500**.72,-.070*np.maximum(-h,0).__pow__(.65)/11000**.65)
def xyz(lon,lat,r):
 a,b=np.radians(lon),np.radians(lat)
 return np.column_stack([r*np.cos(b)*np.sin(a),r*np.sin(b),r*np.cos(b)*np.cos(a)])
stats={}
def save(name,positions,brightness,size):
 count=len(positions)
 values=np.column_stack([positions,brightness,size,rng.uniform(0,2*np.pi,count)]).astype('<f4')
 # A stable mixed order supports quality budgets without geographic holes.
 rng.shuffle(values)
 values.tofile(OUT/(name+'.bin'));stats[name]={'count':count,'stride':6,'bytes':values.nbytes}

# Equal-area candidates; relief changes point elevation and the density of contour bands.
n=210000
lon=rng.uniform(-180,180,n);lat=np.degrees(np.arcsin(rng.uniform(-.995,.995,n)));h=sample(lon,lat)
r=radius(h)
# Approximate slope/roughness from the real relief, sampled at neighboring cells.
rough=np.abs(sample(lon+.15,lat)-sample(lon-.15,lat))+np.abs(sample(lon,np.clip(lat+.15,-89,89))-sample(lon,np.clip(lat-.15,-89,89)))
rough=np.clip(rough/2200,0,1)
bands=np.exp(-(np.sin(h/750*np.pi)/.20)**2)
land=h>=0
save('relief-land',xyz(lon[land],lat[land],r[land]+.00005),(.21+.33*rough[land]+.22*bands[land])*rng.uniform(.7,1.2,land.sum()),rng.uniform(.7,1.55,land.sum()))
ocean=~land
shelf=np.exp(h[ocean]/1300)
save('relief-ocean',xyz(lon[ocean],lat[ocean],r[ocean]),(.025+.36*rough[ocean]+.26*bands[ocean]+.18*shelf)*rng.uniform(.7,1.1,ocean.sum()),rng.uniform(.65,1.4,ocean.sum()))
# Geographic formations continue inward as irregular volumes with quiet cavities.
n=160000
lon=rng.uniform(-180,180,n);lat=np.degrees(np.arcsin(rng.uniform(-1,1,n)));h=sample(lon,lat);surface=radius(h)
r=surface-rng.uniform(.012,.30,n)
p=xyz(lon,lat,r)
field=(np.sin(p[:,0]*18+np.sin(p[:,1]*7)*2)+np.sin(p[:,1]*21+np.sin(p[:,2]*6)*2)+np.sin(p[:,2]*17+np.sin(p[:,0]*8)*2))/3
keep=field>.16
p=p[keep];r=r[keep];h=h[keep];f=field[keep];body_positions=p.copy()
save('stellar-body',p,(.035+.14*f)*np.where(h>0,1.75,.65),rng.uniform(.8,2.7,len(p)))
# Sparse deeper matter makes the cutaway a body rather than another hollow shell.
n=28000
lon=rng.uniform(-180,180,n);lat=np.degrees(np.arcsin(rng.uniform(-1,1,n)));r=np.cbrt(rng.uniform(.015,.78**3,n))
p=xyz(lon,lat,r)
field=(np.sin(p[:,0]*18+np.sin(p[:,1]*7)*2)+np.sin(p[:,1]*21+np.sin(p[:,2]*6)*2)+np.sin(p[:,2]*17+np.sin(p[:,0]*8)*2))/3
keep=field>-.1;p=p[keep]
save('stellar-interior',p,.10+.24*np.maximum(0,field[keep]),rng.uniform(1.2,3,len(p)))
# Broad, very faint kernels share true 3D positions with the body, creating soft texture.
p=np.concatenate([body_positions[::12],p[::7]])
save('stellar-haze',p,rng.uniform(.035,.10,len(p)),rng.uniform(8,20,len(p)))
n=4800
lon=rng.uniform(-180,180,n);lat=np.degrees(np.arcsin(rng.uniform(-1,1,n)));h=sample(lon,lat)
r=radius(np.maximum(h,0))+rng.uniform(.006,.055,n)
save('stellar-halo',xyz(lon,lat,r),rng.uniform(.05,.2,n),rng.uniform(.8,2,n))
manifest={'schema':1,'source':'NOAA NCEI ETOPO 2022, Ice Surface, 60 arc-second source; bilinear globe-scale sample','sourceUrl':'https://www.ncei.noaa.gov/products/etopo-global-relief-model','sourceDOI':'https://doi.org/10.25921/fd45-gt74','exportEndpoint':URL,'exportParameters':PARAMS,'sourceSha256':hashlib.sha256(cache.read_bytes()).hexdigest(),'grid':{'width':W//2,'height':H//2,'type':'int16-le','units':'metres','bounds':[-180,-90,180,90],'pixelCenters':True,'rowOrder':'north-to-south','min':int(np.rint(client_grid).min()),'max':int(np.rint(client_grid).max())},'seed':260913,'layers':stats,'interpretation':'Terrain is exaggerated. Stellar body, interior and halo are artistic material, not Earth interior measurements or people.'}
(OUT/'relief-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'grid':[W,H],'elevationRange':[height.min(),height.max()],'layers':stats},indent=2))
