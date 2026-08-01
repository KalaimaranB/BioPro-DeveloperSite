import Image from "next/image";

export default function Home() {
  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
      <main className="glass-panel" style={{ padding: '4rem 2rem', maxWidth: '800px', width: '100%' }}>
        
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(to right, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          BioPro Developer Portal
        </h1>
        
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
          Build, manage, and distribute your BioPro plugins securely. Manage your cryptographic hashes and track your plugin versions all in one place.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            style={{ 
              display: 'inline-block',
              padding: '0.75rem 2rem', 
              borderRadius: '8px', 
              background: 'var(--accent-primary)', 
              color: 'white', 
              textDecoration: 'none',
              fontWeight: '600',
              boxShadow: '0 4px 14px var(--accent-glow)',
              transition: 'all 0.2s'
            }}
            href="/dashboard"
          >
            Developer Dashboard
          </a>
          <a
            style={{ 
              display: 'inline-block',
              padding: '0.75rem 2rem', 
              borderRadius: '8px', 
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)', 
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            href="/docs"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
