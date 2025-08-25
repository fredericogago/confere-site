// assets/js/pages/about.js
(() => {
  const CLIENTS_YAML = 'assets/data/clients.yml';

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

  async function loadYaml(url) {
    try {
      const res = await fetch(url, { cache:'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return jsyaml.load(await res.text());
    } catch (e) {
      console.error('YAML load failed:', e);
      return null;
    }
  }

  function initials(name='') {
    return name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]?.toUpperCase() || '').join('');
  }

  function renderClients(list, mount) {
    if (!mount) return;

    const clients = (list || []).filter(c => c?.name && typeof c.name === 'string');
    if (!clients.length) {
      mount.appendChild(el('div', { class:'center-card' }, [
        el('p', { class:'section-lead', text:'Em atualização — em breve mostramos alguns dos nossos clientes.' })
      ]));
      return;
    }

    clients.forEach(c => {
      const cardAttrs = { class:'client', role:'listitem' };
      const labelBits = [c.name, c.industry, c.since ? `desde ${c.since}` : null].filter(Boolean);
      const title = labelBits.join(' • ') || c.name;

      const inner = () => {
        const logoWrap = el('div', { class:'client-logo' });
        if (c.logo) {
          const img = el('img', {
            alt: `${c.name} — cliente Confere`,
            loading: 'lazy',
            decoding: 'async'
          });
          img.src = c.logo;
          img.onerror = () => {
            logoWrap.innerHTML = '';
            logoWrap.appendChild(el('div', { class:'client-fallback', text: initials(c.name) }));
          };
          logoWrap.appendChild(img);
        } else {
          logoWrap.appendChild(el('div', { class:'client-fallback', text: initials(c.name) }));
        }

        const nameEl = el('div', { class:'client-name', text: c.name });
        return [logoWrap, nameEl];
      };

      let card;
      if (c.url) {
        card = el('a', { ...cardAttrs, href: c.url, target: '_blank', rel:'noopener', title, 'aria-label': title }, inner());
      } else {
        card = el('div', { ...cardAttrs, title, 'aria-label': title }, inner());
      }
      mount.appendChild(card);
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadYaml(CLIENTS_YAML);
    const clients = data?.clients || [];
    renderClients(clients, document.getElementById('clientsGrid'));
  });
})();
