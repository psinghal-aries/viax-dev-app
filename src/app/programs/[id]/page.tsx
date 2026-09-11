import CatalogDetail from '@/components/CatalogDetail';

export default async function ProgramDetailPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  return (
    <CatalogDetail
      endpoint={`/api/viax/programs/${encodeURIComponent(id)}`}
      backHref="/programs"
      backLabel="Back to programs"
    />
  );
}
