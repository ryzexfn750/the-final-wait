import {mountBoardingPass,attachBoardingPassActions} from './boarding-pass.js?v=3';
(async()=>{
 const holder=document.getElementById('ticketPublicHolder');
 const status=document.getElementById('ticketPublicStatus');
 const verified=document.getElementById('ticketVerified');
 const uuid=(location.pathname.split('/').filter(Boolean).at(-1)||'').trim();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)){
  holder.replaceChildren();
  status.textContent='Ticket not found or no longer active.';
  return;
 }
 try{
  const response=await fetch('/api/community/boarding-pass-public?id='+encodeURIComponent(uuid),{
    method:'GET',cache:'no-store'
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||payload.verified!==true||!payload.ticket)
    throw Error(response.status===404?'Ticket not found or no longer active.':
      payload.error||'Verification temporarily unavailable');
  mountBoardingPass(holder,payload.ticket);
  attachBoardingPassActions(document.getElementById('ticketPublicActions'),payload.ticket);
  verified.hidden=false;
  status.textContent='';
 }catch(error){
  holder.replaceChildren();
  verified.hidden=true;
  status.textContent=error.message;
 }
})().catch(()=>{document.getElementById('ticketPublicStatus').textContent='Verification unavailable.'});
