import CatalogList from '@/components/CatalogList';

export default function ProgramsPage() {
  return <CatalogList endpoint="/api/viax/programs" basePath="/programs" kind="programs" />;
}
