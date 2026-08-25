import React, {useMemo, useState} from 'react';
import { createRoot } from 'react-dom/client';
import { createTryOn, deleteTryOn, pollTryOn, rankRelay, requestUploadTicket, uploadPreparedFile, type RelayPlan, type RelayRequest } from './api';
import { prepareImage, type PreparedImage } from './image';
import './styles.css';

function Home() {
  return <main className="shell">
    <header><div className="brand"><div className="mark">RR</div><span>Rewear Relay</span></div><nav className="topnav"><a href="/relay-lab">Relay lab</a><a href="/lab">Fitting room lab</a></nav></header>
    <section className="hero">
      <p className="eyebrow">SECONDHAND, ON YOU</p>
      <h1>Try it before<br/>someone else buys it.</h1>
      <p className="lede">Find a one-off piece. See that exact garment on you. Relay to a similar live option if it disappears.</p>
      <label className="search"><span>⌕</span><input aria-label="Search secondhand fashion" placeholder="Vintage leather jacket under $80"/><button type="button" disabled>Search live</button></label>
      <div className="actions"><button className="ghost" disabled>Paste listing</button><a className="ghost linkbutton" href="/lab">Upload item photo</a><a className="ghost linkbutton" href="/relay-lab">Test Relay reasoning</a></div>
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
  const [taskId,setTaskId]=useState('');
  const busy = useMemo(()=>!['idle','done','error','deleted'].includes(status),[status]);

  async function choose(file:File, kind:'person'|'garment') {
    setError('');
    try {
      const prepared = await prepareImage(file, kind);
      if (kind === 'person') setPerson(prepared); else setGarment(prepared);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'IMAGE_PREPARATION_FAILED');
    }
  }

  async function cleanup() {
    if (!taskId) return;
    setStatus('deleting provider task + files');
    await deleteTryOn(taskId);
    setTaskId('');
    setResult('');
    setStatus('deleted');
  }

  async function run() {
    if (!person || !garment || busy) return;
    setError('');
    try {
      if (taskId) await cleanup();
      setStatus('requesting upload tickets');
      const [personTicket,garmentTicket] = await Promise.all([
        requestUploadTicket(person.fileName, person.blob.size, person.contentType),
        requestUploadTicket(garment.fileName, garment.blob.size, garment.contentType)
      ]);
      setStatus('uploading sanitized images');
      await Promise.all([uploadPreparedFile(personTicket,person.blob),uploadPreparedFile(garmentTicket,garment.blob)]);
      setStatus('creating virtual try-on');
      const task = await createTryOn(personTicket.fileId, garmentTicket.fileId, category);
      setTaskId(task.taskId);
      setStatus('queued');
      const url = await pollTryOn(task.taskId, next=>setStatus(next));
      setResult(url);
      setStatus('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'TRY_ON_FAILED');
      setStatus('error');
    }
  }

  async function deleteCurrent() {
    setError('');
    try { await cleanup(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'DELETE_FAILED'); setStatus('error'); }
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
      {status === 'deleted' && <div className="notice"><strong>Provider cleanup confirmed</strong><span>Task and associated files deleted.</span></div>}
      {error && <div className="notice error"><strong>Test stopped</strong><span>{error}</span></div>}
      {result && <section className="result"><div><p className="eyebrow">RESULT</p><h2>See the look on you.</h2><p>AI visualization only. Actual sizing, material, drape and condition may differ.</p><button className="ghost cleanup" onClick={deleteCurrent}>Delete provider task + files</button></div><img src={result} alt="Perfect Corp virtual try-on result"/></section>}
      <p className="fineprint">Perfect Corp task cleanup is explicit: finished task + associated inputs + generated outputs are deleted only after the provider confirms the deletion request.</p>
    </section>
    <footer><span>Source → sanitize → direct upload → cloth-v4 → result → explicit cleanup.</span><span>Altru.dev · 2026</span></footer>
  </main>;
}

const relayFixture: RelayRequest = {
  source: {
    id: 'fixture-source-jacket',
    title: 'Vintage brown leather jacket',
    price: 80,
    currency: 'USD',
    garment_category: 'outerwear'
  },
  candidates: [
    {id:'fixture-a',title:'Brown leather moto jacket',price:72,currency:'USD',source:'fixture-marketplace-a',observed_at:'2026-08-25T20:00:00Z',garment_category:'outerwear'},
    {id:'fixture-b',title:'Distressed brown bomber jacket',price:88,currency:'USD',source:'fixture-marketplace-b',observed_at:'2026-08-25T20:01:00Z',garment_category:'outerwear'},
    {id:'fixture-c',title:'Black cropped denim jacket',price:45,currency:'USD',source:'fixture-marketplace-c',observed_at:'2026-08-25T20:02:00Z',garment_category:'outerwear'}
  ],
  intent: 'Keep the brown leather look and stay under $90.'
};

function RelayLab() {
  const [intent,setIntent]=useState(relayFixture.intent ?? '');
  const [plan,setPlan]=useState<RelayPlan|null>(null);
  const [status,setStatus]=useState('idle');
  const [error,setError]=useState('');

  async function runRelay() {
    setStatus('ranking with Rig');
    setError('');
    setPlan(null);
    try {
      const next = await rankRelay({...relayFixture, intent});
      setPlan(next);
      setStatus('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'RELAY_RANK_FAILED');
      setStatus('error');
    }
  }

  return <main className="lab shell">
    <header><div className="brand"><div className="mark">RR</div><span>Rig Relay Lab</span></div><a href="/">Back</a></header>
    <section className="relaybody">
      <div className="relayintro"><p className="eyebrow">RIG 0.42 · GOVERNED RANKING</p><h1>Relay the look,<br/>not the listing.</h1><p className="lede">This lab uses fixed fixture candidates so the reasoning boundary can be tested independently of live search. Rig may rank only these supplied IDs; Rewear rejects anything else.</p></div>
      <section className="sourcecard"><span className="eyebrow">SOURCE ITEM</span><h2>{relayFixture.source.title}</h2><div className="meta"><span>${relayFixture.source.price}</span><span>{relayFixture.source.garment_category}</span></div></section>
      <label className="intentbox"><span>Shopper intent</span><input value={intent} maxLength={600} onChange={e=>setIntent(e.target.value)} /></label>
      <div className="candidategrid">
        {relayFixture.candidates.map(candidate=><article className="candidate" key={candidate.id}><div><span className="candidateid">{candidate.id}</span><h3>{candidate.title}</h3></div><div className="meta"><span>${candidate.price}</span><span>{candidate.source}</span></div><small>Observed {new Date(candidate.observed_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></article>)}
      </div>
      <button className="run" disabled={status==='ranking with Rig'} onClick={runRelay}>{status==='ranking with Rig' ? status : 'Rank supplied candidates with Rig'}</button>
      <p className="fineprint">Fixture inventory only. This screen does not claim that any item is currently for sale.</p>
      {error && <div className="notice error"><strong>Rig path stopped</strong><span>{error}</span></div>}
      {plan && <section className="relayplan"><div className="plansummary"><p className="eyebrow">VALIDATED RELAY PLAN</p><h2>{plan.summary}</h2><p>Source binding: <code>{plan.source_item_id}</code></p></div>{plan.ranked.map(entry=>{const candidate=relayFixture.candidates.find(item=>item.id===entry.candidate_id);return <article className="ranked" key={entry.candidate_id}><div className="score">{entry.score}<small>/100</small></div><div><span className="candidateid">{entry.candidate_id}</span><h3>{candidate?.title ?? 'Validated candidate'}</h3><ul>{entry.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>{entry.cautions.length>0&&<div className="cautions">{entry.cautions.map(caution=><span key={caution}>{caution}</span>)}</div>}</div></article>})}</section>}
    </section>
    <footer><span>Candidate set → Rig typed plan → identity gate → user decision.</span><span>Altru.dev · 2026</span></footer>
  </main>;
}

if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>undefined));
const App = location.pathname === '/lab' ? Lab : location.pathname === '/relay-lab' ? RelayLab : Home;
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
