import {NextResponse} from 'next/server';
import {getOrder} from '@/server/viax';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fetches the current state of a previously created order (the browser's persisted cart).
export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  try {
    const order = await getOrder(id);
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json({error: (err as Error).message}, {status: 500});
  }
}
