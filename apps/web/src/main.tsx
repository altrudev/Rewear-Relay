import React, {useMemo, useState} from 'react';
import { createRoot } from 'react-dom/client';
import { createTryOn, pollTryOn, requestUploadTicket, uploadPreparedFile } from './api';
import { prepareImage, type PreparedImage } from './image';
import './styles.css';

function Home() {
  return <main className="shell">
    <header><div className="brand"><div className="mark">RR</div><span>Rewear Relay</span></div><a href="/lab">Fitting room lab</a></header>
    <section className="hero">
      <p className="eyebrow">SECONDHAND, ON YOU</p>
      <h1>Try it before<br/>someone else buys it.</h1>
      <p className="lede">Find a one-off piece. See that exact garment on you. Relay to a similar live option if it disappears.</p>
      <label className="search"><span>⌕</span><input aria-label="Search secondhand fashion" placeholder="Vintage leather jacket under $80"/><button type="button" disabled>Search live</button></label>
      <div className="actions"><button className="ghost" disabled>Paste listing</button><a className="ghost linkbutton" href="/lab">Upload item photo</a></div>
      <p className="privacy">Your fitting-room photo is not stored by Rewear Relay.</p>
    </section>
    <footer><span>AI visualization ≠ physical sizing evidence.</span><span>Altru.dev · 2026</span></footer>
  </main>;
}

function FileCard({title, hint, value, onChange}:{title:string;hint:string;value:PreparedImage|null;onChange:(file:File)=>void}) {
  return <label className={`filecard ${value ? 'ready' : ''}`}>
    <span className="filetitle">{title}</span>
    <span className="filehint">{value ? `${value.width}×${value.height} · ${value.sha256.slice(0,10)}…` : hint}</span>
    <span className="fileaction">{value ? 'Replace image' : 'Choose image'}</span>
    <input type="file" accept="image/jpeg,image/png" onChange={event=>{const file=event.target.files?.[0];if(file)onChange(file)}}/>
  </label>;
}

function Lab() {
  const [person,setPerson]=useState<PreparedImage|null>(null);
  const [garment,setGarment]=useState<PreparedImage|null>(null);
  const [category,setCategory]=useState('auto');
  const [status,setStatus]=useState('idle');
  const [error,setError]=useState('');
  const [result,setResult]=useState('');
  const busy = useMemo(()=>!['idle','done','error'].includes(status),[status]);

  async function choose(file:File, kind:'person'|'garment') {
    setError('');
    try {
      const prepared = await prepareImage(file, kind);
      if (kind === 'person') setPerson(prepared); else setGarment(prepared);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'IMAGE_PREPARATION_FAILED');
    }
  }

  async function run() {
    if (!person || !garment || busy) return;
    setError(''); setResult('');
    try {
      setStatus('requesting upload tickets');
      const [personTicket,garmentTicket] = await Promise.all([
        requestUploadTicket(person.fileName, person.blob.size, person.contentType),
        requestUploadTicket(garment.fileName, garment.blob.size, garment.contentType)
      ]);
      setStatus('uploading sanitized images');
      await Promise.all([uploadPreparedFile(personTicket,person.blob),uploadPreparedFile(garmentTicket,garment.blob)]);
      setStatus('creating virtual try-on');
      const task = await createTryOn(personTicket.fileId, garmentTicket.fileId, category);
      setStatus('queued');
      const url = await pollTryOn(task.taskId, next=>setStatus(next));
      setResult(url);
      setStatus('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'TRY_ON_FAILED');
      setStatus('error');
    }
  }

  return <main className="lab shell">
    <header><div className="brand"><div className="mark">RR</div><span>Vertical Slice Lab</span></div><a href="/">Back</a></header>
    <section className="labbody">
      <div><p className="eyebrow">PERFECT CORP CLOTH-V4</p><h1>Prove the core<br/>before the polish.</h1><p className="lede">Both images are re-encoded in your browser before upload, removing embedded EXIF/GPS metadata. Rewear receives provider IDs, not photo bytes.</p></div>
      <div className="grid2">
        <FileCard title="Your photo" hint="Full body, one person, clear lighting" value={person} onChange={file=>choose(file,'person')}/>
        <FileCard title="Garment" hint="Product image or clothing reference" value={garment} onChange={file=>choose(file,'garment')}/>
      </div>
      <label className="selectrow">Garment category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="auto">Auto</option><option value="outerwear">Outerwear</option><option value="upper_body">Upper body</option><option value="lower_body">Lower body</option><option value="full_body">Full body</option><option value="shoes">Shoes</option></select></label>
      <button className="run" disabled={!person||!garment||busy} onClick={run}>{busy ? status : 'Try this on'}</button>
      {error && <div className="notice error"><strong>Test stopped</strong><span>{error}</span></div>}
      {result && <section className="result"><div><p className="eyebrow">RESULT</p><h2>See the look on you.</h2><p>AI visualization only. Actual sizing, material, drape and condition may differ.</p></div><img src={result} alt="Perfect Corp virtual try-on result"/></section>}
      <p className="fineprint">Provider retention is not represented as immediate deletion. Explicit resource cleanup remains a Gate 1 verification item.</p>
    </section>
    <footer><span>Source → sanitize → direct upload → cloth-v4 → result.</span><span>Altru.dev · 2026</span></footer>
  </main>;
}

if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>undefined));
const App = location.pathname === '/lab' ? Lab : Home;
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
