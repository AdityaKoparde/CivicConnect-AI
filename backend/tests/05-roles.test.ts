/** Scenario 5 — Role-based access control: citizens are excluded from staff
 *  APIs, officers only see their own department's complaints. */
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { ORIGIN, app, bearer, getDept, getUser, makeComplaint } from './helpers';

describe('Scenario 5 — role-based access and scoping', () => {
  it('rejects unauthenticated access to the complaints API', async () => {
    const res = await request(app).get('/api/complaints').set('Origin', ORIGIN);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('forbids citizens from listing or mutating complaints', async () => {
    const citizen = await getUser('citizen1@civicconnect.demo');
    const token = bearer(citizen.id, 'CITIZEN');

    const list = await request(app)
      .get('/api/complaints')
      .set('Origin', ORIGIN)
      .set('Authorization', token);
    expect(list.status).toBe(403);

    const mutate = await request(app)
      .patch('/api/complaints/CCAI-2026-000001/status')
      .set('Origin', ORIGIN)
      .set('Authorization', token)
      .send({ status: 'REJECTED' });
    expect(mutate.status).toBe(403);
  });

  it('scopes officers to their own department (no cross-department visibility)', async () => {
    // water officer owns a water complaint but must not see BBMP's
    const waterOfficer = await getUser('water@civicconnect.demo');
    const token = bearer(waterOfficer.id, 'DEPARTMENT_OFFICER');

    const list = await request(app)
      .get('/api/complaints?limit=100')
      .set('Origin', ORIGIN)
      .set('Authorization', token);
    expect(list.status).toBe(200);
    const ids: string[] = list.body.items.map((c: { complaintId: string }) => c.complaintId);
    expect(ids).toContain('CCAI-2026-000002'); // water supply, Mysuru — theirs
    expect(ids).not.toContain('CCAI-2026-000001'); // BBMP pothole — not theirs
    // every returned item belongs to their department
    const waterDept = await getDept('WATER-BOARD');
    for (const item of list.body.items) {
      expect(item.departmentId).toBe(waterDept.id);
    }

    // direct detail fetch of another department's complaint → 404 (scoped out)
    const detail = await request(app)
      .get('/api/complaints/CCAI-2026-000001')
      .set('Origin', ORIGIN)
      .set('Authorization', token);
    expect(detail.status).toBe(404);
  });

  it('lets super admins see everything', async () => {
    const admin = await getUser('admin@civicconnect.demo');
    const token = bearer(admin.id, 'SUPER_ADMIN');
    const list = await request(app)
      .get('/api/complaints?limit=100')
      .set('Origin', ORIGIN)
      .set('Authorization', token);
    expect(list.status).toBe(200);
    const ids: string[] = list.body.items.map((c: { complaintId: string }) => c.complaintId);
    expect(ids).toContain('CCAI-2026-000001');
    expect(ids).toContain('CCAI-2026-000002');
    expect(list.body.total).toBeGreaterThanOrEqual(12);
  });

  it('keeps admin endpoints away from non-admins', async () => {
    const citizen = await getUser('citizen2@civicconnect.demo');
    const token = bearer(citizen.id, 'CITIZEN');
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Origin', ORIGIN)
      .set('Authorization', token);
    expect(res.status).toBe(403);

    const officer = await getUser('roads@civicconnect.demo');
    const officerToken = bearer(officer.id, 'DEPARTMENT_OFFICER');
    const officers = await request(app)
      .get('/api/admin/officers')
      .set('Origin', ORIGIN)
      .set('Authorization', officerToken);
    expect(officers.status).toBe(403);
  });

  it('creates a complaint through makeComplaint visible only to its owner citizen', async () => {
    const { complaint, user } = await makeComplaint({ text: 'isolation check' });
    const ownerToken = bearer(user.id, 'CITIZEN');
    const res = await request(app)
      .post('/api/track')
      .set('Origin', ORIGIN)
      .set('Authorization', ownerToken)
      .send({ complaintId: complaint.complaintId });
    expect(res.status).toBe(200);
  });
});
