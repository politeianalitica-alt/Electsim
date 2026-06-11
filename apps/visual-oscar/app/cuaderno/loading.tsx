export default function CuadernoLoading() {
  return (
    <div aria-busy="true" aria-label="Cargando Cuaderno" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', fontFamily: '-apple-system, system-ui, sans-serif',
      fontSize: 13, color: '#6e6e73',
    }}>
      Cargando Cuaderno…
    </div>
  )
}
