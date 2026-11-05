// Callback sessions are isolated from gameplay: no hero storage or persistent auth keys.
export function callbackRequest(url){
 const u=new URL(url),h=new URLSearchParams(u.hash.slice(1));
 if(h.has('error')||u.searchParams.has('error'))return {error:'This link is invalid or expired. Request a new link.'};
 const type=h.get('type');
 if(!['recovery','signup','email_change'].includes(type))return {error:'Open the latest verification or password-reset email link.'};
 const access_token=h.get('access_token'),refresh_token=h.get('refresh_token');
 if(!access_token||!refresh_token)return {error:'The link is incomplete. Request a new link.'};
 return {type,tokens:{access_token,refresh_token}};
}
export class PasswordRecovery{
 constructor(auth){this.auth=auth;this.ready=false;this.busy=false;this.done=false;}
 async accept(request){
  this.ready=false;if(request.error)throw Error(request.error);
  const result=await this.auth.setSession(request.tokens);if(result.error)throw Error('This link is invalid or expired. Request a new link.');
  const verified=await this.auth.getUser();if(verified.error||!verified.data?.user)throw Error('The account could not be verified. Request a new link.');
  this.ready=request.type==='recovery';return request.type;
 }
 async reset(password,confirm){
  if(!this.ready||this.done)throw Error('Open a valid password-reset link first.');
  if(this.busy)throw Error('Password change is already in progress.');
  if(password!==confirm)throw Error('Passwords do not match.');
  if(typeof password!=='string'||password.length<15||new TextEncoder().encode(password).length>72||/^\d+$/.test(password)||new Set(password).size<6)throw Error('Use a varied passphrase of at least 15 characters and at most 72 UTF-8 bytes.');
  this.busy=true;
  try{
   const {error}=await this.auth.updateUser({password});if(error)throw Error('Password change failed. Request a new link if this one has expired.');
   this.done=true;this.ready=false;
   const logout=await this.auth.signOut({scope:'global'});
   return {changed:true,sessionsRevoked:!logout.error};
  }finally{this.busy=false;}
 }
}
