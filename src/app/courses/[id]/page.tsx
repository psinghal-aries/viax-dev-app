import CatalogDetail from '@/components/CatalogDetail';

export default async function CourseDetailPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  return (
    <CatalogDetail
      endpoint={`/api/viax/courses/${encodeURIComponent(id)}`}
      backHref="/courses"
      backLabel="Back to courses"
    />
  );
}
