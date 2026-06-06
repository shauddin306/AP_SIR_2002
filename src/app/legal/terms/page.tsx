export default function TermsOfService() {
  return (
    <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 24px', color: 'var(--color-text-primary)' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: 'var(--color-accent-text)' }}>Terms of Service</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 40 }}>Last Updated: {new Date().toLocaleDateString()}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, lineHeight: 1.6 }}>
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'white' }}>1. Nature of the Platform</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Mindcap (the "Platform") is an independent search engine and data aggregation tool. The Platform is <strong>NOT</strong> affiliated with, endorsed by, or operated by the Election Commission of India (ECI) or any State Election Commission. 
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'white' }}>2. Source of Data</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            All data indexed on this Platform is derived from publicly available electoral rolls published by the government. The Platform acts solely as a search index to facilitate transparency, political analysis, and democratic participation. We do not claim ownership of the public records.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'white' }}>3. Accuracy and AI Extraction Disclaimer</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            The Platform utilizes Artificial Intelligence (AI) and Optical Character Recognition (OCR) to extract data from public PDFs. <strong>We do not guarantee the accuracy, completeness, or reliability of the data.</strong> Typographical errors, misspellings, or incorrect data mapping may occur due to AI hallucination or poor source image quality. Users must verify all critical information directly through the official ECI portal (<a href="https://voters.eci.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>voters.eci.gov.in</a>).
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'white' }}>4. Acceptable Use</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Users agree to use the Platform strictly for lawful purposes. You agree NOT to:
          </p>
          <ul style={{ color: 'var(--color-text-secondary)', listStyleType: 'disc', paddingLeft: 24, marginTop: 8 }}>
            <li>Use the data for harassment, intimidation, or stalking.</li>
            <li>Sell or distribute the data for unauthorized commercial marketing or spamming.</li>
            <li>Attempt to hack, scrape, reverse-engineer, or perform Denial of Service (DoS) attacks on the Platform's APIs.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'white' }}>5. Limitation of Liability</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Under no circumstances shall Mindcap, its founders, engineers, or affiliates be held liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the Platform, or for any errors in the extracted data. Your use of the Platform is entirely at your own risk.
          </p>
        </section>
      </div>

      <div style={{ marginTop: 40 }}>
        <a href="/" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>← Back to Search Engine</a>
      </div>
    </div>
  )
}
