/* Muse portfolio front-end controller. No external JS runtime. */
(() => {
  'use strict';
  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => [...r.querySelectorAll(q)];
  const slug = document.body.dataset.site || 'site';
  const cfg = window.MUSE_SITE_CONFIG || { brand: slug, leadEndpoint: '', environment: 'preview' };
  const toast = $('.toast');
  let toastTimeout;
  const say = (message) => { if (!toast) return; toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => toast.classList.remove('show'), 6500); };
  const mobileBtn = $('.mobile-toggle');
  const mobileMenu = $('#mobile-menu');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => { const expanded = mobileBtn.getAttribute('aria-expanded') !== 'true'; mobileMenu.classList.toggle('open', expanded); mobileBtn.setAttribute('aria-expanded', String(expanded)); });
    $$('a', mobileMenu).forEach(a => a.addEventListener('click', () => { mobileMenu.classList.remove('open'); mobileBtn.setAttribute('aria-expanded', 'false'); }));
  }

  const backdrop = $('#interest-modal');
  const form = $('#lead-form');
  let previousFocus = null;
  const openModal = (plan = 'Early access') => {
    if (!backdrop) return;
    previousFocus = document.activeElement;
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden','false');
    const selector = $('select[name="plan"]', backdrop);
    if (selector && [...selector.options].some(x => x.value === plan)) selector.value = plan;
    const notice = $('#lead-mode');
    if (notice && cfg.leadEndpoint) notice.textContent = 'Secure submission is configured. By submitting, you request launch-related contact. Do not include sensitive information.';
    $('input[name="name"]', backdrop)?.focus();
    document.body.style.overflow = 'hidden';
  };
  const closeModal = () => {
    if (!backdrop) return;
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  };
  $$('[data-modal]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.plan)));
  $$('[data-close-modal]').forEach(btn => btn.addEventListener('click',closeModal));
  backdrop?.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && backdrop?.classList.contains('open')) closeModal(); });
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const notice = $('#lead-mode');
    if (!cfg.leadEndpoint) {
      if (notice) { notice.textContent = 'Demo only — no data was sent or saved. Muse must configure a secure lead endpoint before this form can accept registrations.'; notice.style.background = '#fff1dc'; }
      say('Preview only: no registration was submitted.');
      return;
    }
    if (!/^https:\/\//i.test(cfg.leadEndpoint)) { say('Configuration error: the submission endpoint must use HTTPS.'); return; }
    const btn = $('button[type="submit"]', form);
    btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      const fields = Object.fromEntries(new FormData(form).entries());
      const response = await fetch(cfg.leadEndpoint, { method:'POST', mode:'cors', headers: {'Content-Type':'application/json'}, body:JSON.stringify({ ...fields, source:cfg.brand, consent:'Contact me about launch', submittedAt:new Date().toISOString() }) });
      if (!response.ok) throw new Error('Server rejected submission');
      form.reset(); closeModal(); say('Your interest has been submitted.');
    } catch (error) {
      if (notice) notice.textContent = 'Submission failed. Nothing was confirmed. Please try again or contact the site operator.';
      say('Could not submit your request.');
    } finally { btn.disabled = false; btn.textContent = 'Submit interest ↗'; }
  });

  if (!window.DEMO_DATA) return;
  const data = window.DEMO_DATA;
  const records = Array.isArray(data.rows) ? data.rows : [];
  const saveKey = 'muse-preview-saved:' + slug;
  let saved;
  try { saved = new Set(JSON.parse(localStorage.getItem(saveKey) || '[]')); }
  catch { saved = new Set(); }
  const saveState = () => { try { localStorage.setItem(saveKey, JSON.stringify([...saved])); } catch {} $('#saved-count').textContent = String(saved.size).padStart(2,'0'); };
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const category = $('#category');
  if (category) [...new Set(records.map(r => r.category))].sort().forEach(value => { const opt=document.createElement('option'); opt.value=value;opt.textContent=value;category.append(opt); });
  const filters = ['#search-records','#category','#score','#view'];
  filters.forEach(q => $(q)?.addEventListener(q==='#search-records'?'input':'change', render));
  const detailDialog = $('#detail-dialog');
  function openDetails(id) {
    const r=records.find(item => item.id===id); if (!r || !detailDialog) return;
    $('#detail-title').textContent=r.title;
    $('#detail-desc').textContent=r.summary;
    const fields=[['Illustrative source',r.issuer],['Category',r.category],['Market / coverage',r.region],['Sample value / type',r.value],['Sample timeline',r.deadline],['Sample fit score',r.score+' / 100']];
    $('#detail-fields').replaceChildren(...fields.map(([k,v])=>{const div=document.createElement('div');const dt=document.createElement('dt');dt.textContent=k;const dd=document.createElement('dd');dd.textContent=v;div.append(dt,dd);return div;}));
    $('#detail-reason').textContent='Example relevance rationale: '+r.reason+' This is not an eligibility determination or a verified lead.';
    if (detailDialog.showModal) detailDialog.showModal(); else detailDialog.setAttribute('open','');
  }
  $('#close-detail')?.addEventListener('click',()=>detailDialog.close());
  detailDialog?.addEventListener('click',e=>{if(e.target===detailDialog) detailDialog.close();});
  function filtered(){
    const query=($('#search-records')?.value||'').trim().toLowerCase();
    const cat=$('#category')?.value||'all'; const score=Number($('#score')?.value||0); const view=$('#view')?.value||'all';
    return records.filter(r=> (cat==='all'||r.category===cat) && r.score>=score && (view!=='saved'||saved.has(r.id)) && (!query||[r.title,r.issuer,r.category,r.region,r.summary].join(' ').toLowerCase().includes(query)));
  }
  function render(){
    const list=filtered(); const target=$('#results');if(!target)return;
    if (!list.length) {target.innerHTML='<div class="nothing">No sample records match this view. Try another filter.</div>';}
    else target.innerHTML=list.map(r=>`<article class="result-row"><div><span class="sample-tag">${esc(r.category)} · FICTIONAL DEMO</span><h3 style="margin-top:7px">${esc(r.title)}</h3><p>${esc(r.issuer)} · ${esc(r.region)} · ${esc(r.deadline)}</p></div><div class="right"><span class="score-pill">${esc(r.score)} fit</span><button class="save ${saved.has(r.id)?'is-saved':''}" type="button" data-save="${esc(r.id)}" aria-label="${saved.has(r.id)?'Remove saved':'Save'} ${esc(r.title)}">${saved.has(r.id)?'✓ Saved':'+ Save'}</button><button class="save" type="button" data-detail="${esc(r.id)}">Details ↗</button></div></article>`).join('');
    $('#record-count').textContent=String(list.length).padStart(2,'0');
    saveState();
  }
  $('#results')?.addEventListener('click',e=>{
    const s=e.target.closest('[data-save]'); if(s){ const id=s.dataset.save; saved.has(id)?saved.delete(id):saved.add(id);render();return; }
    const d=e.target.closest('[data-detail]');if(d)openDetails(d.dataset.detail);
  });
  $('#export-csv')?.addEventListener('click',()=>{
    const fields=['title','issuer','category','region','value','deadline','score','summary'];
    const csv=[['data_status',...fields], ...filtered().map(r=>['FICTIONAL DEMO RECORD',...fields.map(k=>r[k])])].map(row=>row.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=slug+'-SAMPLE-ONLY.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);say('Fictional sample records exported as CSV.');
  });
  render();
})();
