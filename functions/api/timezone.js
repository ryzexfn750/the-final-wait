// Cloudflare Pages Function: report only the geographic time zone derived
// from the visitor's network IP. Never expose/store the IP or precise location.
export function onRequestGet({request}) {
  const timezone=typeof request.cf?.timezone==='string'?request.cf.timezone:null;
  return new Response(JSON.stringify({timezone}),{
    status:200,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff'
    }
  });
}
