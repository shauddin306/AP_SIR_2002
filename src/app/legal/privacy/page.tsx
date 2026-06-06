export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 24px', color: 'var(--color-text-primary)' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: 'var(--color-accent-text)' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 40 }}>Last Updated: {new Date().toLocaleDateString()}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, lineHeight: 1.6 }}>
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'white' }}>1. Data We Collect About Our Users</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            When you visit Mindcap, we collect minimal operational data to ensure the platform functions securely:
          </p>
          <ul style={{ color: 'var(--color-text-secondary)', listStyleType: 'disc', paddingLeft: 24, marginTop: 8 }}>
            <li><strong>Account Data:</strong> If you create an administrator or verified account, we securely store your authentication credentials.</li>
            <li><strong>Log Data:</strong> IP addresses, browser types, and search queries may be temporarily logged for cybersecurity monitoring, rate-limiting, and to prevent abuse of the search engine.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'white' }}>2. The Voter Data (Public Domain Information)</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            The voter information searchable on our platform (Names, Ages, EPIC IDs, Polling Stations, Relations) is <strong>public domain data</strong> originally published by the government under democratic electoral laws. We do not collect this information directly from individuals, nor do we claim ownership of it. We act solely as a secondary search index.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'white' }}>3. Data Security & Cyber Protection</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            We employ enterprise-grade security measures to protect the platform and the data we index:
          </p>
          <ul style={{ color: 'var(--color-text-secondary)', listStyleType: 'disc', paddingLeft: 24, marginTop: 8 }}>
            <li>All data in transit is encrypted via SSL/TLS (HTTPS).</li>
            <li>Our database uses strict Row-Level Security (RLS) to prevent unauthorized mass-downloads, bulk scraping, or database breaches.</li>
            <li>We do not sell administrator analytics, user metadata, or search patterns to third-party advertising brokers.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'white' }}>4. Data Removal Requests</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Because the indexed voter data is a matter of public record mandated by national electoral law, we generally do not alter or remove individual voter records from our search index unless the record has been officially struck from the government's master electoral roll.
          </p>
        </section>
      </div>

      <div style={{ marginTop: 40 }}>
        <a href="/" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>← Back to Search Engine</a>
      </div>
    </div>
  )
}
