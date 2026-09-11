import {NextResponse} from 'next/server';
import {fetchCourseByIdentifier, fetchProgram} from '@/server/viax';
import {
  fetchPartnerCourse,
  fetchPartnerCourseRuns,
  fetchPartnerEdOrgs,
  fetchPartnerInstructors,
  fetchPartnerProgram,
  PARTNER_INCLUSION_FIELD,
  selectCourseRun,
} from '@/server/partner-api';
import type {
  CourseRunSelection,
  PartnerEdOrgNode,
  PartnerInstructorNode,
} from '@/app/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function fetchSide<T>(fn: () => Promise<T | null>): Promise<{item: T | null; error?: string}> {
  try {
    return {item: await fn()};
  } catch (err) {
    return {item: null, error: (err as Error).message};
  }
}

async function compareProgram(id: string) {
  const [viax, partner] = await Promise.all([
    fetchSide(() => fetchProgram(id)),
    fetchSide(() => fetchPartnerProgram(id)),
  ]);

  let instructors: {items: PartnerInstructorNode[]; error?: string} = {items: []};
  if (partner.item) {
    const staffUuids = (partner.item.staff ?? []).map((s) => s.uuid).filter((u): u is string => Boolean(u));
    const instructorsResult = await fetchSide(() => fetchPartnerInstructors(staffUuids));
    instructors = {items: instructorsResult.item ?? [], error: instructorsResult.error};
  }

  return NextResponse.json({type: 'program', id, viax, partner, instructors});
}

async function compareCourse(id: string) {
  const [viax, partner] = await Promise.all([
    fetchSide(() => fetchCourseByIdentifier(id)),
    fetchSide(() => fetchPartnerCourse(id)),
  ]);

  let courseRun: {selection: CourseRunSelection; error?: string} = {
    selection: {rule: 'none', run: null, totalRuns: 0, seatPrice: null, seatType: null},
  };
  let instructors: {items: PartnerInstructorNode[]; error?: string} = {items: []};
  let edOrgs: {items: PartnerEdOrgNode[]; error?: string} = {items: []};

  if (partner.item) {
    const partnerCourse = partner.item;
    // The subscription-inclusion field's name varies by environment (PARTNER_INCLUSION_FIELD) —
    // normalize it onto the fixed key CompareView reads (b2c_subscription_inclusion).
    if (partnerCourse.b2c_subscription_inclusion === undefined) {
      partnerCourse.b2c_subscription_inclusion = partnerCourse[PARTNER_INCLUSION_FIELD] as boolean | undefined;
    }
    const ownerUuids = (partnerCourse.owners ?? []).map((o) => o.uuid).filter((u): u is string => Boolean(u));

    const [runsResult, edOrgsResult] = await Promise.all([
      fetchSide(() => fetchPartnerCourseRuns(partnerCourse.uuid)),
      fetchSide(() => fetchPartnerEdOrgs(ownerUuids)),
    ]);

    const runs = runsResult.item ?? [];
    courseRun = {selection: selectCourseRun(partnerCourse, runs), error: runsResult.error};
    edOrgs = {items: edOrgsResult.item ?? [], error: edOrgsResult.error};

    const selectedRun = courseRun.selection.run;
    if (selectedRun) {
      const staffUuids = (selectedRun.staff ?? selectedRun.instructors ?? [])
        .map((s) => s.uuid)
        .filter((u): u is string => Boolean(u));
      const instructorsResult = await fetchSide(() => fetchPartnerInstructors(staffUuids));
      instructors = {items: instructorsResult.item ?? [], error: instructorsResult.error};
    }
  }

  return NextResponse.json({type: 'course', id, viax, partner, courseRun, instructors, edOrgs});
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') === 'program' ? 'program' : 'course';
  // `course` is kept as a fallback so any existing bookmarks/links to the old param still work.
  const id = (url.searchParams.get('id') ?? url.searchParams.get('course'))?.trim();
  if (!id) return NextResponse.json({error: 'id query param is required'}, {status: 400});

  return type === 'program' ? compareProgram(id) : compareCourse(id);
}
