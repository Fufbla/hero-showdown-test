import os,json,threading,http.server,functools
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
url=os.environ.get('CHIBI_TEST_URL')
if not url:
 server=http.server.ThreadingHTTPServer(('127.0.0.1',8877),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 url='http://127.0.0.1:8877/?qa=1'
results=[]
def check(name,value,detail=None):
 results.append({'test':name,'pass':bool(value),'detail':detail});print(name,'PASS' if value else 'FAIL',detail or '')
 assert value,name
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1100,'height':720})
 errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.goto(url,wait_until='networkidle');page.wait_for_function('window.__chibiTest?.state.ready')
 check('six full resolution atlases',len(page.evaluate('Object.values(__chibiTest.assets).filter(a=>a.width===3600&&a.height===724)'))==6)
 x=page.evaluate('__chibiTest.state.x');page.wait_for_timeout(400)
 check('stationary idle',page.evaluate('__chibiTest.state.x')==x)
 page.keyboard.down('ArrowRight');page.wait_for_timeout(550);s=page.evaluate('__chibiTest.state');page.keyboard.up('ArrowRight')
 check('running right',s['x']>x+50 and s['action']=='run' and s['facing']=='right')
 page.wait_for_timeout(250);check('stops at idle',page.evaluate('__chibiTest.state.action')=='idle')
 page.keyboard.down('ArrowLeft');page.wait_for_timeout(250);s=page.evaluate('__chibiTest.state');page.keyboard.up('ArrowLeft');check('running left',s['facing']=='left' and s['action']=='run')
 page.wait_for_timeout(250);page.keyboard.press('Space');page.wait_for_timeout(120);check('jump',page.evaluate('__chibiTest.state.jumps')==1)
 page.keyboard.press('Space');page.wait_for_timeout(80);check('double jump',page.evaluate('__chibiTest.state.jumps')==2)
 page.keyboard.press('Space');page.wait_for_timeout(30);check('third jump blocked',page.evaluate('__chibiTest.state.jumps')==2)
 page.wait_for_timeout(1100);check('landing',page.evaluate('__chibiTest.state.y')==0)
 page.keyboard.press('j');page.wait_for_timeout(80);check('punch',page.evaluate('__chibiTest.state.action')=='punch');page.wait_for_timeout(450)
 page.keyboard.press('k');page.wait_for_timeout(80);check('kick',page.evaluate('__chibiTest.state.action')=='kick');page.wait_for_timeout(550)
 page.locator('#pause').click();t=page.evaluate('__chibiTest.state.ticks');page.wait_for_timeout(200);check('pause',page.evaluate('__chibiTest.state.ticks')==t);page.locator('#pause').click()
 page.locator('#review-toggle').click()
 for action in ['idle','run','jump','doubleJump','punch','kick']:
  page.select_option('#review-action',action)
  for direction in ['left','right']:
   page.select_option('#review-direction',direction)
   for frame in range(12):
    page.locator('#pose').evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',str(frame))
    page.wait_for_function('(f)=>__chibiTest.state.pose===f',arg=frame)
 check('144 directional frames',True);page.locator('#review-toggle').click()
 page.wait_for_timeout(1100);check('active render loop',page.evaluate('__chibiTest.state.measuredFPS')>20,page.evaluate('__chibiTest.state.measuredFPS'))
 check('no JS errors',not errors,errors);check('no cloud requests',not any('supabase' in u for u in requests));check('no save writes',page.evaluate('localStorage.length')==0)
 page.screenshot(path='chibi-desktop-verified.png')
 for name,size in [('portrait',{'width':390,'height':844}),('landscape',{'width':844,'height':390})]:
  pg=browser.new_page(viewport=size,is_mobile=True,has_touch=True)
  pg.goto(url,wait_until='networkidle');pg.wait_for_function('__chibiTest.state.ready')
  check(name+' fits',pg.evaluate('document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1'))
  pg.locator('#jump').tap();pg.wait_for_timeout(80);check(name+' touch jump',pg.evaluate('__chibiTest.state.jumps')==1)
  pg.locator('#jump').tap();pg.wait_for_timeout(80);check(name+' touch double jump',pg.evaluate('__chibiTest.state.jumps')==2)
  pg.wait_for_timeout(1000);pg.screenshot(path='chibi-'+name+'-verified.png');pg.close()
 browser.close()
Path('chibi-test-results.json').write_text(json.dumps(results,indent=2))
