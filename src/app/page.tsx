'use client';

import {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';

interface Overview {
  courses?: number;
  programs?: number;
}

function Card({label, count, href}: {label: string; count?: number; href: string}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-slate-200 bg-white p-6 transition hover:border-slate-400 hover:shadow-sm"
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-black">
        {count === undefined ? '\u2014' : count.toLocaleString()}
      </div>
      <div className="mt-3 text-sm text-slate-600 group-hover:text-slate-900">Browse {label} &rarr;</div>
    </Link>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, p] = await Promise.all([
        fetch('/api/viax/courses?first=1', {cache: 'no-store'}).then((r) => r.json()),
        fetch('/api/viax/programs?first=1', {cache: 'no-store'}).then((r) => r.json()),
      ]);
      if (c.error) throw new Error(c.error);
      if (p.error) throw new Error(p.error);
      setOverview({courses: c.totalCount, programs: p.totalCount});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">VIAX catalog</h1>
          <p className="mt-1 text-sm text-slate-600">
            Live catalog-active courses and programs fetched from the VIAX GraphQL API.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing\u2026' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <div className="mt-1 text-xs text-red-600">
            Check API_GW_URL, IAM_URL and VAULT_SERVICE_CUSTOMER_CLIENT_ID/SECRET in .env.local.
          </div>
        </div>
      ) : null}

      {loading && !error ? (
        <div className="py-16 text-center text-sm text-slate-500">Loading catalog&hellip;</div>
      ) : null}

      {!loading && !error ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card label="courses" count={overview.courses} href="/courses" />
          <Card label="programs" count={overview.programs} href="/programs" />
        </div>
      ) : null}
    </div>
  );
}
