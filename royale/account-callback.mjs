import {createClient} from './vendor/auth-provider.mjs';
import {CLOUD_CONFIG} from './cloud-config.mjs';
import {callbackRequest,PasswordRecovery} from './auth-callback-state.mjs';
import {MenuGamepad} from './menu-gamepad.mjs';
const request=callbackRequest(location.href);
// Strip bearer credentials before rendering or initiating any other requests.
history.replaceState(null,'',location.pathname);
const auth=createClient(CLOUD_CONFIG.url,CLOUD_CONFIG.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'royale.callback.memory-only'}}).auth;
const recovery=new PasswordRecovery(auth),$=id=>document.getElementById(id);
$('show-password').onclick=()=>{const show=$('password').type==='password';for(const id of ['password','confirm'])$(id).type=show?'text':'password';$('show-password').textContent=show?'Hide passwords':'Show passwords';$('show-password').setAttribute('aria-pressed',String(show));};
$('reset').onsubmit=async event=>{event.preventDefault();$('submit').disabled=true;try{const result=await recovery.reset($('password').value,$('confirm').value);$('reset').hidden=true;$('status').textContent=result.sessionsRevoked?'Password changed. Sign in again with your new password.':'Password changed, but other sessions could not be signed out. Review active sessions before continuing.';}catch(error){$('status').textContent=error.message;}finally{$('password').value='';$('confirm').value='';$('submit').disabled=false;}};
try{const type=await recovery.accept(request);if(type==='recovery'){$('reset').hidden=false;$('status').textContent='Your reset link is valid. Choose your new password.';$('password').focus();}else{$('status').textContent='Email verified. Return to the game and sign in.';await auth.signOut({scope:'local'});}}catch(error){$('status').textContent=error.message;}
const controller=new MenuGamepad({active:()=>true,back:()=>document.querySelector('a').focus()});function frame(t){controller.poll(t);requestAnimationFrame(frame);}requestAnimationFrame(frame);
