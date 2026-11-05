const $=id=>document.getElementById(id),frame=$('game'),wait=ms=>new Promise(r=>setTimeout(r,ms));
frame.src='../?touch=1&qa=1&testSession=accounts-ui-'+Date.now();$('size').onchange=()=>{[frame.width,frame.height]=$('size').value.split('x');};
for(let i=0;i<300;i++){if(frame.contentDocument?.querySelector('#account-title')?.textContent==='WELCOME TO HERO SHOWDOWN ROYALE')break;await wait(100);}$('result').textContent='Ready to test.';
$('run').onclick=async()=>{const lines=[],check=(condition,name)=>{lines.push(`${condition?'PASS':'FAIL'} ${name}`);$('result').textContent=lines.join('\n');if(!condition)throw Error(name);},d=frame.contentDocument,w=frame.contentWindow;const old=w.navigator.getGamepads;let polls=0;const pad={connected:true,mapping:'standard',index:0,id:'Synthetic account QA',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
 const press=async(i,ms=160)=>{w.focus();pad.buttons[i].pressed=true;const start=polls;await wait(ms);for(let n=0;n<40&&polls<start+2;n++)await wait(100);pad.buttons[i].pressed=false;const end=polls;await wait(180);for(let n=0;n<40&&polls<end+2;n++)await wait(100);};const find=text=>[...d.querySelectorAll('#account-menu button')].find(b=>b.textContent===text);
 $('run').disabled=true;
 try{
  check(d.querySelector('#roster').hidden,'My Heroes hidden before authentication');find('Create Account')?.click();await wait(100);
  check(!!d.querySelector('#player-confirm')&&!!d.querySelector('#player-email'),'Create Account has confirmation and optional email');check(!d.querySelector('#player-email').required,'Email is optional');
  find('Show Password').click();check(d.querySelector('#player-password').type==='text'&&d.querySelector('#player-confirm').type==='text','Show password toggles both fields');find('Hide Password').click();
  const panel=d.querySelector('#account-panel');check(panel.scrollWidth<=panel.clientWidth+2,'Account panel has no horizontal overflow');
  Object.defineProperty(w.navigator,'getGamepads',{configurable:true,value:()=>{polls++;return [pad];}});w.focus();await wait(200);
  let visited=new Set();for(let i=0;i<16;i++){await press(13,70);const active=d.activeElement;if(active)visited.add(active.id||active.textContent);check(active?.getClientRects().length>0,'Controller focus remains visible '+(i+1));}
  check(visited.size>=8&&polls>10,'Gamepad API reaches fields and buttons with focus scrolling');
  pad.axes=[.2,.1,0,0];const prior=d.activeElement;await wait(500);check(d.activeElement===prior,'Analog drift below dead zone does not navigate');pad.axes=[0,0,0,0];
  find('Back').click();await wait(200);d.querySelector('#account-menu button').focus();await press(0,650);check(d.querySelector('#account-title').textContent==='Create Account','Held confirm opens one screen only');
  await press(1);check(d.querySelector('#account-title').textContent==='WELCOME TO HERO SHOWDOWN ROYALE','B/Circle returns to welcome');
  find('Log In').click();check(!!d.querySelector('#player-username')&&!d.querySelector('#player-confirm'),'Log In uses username and password');find('Forgot Username or Password?').click();check(!!d.querySelector('#recover-email')&&!!d.querySelector('#code-value'),'Recovery offers verified email and recovery code');
  check(d.querySelector('#roster').hidden,'Recovery cannot bypass authentication');lines.push('COMPLETE: '+lines.length+' checks passed. No authentication request sent.');$('result').textContent=lines.join('\n');
 }catch(e){lines.push('STOP: '+e.message);$('result').textContent=lines.join('\n');}finally{Object.defineProperty(w.navigator,'getGamepads',{configurable:true,value:old});$('run').disabled=false;}
};
