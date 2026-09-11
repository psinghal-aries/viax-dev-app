'use client';

import {useEffect, useState} from 'react';
import type {
  CourseRunSelection,
  PartnerCourseNode,
  PartnerEdOrgNode,
  PartnerInstructorNode,
  PartnerProgramNode,
  ViaxCatalogNode,
} from '../app/types';

type CompareType = 'course' | 'program';

interface CourseCompareResponse {
  type: 'course';
  id: string;
  viax: {item: ViaxCatalogNode | null; error?: string};
  partner: {item: PartnerCourseNode | null; error?: string};
  courseRun: {selection: CourseRunSelection; error?: string};
  instructors: {items: PartnerInstructorNode[]; error?: string};
  edOrgs: {items: PartnerEdOrgNode[]; error?: string};
  error?: string;
}

interface ProgramCompareResponse {
  type: 'program';
  id: string;
  viax: {item: ViaxCatalogNode | null; error?: string};
  partner: {item: PartnerProgramNode | null; error?: string};
  instructors: {items: PartnerInstructorNode[]; error?: string};
  error?: string;
}

type CompareResponse = CourseCompareResponse | ProgramCompareResponse;

const SELECTION_RULE_LABEL: Record<CourseRunSelection['rule'], string> = {
  advertised_course_run_uuid: "Matched course's advertised_course_run_uuid",
  canonical_course_run_key: "Matched course's canonical_course_run_key",
  first_available: 'No advertised/canonical match — used first available run',
  none: 'No course runs found',
};

interface ViaxInstructor {
  tGivenName?: string;
  tFamilyName?: string;
}

interface ViaxSchool {
  tName?: string;
}

interface ViaxProgramCourseRef {
  maId?: string;
  maName?: string;
}

function fullName(given?: string, family?: string): string {
  return [given, family].filter(Boolean).join(' ').trim();
}

type FieldKind = 'text' | 'html' | 'bool' | 'number' | 'list';

interface CourseRow {
  label: string;
  kind: FieldKind;
  viax: (n: ViaxCatalogNode) => unknown;
  partner: (n: PartnerCourseNode) => unknown;
}

const COURSE_ROWS: CourseRow[] = [
  {label: 'UUID', kind: 'text', viax: (n) => n.maId, partner: (n) => n.uuid},
  {label: 'Course key', kind: 'text', viax: (n) => n.tCourseKey, partner: (n) => n.key},
  {label: 'Title', kind: 'text', viax: (n) => n.maName, partner: (n) => n.title},
  {
    label: 'Short description',
    kind: 'html',
    viax: (n) => n.tShortDescription,
    partner: (n) => n.short_description,
  },
  {label: 'Full description', kind: 'html', viax: (n) => n.maDescription, partner: (n) => n.full_description},
  {label: 'Subject', kind: 'text', viax: (n) => n.tPrimarySubjectArea, partner: (n) => n.subjects?.[0]?.name},
  {label: 'Level', kind: 'text', viax: (n) => n.tLevelType, partner: (n) => n.level_type},
  {
    label: 'Organization(s)',
    kind: 'text',
    viax: (n) => n.tBrandText,
    partner: (n) => n.owners?.map((o) => o.name).join(', '),
  },
  {label: 'Image', kind: 'text', viax: (n) => n.imageUrl, partner: (n) => n.image},
  {label: 'Marketing URL', kind: 'text', viax: (n) => n.tUrlCourse, partner: (n) => n.marketing_url},
  {label: 'Marketing slug', kind: 'text', viax: (n) => n.tMarketingSlug, partner: (n) => n.url_slug},
  {label: 'Enrollment count', kind: 'number', viax: (n) => n.tEnrollmentCount, partner: (n) => n.enrollment_count},
  {
    label: 'Skills',
    kind: 'list',
    viax: (n) => n.tSkills,
    partner: (n) => n.skills ?? n.skill_names,
  },
  {
    label: "What you'll learn",
    kind: 'list',
    viax: (n) => n.tExpectedLearningItems,
    partner: (n) => n.expected_learning_items,
  },
  {label: 'Prerequisites', kind: 'html', viax: (n) => n.tPrerequisites, partner: (n) => n.prerequisites_raw},
  {label: 'Syllabus', kind: 'html', viax: (n) => n.tSyllabus, partner: (n) => n.syllabus_raw},
  {label: 'FAQ', kind: 'html', viax: (n) => n.tFaq, partner: (n) => n.faq},
  {label: 'Testimonials', kind: 'html', viax: (n) => n.tTestimonials, partner: (n) => n.learner_testimonials},
  {
    label: 'Status',
    kind: 'text',
    viax: (n) => (n.tStatus as {code?: string; name?: string} | undefined)?.name,
    partner: (n) => n.course_run_statuses?.[0]?.status,
  },
  {
    label: 'B2C subscription inclusion',
    kind: 'bool',
    viax: (n) => n.tB2cSubscriptionInclusion,
    partner: (n) => n.b2c_subscription_inclusion,
  },
  {
    label: 'Excluded from search',
    kind: 'bool',
    viax: (n) => n.tExcludedFromSearch,
    partner: (n) => n.excluded_from_search,
  },
  {
    label: 'Has OFAC restrictions',
    kind: 'bool',
    viax: (n) => n.tHasOfacRestrictions,
    partner: (n) => n.has_ofac_restrictions,
  },
  {
    label: 'Last modified (source)',
    kind: 'text',
    viax: (n) => n.tSourceModifiedAt,
    partner: (n) => n.modified ?? n.data_modified_timestamp,
  },
];

interface ProgramRow {
  label: string;
  kind: FieldKind;
  viax: (n: ViaxCatalogNode) => unknown;
  partner: (n: PartnerProgramNode) => unknown;
}

const PROGRAM_ROWS: ProgramRow[] = [
  {label: 'UUID', kind: 'text', viax: (n) => n.maId, partner: (n) => n.uuid},
  {label: 'Title', kind: 'text', viax: (n) => n.maName, partner: (n) => n.title},
  {label: 'Subtitle', kind: 'text', viax: (n) => n.tSubtitle, partner: (n) => n.subtitle},
  {label: 'Marketing hook', kind: 'text', viax: (n) => n.tMarketingHook, partner: (n) => n.marketing_hook},
  {
    label: 'Program type',
    kind: 'text',
    viax: (n) => (n.tProgramType as {code?: string; name?: string} | undefined)?.code,
    partner: (n) => n.type,
  },
  {
    label: 'Organization(s)',
    kind: 'text',
    viax: (n) => n.tBrandText,
    partner: (n) => n.authoring_organizations?.map((o) => o.name).join(', '),
  },
  {
    label: 'Subject',
    kind: 'text',
    viax: (n) => n.tPrimarySubjectArea,
    partner: (n) => n.primary_subject_override?.[0]?.name ?? n.subjects?.[0]?.name,
  },
  {
    label: 'Language',
    kind: 'text',
    viax: (n) => n.tLanguage,
    partner: (n) => n.languages?.[0]?.language_code ?? n.language_override,
  },
  {label: 'Level', kind: 'text', viax: (n) => n.tLevelType, partner: (n) => n.level_type_override?.[0]?.name},
  {
    label: 'Duration (weeks, low–high)',
    kind: 'text',
    viax: (n) => [n.tDurationLow, n.tDurationHigh].filter((v) => v !== undefined && v !== null).join('–'),
    partner: (n) => [n.weeks_to_complete_min, n.weeks_to_complete_max].filter((v) => v !== null && v !== undefined).join('–'),
  },
  {
    label: 'Effort (hrs/wk, low–high)',
    kind: 'text',
    viax: (n) => [n.tEffortLow, n.tEffortHigh].filter((v) => v !== undefined && v !== null).join('–'),
    partner: (n) =>
      [n.min_hours_effort_per_week, n.max_hours_effort_per_week].filter((v) => v !== null && v !== undefined).join('–'),
  },
  {
    label: 'Total hours of effort',
    kind: 'number',
    viax: (n) => n.tTotalHoursOfEffort,
    partner: (n) => n.total_hours_of_effort,
  },
  {
    label: 'Status',
    kind: 'text',
    viax: (n) => (n.tStatus as {code?: string; name?: string} | undefined)?.name,
    partner: (n) => n.status,
  },
  {label: 'Hidden', kind: 'bool', viax: (n) => n.tHidden, partner: (n) => n.hidden},
  {label: 'Marketing URL', kind: 'text', viax: (n) => n.tUrlProgram, partner: (n) => n.marketing_url},
  {label: 'Marketing slug', kind: 'text', viax: (n) => n.tMarketingSlug, partner: (n) => n.marketing_slug},
  {label: 'Banner image', kind: 'text', viax: (n) => n.tBannerImageUrl, partner: (n) => n.banner_image_url},
  {label: 'Org logo', kind: 'text', viax: (n) => n.tOrgLogoUrl, partner: (n) => n.organization_logo_override},
  {
    label: "What you'll learn",
    kind: 'list',
    viax: (n) => n.tExpectedLearningItems,
    partner: (n) => (n.expected_learning_items ?? []).map((i) => i.value).filter(Boolean),
  },
  {
    label: 'Related topics',
    kind: 'list',
    viax: (n) => n.tRelatedTopics,
    partner: (n) =>
      [...(n.subjects ?? []).map((s) => s.name), ...(n.labels ?? []).map((l) => l.name)].filter(Boolean),
  },
  {
    label: 'Skills',
    kind: 'list',
    viax: (n) => n.tSkills,
    partner: (n) => n.skills ?? (n.skill_names ?? []).map((s) => s.field_0).filter(Boolean),
  },
  {label: 'FAQ', kind: 'html', viax: (n) => n.tFaq, partner: (n) => n.faq},
  {label: 'Enrollment count', kind: 'number', viax: (n) => n.tEnrollmentCount, partner: (n) => n.enrollment_count},
  {
    label: 'Excluded from search',
    kind: 'bool',
    viax: (n) => n.tExcludedFromSearch,
    partner: (n) => n.excluded_from_search,
  },
  {
    label: 'Has OFAC restrictions',
    kind: 'bool',
    viax: (n) => n.tHasOfacRestrictions,
    partner: (n) => n.has_ofac_restrictions,
  },
  {label: 'OFAC comment', kind: 'text', viax: (n) => n.tOfacComment, partner: (n) => n.ofac_comment},
  {
    label: 'Last modified (source)',
    kind: 'text',
    viax: (n) => n.tSourceModifiedAt,
    partner: (n) => n.modified ?? n.data_modified_timestamp,
  },
];

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

function normalize(value: unknown, kind: FieldKind): string {
  if (value === undefined || value === null) return '';
  if (kind === 'html' && typeof value === 'string') return stripHtml(value).toLowerCase();
  if (kind === 'list' && Array.isArray(value)) return [...value].map(String).sort().join('|').toLowerCase();
  if (kind === 'bool') return String(Boolean(value));
  return String(value).trim().toLowerCase();
}

function display(value: unknown, kind: FieldKind): string {
  if (value === undefined || value === null || value === '') return '—';
  if (kind === 'html' && typeof value === 'string') return stripHtml(value) || '—';
  if (kind === 'list' && Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (kind === 'bool') return value ? 'Yes' : 'No';
  return String(value);
}

function MatchBadge({match}: {match: boolean}) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
        match ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {match ? 'match' : 'differs'}
    </span>
  );
}

function SourceError({label, error}: {label: string; error: string}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {label}: {error}
    </div>
  );
}

function TableHead() {
  return (
    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
      <tr>
        <th className="px-3 py-2 font-medium">Field</th>
        <th className="px-3 py-2 font-medium">VIAX</th>
        <th className="px-3 py-2 font-medium">Partner API</th>
        <th className="px-3 py-2 font-medium">Status</th>
      </tr>
    </thead>
  );
}

function CompareRow({
  label,
  viaxDisplay,
  partnerDisplay,
  match,
  bothPresent,
}: {
  label: string;
  viaxDisplay: string;
  partnerDisplay: string;
  match: boolean;
  bothPresent: boolean;
}) {
  return (
    <tr className="align-top">
      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">{label}</td>
      <td className="max-w-xs px-3 py-2 text-slate-700">{viaxDisplay}</td>
      <td className="max-w-xs px-3 py-2 text-slate-700">{partnerDisplay}</td>
      <td className="px-3 py-2">{bothPresent ? <MatchBadge match={match} /> : null}</td>
    </tr>
  );
}

export default function CompareView({type, id}: {type: CompareType; id: string}) {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/compare?type=${type}&id=${encodeURIComponent(id)}`, {cache: 'no-store'});
        const json = (await res.json()) as CompareResponse & {error?: string};
        if (!res.ok) throw new Error(json.error ?? 'Failed to load');
        if (active) setData(json);
      } catch (err) {
        if (active) setError((err as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [type, id]);

  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="py-16 text-center text-sm text-slate-500">Loading…</div>;

  const viaxNode = data.viax.item;
  const bothPresent = viaxNode !== null && data.partner.item !== null;

  const viaxInstructorNames = ((viaxNode?.tInstructors as ViaxInstructor[] | undefined) ?? [])
    .map((i) => fullName(i.tGivenName, i.tFamilyName))
    .filter(Boolean);
  const partnerInstructorNames = data.instructors.items
    .map((i) => fullName(i.first_name, i.last_name))
    .filter(Boolean);
  const instructorsMatch = normalize(viaxInstructorNames, 'list') === normalize(partnerInstructorNames, 'list');

  if (data.type === 'program') {
    const partnerNode = data.partner.item;

    const viaxProgramCourses = ((viaxNode?.tCourses as ViaxProgramCourseRef[] | undefined) ?? [])
      .map((c) => c.maName)
      .filter((n): n is string => Boolean(n));
    const partnerProgramCourses = (partnerNode?.courses ?? [])
      .map((c) => c.title)
      .filter((n): n is string => Boolean(n));

    return (
      <div className="space-y-4">
        {data.viax.error ? <SourceError label="VIAX" error={data.viax.error} /> : null}
        {data.partner.error ? <SourceError label="Partner API" error={data.partner.error} /> : null}

        {!viaxNode && !partnerNode ? (
          <div className="py-16 text-center text-sm text-slate-500">No program found in either source.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <TableHead />
              <tbody className="divide-y divide-slate-100">
                {PROGRAM_ROWS.map((row) => {
                  const vRaw = viaxNode ? row.viax(viaxNode) : undefined;
                  const pRaw = partnerNode ? row.partner(partnerNode) : undefined;
                  const match = bothPresent && normalize(vRaw, row.kind) === normalize(pRaw, row.kind);
                  return (
                    <CompareRow
                      key={row.label}
                      label={row.label}
                      viaxDisplay={display(vRaw, row.kind)}
                      partnerDisplay={display(pRaw, row.kind)}
                      match={match}
                      bothPresent={bothPresent}
                    />
                  );
                })}
                <CompareRow
                  label="Instructors"
                  viaxDisplay={display(viaxInstructorNames, 'list')}
                  partnerDisplay={display(partnerInstructorNames, 'list')}
                  match={instructorsMatch}
                  bothPresent={bothPresent}
                />
                <CompareRow
                  label="Courses in program"
                  viaxDisplay={display(viaxProgramCourses, 'list')}
                  partnerDisplay={display(partnerProgramCourses, 'list')}
                  match={normalize(viaxProgramCourses, 'list') === normalize(partnerProgramCourses, 'list')}
                  bothPresent={bothPresent}
                />
              </tbody>
            </table>
          </div>
        )}

        {partnerNode?.price_ranges?.length ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <div className="mb-2 font-medium text-slate-700">Partner API price ranges</div>
            <div className="mb-2 text-xs text-slate-500">
              Informational only — VIAX&apos;s pricPrice is resolved through the pricing-determination model per
              price type and isn&apos;t diffed here.
            </div>
            <ul className="space-y-1 text-slate-700">
              {partnerNode.price_ranges.map((p, i) => (
                <li key={i}>
                  {p.currency ?? '—'}: {p.min ?? '—'} – {p.max ?? '—'} (total {p.total ?? '—'})
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {data.instructors.error ? <SourceError label="Instructors" error={data.instructors.error} /> : null}

        <div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-sm text-slate-600 underline hover:text-slate-900"
          >
            {showRaw ? 'Hide' : 'Show'} raw JSON
          </button>
          {showRaw ? (
            <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <pre className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
                {JSON.stringify(viaxNode, null, 2)}
              </pre>
              <pre className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
                {JSON.stringify(partnerNode, null, 2)}
              </pre>
              <pre className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
                {JSON.stringify({instructors: data.instructors.items}, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // type === 'course'
  const partnerNode = data.partner.item;

  const viaxSchoolNames = ((viaxNode?.tSchools as ViaxSchool[] | undefined) ?? [])
    .map((s) => s.tName)
    .filter((n): n is string => Boolean(n));
  const partnerEdOrgNames = data.edOrgs.items.map((o) => o.name).filter((n): n is string => Boolean(n));

  const selection = data.courseRun.selection;

  const viaxSeatAmount = viaxNode?.tSeatPrice?.amount;
  const viaxSeatPrice = viaxSeatAmount !== undefined ? Number(viaxSeatAmount) : null;
  const partnerSeatPrice = selection.seatPrice;
  const seatPriceMatch =
    viaxSeatPrice !== null &&
    !Number.isNaN(viaxSeatPrice) &&
    partnerSeatPrice !== null &&
    Math.abs(viaxSeatPrice - partnerSeatPrice) < 0.01;
  const viaxSeatPriceDisplay =
    viaxSeatAmount !== undefined ? `${viaxSeatAmount} ${viaxNode?.tSeatPrice?.units?.code ?? ''}`.trim() : '—';
  const partnerSeatPriceDisplay = partnerSeatPrice !== null ? partnerSeatPrice.toFixed(2) : '—';

  const viaxModeCode = (viaxNode?.tMode as {code?: string; name?: string} | undefined)?.code;
  const viaxMode = viaxModeCode ? viaxModeCode.toLowerCase() : null;
  const partnerSeatType = selection.seatType;
  const seatTypeMatch = viaxMode !== null && partnerSeatType !== null && viaxMode === partnerSeatType;

  return (
    <div className="space-y-4">
      {data.viax.error ? <SourceError label="VIAX" error={data.viax.error} /> : null}
      {data.partner.error ? <SourceError label="Partner API" error={data.partner.error} /> : null}

      {!viaxNode && !partnerNode ? (
        <div className="py-16 text-center text-sm text-slate-500">No course found in either source.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <TableHead />
            <tbody className="divide-y divide-slate-100">
              {COURSE_ROWS.map((row) => {
                const vRaw = viaxNode ? row.viax(viaxNode) : undefined;
                const pRaw = partnerNode ? row.partner(partnerNode) : undefined;
                const match = bothPresent && normalize(vRaw, row.kind) === normalize(pRaw, row.kind);
                return (
                  <CompareRow
                    key={row.label}
                    label={row.label}
                    viaxDisplay={display(vRaw, row.kind)}
                    partnerDisplay={display(pRaw, row.kind)}
                    match={match}
                    bothPresent={bothPresent}
                  />
                );
              })}
              <CompareRow
                label="Instructors (selected run)"
                viaxDisplay={display(viaxInstructorNames, 'list')}
                partnerDisplay={display(partnerInstructorNames, 'list')}
                match={instructorsMatch}
                bothPresent={bothPresent}
              />
              <CompareRow
                label="Ed-org organizations"
                viaxDisplay={display(viaxSchoolNames, 'list')}
                partnerDisplay={display(partnerEdOrgNames, 'list')}
                match={normalize(viaxSchoolNames, 'list') === normalize(partnerEdOrgNames, 'list')}
                bothPresent={bothPresent}
              />
              <CompareRow
                label="Seat price (selected run)"
                viaxDisplay={viaxSeatPriceDisplay}
                partnerDisplay={partnerSeatPriceDisplay}
                match={seatPriceMatch}
                bothPresent={bothPresent}
              />
              <CompareRow
                label="seatType/mode"
                viaxDisplay={display(viaxMode, 'text')}
                partnerDisplay={display(partnerSeatType, 'text')}
                match={seatTypeMatch}
                bothPresent={bothPresent}
              />
            </tbody>
          </table>
        </div>
      )}

      {partnerNode ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="mb-2 font-medium text-slate-700">Selected course run</div>
          {data.courseRun.error ? <SourceError label="Course runs" error={data.courseRun.error} /> : null}
          <div className="mb-2 text-xs text-slate-500">
            {SELECTION_RULE_LABEL[selection.rule]}
            {selection.totalRuns ? ` (${selection.totalRuns} run${selection.totalRuns === 1 ? '' : 's'} found)` : ''}
          </div>
          {selection.run ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Key</dt>
                <dd className="text-slate-700">{selection.run.key}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">UUID</dt>
                <dd className="text-slate-700">{selection.run.uuid}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Status</dt>
                <dd className="text-slate-700">{selection.run.status ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Availability</dt>
                <dd className="text-slate-700">{selection.run.availability ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Pacing</dt>
                <dd className="text-slate-700">{selection.run.pacing_type ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Start / End</dt>
                <dd className="text-slate-700">
                  {selection.run.start ?? '—'} / {selection.run.end ?? '—'}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="text-slate-500">No course run available.</div>
          )}
          {data.instructors.error ? <SourceError label="Instructors" error={data.instructors.error} /> : null}
          {data.edOrgs.error ? <SourceError label="Ed-orgs" error={data.edOrgs.error} /> : null}
        </div>
      ) : null}

      <div>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-sm text-slate-600 underline hover:text-slate-900"
        >
          {showRaw ? 'Hide' : 'Show'} raw JSON
        </button>
        {showRaw ? (
          <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <pre className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
              {JSON.stringify(viaxNode, null, 2)}
            </pre>
            <pre className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
              {JSON.stringify(partnerNode, null, 2)}
            </pre>
            <pre className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
              {JSON.stringify(selection.run, null, 2)}
            </pre>
            <pre className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
              {JSON.stringify({instructors: data.instructors.items, edOrgs: data.edOrgs.items}, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
