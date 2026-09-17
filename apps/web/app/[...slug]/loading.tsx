import { Skeleton } from '../../components/interactive-controls';

export default function RouteLoading() {
  return (
    <main className="page loading-page">
      <Skeleton label="Loading ProspectAI view" lines={5} />
    </main>
  );
}
