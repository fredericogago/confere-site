/*
  Confere Website - Dynamic Content Loader
  - Loads services, team and jobs from YAML files and renders them into the page.
  - Keeps DOM manipulation and data concerns separated for clarity and maintainability.
*/

(function () {
    const DATA_PATH = 'assets/data/';

    // Utilities
    function $(selector, root = document) {
        return root.querySelector(selector);
    }

    function el(tag, attrs = {}, children = []) {
        const node = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (k === 'class') node.className = v;
            else if (k === 'text') node.textContent = v;
            else if (k === 'html') node.innerHTML = v;
            else node.setAttribute(k, v);
        }
        for (const child of [].concat(children)) if (child) node.appendChild(child);
        return node;
    }

    // YAML loader with graceful error handling
    async function loadYaml(fileName) {
        try {
            const res = await fetch(`${DATA_PATH}${fileName}`, {cache: 'no-store'});
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            return jsyaml.load(text);
        } catch (err) {
            console.error(`Erro ao carregar ${fileName}:`, err);
            return null;
        }
    }

    // Slider helper: single-row horizontal scroll with controls
    function makeSlider(cards, opts = {}) {
        const slider = el('div', {class: 'slider'});
        const viewport = el('div', {
            class: 'slider-viewport',
            role: 'region',
            'aria-label': opts.ariaLabel || 'Lista',
            tabindex: '0'
        });
        const track = el('div', {class: 'slider-track'});
        cards.forEach(c => track.appendChild(c));
        viewport.appendChild(track);

        const prev = el('button', {
            class: 'slider-btn prev',
            'aria-label': 'Anterior'
        }, [el('span', {'aria-hidden': 'true', text: '‹'})]);
        const next = el('button', {
            class: 'slider-btn next',
            'aria-label': 'Seguinte'
        }, [el('span', {'aria-hidden': 'true', text: '›'})]);

        function updateButtons() {
            const maxScroll = viewport.scrollWidth - viewport.clientWidth - 1; // tolerance
            const atStart = viewport.scrollLeft <= 1;
            const atEnd = viewport.scrollLeft >= maxScroll;
            const overflow = viewport.scrollWidth > viewport.clientWidth + 1;

            prev.hidden = atStart;
            next.hidden = atEnd;

            // Edge fade classes
            slider.classList.toggle('at-start', atStart);
            slider.classList.toggle('at-end', atEnd);
            slider.classList.toggle('no-overflow', !overflow);

            if (!overflow) {
                prev.hidden = true;
                next.hidden = true;
            }
        }

        function scrollByAmount(dir) {
            const amount = Math.max(viewport.clientWidth * 0.9, 260);
            viewport.scrollBy({left: dir * amount, behavior: 'smooth'});
        }

        prev.addEventListener('click', () => scrollByAmount(-1));
        next.addEventListener('click', () => scrollByAmount(1));
        viewport.addEventListener('scroll', updateButtons, {passive: true});
        window.addEventListener('resize', updateButtons);

        // Keyboard support
        viewport.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                scrollByAmount(-1);
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                scrollByAmount(1);
            }
        });

        slider.appendChild(viewport);
        slider.appendChild(prev);
        slider.appendChild(next);

        // Initial state after in DOM
        queueMicrotask(updateButtons);

        return slider;
    }

    // ---------------- Helpers específicos ----------------
    function isJobActive(job) {
        // Se existir campo booleano 'active', respeita-o.
        if (typeof job?.active === 'boolean') return job.active;
        // Compatibilidade: se existir 'status', considera fechada quando indicado.
        if (job?.status) return String(job.status).toLowerCase() !== 'fechada';
        // Por omissão, ativa.
        return true;
    }

    // Renderers
    function renderClients(data, container) {
        if (!container) return;
        container.innerHTML = '';
        const list = (data && Array.isArray(data.clients)) ? data.clients : [];
        if (list.length === 0) {
            container.appendChild(el('p', {
                class: 'section-lead',
                text: 'Em breve partilharemos alguns dos nossos clientes.'
            }));
            return;
        }

        const cards = [];
        for (const c of list) {
            const content = el('div');
            const logoWrap = el('div', {class: 'client-logo'});
            if (c.logo) {
                const img = el('img', {
                    src: c.logo,
                    alt: c.name ? `Logótipo ${c.name}` : 'Logótipo',
                    loading: 'lazy'
                });
                logoWrap.appendChild(img);
            } else {
                // fallback placeholder using brand gradient circle/box
                logoWrap.appendChild(el('div', {
                    class: 'client-logo-fallback',
                    text: (c.name || 'Cliente').charAt(0)
                }));
            }
            content.appendChild(logoWrap);
            content.appendChild(el('h3', {text: c.name || 'Cliente'}));

            let cardInner = content;
            if (c.url) {
                // Wrap with link if URL provided
                const link = el('a', {
                    href: c.url,
                    target: '_blank',
                    rel: 'noopener',
                    class: 'client-link'
                });
                link.appendChild(content);
                cardInner = link;
            }

            const card = el('article', {
                class: 'card client shadow',
                'aria-label': 'Cliente'
            }, [cardInner]);
            cards.push(card);
        }

        const slider = makeSlider(cards, {ariaLabel: 'Clientes'});
        container.appendChild(slider);
    }

    function renderTeam(data, container) {
        if (!container) return;
        container.innerHTML = '';
        if (!data || !Array.isArray(data.team) || data.team.length === 0) {
            container.appendChild(el('p', {
                class: 'section-lead',
                text: 'Em breve partilharemos a nossa equipa.'
            }));
            return;
        }

        const cards = [];
        for (const member of data.team) {
            const card = el('article', {
                class: 'card team shadow',
                'aria-label': 'Membro da equipa'
            });
            const avatar = el('span', {class: 'avatar', 'aria-hidden': 'true'});
            if (member.photo) {
                avatar.appendChild(el('img', {
                    src: member.photo,
                    alt: member.name || 'Membro da equipa'
                }));
            }
            card.appendChild(avatar);
            card.appendChild(el('h3', {text: member.name || 'Nome'}));
            if (member.role) card.appendChild(el('div', {
                class: 'role',
                text: member.role
            }));
            cards.push(card);
        }
        const slider = makeSlider(cards, {ariaLabel: 'Equipa'});
        container.appendChild(slider);
    }

    function renderServices(data, container) {
        if (!container) return;
        container.innerHTML = '';
        if (!data || !Array.isArray(data.services) || data.services.length === 0) {
            container.appendChild(el('p', {
                class: 'section-lead',
                text: 'Em breve partilharemos os nossos serviços.'
            }));
            return;
        }

        const cards = [];
        for (const svc of data.services) {
            const bullets = Array.isArray(svc.bullets) ? svc.bullets : [];
            const card = el('article', {class: 'card service shadow'});
            card.appendChild(el('div', {
                class: 'service-icon',
                'aria-hidden': 'true',
                text: svc.icon || '📌'
            }));
            card.appendChild(el('h3', {text: svc.title || 'Serviço'}));
            if (svc.description) card.appendChild(el('p', {
                class: 'section-lead',
                text: svc.description
            }));
            if (bullets.length) {
                const ul = el('ul', {class: 'bullets'});
                for (const item of bullets) ul.appendChild(el('li', {text: item}));
                card.appendChild(ul);
            }
            cards.push(card);
        }
        const slider = makeSlider(cards, {ariaLabel: 'Serviços'});
        container.appendChild(slider);
    }

    function renderJobs(data, container) {
        if (!container) return;
        container.innerHTML = '';

        const allJobs = (data && Array.isArray(data.jobs)) ? data.jobs : [];
        const openJobs = allJobs.filter(isJobActive);

if (openJobs.length === 0) {
  const wrap = el('div', { class: 'center-card' });
  wrap.appendChild(
    el('p', {
      class: 'section-lead mt-05',
      text: 'Não temos vagas em aberto neste momento.'
    })
  );
  wrap.appendChild(
    el('a', {
      class: 'btn btn-primary mt-08',
      href: 'carreiras.html#candidatura',
      text: 'Candidatura espontânea'
    })
  );
  container.appendChild(wrap);
  return;
}

        const cards = [];
        for (const job of openJobs) {
            const meta = el('div', {class: 'meta'});
            const tags = [job.location, job.area, job.seniority].filter(Boolean);
            for (const t of tags) meta.appendChild(el('span', {
                class: 'tag',
                text: t
            }));

            const article = el('article', {class: 'card job shadow'});
            article.appendChild(meta);
            article.appendChild(el('h3', {text: job.title || 'Oportunidade'}));
            if (job.description) {
                article.appendChild(el('p', {
                    class: 'section-lead',
                    text: job.description
                }));
            }

            const email = job.apply_email || 'info@confere.pt';
            const subject = encodeURIComponent(job.apply_subject || `Candidatura - ${job.title || 'Vaga'}`);
            const body = encodeURIComponent(
                (job.apply_body || 'Olá Confere,\n\nEnvio a minha candidatura. Segue em anexo o meu CV.\n\nObrigad@.')
            );
            const href = `mailto:${email}?subject=${subject}&body=${body}`;

            const actions = el('div', {class: 'actions'});
            actions.appendChild(el('a', {
                class: 'btn btn-secondary',
                href,
                rel: 'noopener',
                text: 'Candidatar'
            }));
            article.appendChild(actions);

            cards.push(article);
        }

        const slider = makeSlider(cards, {ariaLabel: 'Vagas'});
        container.appendChild(slider);
    }

    // Init
    document.addEventListener('DOMContentLoaded', async () => {
        // Dynamic content
        const servicesData = await loadYaml('services.yml');
        renderServices(servicesData, document.getElementById('servicesContainer'));

        const teamData = await loadYaml('team.yml');
        renderTeam(teamData, document.getElementById('teamContainer'));

        const clientsData = await loadYaml('clients.yml');
        renderClients(clientsData, document.getElementById('clientsContainer'));

        const jobsData = await loadYaml('jobs.yml');
        renderJobs(jobsData, document.getElementById('jobsContainer'));
    });
})();

