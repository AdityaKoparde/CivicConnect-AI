/** Department routing engine — the backend VALIDATES what the AI recommends.
 *
 *  1. validate category            5. identify responsible department
 *  2. check AI confidence          6. generate routing explanation
 *  3. validate geography           7. assign or send to manual review
 *  4. resolve jurisdiction
 *
 * The AI recommends; configured jurisdiction/department data decides.
 */
import { prisma } from '../../config/prisma';
import { CATEGORY_MAP } from '../../config/constants';
import type { AIUnderstanding } from '../ai/client';

export type PriorityUpper = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RoutingResult {
  category: string;
  priority: PriorityUpper;
  departmentId: string | null;
  departmentName: string | null;
  jurisdictionId: string | null;
  officerId: string | null;
  status: 'SUBMITTED' | 'ASSIGNED';
  requiresManualReview: boolean;
  explanation: string;
  district: string | null;
  taluk: string | null;
  city: string | null;
  ward: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  language: string;
  originalText: string;
  normalizedText: string;
  summary: string;
  aiConfidence: number;
  aiReasoning: string;
  aiProvider: string;
  safetyRisk: boolean;
  emergency: boolean;
}

const PRIORITY_MAP: Record<string, PriorityUpper> = {
  low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL',
};

/** Which department types are a natural fit per category (bonus score). */
const TYPE_BONUS: Record<string, string[]> = {
  electricity: ['POWER'],
  water_supply: ['WATER'],
  environmental_pollution: ['POLLUTION'],
  fire_emergency: ['FIRE'],
  government_hospitals: ['HEALTH'],
  public_health: ['HEALTH'],
  public_transport: ['TRANSPORT'],
  road_safety: ['TRANSPORT'],
  animal_welfare: ['ANIMAL_WELFARE'],
  road_damage: ['PWD', 'RDPR', 'ULB_CORPORATION', 'ULB_MUNICIPAL_COUNCIL', 'ULB_TOWN_PANCHAYAT'],
  public_infrastructure: ['PWD'],
  drainage_sewage: ['ULB_CORPORATION', 'ULB_MUNICIPAL_COUNCIL', 'ULB_TOWN_PANCHAYAT', 'WATER'],
  garbage_collection: ['ULB_CORPORATION', 'ULB_MUNICIPAL_COUNCIL', 'ULB_TOWN_PANCHAYAT', 'RDPR'],
  streetlights: ['ULB_CORPORATION', 'ULB_MUNICIPAL_COUNCIL', 'ULB_TOWN_PANCHAYAT', 'POWER'],
};

/** Categories that are typically served by the local body of the district. */
const LOCAL_CATEGORIES = new Set([
  'road_damage', 'garbage_collection', 'drainage_sewage', 'streetlights', 'water_supply',
]);

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

export async function routeComplaint(
  understanding: AIUnderstanding,
  slots: Record<string, unknown>,
): Promise<RoutingResult> {
  const district = str(slots.district) ?? str(understanding.entities.district);
  const taluk = str(slots.taluk) ?? str(understanding.entities.taluk);
  const city = str(slots.city) ?? str(understanding.entities.city);
  const ward = str(slots.ward) ?? str(understanding.entities.ward);
  const landmark = str(slots.landmark) ?? str(understanding.entities.landmark);
  const roadType = str(slots.road_type) ?? str(understanding.entities.road_type);

  const loc = slots.location as { latitude?: number; longitude?: number } | undefined;
  const latitude = typeof loc?.latitude === 'number' ? loc.latitude : null;
  const longitude = typeof loc?.longitude === 'number' ? loc.longitude : null;

  let category = understanding.category;
  if (!CATEGORY_MAP.has(category)) category = 'other';

  const confidence = understanding.confidence;
  let requiresManualReview =
    understanding.requires_manual_review || confidence < 0.65 || category === 'other';

  const notes: string[] = [];
  notes.push(
    `AI classified this as "${understanding.category_label?.en ?? category}" ` +
    `(confidence ${confidence.toFixed(2)}, provider ${understanding.ai_provider}).`,
  );

  // ---- 3. validate geography against the jurisdiction registry ----
  let jurisdictionId: string | null = null;
  let validatedDistrict: string | null = null;
  if (district) {
    const districts = await prisma.jurisdiction.findMany({
      where: { level: 'DISTRICT', active: true },
      select: { id: true, name: true },
    });
    const match = districts.find(
      (d) => d.name.toLowerCase() === district.toLowerCase(),
    );
    if (match) {
      jurisdictionId = match.id;
      validatedDistrict = match.name;
      notes.push(`District "${match.name}" validated against the jurisdiction registry.`);
    } else {
      notes.push(
        `District "${district}" is not in the configured registry — routing proceeds ` +
        `with manual review of the location.`,
      );
      requiresManualReview = true;
    }
  } else if (LOCAL_CATEGORIES.has(category)) {
    notes.push('No district provided — local-body categories need a location; manual review.');
    requiresManualReview = true;
  }

  // ---- manual review path ----
  if (requiresManualReview) {
    const triage = await prisma.department.findFirst({
      where: { type: 'TRIAGE', active: true },
      select: { id: true, name: true },
    });
    notes.push('Sent to the CivicConnect triage desk for manual department selection.');
    return buildResult({
      understanding, category, slots, notes,
      departmentId: triage?.id ?? null,
      departmentName: triage?.name ?? null,
      jurisdictionId, validatedDistrict, officerId: null,
      status: 'SUBMITTED', requiresManualReview: true,
      district: validatedDistrict ?? district, taluk, city, ward, landmark,
      latitude, longitude, roadType,
    });
  }

  // ---- 4/5. pick the responsible department from configured data ----
  const candidates = await prisma.department.findMany({
    where: { active: true, categories: { has: category } },
    select: {
      id: true, name: true, type: true, jurisdictionLevel: true, district: true,
    },
  });

  interface Scored { id: string; name: string; score: number; districtScoped: boolean }
  const scored: Scored[] = [];
  const typeBonuses = TYPE_BONUS[category] ?? [];

  for (const dep of candidates) {
    let score = 10;
    if (typeBonuses.includes(dep.type)) score += 5;

    const districtScoped = Boolean(dep.district);
    if (districtScoped) {
      if (!validatedDistrict || dep.district!.toLowerCase() !== validatedDistrict.toLowerCase()) {
        continue; // a different district's local body can never own this complaint
      }
      score += 6;
      // local categories strongly prefer their district's local body
      if (LOCAL_CATEGORIES.has(category) && dep.type.startsWith('ULB')) score += 4;
      if (category === 'road_damage' && roadType === 'urban' && dep.type.startsWith('ULB')) score += 4;
      if (category === 'road_damage' && roadType === 'rural' && dep.type === 'RDPR') score += 4;
      if (category === 'road_damage' && roadType === 'highway' && dep.type === 'PWD') score += 4;
    } else {
      score += 2; // state-level fallback
      if (category === 'road_damage' && roadType === 'highway' && dep.type === 'PWD') score += 6;
      if (category === 'road_damage' && roadType === 'rural' && dep.type === 'RDPR') score += 6;
    }
    scored.push({ id: dep.id, name: dep.name, score, districtScoped });
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    const triage = await prisma.department.findFirst({
      where: { type: 'TRIAGE', active: true },
      select: { id: true, name: true },
    });
    notes.push('No configured department serves this category — manual review required.');
    return buildResult({
      understanding, category, slots, notes,
      departmentId: triage?.id ?? null,
      departmentName: triage?.name ?? null,
      jurisdictionId, validatedDistrict, officerId: null,
      status: 'SUBMITTED', requiresManualReview: true,
      district: validatedDistrict, taluk, city, ward, landmark,
      latitude, longitude, roadType,
    });
  }

  const winner = scored[0];
  notes.push(
    `Matched department "${winner.name}" ` +
    `(${winner.districtScoped ? `district: ${validatedDistrict}` : 'state level'}) ` +
    `— backend validation passed.`,
  );

  // ---- auto-assign the least-loaded active officer of that department ----
  const officers = await prisma.user.findMany({
    where: {
      departmentId: winner.id,
      isActive: true,
      role: { in: ['DEPARTMENT_OFFICER', 'DEPARTMENT_ADMIN'] },
    },
    select: { id: true },
  });
  let officerId: string | null = null;
  if (officers.length > 0) {
    const open = await prisma.complaint.groupBy({
      by: ['assignedOfficerId'],
      where: {
        assignedOfficerId: { in: officers.map((o) => o.id) },
        status: { notIn: ['RESOLVED', 'REJECTED'] },
      },
      _count: { _all: true },
    });
    const load = new Map(open.map((o) => [o.assignedOfficerId, o._count._all]));
    officers.sort(
      (a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0),
    );
    officerId = officers[0].id;
  }

  return buildResult({
    understanding, category, slots, notes,
    departmentId: winner.id,
    departmentName: winner.name,
    jurisdictionId, validatedDistrict, officerId,
    status: officerId ? 'ASSIGNED' : 'SUBMITTED',
    requiresManualReview: false,
    district: validatedDistrict, taluk, city, ward, landmark,
    latitude, longitude, roadType,
  });
}

function buildResult(args: {
  understanding: AIUnderstanding;
  category: string;
  slots: Record<string, unknown>;
  notes: string[];
  departmentId: string | null;
  departmentName: string | null;
  jurisdictionId: string | null;
  validatedDistrict: string | null;
  officerId: string | null;
  status: 'SUBMITTED' | 'ASSIGNED';
  requiresManualReview: boolean;
  district: string | null;
  taluk: string | null;
  city: string | null;
  ward: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  roadType: string | null;
}): RoutingResult {
  const u = args.understanding;
  const slots = args.slots;
  return {
    category: args.category,
    priority: PRIORITY_MAP[u.priority] ?? 'MEDIUM',
    departmentId: args.departmentId,
    departmentName: args.departmentName,
    jurisdictionId: args.jurisdictionId,
    officerId: args.officerId,
    status: args.status,
    requiresManualReview: args.requiresManualReview,
    explanation: args.notes.join(' '),
    district: args.district,
    taluk: args.taluk,
    city: args.city,
    ward: args.ward,
    landmark: args.landmark,
    latitude: args.latitude,
    longitude: args.longitude,
    language: u.detected_language,
    originalText: u.original_text,
    normalizedText: u.normalized_description,
    summary: str(slots.summary) ?? u.normalized_description,
    aiConfidence: u.confidence,
    aiReasoning: u.reasoning,
    aiProvider: u.ai_provider,
    safetyRisk: u.safety_risk,
    emergency: u.emergency,
  };
}
