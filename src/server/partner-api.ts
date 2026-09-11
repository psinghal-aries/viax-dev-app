import 'server-only';

// edX Partner API access (catalog sync source — SUBS-586/587/588). Each resource (courses,
// course-runs, instructors, ed-orgs) is keyed by uuid/key/course_uuid query params against
// PARTNER_API_BASE_URL with an X-API-KEY header, with the same env-configurable suffix applied to
// every resource name (e.g. "courses-stg", "course-runs-stg"). The same uuid/key values are what
// VIAX carries over as `maId`/`tCourseKey` post-migration, so a lookup here lines up 1:1 with viax.ts.

import type {
  CourseRunSelection,
  PartnerCourseNode,
  PartnerCourseRunNode,
  PartnerEdOrgNode,
  PartnerInstructorNode,
  PartnerProgramNode,
} from '@/app/types';

const PARTNER_API_BASE_URL = process.env.PARTNER_API_BASE_URL;
const PARTNER_API_KEY = process.env.PARTNER_API_KEY;
const PARTNER_API_RESOURCE_SUFFIX = process.env.PARTNER_API_RESOURCE_SUFFIX ?? '';
const PARTNER_API_CACHE_TTL_MS = Number(process.env.PARTNER_API_CACHE_TTL_MS ?? 300_000);

// Name of the field on a course element that carries subscription-inclusion status; configurable
// because it has varied across environments (enterprise_subscription_inclusion, b2c_subscription_inclusion).
export const PARTNER_INCLUSION_FIELD = process.env.PARTNER_INCLUSION_FIELD ?? 'enterprise_subscription_inclusion';

interface ElementsResponse<T> {
  name: string;
  elements: T[];
  links?: {rel: string; title: string; href: string}[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function partnerRequest<T>(resource: string, params: Record<string, string>): Promise<ElementsResponse<T>> {
  if (!PARTNER_API_BASE_URL) throw new Error('PARTNER_API_BASE_URL is not set');
  if (!PARTNER_API_KEY) throw new Error('PARTNER_API_KEY is not set');

  const url = new URL(`${PARTNER_API_BASE_URL}/products/${resource}${PARTNER_API_RESOURCE_SUFFIX}`);
  url.searchParams.set('$start_index', '0');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url, {headers: {'X-API-KEY': PARTNER_API_KEY}});
  if (!res.ok) throw new Error(`Partner API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as ElementsResponse<T>;
}

function makeCache<T>() {
  return new Map<string, {value: T; expiresAt: number}>();
}

function readCache<T>(cache: Map<string, {value: T; expiresAt: number}>, key: string): T | undefined {
  const hit = cache.get(key);
  return hit && hit.expiresAt > Date.now() ? hit.value : undefined;
}

function writeCache<T>(cache: Map<string, {value: T; expiresAt: number}>, key: string, value: T): void {
  cache.set(key, {value, expiresAt: Date.now() + PARTNER_API_CACHE_TTL_MS});
}

const courseCache = makeCache<PartnerCourseNode | null>();

// Accepts either a course uuid or a course key and queries the matching param.
export async function fetchPartnerCourse(idOrKey: string): Promise<PartnerCourseNode | null> {
  const trimmed = idOrKey.trim();
  const cacheKey = trimmed.toLowerCase();
  const hit = readCache(courseCache, cacheKey);
  if (hit !== undefined) return hit;

  const data = await partnerRequest<PartnerCourseNode>(
    'courses',
    UUID_RE.test(trimmed) ? {uuid: trimmed} : {key: trimmed},
  );
  const value = data.elements?.[0] ?? null;
  writeCache(courseCache, cacheKey, value);
  return value;
}

const programCache = makeCache<PartnerProgramNode | null>();

// Programs only take a uuid (no `key` param, unlike courses).
export async function fetchPartnerProgram(uuid: string): Promise<PartnerProgramNode | null> {
  const trimmed = uuid.trim();
  const cacheKey = trimmed.toLowerCase();
  const hit = readCache(programCache, cacheKey);
  if (hit !== undefined) return hit;

  const data = await partnerRequest<PartnerProgramNode>('programs', {uuid: trimmed});
  const value = data.elements?.[0] ?? null;
  writeCache(programCache, cacheKey, value);
  return value;
}

const courseRunsCache = makeCache<PartnerCourseRunNode[]>();

// All runs for a course, by the course's uuid (GET /products/course-runs{suffix}?course_uuid=...).
export async function fetchPartnerCourseRuns(courseUuid: string): Promise<PartnerCourseRunNode[]> {
  const cacheKey = courseUuid.trim().toLowerCase();
  const hit = readCache(courseRunsCache, cacheKey);
  if (hit !== undefined) return hit;

  const data = await partnerRequest<PartnerCourseRunNode>('course-runs', {course_uuid: courseUuid});
  const value = data.elements ?? [];
  writeCache(courseRunsCache, cacheKey, value);
  return value;
}

// A run's seat price: its first_enrollable_paid_seat_price, else the first seat priced above 0,
// else null (e.g. an audit-only run).
export function selectSeatPrice(run: PartnerCourseRunNode | null): number | null {
  if (!run) return null;
  if (typeof run.first_enrollable_paid_seat_price === 'number') return run.first_enrollable_paid_seat_price;
  const seat = (run.seats ?? []).find((s) => typeof s.price === 'number' && s.price > 0);
  return seat?.price ?? null;
}

// VIAX collapses a run's seats down to a single tMode (VERIFIED/AUDIT/PROFESSIONAL, no compound
// codes) and drops credit/honor seats entirely — a credit seat rides on top of a verified/audit
// seat rather than being its own mode. Mirror that here: highest of professional > verified >
// audit; if none of those are present, fall back to whatever non-credit/honor seat type remains.
const SEAT_TYPE_PRIORITY = ['professional', 'verified', 'audit'];
const SEAT_TYPES_TO_DROP = new Set(['credit', 'honor']);

export function selectSeatType(run: PartnerCourseRunNode | null): string | null {
  if (!run) return null;
  const types = new Set((run.seats ?? []).map((s) => s.type).filter((t): t is string => Boolean(t)));

  for (const tier of SEAT_TYPE_PRIORITY) {
    if (types.has(tier)) return tier;
  }
  const remaining = [...types].filter((t) => !SEAT_TYPES_TO_DROP.has(t));
  return remaining[0] ?? null;
}

// Course-run selection: the course's advertised run, else its canonical run key, else the first
// run the API returns for that course.
export function selectCourseRun(course: PartnerCourseNode, runs: PartnerCourseRunNode[]): CourseRunSelection {
  if (!runs.length) return {rule: 'none', run: null, totalRuns: 0, seatPrice: null, seatType: null};

  if (course.advertised_course_run_uuid) {
    const run = runs.find((r) => r.uuid === course.advertised_course_run_uuid);
    if (run) {
      return {
        rule: 'advertised_course_run_uuid',
        run,
        totalRuns: runs.length,
        seatPrice: selectSeatPrice(run),
        seatType: selectSeatType(run),
      };
    }
  }
  if (course.canonical_course_run_key) {
    const run = runs.find((r) => r.key === course.canonical_course_run_key);
    if (run) {
      return {
        rule: 'canonical_course_run_key',
        run,
        totalRuns: runs.length,
        seatPrice: selectSeatPrice(run),
        seatType: selectSeatType(run),
      };
    }
  }
  return {
    rule: 'first_available',
    run: runs[0],
    totalRuns: runs.length,
    seatPrice: selectSeatPrice(runs[0]),
    seatType: selectSeatType(runs[0]),
  };
}

const instructorCache = makeCache<PartnerInstructorNode | null>();

async function fetchPartnerInstructor(uuid: string): Promise<PartnerInstructorNode | null> {
  const cacheKey = uuid.trim().toLowerCase();
  const hit = readCache(instructorCache, cacheKey);
  if (hit !== undefined) return hit;

  const data = await partnerRequest<PartnerInstructorNode>('instructors', {uuid});
  const value = data.elements?.[0] ?? null;
  writeCache(instructorCache, cacheKey, value);
  return value;
}

// Resolves each distinct instructor uuid in parallel (GET /products/instructors{suffix}?uuid=...);
// missing or failed lookups are dropped rather than failing the whole batch.
export async function fetchPartnerInstructors(uuids: string[]): Promise<PartnerInstructorNode[]> {
  const unique = [...new Set(uuids.map((u) => u.trim()).filter(Boolean))];
  const results = await Promise.all(unique.map((uuid) => fetchPartnerInstructor(uuid).catch(() => null)));
  return results.filter((r): r is PartnerInstructorNode => r !== null);
}

const edOrgCache = makeCache<PartnerEdOrgNode | null>();

async function fetchPartnerEdOrg(uuid: string): Promise<PartnerEdOrgNode | null> {
  const cacheKey = uuid.trim().toLowerCase();
  const hit = readCache(edOrgCache, cacheKey);
  if (hit !== undefined) return hit;

  const data = await partnerRequest<PartnerEdOrgNode>('ed-orgs', {uuid});
  const value = data.elements?.[0] ?? null;
  writeCache(edOrgCache, cacheKey, value);
  return value;
}

// Resolves each distinct ed-org uuid in parallel (GET /products/ed-orgs{suffix}?uuid=...);
// missing or failed lookups are dropped rather than failing the whole batch.
export async function fetchPartnerEdOrgs(uuids: string[]): Promise<PartnerEdOrgNode[]> {
  const unique = [...new Set(uuids.map((u) => u.trim()).filter(Boolean))];
  const results = await Promise.all(unique.map((uuid) => fetchPartnerEdOrg(uuid).catch(() => null)));
  return results.filter((r): r is PartnerEdOrgNode => r !== null);
}
