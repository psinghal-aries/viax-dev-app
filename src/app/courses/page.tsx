import CatalogList from '@/components/CatalogList';

export default function CoursesPage() {
  return <CatalogList endpoint="/api/viax/courses" basePath="/courses" kind="courses" />;
}
