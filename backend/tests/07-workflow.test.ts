/** Scenario 7 — Complaint workflow: server-enforced status transitions,
 *  resolution notes, public updates, duplicate linking without deletion. */
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/config/prisma';
import { ORIGIN, app, bearer, getDept, getUser, makeComplaint } from './helpers';

describe('Scenario 7 — status workflow and complaint updates', () => {
  it('allows valid transitions and rejects invalid ones', async () => {
    const admin = await getUser('admin@civicconnect.demo');
    const token = bearer(admin.id, 'SUPER_ADMIN');
    const bbmp = await getDept('BBMP');
    const { complaint } = await makeComplaint({ departmentId: bbmp.id, status: 'SUBMITTED' });

    // SUBMITTED → ACKNOWLEDGED ✓
    const ok = await request(app)
      .patch(`/api/complaints/${complaint.complaintId}/status`)
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ status: 'ACKNOWLEDGED', note: 'Acknowledged by department' });
    expect(ok.status).toBe(200);

    // ACKNOWLEDGED → SUBMITTED ✗ (backwards)
    const bad = await request(app)
      .patch(`/api/complaints/${complaint.complaintId}/status`)
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ status: 'SUBMITTED' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toContain('Invalid status transition');

    // RESOLVED requires a note
    const noNote = await request(app)
      .patch(`/api/complaints/${complaint.complaintId}/status`)
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ status: 'IN_PROGRESS' });
    expect(noNote.status).toBe(200);
    const resolvedNoNote = await request(app)
      .patch(`/api/complaints/${complaint.complaintId}/status`)
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ status: 'RESOLVED' });
    expect(resolvedNoNote.status).toBe(400);
    expect(resolvedNoNote.body.error.message).toContain('resolution note');

    // RESOLVED with a note ✓ and resolvedAt is set
    const resolved = await request(app)
      .patch(`/api/complaints/${complaint.complaintId}/status`)
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ status: 'RESOLVED', note: 'Pothole filled and verified' });
    expect(resolved.status).toBe(200);
    const row = await prisma.complaint.findUniqueOrThrow({
      where: { id: complaint.id },
    });
    expect(row.status).toBe('RESOLVED');
    expect(row.resolvedAt).toBeInstanceOf(Date);

    // terminal states stay terminal (except RESOLVED → ESCALATED)
    const terminal = await request(app)
      .patch(`/api/complaints/${complaint.complaintId}/status`)
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ status: 'SUBMITTED' });
    expect(terminal.status).toBe(400);
  });

  it('INFO_REQUEST update moves the complaint to AWAITING_CITIZEN_INFO and is public', async () => {
    const admin = await getUser('admin@civicconnect.demo');
    const token = bearer(admin.id, 'SUPER_ADMIN');
    const bbmp = await getDept('BBMP');
    const { complaint, trackingToken } = await makeComplaint({
      departmentId: bbmp.id,
      status: 'ASSIGNED',
    });

    const res = await request(app)
      .post(`/api/complaints/${complaint.complaintId}/updates`)
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ kind: 'INFO_REQUEST', note: 'Please share a photo of the spot' });
    expect(res.status).toBe(201);

    const row = await prisma.complaint.findUniqueOrThrow({ where: { id: complaint.id } });
    expect(row.status).toBe('AWAITING_CITIZEN_INFO');

    // the info request is visible when tracking
    const tracked = await request(app)
      .post('/api/track')
      .set('Origin', ORIGIN)
      .send({ complaintId: complaint.complaintId, trackingToken });
    expect(tracked.status).toBe(200);
    const kinds = tracked.body.complaint.publicUpdates.map((u: { kind: string }) => u.kind);
    expect(kinds).toContain('INFO_REQUEST');
  });

  it('internal NOTE updates are not exposed in public tracking', async () => {
    const admin = await getUser('admin@civicconnect.demo');
    const token = bearer(admin.id, 'SUPER_ADMIN');
    const bbmp = await getDept('BBMP');
    const { complaint, trackingToken } = await makeComplaint({ departmentId: bbmp.id });

    const res = await request(app)
      .post(`/api/complaints/${complaint.complaintId}/updates`)
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ kind: 'NOTE', note: 'INTERNAL: citizen called twice, follow up tomorrow' });
    expect(res.status).toBe(201);

    const tracked = await request(app)
      .post('/api/track')
      .set('Origin', ORIGIN)
      .send({ complaintId: complaint.complaintId, trackingToken });
    expect(tracked.status).toBe(200);
    expect(JSON.stringify(tracked.body)).not.toContain('INTERNAL');
  });

  it('links duplicates without deleting either complaint', async () => {
    const admin = await getUser('admin@civicconnect.demo');
    const token = bearer(admin.id, 'SUPER_ADMIN');
    const bbmp = await getDept('BBMP');
    const a = await makeComplaint({ departmentId: bbmp.id, text: 'original report' });
    const b = await makeComplaint({ departmentId: bbmp.id, text: 'same issue from another citizen' });

    const res = await request(app)
      .post(`/api/complaints/${b.complaint.complaintId}/duplicate`)
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ duplicateOfId: a.complaint.complaintId });
    expect(res.status).toBe(200);

    const both = await prisma.complaint.findMany({
      where: { id: { in: [a.complaint.id, b.complaint.id] } },
    });
    expect(both).toHaveLength(2); // nothing deleted
    const linked = both.find((c) => c.id === b.complaint.id)!;
    expect(linked.duplicateOfId).toBe(a.complaint.id);
  });

  it('rejects duplicate links to unknown complaints', async () => {
    const admin = await getUser('admin@civicconnect.demo');
    const token = bearer(admin.id, 'SUPER_ADMIN');
    const bbmp = await getDept('BBMP');
    const { complaint } = await makeComplaint({ departmentId: bbmp.id });
    const res = await request(app)
      .post(`/api/complaints/${complaint.complaintId}/duplicate`)
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ duplicateOfId: 'CCAI-2026-999999' });
    expect(res.status).toBe(400);
  });
});
