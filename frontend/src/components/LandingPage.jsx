import { useEffect, useRef } from 'react';

const FEATURES = [
  {
    icon: '🛰️',
    title: 'Multimodal Satellite Fusion',
    desc: 'Combines Sentinel-2 optical, Sentinel-1 SAR radar, and GEDI/ICESat-2 LiDAR data for complete forest characterization.'
  },
  {
    icon: '🌿',
    title: 'AI Canopy Intelligence',
    desc: 'Automated canopy & tree-crown segmentation using deep-learning models to build a digital tree inventory at scale.'
  },
  {
    icon: '⚖️',
    title: 'Carbon Estimation Pipeline',
    desc: 'From canopy geometry → biomass estimation (Random Forest) → carbon stock calculation with explicit methodology labelling.'
  },
  {
    icon: '📡',
    title: 'Forest Change Detection',
    desc: 'Temporal analysis comparing multi-year Landsat + Sentinel observations to detect potential canopy loss and disturbance.'
  },
  {
    icon: '🔍',
    title: 'Explainable Alerts',
    desc: 'Every change alert includes: what changed, where, when, which sensor data supports it, and the model confidence level.'
  },
  {
    icon: '🗺️',
    title: 'Interactive GIS Dashboard',
    desc: 'Professional geospatial interface — search forests, toggle satellite layers, draw AOI, and explore individual tree detections.'
  },
];

const PIPELINE = [
  { icon: '🌲', label: 'Search Forest' },
  { icon: '📡', label: 'Load Data' },
  { icon: '🤖', label: 'AI Analysis' },
  { icon: '🌿', label: 'Detect Canopy' },
  { icon: '⚖️', label: 'Estimate AGB' },
  { icon: '🔬', label: 'Carbon Stock' },
  { icon: '📊', label: 'Dashboard' },
];

export default function LandingPage({ onLaunch }) {
  const particlesRef = useRef(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    const particles = [];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.animationDuration = (8 + Math.random() * 14) + 's';
      p.style.animationDelay = (Math.random() * 12) + 's';
      p.style.width = p.style.height = (1.5 + Math.random() * 2) + 'px';
      p.style.opacity = (0.3 + Math.random() * 0.5).toString();
      container.appendChild(p);
      particles.push(p);
    }
    return () => particles.forEach(p => p.remove());
  }, []);

  return (
    <div className="landing-page">
      <div className="landing-bg" ref={particlesRef} />
      <div className="landing-grid" />

      {/* Nav */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <div className="nav-logo-icon">🌲</div>
          <span className="nav-logo-text">SYLVASENSE</span>
        </div>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#pipeline">Pipeline</a></li>
          <li><a href="#research">Research</a></li>
        </ul>
        <button className="btn btn-primary btn-sm" onClick={onLaunch}>
          Launch Dashboard
        </button>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          ORION-PS-03 · AI Forest Intelligence
        </div>

        <h1 className="hero-title">SYLVASENSE</h1>
        <p className="hero-subtitle">AI-Powered Forest Intelligence &amp; Carbon Monitoring</p>
        <p className="hero-tagline">"See the Forest. Measure the Carbon. Protect the Future."</p>
        <p className="hero-description">
          SylvaSense combines optical, radar and LiDAR Earth observation data with AI to transform satellite observations into an intelligent digital forest inventory — from individual canopy detection to ecosystem-scale carbon estimation.
        </p>

        <div className="hero-buttons">
          <button className="btn btn-primary" onClick={onLaunch} id="btn-explore-forests">
            🌲 Explore Forests
          </button>
          <button className="btn btn-secondary" onClick={onLaunch} id="btn-launch-dashboard">
            🚀 Launch Dashboard
          </button>
        </div>

        {/* Pipeline visualization */}
        <div className="hero-pipeline" id="pipeline">
          {PIPELINE.map((step, i) => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="pipeline-step">
                <div className="pipeline-icon">{step.icon}</div>
                <span className="pipeline-label">{step.label}</span>
              </div>
              {i < PIPELINE.length - 1 && (
                <span className="pipeline-arrow">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="landing-features" id="features">
        <div className="section-title">
          <h2>Forest Intelligence at Every Scale</h2>
          <p>From individual tree crowns to ecosystem-level carbon accounting</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Research section */}
      <section id="research" style={{ padding: '48px 48px', position: 'relative', zIndex: 1 }}>
        <div className="section-title">
          <h2>Research Foundation</h2>
          <p>Methodology grounded in peer-reviewed remote sensing science</p>
        </div>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            'Mapping Forest Height and Aboveground Biomass by Integrating ICESat-2, Sentinel-1 and Sentinel-2 Data Using Random Forest Algorithm',
            'Integrating Sentinel-1 and Sentinel-2 with LiDAR Data to Estimate Aboveground Biomass',
            'Forest Aboveground Biomass Estimation Using GEDI and Earth Observation Data Through Attention-Based Deep Learning',
            'Canopy Height and Biomass Distribution Across Forests of the Iberian Peninsula',
          ].map((ref, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0,230,118,0.1)',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start'
            }}>
              <span style={{ color: 'var(--color-green-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', flexShrink: 0 }}>[{String(i+1).padStart(2,'0')}]</span>
              {ref}
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.7rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
          Reference material cited for methodology context. Full paper details to be validated during model evaluation.
        </p>
      </section>

      {/* CTA */}
      <section style={{ padding: '48px', textAlign: 'center', position: 'relative', zIndex: 1, borderTop: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Ready to Explore?
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
          Experience AI-powered forest intelligence in real time.
        </p>
        <button className="btn btn-primary" onClick={onLaunch} id="btn-cta-launch" style={{ fontSize: '1rem', padding: '14px 32px' }}>
          🚀 Launch Dashboard
        </button>
      </section>
    </div>
  );
}
