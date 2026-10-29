/**
 * Conservative illustrative daily Durable Objects Free allocation scenarios,
 * verified against Cloudflare docs on 2026-10-29.
 *
 * This is an analytical estimate, not a provider bill or capacity guarantee.
 * Run: node tools/hype-free-tier-estimator.mjs
 */
const DAILY_REQUESTS=100_000;
const WORKERS_FREE_DAILY_REQUESTS=100_000;
const DAILY_GBS=13_000;
const MEMORY_GB=128/1000; // Cloudflare pricing examples allocate 128 MB = 0.128 GB
const REACTION_COOLDOWN_SECONDS=20; // current room size >250
const WS_INCOMING_BILLING_RATIO=20;
const ALARM_INTERVAL_MINUTES=15;
const ceil=Math.ceil;
function scenario(users,hours,participation,rooms=1){
  const mins=hours*60;
  // Each established socket is bounded between 15 and 30 minutes by current
  // server policy, so report a central illustration and a conservative bound.
  const sessionsMid=users*ceil(mins/22.5);
  const sessionsWorst=users*ceil(mins/15);
  const reactionMessages=users*participation*(hours*3600/REACTION_COOLDOWN_SECONDS);
  const billedReactions=ceil(reactionMessages/WS_INCOMING_BILLING_RATIO);
  const alarmInvocations=rooms*ceil(mins/ALARM_INTERVAL_MINUTES);
  const requestsTypical=sessionsMid+billedReactions+alarmInvocations;
  const requestsWorst=sessionsWorst+billedReactions+alarmInvocations;
  const upperGBs=rooms*hours*3600*MEMORY_GB;
  return {
    users,hours,rooms,activeReactionFraction:participation,
    estimatedNewSocketsTypical:sessionsMid,
    estimatedNewSocketsWorst:sessionsWorst,
    estimatedIncomingReactions:Math.round(reactionMessages),
    billedReactionRequests:billedReactions,
    estimatedDailyDORequestsTypical:requestsTypical,
    estimatedDailyDORequestsWorst:requestsWorst,
    worstCaseShareOfFreeRequests:Math.round(requestsWorst/DAILY_REQUESTS*1000)/10+'%',
    // Pages Functions are Workers requests, in a separate shared quota.
    // Each rejoin uses POST /ticket and GET /live (2 Functions requests).
    estimatedPagesFunctionsTypical:sessionsMid*2,
    estimatedPagesFunctionsWorst:sessionsWorst*2,
    exceedsWorkersFreeLimitWorst:sessionsWorst*2>WORKERS_FREE_DAILY_REQUESTS,
    upperBoundActiveGBs:Math.round(upperGBs),
    exceedsRequestsFreeLimitWorst:requestsWorst>DAILY_REQUESTS,
    exceedsDurationFreeLimitIfAlwaysActive:upperGBs>DAILY_GBS
  };
}
console.log('THE FINAL WAIT: Cloudflare DO Free illustrative event budget');
console.log('Daily quotas: 100,000 DO requests; 13,000 DO GB-s; 100,000 Workers/Pages requests.');
console.log('Assumptions: all users remain inside LIVE HYPE for event duration;');
console.log('one WebSocket per user; connection renewals at 15–30 min;');
console.log('selected fraction of users sends 1 reaction every 20s;');
console.log('incoming messages discounted 20:1 for billable DO request counting.');
const scenarios=[
  scenario(1000,4,.05,1),
  scenario(5000,4,.05,1),
  scenario(5000,4,.10,1),
  scenario(5000,4,.05,8),
  scenario(5000,24,.05,1)
];
console.table(scenarios);
console.log([
  'LIMITATIONS:',
  'These estimates omit Pages Functions, Auth/Supabase, repeated login flows,',
  'rate-limit retries, deployment reconnect storms, and other account usage.',
  'Per-room active duration is a pessimistic continuous-active upper bound:',
  'hibernation usually reduces billable duration, but frequent events may prevent it.',
  'On Workers Free, over-quota operations FAIL; traffic is not silently free forever.',
  'Do not use a 1,000-client local benchmark as proof of 5,000 edge clients.',
  'Sources: https://developers.cloudflare.com/durable-objects/platform/pricing/',
  '         https://developers.cloudflare.com/durable-objects/best-practices/websockets/'
].join('\n'));
