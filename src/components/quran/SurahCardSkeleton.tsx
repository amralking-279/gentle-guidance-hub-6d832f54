export default function SurahCardSkeleton() {
  const safeLayerStyle = {
    isolation: 'isolate' as const,
    contain: 'paint' as const,
    transform: 'translate3d(0,0,0)',
    willChange: 'transform',
    boxShadow: 'none',
    backgroundImage: 'none',
    filter: 'none',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  };

  return (
    <div className="rounded-2xl p-4 bg-emerald-950 border border-emerald-800 animate-pulse" style={safeLayerStyle}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-900" style={safeLayerStyle} />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-emerald-900 rounded-lg w-1/2" style={safeLayerStyle} />
          <div className="h-3 bg-emerald-900 rounded-lg w-3/4" style={safeLayerStyle} />
        </div>
        <div className="flex gap-1">
          <div className="w-8 h-8 bg-emerald-900 rounded-lg" style={safeLayerStyle} />
          <div className="w-8 h-8 bg-emerald-900 rounded-lg" style={safeLayerStyle} />
          <div className="w-8 h-8 bg-emerald-900 rounded-lg" style={safeLayerStyle} />
        </div>
      </div>
    </div>
  );
}
