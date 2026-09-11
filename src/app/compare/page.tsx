import CompareView from '@/components/CompareView';

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{type?: string; id?: string}>;
}) {
  const {type: rawType, id} = await searchParams;
  const type = rawType === 'program' ? 'program' : 'course';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Compare VIAX vs. Partner API</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter a {type} uuid{type === 'course' ? ' or course key' : ''} to pull the same {type} from VIAX and the
          edX Partner API side by side.
        </p>
      </div>

      <form action="/compare" method="get" className="flex max-w-xl flex-wrap gap-2">
        <select
          name="type"
          defaultValue={type}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="course">Course</option>
          <option value="program">Program</option>
        </select>
        <input
          type="text"
          name="id"
          defaultValue={id ?? ''}
          placeholder={type === 'program' ? 'Program uuid' : 'Course uuid or course key (e.g. RiceX+APESx)'}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Compare
        </button>
      </form>

      {id ? <CompareView key={`${type}:${id}`} type={type} id={id} /> : null}
    </div>
  );
}
