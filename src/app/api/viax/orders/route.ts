import {NextRequest, NextResponse} from 'next/server';
import {addItemToOrder} from '@/server/viax';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Adds the given course to the order identified by `orderId` (the browser's persisted cart),
// creating a new order first if `orderId` is missing or no longer resolves.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const maId = typeof body?.maId === 'string' ? body.maId : undefined;
  const orderId = typeof body?.orderId === 'string' ? body.orderId : undefined;
  if (!maId) return NextResponse.json({error: 'maId is required'}, {status: 400});

  try {
    const order = await addItemToOrder(orderId, maId);
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json({error: (err as Error).message}, {status: 500});
  }
}
