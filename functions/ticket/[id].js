// Public, unguessable ticket URL. Dynamic route serves the same static shell.
// Verification is always performed by the server using a live database lookup.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function onRequestGet({request,env,params}){
  if(!UUID.test(params.id||''))return new Response('Ticket not found',{status:404,
    headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
  const shell=await env.ASSETS.fetch(new Request(new URL('/ticket.html',request.url)));
  const headers=new Headers(shell.headers);
  headers.set('cache-control','no-store');
  headers.set('x-robots-tag','noindex');
  return new Response(shell.body,{status:shell.status,headers});
}
