import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GET as health } from '../app/api/health/route';
import { ConfigurationList } from '../app/settings/ConnectionSettings';
import { parseReadiness } from '../app/settings/provider-readiness';
import { demoStatusLabel } from '../app/settings/provider-status';
import { OBSERVATION_MAX_AGE_MS } from '../src/lib/config/observation-contract';

test('health presentation distinguishes observed failures, expires success and keeps voice optional', async () => {
  const raw = await health().json();
  const now = Date.now();
  const states = [
    ['succeeded', 'Last request succeeded'],
    ['authentication_failed', 'Sign-in rejected'],
    ['unavailable', 'Service unavailable'],
    ['rate_limited', 'Usage limit reached'],
    ['failed', 'Last request failed'],
  ];
  for (const [status, label] of states) {
    const value = parseReadiness({ ...raw, services: {
      ...raw.services,
      ai: { ...raw.services.ai, configured: true, status: 'unchecked', observation: {
        status, observedAt: new Date(now).toISOString(), operation: 'suspect', stale: false,
      } },
      voice: { ...raw.services.voice, configured: false, status: 'missing', observation: null },
      storage: { ...raw.services.storage, configured: true, status: 'unchecked' },
    } });
    const markup = renderToStaticMarkup(<ConfigurationList value={value} />);
    assert.ok(markup.includes(label));
    assert.match(markup, /<time dateTime=/);
    assert.match(markup, /not a guarantee/);
    if (status === 'succeeded') {
      assert.equal(demoStatusLabel(value, now), 'AI responded recently');
      assert.match(demoStatusLabel(value, now + OBSERVATION_MAX_AGE_MS), /unchecked/);
      value.services.storage.configured = false;
      assert.equal(demoStatusLabel(value, now), 'Game storage setup needed');
    }
    assert.throws(() => parseReadiness({ ...value, services: { ...value.services,
      ai: { ...value.services.ai, observation: { status: 'succeeded', observedAt: 'invalid', operation: 'suspect', stale: false } },
    } }));
  }
});
