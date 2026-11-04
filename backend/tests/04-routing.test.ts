/** Scenario 4 — Jurisdiction-aware routing: the AI recommends, the backend
 *  validates against configured departments/jurisdictions. */
import { describe, expect, it } from 'vitest';
import { routeComplaint } from '../src/services/routing/engine';
import { getDept, makeUnderstanding } from './helpers';

describe('Scenario 4 — jurisdiction-aware routing engine', () => {
  it('routes a Bengaluru Urban pothole to the district local body', async () => {
    const result = await routeComplaint(
      makeUnderstanding({ category: 'road_damage', confidence: 0.92 }) as never,
      { district: 'Bengaluru Urban', road_type: 'urban' },
    );
    expect(result.requiresManualReview).toBe(false);
    expect(result.district).toBe('Bengaluru Urban');
    expect(result.departmentId).toBeTruthy();
    expect(result.explanation).toContain('validated against the jurisdiction registry');
    expect(result.explanation).toContain('backend validation passed');
    // the winner must be a department configured for Bengaluru Urban
    const { prisma } = await import('../src/config/prisma');
    const winner = await prisma.department.findUniqueOrThrow({
      where: { id: result.departmentId! },
    });
    expect(['BBMP', 'PWD', 'PWD-BLR', 'BESCOM']).toContain(winner.code);
  });

  it('sends complaints with an unknown district to the triage desk for manual review', async () => {
    const result = await routeComplaint(
      makeUnderstanding({ category: 'road_damage', confidence: 0.9 }) as never,
      { district: 'Not A Real District' },
    );
    expect(result.requiresManualReview).toBe(true);
    expect(result.status).toBe('SUBMITTED');
    const triage = await getDept('CIVIC-TRIAGE');
    expect(result.departmentId).toBe(triage.id);
    expect(result.explanation).toContain('manual review');
  });

  it('forces manual review when AI confidence is below the backend gate', async () => {
    const result = await routeComplaint(
      makeUnderstanding({ category: 'road_damage', confidence: 0.42, requires_manual_review: true }) as never,
      { district: 'Bengaluru Urban' },
    );
    expect(result.requiresManualReview).toBe(true);
    const triage = await getDept('CIVIC-TRIAGE');
    expect(result.departmentId).toBe(triage.id);
  });

  it('normalises unknown categories to "other" and routes to manual review', async () => {
    const result = await routeComplaint(
      makeUnderstanding({ category: 'definitely_not_a_category', confidence: 0.99 }) as never,
      { district: 'Bengaluru Urban' },
    );
    expect(result.category).toBe('other');
    expect(result.requiresManualReview).toBe(true);
  });

  it('requires a location for local-body categories when none is given', async () => {
    const result = await routeComplaint(
      makeUnderstanding({ category: 'garbage_collection', confidence: 0.95 }) as never,
      {},
    );
    expect(result.requiresManualReview).toBe(true);
    expect(result.explanation).toContain('need a location');
  });

  it('routes state-level categories (fire) to the state department', async () => {
    const result = await routeComplaint(
      makeUnderstanding({ category: 'fire_emergency', confidence: 0.97 }) as never,
      { district: 'Mysuru' },
    );
    expect(result.requiresManualReview).toBe(false);
    const fire = await getDept('FIRE-911');
    expect(result.departmentId).toBe(fire.id);
  });
});
