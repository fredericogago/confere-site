// core.js — header/footer, tema, logo, menu
(function () {
  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Mobile menu toggle
  const btn = document.getElementById('menuBtn');
  const links = document.getElementById('menuLinks');
  if (btn && links) btn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
})();

(() => {
  // Tema + logo (mesmo código que usas na home)
  const KEY = "theme-preference";
  const root = document.documentElement;
  const btn  = document.getElementById("theme-toggle");
  const logo = document.getElementById("brand-logo");
  const mq   = window.matchMedia("(prefers-color-scheme: dark)");

  function logoPaths(theme) {
    const isDark = theme === "dark";
    const src    = logo?.dataset[isDark ? "darkSrc"    : "lightSrc"];
    const srcset = logo?.dataset[isDark ? "darkSrcset" : "lightSrcset"];
    return { src, srcset };
  }

  const getStored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const setStored = (v) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {} };
  const systemTheme = () => (mq.matches ? "dark" : "light");
  const effectiveTheme = () => (root.getAttribute("data-theme") || systemTheme());

  function updateThemeColorMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const cs = getComputedStyle(document.documentElement);
    meta.setAttribute("content", cs.getPropertyValue("--bg").trim());
  }

  function apply(themeOrNull) {
    if (themeOrNull === "light" || themeOrNull === "dark") root.setAttribute("data-theme", themeOrNull);
    else root.removeAttribute("data-theme");

    const cur = effectiveTheme();
    if (btn) {
      btn.textContent = cur === "dark" ? "🌙" : "☀️";
      const label = `Tema atual: ${cur}. Clicar para alternar.`;
      btn.title = label; btn.setAttribute("aria-label", label);
    }
    if (logo) {
      const { src, srcset } = logoPaths(cur);
      if (src && logo.getAttribute("src") !== src) {
        logo.src = src; if (srcset) logo.srcset = srcset;
        logo.alt = `Confere (${cur})`;
      }
    }
    updateThemeColorMeta();
  }

  mq.addEventListener?.("change", () => { if (!getStored()) apply(null); });
  apply(getStored());

  btn?.addEventListener("click", () => {
    const stored = getStored();
    const next = stored ? (stored === "light" ? "dark" : "light")
                        : (systemTheme() === "dark" ? "light" : "dark");
    setStored(next); apply(next);
  });
})();
