'use client';

import {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {PAGE_SIZE} from './constants';
import type {ViaxCatalogNode, ViaxConnection} from '../app/types';
import {useCart} from './CartProvider';

function formatPrice(node: ViaxCatalogNode): string | null {
  const p = node.tSeatPrice;
  if (!p?.amount) return null;
  const code = p.units?.code ?? 'USD';
  return `${code} ${p.amount}`;
}

type OrderState = 'idle' | 'loading' | 'done' | 'error';

function Tile({node, href, showOrderCta}: {node: ViaxCatalogNode; href: string; showOrderCta: boolean}) {
  const price = formatPrice(node);
  const type = node.tProgramType?.name ?? node.tProgramType?.code;
  const {addItem} = useCart();
  const [orderState, setOrderState] = useState<OrderState>('idle');
  const [orderError, setOrderError] = useState<string | null>(null);

  const addToOrder = async () => {
    if (orderState === 'loading' || orderState === 'done') return;
    setOrderState('loading');
    setOrderError(null);
    try {
      await addItem(node.maId);
      setOrderState('done');
    } catch (err) {
      setOrderError((err as Error).message);
      setOrderState('error');
    }
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-slate-400 hover:shadow-sm">
      <Link href={href} className="flex flex-1 flex-col">
        <div className="aspect-video w-full overflow-hidden bg-slate-100">
          {node.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={node.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          {node.tBrandText ? (
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{node.tBrandText}</div>
          ) : null}
          <div className="line-clamp-2 font-semibold text-slate-900 group-hover:text-slate-700">
            {node.maName ?? '(untitled)'}
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-500">
            {node.tPrimarySubjectArea ? <span>{node.tPrimarySubjectArea}</span> : null}
            {type ? <span className="rounded bg-slate-100 px-1.5 py-0.5">{type}</span> : null}
            {price ? <span className="font-medium text-slate-700">{price}</span> : null}
            {typeof node.tEnrollmentCount === 'number' ? (
              <span>{node.tEnrollmentCount.toLocaleString()} enrolled</span>
            ) : null}
          </div>
        </div>
      </Link>
      {showOrderCta ? (
        <div className="border-t border-slate-100 p-3 pt-2">
          <button
            onClick={addToOrder}
            disabled={orderState === 'loading' || orderState === 'done'}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-default disabled:opacity-60"
          >
            {orderState === 'done' ? 'Added to order' : orderState === 'loading' ? 'Adding…' : 'Add to Order'}
          </button>
          {orderState === 'error' && orderError ? <div className="mt-1 text-xs text-red-600">{orderError}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export default function CatalogList({
  endpoint,
  basePath,
  kind,
}: {
  endpoint: string;
  basePath: string;
  kind: string;
}) {
  const [data, setData] = useState<ViaxConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(0);

  const load = useCallback(
    async (after: string | undefined) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (after) params.set('after', after);
        const res = await fetch(`${endpoint}?${params.toString()}`, {cache: 'no-store'});
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load');
        setData(json as ViaxConnection);
      } catch (err) {
        setError((err as Error).message);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [endpoint],
  );

  useEffect(() => {
    void load(cursors[page]);
  }, [load, cursors, page]);

  const goNext = () => {
    const next = data?.pageInfo.endCursor;
    if (!next) return;
    setCursors((prev) => [...prev.slice(0, page + 1), next]);
    setPage((p) => p + 1);
  };
  const goPrev = () => setPage((p) => Math.max(0, p - 1));

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold capitalize">{kind}</h1>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <div className="mt-1 text-xs text-red-600">
            Check that API_GW_URL, IAM_URL and the VAULT_SERVICE_CUSTOMER_CLIENT_* values are set in
            .env.local.
          </div>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="py-16 text-center text-sm text-slate-500">Loading\u2026</div>
      ) : null}

      {data && data.items.length === 0 && !error ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No {kind} found.
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((node) => (
              <Tile
                key={node.maId}
                node={node}
                href={`${basePath}/${encodeURIComponent(node.maId)}`}
                showOrderCta={kind === 'courses'}
              />
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
            <div className="text-slate-500">
              {data.totalCount.toLocaleString()} {kind} &middot; Page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={goPrev}
                disabled={page === 0 || loading}
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                &larr; Prev
              </button>
              <button
                onClick={goNext}
                disabled={!data.pageInfo.hasNextPage || loading}
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
