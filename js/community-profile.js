import {publicTicketUrl,EDITIONS} from './boarding-pass.js?v=6';
/* Profile-only account actions. Confirmation dialogs are styled in-page,
   without browser-native confirmation popups or newsletter/CAPTCHA widgets. */
const $=selector=>document.querySelector(selector);
function feedback(message,error=false){
 const element=$('#profileFeedback');
 element.textContent=message;
 element.classList.toggle('error',error);
}
async function initProfile(){
 const dialog=$('#profileConfirm');
 const heading=$('#profileConfirmTitle');
 const description=$('#profileConfirmDescription');
 const accept=$('#profileConfirmAccept');
 const cancel=$('#profileConfirmCancel');
 const modalStatus=$('#profileConfirmStatus');
 let client=null,profile=null,action=null,busy=false;
 function closeDialog(){
   if(busy)return;
   if(dialog.open)dialog.close();
   action=null;
 }
 function openDialog(mode){
   if(busy||!profile)return;
   action=mode;
   modalStatus.textContent='';
   heading.textContent=mode==='delete'?'DELETE YOUR ACCOUNT?':'SIGN OUT?';
   description.textContent=mode==='delete'?
     'This permanently deletes your The Final Wait community account and nickname. This action cannot be undone.':
     'You will need to sign in with Google again to enter the site.';
   accept.textContent=mode==='delete'?'DELETE PERMANENTLY':'YES, SIGN OUT';
   accept.classList.toggle('tfw-profile-delete-confirm',mode==='delete');
   dialog.showModal();
   cancel.focus();
 }
 const goHome=()=>{
   const target=new URL('index.html',location.href).href;
   try{
     if(window.top!==window){
       window.top.dispatchEvent(new Event('tfw:community-signout'));
       window.top.location.assign(target);
     }else location.assign(target);
   }catch{location.assign(target)}
 };
 dialog.addEventListener('cancel',event=>{
   if(busy)event.preventDefault();
   else action=null;
 });
 cancel.addEventListener('click',closeDialog);
 $('#profileLogout').addEventListener('click',()=>openDialog('logout'));
 $('#profileDelete').addEventListener('click',()=>openDialog('delete'));
 accept.addEventListener('click',async()=>{
   if(busy||!action||!client)return;
   busy=true;accept.disabled=true;cancel.disabled=true;
   const mode=action;
   modalStatus.textContent=mode==='delete'?'Deleting your account…':'Signing out…';
   try{
     if(mode==='delete'){
       const session=(await client.auth.getSession()).data?.session;
       if(!session?.access_token)throw Error('Session expired; sign in again');
       const response=await fetch('/api/community/profile',{
         method:'DELETE',cache:'no-store',
         headers:{Authorization:'Bearer '+session.access_token}
       });
       let result={};try{result=await response.json()}catch{}
       if(!response.ok)throw Error(result.error||'Account deletion failed');
     }
     const {error}=await client.auth.signOut();
     if(error&&mode!=='delete')throw error;
     if(dialog.open)dialog.close();
     goHome();
   }catch(error){
     modalStatus.textContent=error.message;
     feedback(error.message,true);
   }finally{
     busy=false;accept.disabled=false;cancel.disabled=false;
   }
 });
 try{
   const response=await fetch('/api/community/config',{cache:'no-store'});
   if(!response.ok)throw Error('Account service unavailable');
   const config=await response.json();
   if(!config.enabled)throw Error('Account service is not active here');
   const lib=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
   client=lib.createClient(config.supabaseUrl,config.supabaseAnonKey,{
     auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}
   });
   const session=(await client.auth.getSession()).data?.session;
   if(!session?.access_token)throw Error('Sign in with Google to view your profile');
   const result=await fetch('/api/community/profile',{
     method:'GET',cache:'no-store',
     headers:{Authorization:'Bearer '+session.access_token}
   });
   let data={};try{data=await result.json()}catch{}
   if(!result.ok)throw Error(data.error||'Could not load profile');
   if(!data.profile?.nickname||data.profile.terms_version!==config.termsVersion)
     throw Error('Complete your account registration first');
   profile=data.profile;
   $('#profileNickname').textContent=profile.nickname;
   if(profile.created_at){
     const joined=new Date(profile.created_at);
     if(Number.isFinite(joined.getTime())){
       $('#profileCreatedAt').dateTime=joined.toISOString();
       $('#profileCreatedAt').textContent=new Intl.DateTimeFormat(window.__tfwPreferredSiteLanguage?.()||navigator.language||'en',{
         day:'numeric',month:'long',year:'numeric',timeZone:'UTC'
       }).format(joined);
     }
   }
   window.addEventListener('tfw:site-language-changed',()=>{
     if(!profile?.created_at)return;
     const joined=new Date(profile.created_at);
     if(!Number.isFinite(joined.getTime()))return;
     $('#profileCreatedAt').textContent=new Intl.DateTimeFormat(
       window.__tfwPreferredSiteLanguage?.()||navigator.language||'en',
       {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(joined);
   },{once:false});
   // Ticket errors must not disable the user's account/profile actions.
   try{
     const passResponse=await fetch('/api/community/boarding-pass',{
       method:'GET',cache:'no-store',
       headers:{Authorization:'Bearer '+session.access_token}
     });
     const passData=await passResponse.json().catch(()=>({}));
     if(!passResponse.ok)throw Error(passData.error||'Boarding pass unavailable');
     const pass=passData.ticket;
     const open=$('#profileTicketLink');
     open.href=publicTicketUrl(pass);
     open.removeAttribute('aria-disabled');open.removeAttribute('tabindex');
     $('#profileTicketCode').textContent=pass.ticketCode+' · '+EDITIONS[pass.edition].name;
     $('#profileTicketFeedback').textContent='';
   }catch(error){
     $('#profileTicketCode').textContent='BOARDING PASS UNAVAILABLE';
     $('#profileTicketLink').setAttribute('aria-disabled','true');
     $('#profileTicketFeedback').textContent=error.message;
   }
 }catch(error){feedback(error.message,true)}
}
window.__tfwContentReady=true;
document.dispatchEvent(new Event('tfw:content-ready'));
void initProfile().catch(error=>feedback(error.message,true));
