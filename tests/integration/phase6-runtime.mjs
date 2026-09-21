import { createHash, randomBytes, randomUUID } from 'node:crypto';

const base = process.env.PROSPECTAI_INTEGRATION_URL || 'http://localhost:3000/api/v1';
const results = {};
const integrationIp = '198.51.100.' + (Math.floor(Math.random() * 200) + 1);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const jsonRequest = async (path, options = {}) => {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': integrationIp,
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
};
const guestToken = randomBytes(32).toString('base64url');
const guestHeaders = { Authorization: 'Guest ' + guestToken };
const session = await jsonRequest('/guest-sessions', { method: 'POST', headers: guestHeaders });
assert(session.response.status === 201, 'Guest session creation failed.');
const guestSessionId = session.body.data.sessionId;
assert(session.body.data.trialRemaining === 3, 'Fresh guest allowance was not 3.');
results.freshGuest = 'PASS';

const jobs = [];
const jobKeys = [];
for (let index = 1; index <= 3; index += 1) {
  const jobKey = 'phase6-' + randomUUID();
  const submission = await jsonRequest('/guest-analyses', {
    method: 'POST',
    headers: { ...guestHeaders, 'Idempotency-Key': jobKey },
    body: JSON.stringify({ url: 'https://example.com/' }),
  });
  assert(submission.response.status === 202, 'Guest analysis ' + index + ' was not queued.');
  assert(
    submission.body.data.entitlement.trialRemaining === 3 - index,
    'Guest allowance mismatch.',
  );
  jobs.push(submission.body.data);
  jobKeys.push(jobKey);
}
results.threeReservations = 'PASS';

const duplicate = await jsonRequest('/guest-analyses', {
  method: 'POST',
  headers: { ...guestHeaders, 'Idempotency-Key': jobKeys[0] },
  body: JSON.stringify({ url: 'https://example.com/' }),
});
assert(duplicate.response.status === 202, 'Idempotent guest replay was rejected.');
assert(duplicate.body.data.jobId === jobs[0].jobId, 'Idempotent replay created a different job.');
results.analysisIdempotency = 'PASS';

const fourth = await jsonRequest('/guest-analyses', {
  method: 'POST',
  headers: { ...guestHeaders, 'Idempotency-Key': 'phase6-fourth-' + randomUUID() },
  body: JSON.stringify({ url: 'https://example.com/' }),
});
assert(fourth.response.status === 429, 'Fourth guest analysis was not rejected.');
assert(fourth.body.error.code === 'GUEST_TRIAL_EXHAUSTED', 'Fourth attempt returned wrong error.');
assert(typeof fourth.body.error.requestId === 'string', 'Error response omitted requestId.');
results.fourthRejected = 'PASS';

for (const job of jobs) {
  let terminal = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const poll = await jsonRequest('/analysis-jobs/' + encodeURIComponent(job.jobId), {
      headers: guestHeaders,
    });
    assert(poll.response.status === 200, 'Guest polling failed.');
    if (['completed', 'partial', 'failed'].includes(poll.body.data.status)) {
      terminal = poll.body.data.status;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert(
    terminal === 'partial' || terminal === 'completed',
    'Guest job did not complete successfully.',
  );
}
results.workerPipeline = 'PASS';

const limited = await jsonRequest('/guest-analyses/' + encodeURIComponent(jobs[2].analysisId), {
  headers: guestHeaders,
});
assert(limited.response.status === 200, 'Guest result endpoint failed.');
assert(Array.isArray(limited.body.data.keySignals), 'Guest result omitted key signals.');
assert(!('findings' in limited.body.data), 'Guest result exposed full findings.');
results.guestEntitlementTransform = 'PASS';

const emailA = 'phase6-a-' + randomUUID() + '@example.test';
const passwordA = 'P6!' + randomBytes(18).toString('base64url');
const signupA = await jsonRequest('/auth/signup', {
  method: 'POST',
  body: JSON.stringify({ email: emailA, password: passwordA }),
});
assert(signupA.response.status === 201, 'Account A signup failed.');
const cookieA = signupA.response.headers.get('set-cookie')?.split(';')[0];
assert(cookieA, 'Account A session cookie missing.');
results.signup = 'PASS';

const conversion = await jsonRequest('/guest-sessions/convert', {
  method: 'POST',
  headers: { Cookie: cookieA, 'X-Guest-Token': guestToken },
  body: JSON.stringify({ guestSessionId }),
});
assert(conversion.response.status === 200, 'Guest conversion failed.');
assert(conversion.body.data.preservedAnalysisId, 'Converted result was not preserved.');
const convertedId = conversion.body.data.preservedAnalysisId;
const replayConversion = await jsonRequest('/guest-sessions/convert', {
  method: 'POST',
  headers: { Cookie: cookieA, 'X-Guest-Token': guestToken },
  body: JSON.stringify({ guestSessionId }),
});
assert(replayConversion.response.status === 200, 'Guest conversion was not idempotent.');
assert(
  replayConversion.body.data.alreadyConverted === true,
  'Conversion replay was not identified.',
);
results.guestConversion = 'PASS';

const convertedDetail = await jsonRequest('/analyses/' + encodeURIComponent(convertedId), {
  headers: { Cookie: cookieA },
});
assert(convertedDetail.response.status === 200, 'Converted analysis was not available to account.');
assert(
  Array.isArray(convertedDetail.body.data.findings),
  'Registered result omitted full findings.',
);
const opportunityId = convertedDetail.body.data.opportunities[0]?.id;
assert(opportunityId, 'Converted analysis has no opportunity.');
results.convertedResultAccess = 'PASS';

const leadCreate = await jsonRequest('/leads', {
  method: 'POST',
  headers: { Cookie: cookieA },
  body: JSON.stringify({ analysisId: convertedId, name: 'Phase 6 integration lead' }),
});
assert(leadCreate.response.status === 201, 'Lead creation failed.');
const leadId = leadCreate.body.data.id;
const leadRead = await jsonRequest('/leads/' + encodeURIComponent(leadId), {
  headers: { Cookie: cookieA },
});
assert(leadRead.response.status === 200, 'Lead retrieval failed.');
results.leads = 'PASS';

const pitch = await jsonRequest('/pitches', {
  method: 'POST',
  headers: { Cookie: cookieA },
  body: JSON.stringify({
    analysisId: convertedId,
    leadId,
    opportunityId,
    format: 'cold_email',
  }),
});
assert(
  pitch.response.status === 503 && pitch.body.error.code === 'AI_UNAVAILABLE',
  'Unconfigured AI did not return controlled AI_UNAVAILABLE.',
);
results.pitchProviderBoundary = 'PASS';

const emailB = 'phase6-b-' + randomUUID() + '@example.test';
const passwordB = 'P6!' + randomBytes(18).toString('base64url');
const signupB = await jsonRequest('/auth/signup', {
  method: 'POST',
  body: JSON.stringify({ email: emailB, password: passwordB }),
});
assert(signupB.response.status === 201, 'Account B signup failed.');
const cookieB = signupB.response.headers.get('set-cookie')?.split(';')[0];
const crossTenantLead = await jsonRequest('/leads/' + encodeURIComponent(leadId), {
  headers: { Cookie: cookieB },
});
const crossTenantAnalysis = await jsonRequest('/analyses/' + encodeURIComponent(convertedId), {
  headers: { Cookie: cookieB },
});
assert(crossTenantLead.response.status === 404, 'Cross-tenant lead read was not blocked.');
assert(crossTenantAnalysis.response.status === 404, 'Cross-tenant analysis read was not blocked.');
results.tenantIsolation = 'PASS';

const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const authRequest = await jsonRequest('/extension/authorization-requests', {
  method: 'POST',
  body: JSON.stringify({
    codeChallenge: challenge,
    redirectUri: 'https://abcdefghijklmnop.chromiumapp.org/',
    extensionVersion: '0.1.0',
    deviceName: 'Phase 6 integration',
  }),
});
assert(authRequest.response.status === 201, 'Extension authorization request failed.');
const requestId = authRequest.body.data.id;
const approval = await jsonRequest(
  '/extension/authorization-requests/' + encodeURIComponent(requestId) + '/approve',
  { method: 'POST', headers: { Cookie: cookieA } },
);
assert(approval.response.status === 200, 'Extension authorization approval failed.');
const code = new URL(approval.body.data.next).searchParams.get('code');
assert(code, 'One-time extension code missing.');
const exchange = await jsonRequest(
  '/extension/authorization-requests/' + encodeURIComponent(requestId) + '/exchange',
  { method: 'POST', body: JSON.stringify({ code, codeVerifier: verifier }) },
);
assert(exchange.response.status === 200, 'Extension PKCE exchange failed.');
const accessToken = exchange.body.data.accessToken;
const replay = await jsonRequest(
  '/extension/authorization-requests/' + encodeURIComponent(requestId) + '/exchange',
  { method: 'POST', body: JSON.stringify({ code, codeVerifier: verifier }) },
);
assert(
  replay.response.status === 401 || replay.response.status === 409,
  'Extension authorization code replay was accepted.',
);
const extensionState = await jsonRequest('/extension/session', {
  headers: { Authorization: 'Bearer ' + accessToken },
});
assert(extensionState.response.status === 200, 'Extension session was not issued.');
const disconnect = await jsonRequest('/extension/session', {
  method: 'DELETE',
  headers: { Authorization: 'Bearer ' + accessToken },
});
assert(disconnect.response.status === 200, 'Extension disconnect failed.');
const revoked = await jsonRequest('/extension/session', {
  headers: { Authorization: 'Bearer ' + accessToken },
});
assert(
  revoked.response.status === 401 && revoked.body.error.code === 'SESSION_REVOKED',
  'Revoked extension session retained access.',
);
results.extensionPkceAndRevocation = 'PASS';

const logout = await jsonRequest('/logout', { method: 'POST', headers: { Cookie: cookieA } });
assert(logout.response.status === 200, 'Logout failed.');
const afterLogout = await jsonRequest('/me', { headers: { Cookie: cookieA } });
assert(afterLogout.response.status === 401, 'Revoked web session retained access.');
results.logoutRevocation = 'PASS';

console.log(JSON.stringify(results, null, 2));
