'use client';

import type {Money, OrderItemSummary, OrderSummary} from '../app/types';

function formatMoney(price?: Money): string | null {
  if (!price?.amount) return null;
  const code = price.units?.code ?? 'USD';
  return `${code} ${price.amount}`;
}

function total(items: OrderItemSummary[]): string | null {
  const amounts = items.map((i) => Number(i.price?.amount)).filter((n) => !Number.isNaN(n));
  if (amounts.length !== items.length || amounts.length === 0) return null;
  const code = items.find((i) => i.price?.units?.code)?.price?.units?.code ?? 'USD';
  const sum = amounts.reduce((a, b) => a + b, 0);
  return `${code} ${sum.toFixed(2)}`;
}

export default function OrderDrawer({order, onClose}: {order: OrderSummary | null; onClose: () => void}) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-sm flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Your order</h2>
            <div className="text-xs text-slate-500">Order {order.orderNumber}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            &#x2715;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {order.items.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Your order is empty.</div>
          ) : (
            <ul className="space-y-4">
              {order.items.map((item) => {
                const price = formatMoney(item.price);
                return (
                  <li key={item.itemId} className="flex gap-3">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="h-14 w-20 flex-shrink-0 rounded object-cover" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-medium text-slate-900">{item.courseName}</div>
                      <div className="mt-1 text-xs text-slate-500">Qty 1</div>
                    </div>
                    <div className="whitespace-nowrap text-sm font-medium text-slate-700">{price ?? '—'}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 p-4 text-sm">
          <div className="flex items-center justify-between font-semibold text-slate-900">
            <span>Total</span>
            <span>{total(order.items) ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
