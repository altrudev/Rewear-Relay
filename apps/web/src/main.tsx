import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return <main className="shell">
    <header><div className="mark">RR</div><span>Rewear Relay</span></header>
    <section className="hero">
      <p className="eyebrow">SECONDHAND, ON YOU</p>
      <h1>Try it before<br/>someone else buys it.</h1>
      <p className="lede">Find a one-off piece. See that exact garment on you. Relay to a similar live option if it disappears.</p>
      <label className="search"><span>⌕</span><input aria-label="Search secondhand fashion" placeholder="Vintage leather jacket under $80"/><button type="button">Search live</button></label>
      <div className="actions"><button className="ghost">Paste listing</button><button className="ghost">Upload item photo</button></div>
      <p className="privacy">Your fitting-room photo is not stored by Rewear Relay.</p>
    </section>
    <footer><span>AI visualization ≠ physical sizing evidence.</span><span>Altru.dev · 2026</span></footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
