/** Scenario 8 — Analytics from real data + honest demo/openai provider labeling. */
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { ORIGIN, app, agent, bearer, getUser, newConversation } from './helpers';

describe('Scenario 8 — analytics and honest AI provider labeling', () => {
  it('reports health with database and AI service status', async () => {
    const res = await request(app).get('/api/health').set('Origin', ORIGIN);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('up');
    expect(res.body.ai).toBe('up');
  });

  it('serves public stats computed from the database', async () => {
    const res = await request(app).get('/api/stats').set('Origin', ORIGIN);
    expect(res.status).toBe(200);
    expect(res.body.totalComplaints).toBeGreaterThanOrEqual(12);
    expect(res.body.resolvedComplaints).toBeGreaterThanOrEqual(1);
    expect(res.body.activeDepartments).toBeGreaterThanOrEqual(10);
    expect(res.body.districtsCovered).toBeGreaterThanOrEqual(10);
    expect(res.body.isDemoData).toBe(true);
    expect(typeof res.body.lastUpdated).toBe('string');
  });

  it('serves admin dashboard analytics scoped to the caller', async () => {
    const admin = await getUser('admin@civicconnect.demo');
    const token = bearer(admin.id, 'SUPER_ADMIN');
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Origin', ORIGIN)
      .set('Authorization', token);
    expect(res.status).toBe(200);
    expect(res.body.overview.total).toBeGreaterThanOrEqual(12);
    expect(res.body.byCategory.length).toBeGreaterThanOrEqual(5);
    expect(res.body.byCategory[0]).toHaveProperty('label');
    expect(res.body.byDepartment.length).toBeGreaterThanOrEqual(5);
    expect(res.body.byDistrict.length).toBeGreaterThanOrEqual(5);
    expect(res.body.monthly).toHaveLength(12);
    expect(res.body.priorityDistribution).toHaveLength(4);
    expect(res.body.pendingTrend).toHaveLength(30);
    expect(typeof res.body.resolutionRate).toBe('number');
    expect(res.body.isDemoData).toBe(true);
  });

  it('exposes all 15 categories with trilingual labels', async () => {
    const res = await request(app).get('/api/categories').set('Origin', ORIGIN);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(15);
    const pothole = res.body.items.find((c: { key: string }) => c.key === 'road_damage');
    expect(pothole.label.en).toBeTruthy();
    expect(pothole.label.kn).toBeTruthy();
    expect(pothole.label.hi).toBeTruthy();
  });

  it('labels chat responses with the actual provider (demo, not openai)', async () => {
    const convId = await newConversation('en');
    const res = await agent
      .post(`/api/chat/conversations/${convId}/messages`)
      .set('Origin', ORIGIN)
      .send({ content: 'I need to complain about street lights not working' });
    expect(res.status).toBe(200);
    expect(res.body.aiProvider).toBe('demo');
    // honest labeling: never claim cloud AI was used in demo mode
    expect(res.body.aiProvider).not.toBe('openai');
  });

  it('keeps department registry listing public and complete', async () => {
    const res = await request(app).get('/api/departments').set('Origin', ORIGIN);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(15);
    const codes = res.body.items.map((d: { code: string }) => d.code);
    expect(codes).toContain('CIVIC-TRIAGE');
    expect(codes).toContain('BBMP');
    expect(codes).toContain('PWD');
  });
});
