/** Scenario 6 — Secure tracking: correct ID + token works; wrong token and
 *  unknown IDs return an identical 404 (no enumeration of complaint IDs). */
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { ORIGIN, app, bearer, getUser } from './helpers';

describe('Scenario 6 — privacy-safe complaint tracking', () => {
  it('tracks with the correct complaint ID + tracking token', async () => {
    const res = await request(app)
      .post('/api/track')
      .set('Origin', ORIGIN)
      .send({ complaintId: 'CCAI-2026-000001', trackingToken: 'demo-track-01' });

    expect(res.status).toBe(200);
    expect(res.body.complaint.complaintId).toBe('CCAI-2026-000001');
    expect(res.body.complaint.status).toBeTruthy();
    expect(Array.isArray(res.body.complaint.history)).toBe(true);
    expect(res.body.complaint.history.length).toBeGreaterThanOrEqual(1);
    // never leak internal identifiers
    expect(JSON.stringify(res.body)).not.toMatch(/trackingHash|passwordHash|citizenId/);
  });

  it('returns an identical 404 for a wrong token and for an unknown ID', async () => {
    const wrongToken = await request(app)
      .post('/api/track')
      .set('Origin', ORIGIN)
      .send({ complaintId: 'CCAI-2026-000001', trackingToken: 'definitely-the-wrong-token-value' });

    const unknownId = await request(app)
      .post('/api/track')
      .set('Origin', ORIGIN)
      .send({ complaintId: 'CCAI-2026-999999', trackingToken: 'definitely-the-wrong-token-value' });

    expect(wrongToken.status).toBe(404);
    expect(unknownId.status).toBe(404);
    // byte-identical error envelope → attackers cannot distinguish
    // "complaint exists" from "complaint does not exist"
    expect(wrongToken.body).toEqual(unknownId.body);
    expect(wrongToken.body.error.message).toBe('No complaint matches that ID and tracking token');
  });

  it('rejects malformed complaint IDs with validation error (not a probe result)', async () => {
    const res = await request(app)
      .post('/api/track')
      .set('Origin', ORIGIN)
      .send({ complaintId: 'nope', trackingToken: 'x'.repeat(20) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lets the owning citizen track without a token (via their session)', async () => {
    const citizen = await getUser('citizen1@civicconnect.demo');
    const token = bearer(citizen.id, 'CITIZEN');

    const owner = await request(app)
      .post('/api/track')
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ complaintId: 'CCAI-2026-000001' });
    expect(owner.status).toBe(200);

    // a different citizen without the token gets the generic 404
    const other = await getUser('citizen2@civicconnect.demo');
    const otherToken = bearer(other.id, 'CITIZEN');
    const denied = await request(app)
      .post('/api/track')
      .set('Origin', ORIGIN)
      .set('Authorization', otherToken)
      .send({ complaintId: 'CCAI-2026-000001' });
    expect(denied.status).toBe(404);
    expect(denied.body.error.message).toBe(
      'No complaint matches that ID and tracking token',
    );
  });

  it('enforces a rate limit on tracking attempts', async () => {
    // hit the limiter with 31 requests in the same minute
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const res = await request(app)
        .post('/api/track')
        .set('Origin', ORIGIN)
        .send({ complaintId: 'CCAI-2026-000001', trackingToken: 'demo-track-01' });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  }, 30_000);
});
