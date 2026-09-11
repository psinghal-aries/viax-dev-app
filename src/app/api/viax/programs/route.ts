import {NextRequest, NextResponse} from 'next/server';
import {fetchPrograms, PAGE_SIZE} from '@/server/viax';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Paged VIAX program list (cursor pagination) for the tiles page.
export async function GET(req: NextRequest) {
  const {searchParams} = req.nextUrl;
  const after = searchParams.get('after') ?? undefined;
  const first = Number(searchParams.get('first')) || PAGE_SIZE;
  try {
    const conn = await fetchPrograms(first, after);
    return NextResponse.json(conn);
  } catch (err) {
    return NextResponse.json({error: (err as Error).message}, {status: 500});
  }
}
