/**
 * Loading del segmento /workspaces/[workspaceId]/* — skeleton neutro dentro
 * del chrome del workspace mientras carga la vista.
 */

export default function WorkspaceLoading() {
  return (
 <div aria-busy="true" aria-label="Cargando vista del workspace" style={{ padding: "8px 0" }}>
 <div style={{ height: 28, width: 260, borderRadius: 8, background: "#eceef2", marginBottom: 10 }} />
 <div style={{ height: 13, width: 420, borderRadius: 6, background: "#f5f5f7", marginBottom: 24 }} />
 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
 <div key={i} style={{ height: 120, borderRadius: 14, background: "#ffffff", border: "1px solid #e8e8ed" }} />
        ))}
 </div>
 </div>
  );
}
