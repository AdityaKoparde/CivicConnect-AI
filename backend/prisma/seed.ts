/** CivicConnect AI demo seed — categories, jurisdictions, departments,
 *  demo accounts, escalation rules and a small realistic complaint dataset.
 *
 *  Idempotent: safe to re-run. Demo passwords are documented in README.md.
 *
 *  Demo logins (password for all: Demo@12345)
 *    admin@civicconnect.demo     SUPER_ADMIN
 *    triage@civicconnect.demo    DEPARTMENT_ADMIN (triage desk)
 *    bbmp@civicconnect.demo      DEPARTMENT_ADMIN (Bengaluru City Corporation)
 *    roads@civicconnect.demo     DEPARTMENT_OFFICER (PWD)
 *    power@civicconnect.demo     DEPARTMENT_OFFICER (BESCOM)
 *    health@civicconnect.demo    DEPARTMENT_OFFICER (Health)
 *    water@civicconnect.demo     DEPARTMENT_OFFICER (Water Board)
 *    citizen1@civicconnect.demo  CITIZEN (owns several demo complaints)
 *    citizen2@civicconnect.demo  CITIZEN
 */
import bcrypt from 'bcryptjs';
import { Prisma, ComplaintStatus, Priority } from '@prisma/client';
import { prisma } from '../src/config/prisma';
import { CATEGORIES } from '../src/config/constants';
import { hashTrackingToken } from '../src/utils/crypto';

const DEMO_PASSWORD = 'Demo@12345';

// ---------------------------------------------------------------- districts
// Approximate public district headquarters coordinates (demo map centroids).
const DISTRICTS: [name: string, lat: number, lng: number][] = [
  ['Bagalkot', 16.18, 75.70],
  ['Bengaluru Rural', 13.28, 77.58],
  ['Bengaluru Urban', 12.97, 77.59],
  ['Belagavi', 15.85, 74.50],
  ['Ballari', 15.14, 76.92],
  ['Bidar', 17.91, 77.52],
  ['Vijayapura', 16.83, 75.71],
  ['Chamarajanagar', 11.92, 76.94],
  ['Chikkaballapur', 13.43, 77.73],
  ['Chikkamagaluru', 13.32, 75.77],
  ['Chitradurga', 14.23, 76.40],
  ['Dakshina Kannada', 12.87, 74.88],
  ['Davanagere', 14.46, 75.92],
  ['Dharwad', 15.36, 75.12],
  ['Gadag', 15.43, 75.63],
  ['Kalaburagi', 17.33, 76.83],
  ['Hassan', 13.00, 76.10],
  ['Haveri', 14.79, 75.40],
  ['Kodagu', 12.33, 75.80],
  ['Kolar', 13.13, 78.13],
  ['Koppal', 15.35, 76.15],
  ['Mandya', 12.52, 76.90],
  ['Mysuru', 12.30, 76.65],
  ['Raichur', 16.20, 77.36],
  ['Ramanagara', 12.72, 77.28],
  ['Shivamogga', 13.93, 75.56],
  ['Tumakuru', 13.34, 77.10],
  ['Udupi', 13.34, 74.75],
  ['Uttara Kannada', 14.81, 74.13],
  ['Yadgir', 16.77, 77.14],
  ['Vijayanagara', 15.27, 76.46],
];

const TALUKS: [district: string, name: string, lat: number, lng: number][] = [
  ['Bengaluru Urban', 'Bengaluru North', 13.03, 77.59],
  ['Bengaluru Urban', 'Bengaluru South', 12.85, 77.60],
  ['Bengaluru Urban', 'Bengaluru East', 12.95, 77.75],
  ['Mysuru', 'Mysuru Taluk', 12.30, 76.65],
  ['Belagavi', 'Belagavi Taluk', 15.85, 74.50],
  ['Dakshina Kannada', 'Mangaluru Taluk', 12.87, 74.88],
];

// -------------------------------------------------------------- departments
interface DeptSeed {
  code: string;
  name: string;
  type:
    | 'ULB_CORPORATION' | 'ULB_MUNICIPAL_COUNCIL' | 'ULB_TOWN_PANCHAYAT'
    | 'PWD' | 'RDPR' | 'WATER' | 'POWER' | 'HEALTH' | 'FIRE'
    | 'TRANSPORT' | 'POLLUTION' | 'ANIMAL_WELFARE' | 'TRIAGE' | 'OTHER';
  categories: string[];
  jurisdictionLevel?: 'STATE' | 'DISTRICT' | 'TALUK' | 'LOCAL_BODY' | 'WARD';
  district?: string;
  description?: string;
  contactEmail?: string;
}

const ALL_CATEGORIES = CATEGORIES.map((c) => c.key);

const DEPARTMENTS: DeptSeed[] = [
  {
    code: 'CIVIC-TRIAGE', name: 'CivicConnect Triage Desk', type: 'TRIAGE',
    categories: ALL_CATEGORIES, jurisdictionLevel: 'STATE',
    description: 'Manual review desk for complaints the AI cannot route with confidence.',
    contactEmail: 'triage@civicconnect.demo',
  },
  // ---- urban local bodies ----
  {
    code: 'BBMP', name: 'Bengaluru City Corporation (BBMP)', type: 'ULB_CORPORATION',
    categories: ['road_damage', 'garbage_collection', 'drainage_sewage', 'streetlights', 'public_infrastructure'],
    jurisdictionLevel: 'LOCAL_BODY', district: 'Bengaluru Urban',
    contactEmail: 'bbmp@civicconnect.demo',
  },
  {
    code: 'MYS-CORP', name: 'Mysuru City Corporation', type: 'ULB_CORPORATION',
    categories: ['road_damage', 'garbage_collection', 'drainage_sewage', 'streetlights', 'public_infrastructure'],
    jurisdictionLevel: 'LOCAL_BODY', district: 'Mysuru',
  },
  {
    code: 'MANG-CORP', name: 'Mangaluru City Corporation', type: 'ULB_CORPORATION',
    categories: ['road_damage', 'garbage_collection', 'drainage_sewage', 'streetlights', 'public_infrastructure'],
    jurisdictionLevel: 'LOCAL_BODY', district: 'Dakshina Kannada',
  },
  {
    code: 'HUB-DWD-CORP', name: 'Hubballi-Dharwad Municipal Corporation', type: 'ULB_CORPORATION',
    categories: ['road_damage', 'garbage_collection', 'drainage_sewage', 'streetlights', 'public_infrastructure'],
    jurisdictionLevel: 'LOCAL_BODY', district: 'Dharwad',
  },
  {
    code: 'TUM-TC', name: 'Tumakuru Municipal Council', type: 'ULB_MUNICIPAL_COUNCIL',
    categories: ['road_damage', 'garbage_collection', 'drainage_sewage', 'streetlights', 'public_infrastructure'],
    jurisdictionLevel: 'LOCAL_BODY', district: 'Tumakuru',
  },
  {
    code: 'BALLARI-MC', name: 'Ballari Municipal Council', type: 'ULB_MUNICIPAL_COUNCIL',
    categories: ['road_damage', 'garbage_collection', 'drainage_sewage', 'streetlights', 'public_infrastructure'],
    jurisdictionLevel: 'LOCAL_BODY', district: 'Ballari',
  },
  {
    code: 'MADIKERI-TP', name: 'Madikeri Town Panchayat', type: 'ULB_TOWN_PANCHAYAT',
    categories: ['road_damage', 'garbage_collection', 'drainage_sewage', 'streetlights'],
    jurisdictionLevel: 'LOCAL_BODY', district: 'Kodagu',
  },
  // ---- state infrastructure ----
  {
    code: 'PWD', name: 'State Public Works Department (PWD)', type: 'PWD',
    categories: ['road_damage', 'road_safety', 'public_infrastructure'],
    jurisdictionLevel: 'STATE',
    description: 'State highways, major roads and bridges.',
    contactEmail: 'roads@civicconnect.demo',
  },
  {
    code: 'PWD-BLR', name: 'Bengaluru Urban PWD Division', type: 'PWD',
    categories: ['road_damage', 'road_safety', 'public_infrastructure'],
    jurisdictionLevel: 'DISTRICT', district: 'Bengaluru Urban',
  },
  {
    code: 'RDPR', name: 'Rural Development & Panchayat Raj (RDPR)', type: 'RDPR',
    categories: ['road_damage', 'drainage_sewage', 'garbage_collection', 'public_infrastructure'],
    jurisdictionLevel: 'STATE',
    description: 'Rural roads, gram panchayat works and sanitation.',
  },
  {
    code: 'WATER-BOARD', name: 'Karnataka Water Supply Board', type: 'WATER',
    categories: ['water_supply', 'drainage_sewage'],
    jurisdictionLevel: 'STATE',
    contactEmail: 'water@civicconnect.demo',
  },
  // ---- power distribution (ESCOMs) ----
  {
    code: 'BESCOM', name: 'BESCOM Power Distribution', type: 'POWER',
    categories: ['electricity', 'streetlights'],
    jurisdictionLevel: 'DISTRICT', district: 'Bengaluru Urban',
    contactEmail: 'power@civicconnect.demo',
  },
  {
    code: 'MESCOM', name: 'MESCOM Power Distribution', type: 'POWER',
    categories: ['electricity', 'streetlights'],
    jurisdictionLevel: 'DISTRICT', district: 'Mysuru',
  },
  {
    code: 'GESCOM', name: 'GESCOM Power Distribution', type: 'POWER',
    categories: ['electricity', 'streetlights'],
    jurisdictionLevel: 'DISTRICT', district: 'Kalaburagi',
  },
  {
    code: 'HESCOM', name: 'HESCOM Power Distribution', type: 'POWER',
    categories: ['electricity', 'streetlights'],
    jurisdictionLevel: 'DISTRICT', district: 'Dharwad',
  },
  // ---- other state services ----
  {
    code: 'HEALTH', name: 'Department of Health & Family Welfare', type: 'HEALTH',
    categories: ['public_health', 'government_hospitals'],
    jurisdictionLevel: 'STATE',
    contactEmail: 'health@civicconnect.demo',
  },
  {
    code: 'FIRE-911', name: 'Karnataka Fire & Emergency Services', type: 'FIRE',
    categories: ['fire_emergency'],
    jurisdictionLevel: 'STATE',
  },
  {
    code: 'PUBLIC-TRANSPORT', name: 'Public Transport Authority (BMTC/KSRTC)', type: 'TRANSPORT',
    categories: ['public_transport', 'road_safety'],
    jurisdictionLevel: 'STATE',
  },
  {
    code: 'KSPCB', name: 'Karnataka Pollution Control Board', type: 'POLLUTION',
    categories: ['environmental_pollution'],
    jurisdictionLevel: 'STATE',
  },
  {
    code: 'ANIMAL-WELFARE', name: 'Animal Welfare & Veterinary Services', type: 'ANIMAL_WELFARE',
    categories: ['animal_welfare'],
    jurisdictionLevel: 'STATE',
  },
];

// ------------------------------------------------------------------- users
interface UserSeed {
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'DEPARTMENT_ADMIN' | 'DEPARTMENT_OFFICER' | 'CITIZEN';
  deptCode?: string;
  talukJurisdiction?: string; // taluk name → jurisdictionId binding for officers
}

const USERS: UserSeed[] = [
  { email: 'admin@civicconnect.demo', name: 'Demo Super Admin', role: 'SUPER_ADMIN' },
  { email: 'triage@civicconnect.demo', name: 'Triage Desk Lead', role: 'DEPARTMENT_ADMIN', deptCode: 'CIVIC-TRIAGE' },
  { email: 'bbmp@civicconnect.demo', name: 'BBMP Ward Officer', role: 'DEPARTMENT_ADMIN', deptCode: 'BBMP' },
  { email: 'roads@civicconnect.demo', name: 'PWD Road Engineer', role: 'DEPARTMENT_OFFICER', deptCode: 'PWD' },
  { email: 'power@civicconnect.demo', name: 'BESCOM Field Officer', role: 'DEPARTMENT_OFFICER', deptCode: 'BESCOM', talukJurisdiction: 'Bengaluru South' },
  { email: 'health@civicconnect.demo', name: 'Health Inspector', role: 'DEPARTMENT_OFFICER', deptCode: 'HEALTH' },
  { email: 'water@civicconnect.demo', name: 'Water Supply Engineer', role: 'DEPARTMENT_OFFICER', deptCode: 'WATER-BOARD' },
  { email: 'citizen1@civicconnect.demo', name: 'Ravi Kumar', role: 'CITIZEN' },
  { email: 'citizen2@civicconnect.demo', name: 'Lakshmi Narayan', role: 'CITIZEN' },
];

// ------------------------------------------------------------ complaints
interface ComplaintSeed {
  seq: number;
  citizenEmail: string;
  text: string;
  summary: string;
  language: string;
  category: string;
  priority: Priority;
  status: ComplaintStatus;
  district: string;
  taluk?: string;
  city?: string;
  landmark?: string;
  deptCode: string;
  officerEmail?: string;
  daysAgo: number;
  confidence: number;
  manualReview?: boolean;
  emergency?: boolean;
  resolutionNote?: string;
  resolvedDaysAgo?: number;
}

const COMPLAINTS: ComplaintSeed[] = [
  {
    seq: 1, citizenEmail: 'citizen1@civicconnect.demo',
    text: 'Huge pothole in front of Koramangala 80 Feet Road near the water tank, bikes are falling every day.',
    summary: 'Deep pothole on 80 Feet Road, Koramangala endangering two-wheeler riders.',
    language: 'en', category: 'road_damage', priority: 'HIGH', status: 'RESOLVED',
    district: 'Bengaluru Urban', taluk: 'Bengaluru South', city: 'Bengaluru', landmark: 'Koramangala water tank',
    deptCode: 'BBMP', officerEmail: 'bbmp@civicconnect.demo',
    daysAgo: 42, confidence: 0.91,
    resolutionNote: 'Pothole filled with mastic asphalt and compacted on priority; lane markings restored.',
    resolvedDaysAgo: 33,
  },
  {
    seq: 2, citizenEmail: 'citizen2@civicconnect.demo',
    text: 'ಕುಡಿಯುವ ನೀರಿನ ಸರಬರಾಜು ಮೂರು ದಿನಗಳಿಂದ ನಿಂತಿದೆ. ವಸತಿ ಬಡಾವಣೆಯಲ್ಲಿ ಯಾವುದೇ ನೀರು ಬರುತ್ತಿಲ್ಲ.',
    summary: 'No drinking water supply in the residential colony for three days.',
    language: 'kn', category: 'water_supply', priority: 'CRITICAL', status: 'IN_PROGRESS',
    district: 'Mysuru', taluk: 'Mysuru Taluk', city: 'Mysuru', landmark: 'Vijayanagar 2nd Stage',
    deptCode: 'WATER-BOARD', officerEmail: 'water@civicconnect.demo',
    daysAgo: 6, confidence: 0.93,
  },
  {
    seq: 3, citizenEmail: 'citizen1@civicconnect.demo',
    text: 'Garbage has not been collected for over a week in our street, bins overflowing and stray dogs spreading waste.',
    summary: 'Uncollected garbage for a week with overflowing bins near the market.',
    language: 'en', category: 'garbage_collection', priority: 'HIGH', status: 'ASSIGNED',
    district: 'Dakshina Kannada', city: 'Mangaluru', landmark: 'Hampankatta market road',
    deptCode: 'MANG-CORP',
    daysAgo: 8, confidence: 0.88,
  },
  {
    seq: 4, citizenEmail: 'citizen2@civicconnect.demo',
    text: 'Transformer near our colony exploded last night and there has been no power since. Voltage fluctuation was happening for a week.',
    summary: 'Transformer fault causing power outage in the colony since last night.',
    language: 'en', category: 'electricity', priority: 'CRITICAL', status: 'ESCALATED',
    district: 'Kalaburagi', city: 'Kalaburagi', landmark: 'Shah Bazaar',
    deptCode: 'GESCOM',
    daysAgo: 4, confidence: 0.9,
    emergency: false,
  },
  {
    seq: 5, citizenEmail: 'citizen1@civicconnect.demo',
    text: 'Street lights have been dead on our stretch for two months. Women and elderly cannot walk after 7pm.',
    summary: 'Eight street lights out for two months on the main stretch.',
    language: 'en', category: 'streetlights', priority: 'MEDIUM', status: 'AWAITING_CITIZEN_INFO',
    district: 'Tumakuru', city: 'Tumakuru', landmark: 'SRS Road',
    deptCode: 'TUM-TC',
    daysAgo: 15, confidence: 0.86,
  },
  {
    seq: 6, citizenEmail: 'citizen2@civicconnect.demo',
    text: 'ಚರಂಡಿ ಮುಚ್ಚಿ ಹೋಗಿದೆ, ಮಳೆ ನೀರು ರಸ್ತೆಯಲ್ಲಿ ನಿಂತು ಮನೆಗಳಿಗೆ ನುಗ್ಗುತ್ತಿದೆ.',
    summary: 'Blocked drain with rainwater entering houses during showers.',
    language: 'kn', category: 'drainage_sewage', priority: 'HIGH', status: 'RESOLVED',
    district: 'Belagavi', taluk: 'Belagavi Taluk', city: 'Belagavi', landmark: 'Tilakwadi 3rd Cross',
    deptCode: 'HUB-DWD-CORP',
    daysAgo: 60, confidence: 0.87,
    resolutionNote: 'Drain desilted, manhole cover replaced and stagnant water pumped out.',
    resolvedDaysAgo: 47,
  },
  {
    seq: 7, citizenEmail: 'citizen1@civicconnect.demo',
    text: 'Stagnant water behind the government school for weeks — mosquito menace, children falling sick with fever.',
    summary: 'Stagnant water near government school causing mosquito menace.',
    language: 'en', category: 'public_health', priority: 'HIGH', status: 'RESOLVED',
    district: 'Ballari', city: 'Ballari', landmark: 'Government High School compound',
    deptCode: 'HEALTH', officerEmail: 'health@civicconnect.demo',
    daysAgo: 55, confidence: 0.89,
    resolutionNote: 'Anti-larval treatment done, stagnant water drained and weekly fogging scheduled.',
    resolvedDaysAgo: 50,
  },
  {
    seq: 8, citizenEmail: 'citizen2@civicconnect.demo',
    text: 'No signal at the traffic junction for the last 10 days, vehicles are crossing randomly and an accident happened yesterday.',
    summary: 'Traffic signal dead at major junction after an accident.',
    language: 'en', category: 'road_safety', priority: 'CRITICAL', status: 'IN_PROGRESS',
    district: 'Bengaluru Urban', taluk: 'Bengaluru East', city: 'Bengaluru', landmark: 'Outer Ring Road, Marathahalli',
    deptCode: 'PUBLIC-TRANSPORT',
    daysAgo: 2, confidence: 0.92,
  },
  {
    seq: 9, citizenEmail: 'citizen1@civicconnect.demo',
    text: 'Factory smoke is dark and smells bad every morning, clothes dried outside turn black. Air quality feels unhealthy.',
    summary: 'Industrial smoke emission affecting air quality in the neighbourhood.',
    language: 'en', category: 'environmental_pollution', priority: 'MEDIUM', status: 'SUBMITTED',
    district: 'Bengaluru Rural', city: 'Devanahalli', landmark: 'Industrial area main gate',
    deptCode: 'KSPCB',
    daysAgo: 1, confidence: 0.84,
  },
  {
    seq: 10, citizenEmail: 'citizen2@civicconnect.demo',
    text: 'Stray dog pack near the bus stand is chasing school children every morning. One child was bitten last week.',
    summary: 'Aggressive stray dog pack near bus stand injured a child.',
    language: 'en', category: 'animal_welfare', priority: 'HIGH', status: 'ACKNOWLEDGED',
    district: 'Mysuru', taluk: 'Mysuru Taluk', city: 'Mysuru', landmark: 'City bus stand',
    deptCode: 'ANIMAL-WELFARE',
    daysAgo: 3, confidence: 0.9,
  },
  {
    seq: 11, citizenEmail: 'citizen1@civicconnect.demo',
    text: 'Bus services to our village have been cut from 8 trips to 3 trips since last month, students and workers are suffering.',
    summary: 'Reduced bus trips to village affecting students and workers.',
    language: 'en', category: 'public_transport', priority: 'MEDIUM', status: 'RESOLVED',
    district: 'Dharwad', city: 'Hubballi', landmark: 'Old bus stand',
    deptCode: 'PUBLIC-TRANSPORT',
    daysAgo: 75, confidence: 0.85,
    resolutionNote: 'Two additional morning trips restored after coordination with the depot.',
    resolvedDaysAgo: 60,
  },
  {
    seq: 12, citizenEmail: 'citizen2@civicconnect.demo',
    text: 'My neighbour keeps dumping construction debris on the vacant site and the corporation is not responding. Please help.',
    summary: 'Construction debris dumped on vacant site; unclear jurisdiction.',
    language: 'en', category: 'other', priority: 'LOW', status: 'SUBMITTED',
    district: 'Bengaluru Urban', taluk: 'Bengaluru North', city: 'Bengaluru', landmark: 'RT Nagar 5th Main',
    deptCode: 'CIVIC-TRIAGE',
    daysAgo: 2, confidence: 0.42, manualReview: true,
  },
  {
    seq: 13, citizenEmail: 'citizen1@civicconnect.demo',
    text: 'Fever cases rising in our area after water stagnation near the community hall, mosquito breeding everywhere.',
    summary: 'Water stagnation near community hall causing fever cases in the area.',
    language: 'en', category: 'public_health', priority: 'MEDIUM', status: 'SUBMITTED',
    district: 'Shivamogga', city: 'Shivamogga', landmark: 'Community hall grounds',
    deptCode: 'HEALTH',
    daysAgo: 5, confidence: 0.87,
  },
  {
    seq: 14, citizenEmail: 'citizen2@civicconnect.demo',
    text: 'ಕುಡಿಯುವ ನೀರಿನ ಪೈಪ್‌ಲೈನ್ ಒಡೆದು ರಸ್ತೆಯಲ್ಲಿ ನೀರು ಹರಿಯುತ್ತಿದೆ, ಮಕ್ಕಳು ಶಾಲೆಗೆ ಹೋಗಲು ಕಷ್ಟವಾಗುತ್ತಿದೆ.',
    summary: 'Broken drinking water pipeline flooding the road; children struggle to reach school.',
    language: 'kn', category: 'water_supply', priority: 'HIGH', status: 'ACKNOWLEDGED',
    district: 'Hassan', city: 'Hassan', landmark: 'Old bus stand road',
    deptCode: 'WATER-BOARD',
    daysAgo: 7, confidence: 0.9,
  },
];

const daysAgo = (d: number): Date => new Date(Date.now() - d * 24 * 3600 * 1000);

async function upsertJurisdiction(data: {
  level: 'STATE' | 'DISTRICT' | 'TALUK' | 'LOCAL_BODY' | 'WARD';
  name: string;
  district?: string;
  taluk?: string;
  latitude?: number;
  longitude?: number;
  parentId?: string;
  code?: string;
}) {
  const existing = await prisma.jurisdiction.findFirst({
    where: { level: data.level, name: data.name },
  });
  if (existing) {
    return prisma.jurisdiction.update({
      where: { id: existing.id },
      data: {
        district: data.district, taluk: data.taluk,
        latitude: data.latitude, longitude: data.longitude,
        parentId: data.parentId, active: true, isDemo: true,
      },
    });
  }
  return prisma.jurisdiction.create({ data: { ...data, isDemo: true } });
}

async function main() {
  console.log('Seeding CivicConnect AI demo data…');

  // ---- 1. categories ----
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { key: c.key },
      update: { label: c.label, description: c.description, icon: c.icon, sortOrder: c.sortOrder, active: true },
      create: {
        key: c.key, label: c.label, description: c.description,
        icon: c.icon, sortOrder: c.sortOrder,
      },
    });
  }
  console.log(`  ✓ ${CATEGORIES.length} categories`);

  // ---- 2. jurisdictions ----
  const state = await upsertJurisdiction({
    level: 'STATE', name: 'Karnataka', code: 'KA',
    latitude: 14.52, longitude: 75.73,
  });
  const districtIds = new Map<string, string>();
  for (const [name, lat, lng] of DISTRICTS) {
    const row = await upsertJurisdiction({
      level: 'DISTRICT', name, parentId: state.id,
      district: name, latitude: lat, longitude: lng,
    });
    districtIds.set(name, row.id);
  }
  for (const [district, name, lat, lng] of TALUKS) {
    await upsertJurisdiction({
      level: 'TALUK', name, district, taluk: name,
      parentId: districtIds.get(district), latitude: lat, longitude: lng,
    });
  }
  console.log(`  ✓ ${DISTRICTS.length + TALUKS.length + 1} jurisdictions`);

  // ---- 3. departments ----
  const deptIds = new Map<string, string>();
  for (const d of DEPARTMENTS) {
    const existing = await prisma.department.findUnique({ where: { code: d.code } });
    const data = {
      name: d.name,
      type: d.type as never,
      categories: d.categories,
      jurisdictionLevel: (d.jurisdictionLevel ?? 'STATE') as never,
      district: d.district ?? null,
      description: d.description ?? null,
      contactEmail: d.contactEmail ?? null,
      isDemo: true,
      active: true,
    };
    const row = existing
      ? await prisma.department.update({ where: { code: d.code }, data })
      : await prisma.department.create({ data: { code: d.code, ...data } });
    deptIds.set(d.code, row.id);
  }
  console.log(`  ✓ ${DEPARTMENTS.length} departments`);

  // ---- 4. users ----
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userIds = new Map<string, string>();
  const citizenIds = new Map<string, string>();
  const talukJurisdictions = await prisma.jurisdiction.findMany({
    where: { level: 'TALUK' },
    select: { id: true, name: true },
  });

  for (const u of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    const taluk = u.talukJurisdiction
      ? talukJurisdictions.find((t) => t.name === u.talukJurisdiction)
      : undefined;
    const data = {
      name: u.name,
      role: u.role as never,
      passwordHash,
      isActive: true,
      departmentId: u.deptCode ? deptIds.get(u.deptCode) ?? null : null,
      jurisdictionId: taluk?.id ?? null,
    };
    const row = existing
      ? await prisma.user.update({ where: { email: u.email }, data })
      : await prisma.user.create({ data: { email: u.email, ...data } });
    userIds.set(u.email, row.id);

    if (u.role === 'CITIZEN') {
      const cit = await prisma.citizen.upsert({
        where: { userId: row.id },
        update: { name: u.name, preferredLanguage: 'en' },
        create: { userId: row.id, name: u.name, preferredLanguage: 'en' },
      });
      citizenIds.set(u.email, cit.id);
    } else {
      // staff also get a citizen row? not required — skip
    }
  }
  console.log(`  ✓ ${USERS.length} demo users`);

  // ---- 5. escalation rules ----
  const triageId = deptIds.get('CIVIC-TRIAGE')!;
  const pwdId = deptIds.get('PWD')!;
  const rules = [
    {
      name: 'Critical complaints unresolved after 48 hours',
      category: null as string | null,
      priority: 'CRITICAL' as Priority,
      hoursToEscalate: 48,
      targetDepartmentId: triageId,
    },
    {
      name: 'Pothole complaints open beyond 5 days',
      category: 'road_damage',
      priority: null as Priority | null,
      hoursToEscalate: 120,
      targetDepartmentId: pwdId,
    },
  ];
  for (const r of rules) {
    const existing = await prisma.escalationRule.findFirst({ where: { name: r.name } });
    if (existing) {
      await prisma.escalationRule.update({ where: { id: existing.id }, data: { ...r, active: true } });
    } else {
      await prisma.escalationRule.create({ data: { ...r, active: true, isDemo: true } });
    }
  }
  console.log(`  ✓ ${rules.length} escalation rules`);

  // ---- 6. complaints ----
  const staffNotify = new Map<string, Set<string>>(); // deptId → userIds
  let resolvedCount = 0;

  for (const c of COMPLAINTS) {
    const complaintId = `CCAI-2026-${String(c.seq).padStart(6, '0')}`;
    const citizenId = citizenIds.get(c.citizenEmail)!;
    const departmentId = deptIds.get(c.deptCode)!;
    const officerId = c.officerEmail ? userIds.get(c.officerEmail) ?? null : null;
    const districtJur = districtIds.get(c.district) ?? null;
    const created = daysAgo(c.daysAgo);
    const resolvedAt = c.resolvedDaysAgo ? daysAgo(c.resolvedDaysAgo) : c.status === 'RESOLVED' ? daysAgo(c.daysAgo - 5) : null;
    const trackingHash = hashTrackingToken(`demo-track-${String(c.seq).padStart(2, '0')}`);

    const base = {
      citizenId,
      originalText: c.text,
      normalizedText: c.summary.toLowerCase(),
      summary: c.summary,
      language: c.language,
      category: c.category,
      priority: c.priority,
      status: c.status,
      district: c.district,
      taluk: c.taluk ?? null,
      city: c.city ?? null,
      landmark: c.landmark ?? null,
      jurisdictionId: districtJur,
      departmentId,
      assignedOfficerId: officerId,
      aiConfidence: c.confidence,
      aiReasoning: `Seeded demo classification (${c.category}, confidence ${c.confidence}).`,
      aiProvider: 'demo',
      requiresManualReview: c.manualReview ?? false,
      routingExplanation: `AI recommended "${c.category}" → validated against configured departments → routed to department code ${c.deptCode}.`,
      trackingHash,
      isDemo: true,
      emergency: c.emergency ?? false,
      safetyRisk: c.priority === 'CRITICAL',
      resolvedAt,
      resolutionNote: c.resolutionNote ?? null,
      createdAt: created,
      updatedAt: resolvedAt ?? created,
    };

    const complaint = await prisma.complaint.upsert({
      where: { complaintId },
      update: base,
      create: { complaintId, ...base },
    });

    // assignment row
    const existingAssign = await prisma.assignment.findFirst({
      where: { complaintId: complaint.id },
    });
    if (!existingAssign) {
      await prisma.assignment.create({
        data: {
          complaintId: complaint.id,
          departmentId,
          officerId,
          assignedById: userIds.get('admin@civicconnect.demo')!,
          reason: 'Seeded routing: category and district matched department configuration.',
          createdAt: created,
        },
      });
    }

    // status history updates
    const existingUpdates = await prisma.complaintUpdate.count({
      where: { complaintId: complaint.id },
    });
    if (existingUpdates === 0) {
      const adminId = userIds.get('admin@civicconnect.demo')!;
      const chain: { kind: 'STATUS' | 'ASSIGNMENT' | 'NOTE' | 'INFO_REQUEST' | 'RESOLUTION' | 'ESCALATION'; from?: ComplaintStatus; to?: ComplaintStatus; note?: string; isPublic: boolean; at: Date }[] = [
        { kind: 'STATUS', to: 'SUBMITTED', isPublic: true, note: 'Complaint registered through CivicConnect AI.', at: created },
        { kind: 'ASSIGNMENT', from: 'SUBMITTED', to: 'ASSIGNED', isPublic: true, note: `Routed to ${c.deptCode}.`, at: daysAgo(c.daysAgo - 0.2) },
      ];
      if (c.status === 'AWAITING_CITIZEN_INFO') {
        chain.push({ kind: 'INFO_REQUEST', to: 'AWAITING_CITIZEN_INFO', isPublic: true, note: 'Please share the nearest landmark and a photo so we can locate the dead street lights.', at: daysAgo(c.daysAgo - 1) });
      }
      if (c.status === 'ESCALATED') {
        chain.push({ kind: 'ESCALATION', to: 'ESCALATED', isPublic: true, note: 'Escalated to the supervisory desk — power outage crossing 24 hours.', at: daysAgo(c.daysAgo - 2) });
      }
      if (c.status === 'IN_PROGRESS') {
        chain.push({ kind: 'STATUS', from: 'ASSIGNED', to: 'IN_PROGRESS', isPublic: true, note: 'Field team scheduled for inspection.', at: daysAgo(c.daysAgo - 1) });
      }
      if (c.status === 'ACKNOWLEDGED') {
        chain.push({ kind: 'STATUS', from: 'ASSIGNED', to: 'ACKNOWLEDGED', isPublic: true, note: 'Complaint acknowledged by the department.', at: daysAgo(c.daysAgo - 1) });
      }
      if (resolvedAt) {
        chain.push({ kind: 'STATUS', from: 'IN_PROGRESS', to: 'RESOLVED', isPublic: true, note: c.resolutionNote ?? 'Work completed and verified.', at: resolvedAt });
      }
      for (const u of chain) {
        await prisma.complaintUpdate.create({
          data: {
            complaintId: complaint.id,
            kind: u.kind,
            fromStatus: u.from ?? null,
            toStatus: u.to ?? null,
            note: u.note ?? null,
            isPublic: u.isPublic,
            actorId: u.kind === 'STATUS' && u.to === 'SUBMITTED' ? null : adminId,
            createdAt: u.at,
          },
        });
      }
      if (resolvedAt) resolvedCount += 1;
    }

    // staff notifications (a few, so the bell has demo data)
    if (!staffNotify.has(departmentId)) staffNotify.set(departmentId, new Set());
    const targets = staffNotify.get(departmentId)!;
    if (officerId) targets.add(officerId);
  }

  // notifications for demo staff (triage + super admin + one officer)
  const notifyTargets: [userId: string, type: 'COMPLAINT_SUBMITTED' | 'ASSIGNED' | 'STATUS_CHANGED' | 'ESCALATED', title: string, body: string, complaintSeq: number, at: Date][] = [
    [userIds.get('admin@civicconnect.demo')!, 'ESCALATED', 'CCAI-2026-000004 escalated', 'Transformer fault complaint escalated after 24h without power.', 4, daysAgo(2)],
    [userIds.get('triage@civicconnect.demo')!, 'COMPLAINT_SUBMITTED', 'New complaint CCAI-2026-000012 needs routing', 'Category "other" requires manual department selection.', 12, daysAgo(2)],
    [userIds.get('bbmp@civicconnect.demo')!, 'ASSIGNED', 'CCAI-2026-000001 assigned to you', 'Roads and potholes — Koramangala 80 Feet Road.', 1, daysAgo(42)],
    [userIds.get('health@civicconnect.demo')!, 'STATUS_CHANGED', 'CCAI-2026-000007 resolved', 'Anti-larval treatment completed near government school.', 7, daysAgo(50)],
    [userIds.get('power@civicconnect.demo')!, 'COMPLAINT_SUBMITTED', 'New complaint CCAI-2026-000008', 'Critical road safety issue at Marathahalli junction.', 8, daysAgo(2)],
  ];
  for (const [userId, type, title, body, seq, at] of notifyTargets) {
    if (!userId) continue;
    const complaint = await prisma.complaint.findUnique({
      where: { complaintId: `CCAI-2026-${String(seq).padStart(6, '0')}` },
      select: { id: true },
    });
    const existing = await prisma.notification.findFirst({
      where: { userId, title, createdAt: at },
    });
    if (existing) continue;
    await prisma.notification.create({
      data: {
        userId, type, title, body,
        complaintId: complaint?.id ?? null,
        createdAt: at,
        // first three seeded as unread so the badge shows demo data
        readAt: seq <= 3 ? null : at,
      },
    });
  }

  // ---- 7. counter so real registrations continue after the seeded IDs ----
  await prisma.counter.upsert({
    where: { key: 'complaint-2026' },
    update: { value: Math.max(COMPLAINTS.length, (await prisma.counter.findUnique({ where: { key: 'complaint-2026' } }))?.value ?? 0) },
    create: { key: 'complaint-2026', value: COMPLAINTS.length },
  });

  const totals = {
    departments: await prisma.department.count(),
    jurisdictions: await prisma.jurisdiction.count(),
    users: await prisma.user.count(),
    complaints: await prisma.complaint.count(),
    updates: await prisma.complaintUpdate.count(),
    notifications: await prisma.notification.count(),
    resolved: resolvedCount,
  };
  console.log('  ✓ demo complaints + notifications + counter');
  console.log('Seed complete:', totals);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
