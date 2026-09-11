'use client';

import {createContext, useCallback, useContext, useEffect, useState, type ReactNode} from 'react';
import type {OrderSummary} from '../app/types';
import OrderDrawer from './OrderDrawer';

const STORAGE_KEY = 'cmui.cartOrderId';

interface CartContextValue {
  itemCount: number;
  addItem: (maId: string) => Promise<void>;
  openDrawer: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readOrderId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeOrderId(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage unavailable (private mode, etc) — the cart just won't persist.
  }
}

export function CartProvider({children}: {children: ReactNode}) {
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchOrder = useCallback(async (orderId: string): Promise<OrderSummary | null> => {
    const res = await fetch(`/api/viax/orders/${encodeURIComponent(orderId)}`, {cache: 'no-store'});
    if (!res.ok) return null;
    return (await res.json()) as OrderSummary;
  }, []);

  // On first load, pick up whatever cart the browser already has so the header badge is right
  // away accurate, without forcing the drawer open.
  useEffect(() => {
    const orderId = readOrderId();
    if (!orderId) return;
    void fetchOrder(orderId).then((fresh) => {
      if (fresh) setOrder(fresh);
    });
  }, [fetchOrder]);

  const addItem = useCallback(
    async (maId: string) => {
      const orderId = readOrderId() ?? undefined;
      const res = await fetch('/api/viax/orders', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({maId, orderId}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to add to order');
      const nextOrder = json as OrderSummary;
      writeOrderId(nextOrder.orderId);
      setOrder(nextOrder);
      setDrawerOpen(true);
    },
    [],
  );

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    const orderId = readOrderId();
    if (orderId) {
      void fetchOrder(orderId).then((fresh) => {
        if (fresh) setOrder(fresh);
      });
    }
  }, [fetchOrder]);

  const itemCount = order?.items.length ?? 0;

  return (
    <CartContext.Provider value={{itemCount, addItem, openDrawer}}>
      {children}
      <OrderDrawer order={drawerOpen ? order : null} onClose={() => setDrawerOpen(false)} />
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
