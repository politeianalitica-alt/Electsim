export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-body)' }}>
      <div style={{ height: 44, borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(251,251,253,0.85)' }}/>
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 28px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Skel w="35%" h={28} r={6}/>
          <Skel w="100%" h={120} r={16}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {[0, 1, 2, 3].map(i => <Skel key={i} w="100%" h={110} r={16}/>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 18 }}>
            <Skel w="100%" h={320} r={16}/>
            <Skel w="100%" h={320} r={16}/>
          </div>
        </div>
      </main>
    </div>
  );
}

function Skel({ w, h, r }: { w: string | number; h: number; r: number }) {
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: r,
      background: 'linear-gradient(90deg, #ECECEF 0%, #F5F5F7 50%, #ECECEF 100%)',
      backgroundSize: '200% 100%',
      animation: 'pol-shimmer-load 1.6s ease-in-out infinite',
    }}>
      <style>{`
        @keyframes pol-shimmer-load {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
