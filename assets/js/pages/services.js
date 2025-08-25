// assets/js/pages/services.js
(() => {
  const DATA_URL = 'assets/data/services.yml';

  const $ = (s, r=document) => r.querySelector(s);
  const el = (t,a={},c=[]) => {
    const n = document.createElement(t);
    for (const [k,v] of Object.entries(a)) {
      if (k==='class') n.className=v;
      else if (k==='text') n.textContent=v;
      else if (k==='html') n.innerHTML=v;
      else n.setAttribute(k,v);
    }
    ([]).concat(c).forEach(ch=>ch && n.appendChild(ch));
    return n;
  };
  const toSlug = (str='') => str.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

  async function loadYaml(url){
    try{
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      return jsyaml.load(await res.text());
    }catch(e){ console.error('YAML load failed:', e); return null; }
  }

  // Search state
  let allServices = [];
  let activeCategory = 'Todos';
  let query = '';

  const uniq = arr => [...new Set(arr)];

  function buildFilters(services) {
    const mount = $('#servicesFilters');
    if (!mount) return;
    const cats = uniq(['Todos', ...services.map(s => s.category).filter(Boolean)]);
    mount.innerHTML = '';
    cats.forEach(cat => {
      const btn = el('button', {
        type:'button',
        class:'svc-chip',
        'aria-pressed': String(cat===activeCategory)
      }, [document.createTextNode(cat)]);
      btn.addEventListener('click', () => {
        activeCategory = cat;
        for (const b of mount.querySelectorAll('.svc-chip')) {
          b.setAttribute('aria-pressed', String(b===btn));
        }
        renderList();
      });
      mount.appendChild(btn);
    });
  }

  function matches(svc, q){
    if (!q) return true;
    const faqText = Array.isArray(svc.faq) ? svc.faq.map(f => `${f.q} ${f.a}`).join(' ') : '';
    const hay = [
      svc.title, svc.summary, svc.category,
      ...(svc.tags||[]),
      ...(svc.highlights||[]),
      ...(svc.bullets||[]),
      ...(svc.outcomes||[]),
      ...(svc.deliverables||[]),
      ...(svc.obligations||[]),
      ...(svc.documents_required||[]),
      ...(svc.onboarding_steps||[]),
      ...(svc.for||[]),
      faqText
    ].join(' ').toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function inCategory(svc){
    return activeCategory==='Todos' || (svc.category||'')===activeCategory;
  }

  // pequenos chips de contexto (sem SLA/tools)
  function chipFacts(svc){
    const facts = el('div', { class:'facts' });
    const pool = [
      ...(svc.highlights || []),
      ...(svc.obligations || []),
      ...(svc.for || []),
    ];
    const picks = pool.filter(Boolean).slice(0, 2);
    picks.forEach(txt => facts.append(
      el('span', { class:'fact' }, [
        el('span', { class:'dot', 'aria-hidden':'true' }),
        el('span', { text: String(txt) })
      ])
    ));
    return facts;
  }

  function sectionList(title, items){
    if (!Array.isArray(items) || !items.length) return null;
    const wrap = el('div', { class:'mt-03' });
    wrap.append(el('h4', { text:title, class:'svc-sec-title' }));
    const ul = el('ul', { class:'bullets' });
    items.forEach(i => ul.append(el('li', { text:String(i) })));
    wrap.append(ul);
    return wrap;
  }

  function renderList() {
    const list = $('#servicesList');
    const empty = $('#servicesEmpty');
    if (!list) return;

    const filtered = allServices.filter(s => inCategory(s) && matches(s, query));
    list.innerHTML = '';

    if (filtered.length === 0) { empty.hidden = false; return; }
    empty.hidden = true;

    filtered.forEach((svc, i) => {
      const slug = svc.slug || toSlug(svc.title || `servico-${i+1}`);
      const card = el('article', { class:'card service shadow', id:`svc-${slug}`, role:'listitem' });

      const icon = el('div', { class:'service-icon', 'aria-hidden':'true', text: svc.icon || '📌' });
      const h3 = el('h3', { text: svc.title || 'Serviço' });
      const sum = svc.summary ? el('p', { class:'section-lead', text: svc.summary }) : null;

      const facts = chipFacts(svc);

      // bullets (top 3)
      const bullets = Array.isArray(svc.bullets) ? svc.bullets.slice(0,3) : [];
      let ul = null;
      if (bullets.length) {
        ul = el('ul', { class:'bullets' });
        bullets.forEach(b => ul.append(el('li', { text: String(b) })));
      }

      // tags (curtas)
      let tagsWrap = null;
      if (Array.isArray(svc.tags) && svc.tags.length) {
        tagsWrap = el('div', { class:'svc-tags' });
        svc.tags.slice(0, 4).forEach(t => tagsWrap.append(el('span', { class:'tag', text:String(t) })));
      }

 const det = el('details');

// "Saber mais" com rótulos dinâmicos e chevron
const sumDet = el('summary', { class:'svc-summary' }, [
  el('span', { class:'when-closed', text:'Saber mais' }),
  el('span', { class:'when-open',  text:'Mostrar menos' }),
    el('span', {
    class: 'chev',
    'aria-hidden': 'true',
    html: `
      <svg viewBox="0 0 24 24" width="18" height="18" role="img" aria-hidden="true">
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `
  })
]);

det.append(sumDet);


      const detWrap = el('div');

      if (Array.isArray(svc.outcomes) && svc.outcomes.length) {
        const oc = el('div', { class:'outcomes' });
        svc.outcomes.forEach(o => oc.append(el('span', { class:'outcome', text:String(o) })));
        detWrap.append(oc);
      }

      if (Array.isArray(svc.bullets) && svc.bullets.length > 3) {
        const more = el('ul', { class:'bullets' });
        svc.bullets.slice(3).forEach(b => more.append(el('li', { text:String(b) })));
        detWrap.append(more);
      }

      // secções detalhadas (sem Ferramentas)
      const sec1 = sectionList('Obrigações legais', svc.obligations);
      const sec2 = sectionList('Entregáveis', svc.deliverables);
      const sec3 = sectionList('Documentos necessários', svc.documents_required);
      const sec4 = sectionList('Onboarding', svc.onboarding_steps);
      [sec1, sec2, sec3, sec4].filter(Boolean).forEach(s => detWrap.append(s));

      // público-alvo
      if (Array.isArray(svc.for) && svc.for.length) {
        const audience = el('div', { class:'outcomes mt-03' });
        svc.for.forEach(a => audience.append(el('span', { class:'outcome', text:String(a) })));
        detWrap.append(el('h4', { text:'Para quem', class:'svc-sec-title' }));
        detWrap.append(audience);
      }

      // FAQ
      if (Array.isArray(svc.faq) && svc.faq.length) {
        const faqBlk = el('div', { class:'svc-faq mt-03' });
        faqBlk.append(el('h4', { class:'svc-sec-title', text:'FAQ' }));
        svc.faq.forEach(item => {
          const qi = (typeof item === 'object') ? item.q : null;
          const ai = (typeof item === 'object') ? item.a : null;
          if (!qi || !ai) return;
          const d = el('details', { class:'faq-item' });
          d.append(
            el('summary', { text: String(qi) }),
            el('div', { class:'answer' }, [ el('p', { text: String(ai) }) ])
          );
          faqBlk.append(d);
        });
        detWrap.append(faqBlk);
      }

      det.append(detWrap);

// actions (apenas CTA principal; fica colado ao fundo via CSS)
const actions = el('div', { class:'actions svc-actions' });
const primary = el('a', {
  class:'btn btn-primary',
  href: (svc.cta_url || 'index.html#contactos'),
  text: (svc.cta_label || 'Falar connosco')
});
actions.append(primary);


      card.append(icon, h3);
      if (sum) card.append(sum);
      card.append(facts);
      if (ul) card.append(ul);
      if (tagsWrap) card.append(tagsWrap);
      card.append(det, actions);
      list.append(card);
    });

    // deep-link highlight
    const hid = decodeURIComponent(location.hash.replace('#',''));
    if (hid) {
      const target = document.getElementById(hid);
      if (target) {
        target.scrollIntoView({behavior:'smooth', block:'start'});
        target.classList.add('job--highlight');
        setTimeout(()=> target.classList.remove('job--highlight'), 1600);
      }
    }
  }

  function injectServiceJSONLD(services){
    if (!Array.isArray(services) || !services.length) return;
    const org = {
      "@type":"Organization",
      "name":"Confere",
      "url":"https://www.confere.pt",
      "logo":"https://www.confere.pt/assets/images/logotipo/light/logo-320.webp"
    };
    const items = services.map((s) => ({
      "@context":"https://schema.org",
      "@type":"Service",
      "name": s.title || "Serviço",
      "description": s.summary || "",
      "provider": org,
      "areaServed": "PT",
      "category": s.category || undefined
    }));
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(items, null, 2);
    document.head.appendChild(s);
  }

  function readQuery(){
    const url = new URL(location.href);
    query = url.searchParams.get('q') || '';
    const input = $('#servicesSearch');
    if (input) input.value = query;
  }

  function bindSearch(){
    const f = $('#servicesSearchForm');
    const i = $('#servicesSearch');
    if (!f || !i) return;
    i.addEventListener('input', () => {
      query = i.value.trim();
      const url = new URL(location.href);
      if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
      history.replaceState(null, '', url.toString());
      renderList();
    });
    f.addEventListener('submit', (e)=>{ e.preventDefault(); });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadYaml(DATA_URL);
    allServices = Array.isArray(data?.services) ? data.services : [];
    buildFilters(allServices);
    readQuery();
    bindSearch();
    renderList();
    injectServiceJSONLD(allServices);
  });
})();
