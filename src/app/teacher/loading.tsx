export default function Loading() {
  return (
    <div className="space-y-4 p-2" role="status" aria-label="Loading">
      <div className="skeleton h-8 w-56 rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );
}
