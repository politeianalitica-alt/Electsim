export default function RiesgoLoading() {
  return (
 <div className="shell" style={{ background: 'var(--color-bg)' }}>
 <div style={{ height: 32, width: 200, background: 'var(--color-surface-raised)', borderRadius: 8, marginBottom: 24, animation: 'pulse 1.5s ease-in-out infinite' }} />
 <div style={{ height: 180, background: 'var(--color-surface-raised)', borderRadius: 18, marginBottom: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {[0, 1].map(i => <div key={i} style={{ height: 200, background: 'var(--color-surface-raised)', borderRadius: 18, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
 </div>
 <div style={{ height: 320, background: 'var(--color-surface-raised)', borderRadius: 18, animation: 'pulse 1.5s ease-in-out infinite' }} />
 <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
 </div>
  );
}
