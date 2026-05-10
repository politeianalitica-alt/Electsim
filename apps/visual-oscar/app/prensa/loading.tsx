export default function PrensaLoading() {
  return (
    <div className="shell" style={{ background: 'var(--color-bg)' }}>
      <div style={{ height: 32, width: 260, background: 'var(--color-surface-raised)', borderRadius: 8, marginBottom: 24, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0,1,2,3,4].map(i => <div key={i} style={{ height: 140, background: 'var(--color-surface-raised)', borderRadius: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ height: 280, background: 'var(--color-surface-raised)', borderRadius: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 160, background: 'var(--color-surface-raised)', borderRadius: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
