'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import type {EnumValue, Money, ViaxCatalogNode} from '../app/types';

interface Instructor {
  tGivenName?: string;
  tFamilyName?: string;
  tOrganization?: string;
  tImageUrl?: string;
  tPosition?: string;
}
interface School {
  tName?: string;
  tLogoUrl?: string;
}
interface CourseRef {
  maId: string;
  maName?: string;
}

function enumText(v?: EnumValue): string | undefined {
  return v?.name ?? v?.code;
}
function priceText(p?: Money): string | undefined {
  return p?.amount ? `${p.units?.code ?? 'USD'} ${p.amount}` : undefined;
}

function Field({label, value}: {label: string; value?: React.ReactNode}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export default function CatalogDetail({
  endpoint,
  backHref,
  backLabel,
}: {
  endpoint: string;
  backHref: string;
  backLabel: string;
}) {
  const [node, setNode] = useState<ViaxCatalogNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(endpoint, {cache: 'no-store'});
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load');
        if (active) setNode(json.item as ViaxCatalogNode);
      } catch (err) {
        if (active) setError((err as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [endpoint]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href={backHref} className="text-sm text-slate-600 hover:text-slate-900">
          &larr; {backLabel}
        </Link>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }
  if (!node) return <div className="py-16 text-center text-sm text-slate-500">Loading\u2026</div>;

  const instructors = (node.tInstructors as Instructor[] | undefined) ?? [];
  const schools = (node.tSchools as School[] | undefined) ?? [];
  const courses = (node.tCourses as CourseRef[] | undefined) ?? [];
  const skills = (node.tSkills as string[] | undefined) ?? [];
  const learning = (node.tExpectedLearningItems as string[] | undefined) ?? [];
  const description = (node.maDescription as string | undefined) ?? (node.tShortDescription as string | undefined);

  return (
    <div className="space-y-6">
      <Link href={backHref} className="text-sm text-slate-600 hover:text-slate-900">
        &larr; {backLabel}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row">
        {node.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={node.imageUrl as string}
            alt=""
            className="h-40 w-full rounded-lg object-cover sm:w-64"
          />
        ) : null}
        <div className="space-y-1">
          {node.tBrandText ? (
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {node.tBrandText as string}
            </div>
          ) : null}
          <h1 className="text-2xl font-semibold text-slate-900">{node.maName ?? '(untitled)'}</h1>
          {node.tSubtitle ? <p className="text-slate-600">{node.tSubtitle as string}</p> : null}
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-600">{node.maId}</span>
            {node.tCatalogActive ? (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">catalog-active</span>
            ) : null}
            {node.tAlacartePurchasable ? (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">à-la-carte</span>
            ) : null}
          </div>
        </div>
      </div>

      {description ? (
        <Section title="Description">
          <div
            className="prose prose-sm max-w-none text-slate-700"
            dangerouslySetInnerHTML={{__html: description}}
          />
        </Section>
      ) : null}

      <Section title="Details">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Subject" value={node.tPrimarySubjectArea as string} />
          <Field label="Level" value={node.tLevelType as string} />
          <Field label="Language" value={node.tLanguage as string} />
          <Field label="Program type" value={enumText(node.tProgramType)} />
          <Field label="Mode" value={enumText(node.tMode as EnumValue)} />
          <Field label="Pacing" value={enumText(node.tPacingType as EnumValue)} />
          <Field label="Status" value={enumText(node.tStatus as EnumValue)} />
          <Field label="Seat price" value={priceText(node.tSeatPrice)} />
          <Field
            label="Enrolled"
            value={
              typeof node.tEnrollmentCount === 'number' ? node.tEnrollmentCount.toLocaleString() : undefined
            }
          />
          <Field
            label="Duration"
            value={
              node.tDurationLow || node.tDurationHigh
                ? `${node.tDurationLow ?? '?'}–${node.tDurationHigh ?? '?'} weeks`
                : undefined
            }
          />
          <Field
            label="Effort"
            value={
              node.tEffortLow || node.tEffortHigh
                ? `${node.tEffortLow ?? '?'}–${node.tEffortHigh ?? '?'} hrs/wk`
                : undefined
            }
          />
          <Field label="Course key" value={node.tCourseKey as string} />
        </dl>
      </Section>

      {learning.length ? (
        <Section title="What you'll learn">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {learning.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {skills.length ? (
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {skills.map((s, i) => (
              <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {s}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      {instructors.length ? (
        <Section title="Instructors">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {instructors.map((ins, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                {ins.tImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ins.tImageUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-slate-100" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">
                    {[ins.tGivenName, ins.tFamilyName].filter(Boolean).join(' ') || 'Instructor'}
                  </div>
                  <div className="truncate text-xs text-slate-500">{ins.tPosition ?? ins.tOrganization}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {schools.length ? (
        <Section title="Schools">
          <div className="flex flex-wrap gap-4">
            {schools.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                {s.tLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.tLogoUrl} alt="" className="h-6 object-contain" />
                ) : null}
                <span>{s.tName}</span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {courses.length ? (
        <Section title="Courses in this program">
          <ul className="space-y-1 text-sm text-slate-700">
            {courses.map((c) => (
              <li key={c.maId}>
                <Link href={`/courses/${encodeURIComponent(c.maId)}`} className="text-slate-700 underline hover:text-slate-900">
                  {c.maName ?? c.maId}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-sm text-slate-600 underline hover:text-slate-900"
        >
          {showRaw ? 'Hide' : 'Show'} raw VIAX JSON
        </button>
        {showRaw ? (
          <pre className="mt-2 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
            {JSON.stringify(node, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
