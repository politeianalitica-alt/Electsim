export default function BriefingLoading() {
  return (
 <div className="shell" style={{ background: 'var(--color-bg)' }}>
 <div style={{ height: 32, width: 220, background: 'var(--color-surface-raised)', borderRadius: 8, marginBottom: 24, animation: 'pulse 1.5s ease-in-out infinite' }} />
 <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1,2].map(i => <div key={i} style={{ height: 64, background: 'var(--color-surface-raised)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
 <div style={{ height: 160, background: 'var(--color-surface-raised)', borderRadius: 18, animation: 'pulse 1.5s ease-in-out infinite' }} />
 <div style={{ height: 44, background: 'var(--color-surface-raised)', borderRadius: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />
 <div style={{ height: 320, background: 'var(--color-surface-raised)', borderRadius: 18, animation: 'pulse 1.5s ease-in-out infinite' }} />
 </div>
 </div>
 <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
 </div>
  );
}
