export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-32 bg-bg3 rounded"/>
        <div className="h-8 w-72 bg-bg3 rounded"/>
        <div className="h-3 w-96 bg-bg3 rounded"/>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-bg3 rounded-xl"/>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-bg3 rounded-xl"/>
        <div className="h-80 bg-bg3 rounded-xl"/>
      </div>
      <div className="h-64 bg-bg3 rounded-xl"/>
    </div>
  );
}
