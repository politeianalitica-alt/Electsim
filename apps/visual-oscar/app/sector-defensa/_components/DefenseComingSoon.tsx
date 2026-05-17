interface Props {
  tab: string
  description: string
  features: string[]
  sprint: string
}

export function DefenseComingSoon({ tab, description, features, sprint }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 480,
        gap: 24,
        padding: '60px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #F5F5F7 0%, #ECECEF 100%)',
          border: '1px solid #DDDDE3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          color: '#86868b',
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        {tab.slice(0, 2).toUpperCase()}
      </div>

      <div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 700,
            color: '#1d1d1f',
            letterSpacing: '-0.02em',
            margin: '0 0 8px',
          }}
        >
          {tab}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: '#6e6e73',
            margin: 0,
            maxWidth: 480,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10,
          maxWidth: 680,
          width: '100%',
        }}
      >
        {features.map((f) => (
          <div
            key={f}
            style={{
              padding: '10px 14px',
              background: '#FAFAFA',
              border: '1px solid #ECECEF',
              borderRadius: 10,
              fontSize: 12,
              color: '#3a3a3d',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#DDDDE3',
                flexShrink: 0,
              }}
            />
            {f}
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: 11,
          color: '#86868b',
          padding: '6px 14px',
          borderRadius: 999,
          border: '1px solid #ECECEF',
          background: '#FAFAFA',
          fontWeight: 500,
        }}
      >
        Disponible en {sprint}
      </div>
    </div>
  )
}
