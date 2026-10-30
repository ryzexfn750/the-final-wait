// Cloudflare Pages Function: report only the geographic time zone derived
// from the visitor's network IP. Never expose/store the IP or precise location.
export function onRequestGet({request}) {
  const timezone=typeof request.cf?.timezone==='string'?request.cf.timezone:null;
  const isoCountry=typeof request.cf?.country==='string'?request.cf.country.toUpperCase():null;
  // Only an ISO country code is returned; never return a network address.
  const country=/^[A-Z]{2}$/.test(isoCountry||'')?isoCountry:null;
  return new Response(JSON.stringify({timezone,country}),{
    status:200,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff'
    }
  });
}
