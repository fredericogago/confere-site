// assets/js/pages/careers.js
(() => {
  const JOBS_YAML = 'assets/data/jobs.yml';
  const CRLF = '\r\n';
  const enc = encodeURIComponent;

  // ---------- helpers ----------
  const $ = (s, r=document) => r.querySelector(s);
  const el = (t,a={},c=[]) => {
    const n=document.createElement(t);
    for (const [k,v] of Object.entries(a)) {
      if (k==='class') n.className=v;
      else if (k==='text') n.textContent=v;
      else if (k==='html') n.innerHTML=v;
      else n.setAttribute(k,v);
    }
    ([]).concat(c).forEach(ch=>ch && n.appendChild(ch));
    return n;
  };
  // --- helper para SVG (ícones)
const svgEl = (tag, attrs = {}, children = []) => {
  const NS = 'http://www.w3.org/2000/svg';
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  ([]).concat(children).forEach(ch => ch && n.appendChild(ch));
  return n;
};


  const toSlug = (str) =>
    (str ?? '')
      .toString()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'oportunidade';

  const buildAbsoluteUrl = (path) => {
    const origin = (location && location.origin) || 'https://www.confere.pt';
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/')) return origin + path;
    return origin + '/' + path;
  };

  const mailtoHref = ({ to, subject, body }) =>
    `mailto:${enc(to)}?subject=${enc(subject)}&body=${enc(body)}`;

  async function loadYaml(url) {
    try {
      const res = await fetch(url, { cache:'no-store' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      return jsyaml.load(await res.text());
    } catch (e) {
      console.error('YAML load failed:', e);
      return null;
    }
  }

  const isJobActive = (job) => {
    if (typeof job?.active === 'boolean') return job.active;
    if (job?.status) return String(job.status).toLowerCase() !== 'fechada';
    return true;
  };

  // ---------- MODAL infra ----------
  let modal, dlg, bodyEl, ctaEl, lastFocus, focusable, jobsIndex = new Map();

  function ensureModal() {
    if (modal) return modal;

    modal = el('div', { id:'jobModal', class:'modal', 'data-state':'closed', 'aria-hidden':'true' });
    const backdrop = el('div', { class:'modal-backdrop', 'data-close':'true' });
    dlg = el('div', { class:'modal-dialog', role:'dialog', 'aria-modal':'true' });

    // header só com botão fechar (bonito + acessível)
// header só com botão fechar (com ícone SVG)
const header = el('header', { class:'modal-header' }, [
  el('button', {
    class:'modal-close',
    type:'button',
    'aria-label':'Fechar',
    title:'Fechar (Esc)',
    'data-close':'true'
  }, [
    svgEl('svg', {
      viewBox:'0 0 24 24',
      'aria-hidden':'true',
      class:'modal-close-icon'
    }, [
      svgEl('path', {
        d:'M6 6l12 12M18 6L6 18',
        fill:'none',
        stroke:'currentColor',
        'stroke-width':'2',
        'stroke-linecap':'round',
        'stroke-linejoin':'round'
      })
    ])
  ])
]);



    bodyEl = el('div', { class:'modal-body' });

    const footer = el('footer', { class:'modal-footer' }, [
      ctaEl = el('a', { class:'btn btn-primary', href:'#', text:'Candidatar' })
    ]);

    dlg.append(header, bodyEl, footer);
    modal.append(backdrop, dlg);
    document.body.appendChild(modal);

    // Fechar (corrigido para mobile: usa closest para apanhar o span interno)
    modal.addEventListener('click', (e) => {
      const closeEl = e.target.closest('[data-close="true"]');
      if (closeEl) { e.preventDefault(); closeModal(); }
    });

    document.addEventListener('keydown', (e) => {
      if (modalOpen() && e.key === 'Escape') { e.preventDefault(); closeModal(); }
      if (modalOpen() && e.key === 'Tab') trapTab(e);
    });

    return modal;
  }

  function modalOpen() { return modal?.dataset.state === 'open'; }

  function openModal(job, id) {
    ensureModal();
    lastFocus = document.activeElement;

    // conteúdo
    bodyEl.innerHTML = '';
    bodyEl.appendChild(buildJobContent(job));

    // CTA mailto
    const email = job.apply_email || 'info@confere.pt';
    const subject = job.apply_subject || `Candidatura - ${job.title || 'Vaga'}`;
    const defaultBody = ['Olá Confere,', '', 'Envio a minha candidatura.', '', 'Obrigad@.'].join(CRLF);
    const body = (job.apply_body || defaultBody).toString().replace(/\n/g, CRLF);
    ctaEl.href = mailtoHref({ to: email, subject, body });

    // A11y: nome do diálogo
    dlg.setAttribute('aria-label', job.title || 'Oportunidade');

    // abrir
    modal.dataset.state = 'open';
    modal.removeAttribute('aria-hidden');
    document.body.classList.add('modal-open');

    // hash canónico (partilha direta da vaga)
    const canonical = (document.querySelector('link[rel="canonical"]')?.href) || buildAbsoluteUrl('carreiras.html');
    const url = canonical.split('#')[0] + '#' + id;
    history.replaceState(null, '', url);

    // esconder CTA em mobile enquanto modal aberta
    setApplyCta(false);

    // focus
    focusable = dlg.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
    (focusable[0] || dlg).focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.dataset.state = 'closed';
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    // remove hash
    const base = location.href.split('#')[0];
    history.replaceState(null, '', base);

    // devolve focus
    lastFocus?.focus?.();

    // volta a avaliar visibilidade da CTA
    toggleCtaOnScroll(true);
  }

  function trapTab(e) {
    const f = Array.from(focusable || []);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); return; }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); return; }
  }

  // ---------- UI builders ----------
  const listSection = (title, items) => {
    if (!Array.isArray(items) || !items.length) return null;
    return el('section', { class:'job-sec' }, [
      el('h4', { class:'job-sec-title', text:title }),
      el('ul', { class:'job-list' }, items.map(i => el('li', { text:String(i) })))
    ]);
  };

  const factsSection = (facts) => {
    const rows = facts.filter(([_,v]) => v != null && String(v).trim() !== '');
    if (!rows.length) return null;
    const dl = el('dl', { class:'job-facts' });
    rows.forEach(([k,v]) => dl.append(el('dt',{text:k}), el('dd',{text:String(v)})));
    return el('section', { class:'job-sec' }, [
      el('h4', { class:'job-sec-title', text:'Informação prática' }),
      dl
    ]);
  };

  const perksPills = (perks) => {
    if (!Array.isArray(perks) || !perks.length) return null;
    return el('section', { class:'job-sec' }, [
      el('h4', { class:'job-sec-title', text:'Benefícios' }),
      el('div', { class:'job-perks' }, perks.map(p => el('span', { class:'tag', text:String(p) })))
    ]);
  };

  function buildJobContent(job) {
    const wrap  = el('div', { class:'job-modal-content' });

    // título dentro da modal
    const title = el('h3', { class:'modal-job-title', text: job.title || 'Oportunidade' });
    wrap.appendChild(title);

    if (job.description) {
      wrap.appendChild(el('p', { class:'section-lead', text:String(job.description) }));
    }

    const left  = el('div');
    const right = el('aside');

    [ listSection('Funções', job.responsibilities),
      listSection('Requisitos', job.requirements),
      listSection('Valorizamos', job.nice_to_have),
      listSection('Ferramentas', job.tools)
    ].filter(Boolean).forEach(sec => left.appendChild(sec));

    const facts = factsSection([
      ['Modelo de trabalho', job.work_model],
      ['Contrato', job.contract],
      ['Departamento', job.department],
      ['Reporta a', job.reports_to],
      ['Local de trabalho', job.workplace],
      ['Horário', job.work_schedule],
      ['Formação', job.education],
      ['Línguas', Array.isArray(job.languages) ? job.languages.join(', ') : job.languages],
      ['Tipo', job.employment_type || job.type]
    ]);
    const perks = perksPills(job.perks);
    [facts, perks].filter(Boolean).forEach(sec => right.appendChild(sec));

    const grid = el('div', { class:'job-cols' }, [left, right]);
    wrap.appendChild(grid);
    return wrap;
  }

  function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const job = jobsIndex.get(id);
    if (job) openModal(job, id);
  }

  // ---------- render cards ----------
  function renderJobs(list, mount) {
    if (!mount) return;
    mount.innerHTML = '';
    jobsIndex.clear();

    const open = (list || []).filter(isJobActive);

    if (!open.length) {
      mount.appendChild(
        el('div', { class:'center-card' }, [
          el('p', { class:'section-lead', text:'Não temos vagas em aberto neste momento.' }),
          el('a', { class:'btn btn-primary mt-08', href:'#candidatura', text:'Candidatura espontânea' })
        ])
      );
      return;
    }

    open.forEach((job, idx) => {
      const slug = toSlug(job.title || '') || `posicao-${idx+1}`;
      const id = `job-${slug}`;
      jobsIndex.set(id, job);

      const card = el('article', {
        class:'card job shadow',
        id,
        'aria-label': job.title || 'Oportunidade'
      });

      const meta = el('div', { class:'meta' });
      [job.location, job.area, job.seniority].filter(Boolean)
        .forEach(t => meta.appendChild(el('span', { class:'tag', text:t })));

      const desc = job.description ? el('p', { class:'section-lead', text: job.description }) : null;

      const email = job.apply_email || 'info@confere.pt';
      const subject = job.apply_subject || `Candidatura - ${job.title || 'Vaga'}`;
      const defaultBody = ['Olá Confere,', '', 'Envio a minha candidatura.', '', 'Obrigad@.'].join(CRLF);
      const body = (job.apply_body || defaultBody).toString().replace(/\n/g, CRLF);
      const href = mailtoHref({ to: email, subject, body });

      const verMais = el('button', {
        class:'btn btn-secondary',
        type:'button',
        text:'Ver mais',
        'aria-label': `Ver mais sobre: ${job.title || 'Oportunidade'}`
      });
      verMais.addEventListener('click', () => openModal(job, id));

      const actions = el('div', { class:'actions' }, [
        el('a', { class:'btn btn-primary', href, text:'Candidatar' }),
        verMais
      ]);

      card.append(meta);
      if (desc) card.appendChild(desc);
      card.appendChild(actions);
      mount.appendChild(card);
    });
  }

  // ---------- JSON-LD ----------
  function injectJobPostingJSONLD(list) {
    const jobs = (list || []).filter(isJobActive);
    if (!jobs.length) return;

    const org = {
      '@type': 'Organization',
      'name': 'Confere',
      'url': 'https://www.confere.pt',
      'logo': 'https://www.confere.pt/assets/images/logotipo/light/logo-320.webp'
    };

    const postings = jobs.map((j, idx) => {
      const slug = toSlug(j.title || '') || `posicao-${idx + 1}`;
      const id = `job-${slug}`;
      const canonical = (document.querySelector('link[rel="canonical"]')?.href) || buildAbsoluteUrl('carreiras.html');
      const url = canonical.split('#')[0] + '#' + id;
      const location = j.location || 'Moscavide, PT';

      const jp = {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        'title': j.title || 'Oportunidade',
        'description': String(j.description || ''),
        'datePosted': j.datePosted || new Date().toISOString().slice(0, 10),
        'employmentType': j.employment_type || j.type || 'FULL_TIME',
        'hiringOrganization': org,
        'jobLocation': {
          '@type': 'Place',
          'address': { '@type': 'PostalAddress', 'addressLocality': location }
        },
        'directApply': true,
        'url': url
      };

      if (j.validThrough) jp.validThrough = j.validThrough;

      if (j.salaryMin && j.salaryMax && j.currency) {
        jp.baseSalary = {
          '@type': 'MonetaryAmount',
          'currency': j.currency,
          'value': {
            '@type': 'QuantitativeValue',
            'minValue': Number(j.salaryMin),
            'maxValue': Number(j.salaryMax),
            'unitText': j.salaryPeriod || 'YEAR'
          }
        };
      }
      return jp;
    });

    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(postings, null, 2);
    document.head.appendChild(s);
  }

  // ---------- CTA móvel (mostrar só quando interessa) ----------
  let applyCta, candidaturaInView = false, lastY = 0;

  function setApplyCta(show){
    if (!applyCta) return;
    applyCta.classList.toggle('is-visible', !!show);
  }

  function toggleCtaOnScroll(forceEvaluate=false){
    if (!applyCta) return;
    if (modalOpen()) { setApplyCta(false); return; }

    const y = window.scrollY || 0;
    const nearTop = y < 200;

    // direção de scroll
    const goingDown = y > lastY + 4;
    const goingUp   = y < lastY - 4;

    const shouldShow = !nearTop && goingUp && !candidaturaInView;
    setApplyCta(shouldShow);

    if (!forceEvaluate) lastY = y;
  }

  function setupMobileCta() {
    applyCta = $('#applyCta') || $('.apply-cta');

    // Observa a secção de candidatura para esconder CTA quando está visível
    const target = $('#candidatura');
    if ('IntersectionObserver' in window && target) {
      const io = new IntersectionObserver((entries)=>{
        candidaturaInView = !!entries[0]?.isIntersecting;
        toggleCtaOnScroll(true);
      }, { threshold: 0.1 });
      io.observe(target);
    }

    lastY = window.scrollY || 0;
    window.addEventListener('scroll', () => toggleCtaOnScroll(), { passive: true });
    toggleCtaOnScroll(true);
  }

  // ---------- formulário candidatura espontânea ----------
  function mountSpontaneousForm() {
    const form = $('#spontaneousForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const email = 'info@confere.pt';
      const subject = 'Candidatura — Espontânea';

      const bodyLines = [
        `Nome: ${data.get('nome')||''}`,
        `Email: ${data.get('email')||''}`,
        `Telefone: ${data.get('telefone')||''}`,
        `Área: ${data.get('area')||''}`,
        '',
        (data.get('mensagem')||'').toString(),
        '',
        'Anexe o seu CV no email antes de enviar.'
      ];
      const body = bodyLines.join(CRLF);
      const mailto = mailtoHref({ to: email, subject, body });

      try { window.location.href = mailto; } catch {}
      setTimeout(() => { try { window.open(mailto, '_self'); } catch {} }, 0);

      form.reset();
    });
  }

  // ---------- init ----------
  document.addEventListener('DOMContentLoaded', async () => {
    ensureModal();
    const data = await loadYaml(JOBS_YAML);
    const jobs = data?.jobs || [];

    renderJobs(jobs, $('#jobsPage'));
    injectJobPostingJSONLD(jobs);
    mountSpontaneousForm();
    setupMobileCta();

    window.addEventListener('hashchange', openFromHash);
    openFromHash();
  });
})();
