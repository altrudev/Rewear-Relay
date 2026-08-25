import React, {useMemo, useState} from 'react';
import { createRoot } from 'react-dom/client';
import {
  createTryOn,
  deleteTryOn,
  pollTryOn,
  rankRelay,
  requestUploadTicket,
  searchInventory,
  uploadPreparedFile,
  type InventorySearchResponse,
  type RelayPlan,
  type RelaySource
} from './api';
import { prepareImage, type PreparedImage } from './image';
import './styles.css';

function Home() {
  const [query,setQuery]=useState('');
  function openSearch(event: React.FormEvent) {
    event.preventDefault();
    const next = query.trim();
    if (!next) return;
    location.href = `/relay-lab?q=${encodeURIComponent(next)}`;
  }

  return <main className="shell">
    <header><div className="brand"><div className="mark">RR</div><span>Rewear Relay</span></div><nav className="topnav"><a href="/relay-lab">Relay lab</a><a href="/lab">Fitting room lab</a></nav></header>
    <section className="hero">
      <p className="eyebrow">SECONDHAND, ON YOU</p>
      <h1>Try it before<br/>someone else buys it.</h1>
      <p className="lede">Find a one-off piece. See that exact garment on you. Relay to a similar live option if it disappears.</p>
      <form className="search" onSubmit={openSearch}><span>⌕</span><input aria-label="Search secondhand fashion" placeholder="Vintage leather jacket under $80" value={query} onChange={event=>setQuery(event.target.value)}/><button type="submit" disabled={!query.trim()}>Search secondhand</button></form>
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

const relaySource: RelaySource = {
  id: 'fixture-source-jacket',
  title: 'Vintage brown leather jacket',
  price: 80,
  currency: 'CAD',
  garment_category: 'outerwear'
};

function RelayLab() {
  const urlQuery = new URLSearchParams(location.search).get('q')?.trim() || 'brown leather jacket';
  const [query,setQuery]=useState(urlQuery);
  const [intent,setIntent]=useState('Keep the brown leather look and stay under the source-item price where evidence allows.');
  const [inventory,setInventory]=useState<InventorySearchResponse|null>(null);
  const [plan,setPlan]=useState<RelayPlan|null>(null);
  const [status,setStatus]=useState('idle');
  const [error,setError]=useState('');

  async function findCandidates() {
    setStatus('searching normalized inventory');
    setError('');
    setPlan(null);
    setInventory(null);
    try {
      const next = await searchInventory(relaySource, query);
      setInventory(next);
      setStatus(next.candidates.length > 0 ? 'search ready' : 'no strict secondhand results');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SEARCH_FAILED');
      setStatus('error');
    }
  }

  async function runRelay() {
    if (!inventory?.candidateSetToken) return;
    setStatus('ranking signed candidate set with Rig');
    setError('');
    setPlan(null);
    try {
      const next = await rankRelay(inventory.candidateSetToken, intent);
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
      <div className="relayintro"><p className="eyebrow">SEARCH RECEIPT → RIG 0.42 → GOVERNED RANKING</p><h1>Relay the look,<br/>not the listing.</h1><p className="lede">Search is normalized at the Edge. Rewear signs the observed candidate set before the browser receives it; Rig ranking later accepts only that signed set plus your intent.</p></div>
      <section className="sourcecard"><span className="eyebrow">SOURCE ITEM</span><h2>{relaySource.title}</h2><div className="meta"><span>${relaySource.price} {relaySource.currency}</span><span>{relaySource.garment_category}</span></div></section>

      <div className="searchpanel">
        <label className="intentbox"><span>Alternative search</span><input value={query} maxLength={300} onChange={e=>setQuery(e.target.value)} /></label>
        <button className="run" disabled={!query.trim()||status==='searching normalized inventory'} onClick={findCandidates}>{status==='searching normalized inventory' ? status : 'Find strict secondhand candidates'}</button>
      </div>

      {inventory && <section className="inventoryreceipt">
        <div><span className="eyebrow">SIGNED CANDIDATE SET</span><h2>{inventory.candidates.length} candidates · {inventory.provider}</h2></div>
        <div className="receiptmeta"><span>Observed {new Date(inventory.observedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span><span>Expires {new Date(inventory.expiresAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div>
        {inventory.providerQuery !== inventory.query && <p className="fineprint">Provider query expanded for secondhand recall: <code>{inventory.providerQuery}</code></p>}
      </section>}

      {inventory && inventory.candidates.length > 0 && <div className="candidategrid">
        {inventory.candidates.map(candidate=><article className="candidate" key={candidate.id}>
          {candidate.imageUrl && <img className="candidateimg" src={candidate.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer"/>}
          <div><span className="candidateid">{candidate.id}</span><h3>{candidate.title}</h3></div>
          <div className="meta"><span>{candidate.priceText ?? (candidate.price != null ? String(candidate.price) : 'Price unavailable')}</span><span>{candidate.source}</span></div>
          <small>{candidate.secondHandCondition ? `Condition evidence: ${candidate.secondHandCondition}` : 'Condition not evidenced'} · observed {new Date(candidate.observedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>
          {candidate.productUrl && <a className="candidateout" href={candidate.productUrl} target="_blank" rel="noreferrer">Open shopping result ↗</a>}
        </article>)}
      </div>}

      {inventory?.candidateSetToken && <>
        <label className="intentbox"><span>Shopper intent</span><input value={intent} maxLength={800} onChange={e=>setIntent(e.target.value)} /></label>
        <button className="run" disabled={!intent.trim()||status==='ranking signed candidate set with Rig'} onClick={runRelay}>{status==='ranking signed candidate set with Rig' ? status : 'Rank signed candidates with Rig'}</button>
      </>}

      <p className="fineprint">Fixture mode is the zero-cost default. Live SerpApi search occurs only when the server is explicitly configured for it. Search observation does not guarantee that an item remains available.</p>
      {error && <div className="notice error"><strong>Relay path stopped</strong><span>{error}</span></div>}
      {inventory && inventory.candidates.length === 0 && <div className="notice"><strong>No evidenced secondhand candidates</strong><span>Rewear did not relax the condition gate or silently mix in ordinary retail results.</span></div>}
      {plan && <section className="relayplan"><div className="plansummary"><p className="eyebrow">VALIDATED RELAY PLAN</p><h2>{plan.summary}</h2><p>Source binding: <code>{plan.source_item_id}</code></p>{plan.candidateSet&&<p>Evidence: {plan.candidateSet.provider} · observed {new Date(plan.candidateSet.observedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>}</div>{plan.ranked.map(entry=>{const candidate=inventory?.candidates.find(item=>item.id===entry.candidate_id);return <article className="ranked" key={entry.candidate_id}><div className="score">{entry.score}<small>/100</small></div><div><span className="candidateid">{entry.candidate_id}</span><h3>{candidate?.title ?? 'Validated candidate'}</h3><ul>{entry.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>{entry.cautions.length>0&&<div className="cautions">{entry.cautions.map(caution=><span key={caution}>{caution}</span>)}</div>}</div></article>})}</section>}
    </section>
    <footer><span>Search → signed evidence → Rig typed plan → identity gate → user decision.</span><span>Altru.dev · 2026</span></footer>
  </main>;
}

if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>undefined));
const App = location.pathname === '/lab' ? Lab : location.pathname === '/relay-lab' ? RelayLab : Home;
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
