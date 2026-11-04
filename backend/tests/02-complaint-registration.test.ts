/** Scenario 2 — Complaint registration through the chatbot: explicit
 *  confirmation gate, unique CCAI-YYYY-NNNNNN IDs, tracking token issued. */
import { describe, expect, it } from 'vitest';
import { ORIGIN, agent, chatUntilConfirmation, makeComplaint, newConversation } from './helpers';

describe('Scenario 2 — complaint registration with explicit confirmation', () => {
  it('collects information one question at a time and only registers after confirmation', async () => {
    const convId = await newConversation('en');
    const { last } = await chatUntilConfirmation(
      convId,
      'I want to register a complaint. Big pothole on 80 Feet Road, Koramangala, Bengaluru Urban district.',
    );

    expect(last.needsConfirmation).toBe(true);
    expect(last.confirmationSummary).toBeTruthy();
    expect(last.emergency.isEmergency).toBe(false);

    // NOT registered yet — status still ACTIVE with no complaint
    const before = await agent.get(`/api/chat/conversations/${convId}`).set('Origin', ORIGIN);
    expect(before.body.conversation.status).toBe('ACTIVE');
    expect(before.body.conversation.complaintId).toBeNull();

    // registration requires an explicit confirm:true
    const missingConfirm = await agent
      .post(`/api/chat/conversations/${convId}/confirm`)
      .set('Origin', ORIGIN)
      .send({});
    expect(missingConfirm.status).toBe(400);

    const confirmed = await agent
      .post(`/api/chat/conversations/${convId}/confirm`)
      .set('Origin', ORIGIN)
      .send({ confirm: true });
    expect(confirmed.status).toBe(201);

    const complaintId: string = confirmed.body.complaint.complaintId;
    expect(complaintId).toMatch(/^CCAI-\d{4}-\d{6}$/);
    expect(confirmed.body.trackingToken).toBeTruthy();
    expect(['SUBMITTED', 'ASSIGNED']).toContain(confirmed.body.complaint.status);
    expect(confirmed.body.complaint.departmentName).toBeTruthy();
    expect(confirmed.body.complaint.routingExplanation).toContain('AI classified');

    // double registration is rejected
    const again = await agent
      .post(`/api/chat/conversations/${convId}/confirm`)
      .set('Origin', ORIGIN)
      .send({ confirm: true });
    expect(again.status).toBe(409);

    // the tracking token works immediately
    const tracked = await agent
      .post('/api/track')
      .set('Origin', ORIGIN)
      .send({ complaintId, trackingToken: confirmed.body.trackingToken });
    expect(tracked.status).toBe(200);
    expect(tracked.body.complaint.complaintId).toBe(complaintId);
    expect(tracked.body.complaint.history.length).toBeGreaterThanOrEqual(1);
  }, 60_000);

  it('issues unique sequential complaint IDs', async () => {
    const a = await makeComplaint({ text: 'first unique id test' });
    const b = await makeComplaint({ text: 'second unique id test' });
    expect(a.complaint.complaintId).not.toBe(b.complaint.complaintId);
    expect(a.complaint.complaintId).toMatch(/^CCAI-\d{4}-\d{6}$/);
    const seqA = Number(a.complaint.complaintId.split('-')[2]);
    const seqB = Number(b.complaint.complaintId.split('-')[2]);
    expect(seqB).toBeGreaterThan(seqA);
  });
});
