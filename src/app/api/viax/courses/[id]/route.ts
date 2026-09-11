import {NextResponse} from 'next/server';
import {fetchCourse} from '@/server/viax';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  try {
    const item = await fetchCourse(id);
    if (!item) return NextResponse.json({error: 'Course not found'}, {status: 404});
    return NextResponse.json({item});
  } catch (err) {
    return NextResponse.json({error: (err as Error).message}, {status: 500});
  }
}
