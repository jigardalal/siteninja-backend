export default function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        maxWidth: '600px',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '10px',
          color: '#1a1a1a'
        }}>
          🚀 SiteNinja Backend API
        </h1>

        <p style={{
          fontSize: '1.1rem',
          color: '#666',
          marginBottom: '30px'
        }}>
          Multi-tenant website builder backend
        </p>

        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '30px'
        }}>
          <a
            href="/api-docs"
            style={{
              padding: '12px 24px',
              backgroundColor: '#3B82F6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            📖 API Documentation
          </a>

          <a
            href="/api/health"
            style={{
              padding: '12px 24px',
              backgroundColor: '#10B981',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            ✅ Health Check
          </a>
        </div>

        <div style={{
          textAlign: 'left',
          padding: '20px',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Quick Stats</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
            <li>✅ 70+ API Endpoints</li>
            <li>✅ Complete Authentication</li>
            <li>✅ Multi-tenant Support</li>
            <li>✅ Audit Logging & Webhooks</li>
            <li>✅ Redis Caching</li>
            <li>✅ Rate Limiting</li>
          </ul>
        </div>

        <div style={{
          textAlign: 'left',
          padding: '20px',
          backgroundColor: '#FEF3C7',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0, color: '#92400E' }}>🧪 Test Credentials</h3>
          <p style={{ margin: '5px 0', color: '#92400E', fontSize: '0.9rem' }}>
            After running <code style={{ backgroundColor: '#FDE68A', padding: '2px 6px', borderRadius: '4px' }}>npm run db:seed</code>:
          </p>
          <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#92400E', fontSize: '0.9rem' }}>
            <li><strong>Super Admin:</strong> admin@siteninja.com</li>
            <li><strong>Restaurant:</strong> marco@bellaitalia.com</li>
            <li><strong>Tech Startup:</strong> sarah@techflow.io</li>
            <li><strong>Password:</strong> Password123! (all users)</li>
          </ul>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '10px',
          marginTop: '20px'
        }}>
          <a
            href="https://github.com"
            style={{
              padding: '10px',
              backgroundColor: '#f0f0f0',
              color: '#333',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          >
            📚 GitHub
          </a>
          <a
            href="/api/openapi"
            style={{
              padding: '10px',
              backgroundColor: '#f0f0f0',
              color: '#333',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          >
            📄 OpenAPI Spec
          </a>
        </div>

        <p style={{
          marginTop: '30px',
          fontSize: '0.85rem',
          color: '#999'
        }}>
          Version 2.0.0 • Built with Next.js 15 & TypeScript
        </p>
      </div>
    </div>
  );
}
