/*==================== HELPERS ====================*/
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Owner placeholders ("TODO (owner): ...") are never rendered
const isTodo = (value) => /^TODO \(owner\)/i.test(String(value ?? "").trim());
const present = (value) => Boolean(value) && !isTodo(value);

// Escape everything except explicit <br> line breaks
const withBreaks = (value) => String(value ?? "").split(/<br\s*\/?>/i).map(escapeHTML).join("<br>");

const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

const chips = (items = []) =>
  items.length ? `<ul class="chips">${items.map((t) => `<li class="chip">${escapeHTML(t)}</li>`).join("")}</ul>` : "";

const bulletList = (items = []) => {
  const shown = items.filter(present);
  return shown.length ? `<ul class="bullets">${shown.map((b) => `<li>${escapeHTML(b)}</li>`).join("")}</ul>` : "";
};

const tiles = (items = []) =>
  items.length
    ? `<ul class="tiles">${items
        .map((m) => `<li class="tile"><p class="tile__value">${escapeHTML(m.value)}</p><p class="tile__label">${escapeHTML(m.label)}</p></li>`)
        .join("")}</ul>`
    : "";

const isExternal = (href) => /^https?:\/\//i.test(href);
const extAttrs = (href) => (isExternal(href) ? ' target="_blank" rel="noopener noreferrer"' : "");
const newTab = (href) => (isExternal(href) ? " (opens in new tab)" : "");

// GitHub links say "GitHub"; other code-hosting pages say "Project page"
const codeLabel = (href) => (/github\.com/i.test(href) ? "GitHub" : "Project page");

const loadJSON = (path) =>
  // "no-cache" revalidates with the server so JSON edits show up on the next load
  fetch(path, { cache: "no-cache" }).then((res) => {
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.json();
  });

const showError = (el, what) => {
  if (el) el.innerHTML = `<p class="load-error">Couldn't load ${escapeHTML(what)}. Please refresh the page.</p>`;
};

/*==================== REVEAL ON SCROLL ====================*/
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealObserver =
  !reducedMotion && "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
      )
    : null;

function observeReveal(root = document) {
  $$(".reveal:not(.is-visible)", root).forEach((el) => {
    // Stagger siblings (cards in a grid, list rows) so they cascade in
    const siblings = el.parentElement ? $$(":scope > .reveal", el.parentElement) : [];
    el.style.setProperty("--i", Math.min(siblings.indexOf(el), 8));
    if (revealObserver) revealObserver.observe(el);
    else el.classList.add("is-visible");
  });
  observeMotion(root);
}

/*==================== MOTION: COUNT-UP, CHART BARS, PIPELINE PULSE ====================*/
// Animates "0.94", "+41 pts", "6,665", "1+ yr", "97%" up from zero, ending on the exact original text
function countUp(el) {
  const original = el.textContent;
  const m = original.match(/^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m || reducedMotion) return;
  const [, prefix, num, suffix] = m;
  const target = parseFloat(num.replace(/,/g, ""));
  const decimals = (num.split(".")[1] || "").length;
  const grouped = num.includes(",");
  const duration = 2000;
  const start = performance.now();
  const format = (v) =>
    grouped ? v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : v.toFixed(decimals);
  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = prefix + format(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = original;
  };
  requestAnimationFrame(tick);
}

const motionObserver =
  !reducedMotion && "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const el = entry.target;
            if (el.classList.contains("pipeline")) {
              // The pulse only runs while the panel is on screen
              el.classList.toggle("is-running", entry.isIntersecting);
              return;
            }
            if (!entry.isIntersecting) return;
            if (el.hasAttribute("data-count")) countUp(el);
            else el.classList.add("is-visible");
            motionObserver.unobserve(el);
          });
        },
        { threshold: 0.3 }
      )
    : null;

function observeMotion(root = document) {
  const targets = $$("[data-count]:not([data-observed]), .chart:not([data-observed]), .pipeline:not([data-observed])", root);
  targets.forEach((el) => {
    el.setAttribute("data-observed", "");
    if (motionObserver) motionObserver.observe(el);
    else el.classList.add("is-visible");
  });
}

/*==================== EXPERIENCE ====================*/
function renderJobProject(proj) {
  return `
    <div class="job__project">
      <h4 class="job__project-name">${escapeHTML(proj.name)}</h4>
      ${present(proj.summary) ? `<p class="job__project-summary">${escapeHTML(proj.summary)}</p>` : ""}
      ${bulletList(proj.bullets)}
    </div>`;
}

function renderExperience(jobs) {
  const list = $("#experience-list");
  list.innerHTML = jobs
    .map(
      (job) => `
      <article class="card job reveal">
        <div class="job__side">
          <p class="meta">${escapeHTML(job.start)} - ${escapeHTML(job.end)}</p>
          <h3 class="job__role">${escapeHTML(job.role)}</h3>
          <p class="job__company">${escapeHTML(job.company)}</p>
          <p class="job__loc">${escapeHTML(job.location)}</p>
          ${job.current ? '<span class="pill-live">Current</span>' : ""}
        </div>
        <div class="job__body">
          ${tiles(job.highlights)}
          ${bulletList(job.bullets)}
          ${(job.projects || []).map(renderJobProject).join("")}
          ${chips(job.tech)}
        </div>
      </article>`
    )
    .join("");
  observeReveal(list);
}

/*==================== PROJECTS ====================*/
function linkList(p) {
  const links = p.links || {};
  const items = [
    [links.live, "Live site"],
    [links.paper, "Paper"],
    [links.github, codeLabel(links.github || "")],
  ].filter(([href]) => present(href));
  return items
    .map(
      ([href, label]) =>
        `<a href="${escapeHTML(href)}"${extAttrs(href)} aria-label="${escapeHTML(`${label}: ${p.title}${newTab(href)}`)}">${escapeHTML(label)} <span aria-hidden="true">→</span></a>`
    )
    .join("");
}

function renderPipeline(p) {
  const fig = $("#pipeline");
  if (!fig || !p.pipeline) return;
  fig.innerHTML = `
    <figcaption class="pipeline__cap">
      <span class="meta">${escapeHTML(p.title.split(" - ")[0])} · production RAG pipeline</span>
      <span class="pipeline__live">Live on AWS</span>
    </figcaption>
    <ol class="pipeline__steps">
      ${p.pipeline
        .map(
          (s, i) => `
        <li class="step${s.highlight ? " step--hi" : ""}" style="--i: ${i}">
          <p class="step__n">0${i + 1} · ${escapeHTML(s.stage)}</p>
          <p class="step__label">${escapeHTML(s.label)}</p>
        </li>`
        )
        .join("")}
    </ol>
    <ul class="metric-strip">
      ${(p.pipelineMetrics || [])
        .map((m) => `<li><p class="metric-strip__value" data-count>${escapeHTML(m.value)}</p><p class="metric-strip__label">${escapeHTML(m.label)}</p></li>`)
        .join("")}
    </ul>`;
  fig.hidden = false;
}

function renderChart(ev) {
  if (!ev || !ev.rows) return "";
  return `
    <figure class="chart" aria-label="${escapeHTML(`${ev.title}: ${ev.rows.map((r) => `${r.label} ${r.value}`).join(", ")}`)}">
      <figcaption>
        <p class="chart__title">${escapeHTML(ev.title)}</p>
        <p class="chart__sub meta">${escapeHTML(ev.subtitle)}</p>
      </figcaption>
      <ul class="chart__rows">
        ${ev.rows
          .map(
            (r) => `
          <li class="chart__row${r.highlight ? " chart__row--hi" : ""}">
            <div class="chart__row-head"><span>${escapeHTML(r.label)}</span><span class="mono">${Number(r.value).toFixed(2)}</span></div>
            <div class="chart__track"><div class="chart__bar" style="--w: ${Math.max(0, Math.min(100, Number(r.value) * 100))}%"></div></div>
          </li>`
          )
          .join("")}
      </ul>
      ${present(ev.note) ? `<p class="chart__note">${escapeHTML(ev.note)}</p>` : ""}
    </figure>`;
}

function renderFeatured(p) {
  const links = p.links || {};
  const button = (href, label, cls, iconName) =>
    present(href)
      ? `<a href="${escapeHTML(href)}" class="btn ${cls} btn--sm"${extAttrs(href)} aria-label="${escapeHTML(`${label}: ${p.title}${newTab(href)}`)}">${escapeHTML(label)}${iconName ? icon(iconName) : ""}</a>`
      : "";
  $("#project-hero").innerHTML = `
    <article class="card feature reveal">
      <div class="feature__body">
        <div>
          <p class="meta">${escapeHTML(p.category || "Featured")} · ${escapeHTML(p.period)}</p>
          <h3 class="feature__title">${escapeHTML(p.title)}</h3>
          <p class="feature__tagline">${escapeHTML(p.tagline)}</p>
        </div>
        ${bulletList(p.bullets)}
        ${chips(p.tech)}
        <div class="actions">
          ${button(links.live, "Live demo", "btn--primary", "external")}
          ${button(links.github, codeLabel(links.github || ""), "btn--ghost", "github")}
          ${button(links.architecture, "Architecture diagram", "btn--ghost", "")}
        </div>
      </div>
      ${renderChart(p.evaluation)}
    </article>`;
}

// App screenshots (e.g. a mobile app) as a scrollable row of phone screens
function screenStrip(p) {
  const screens = (p.screens || []).filter((s) => present(s.src));
  if (!screens.length) return "";
  return `
    <div class="screens" tabindex="0" role="region" aria-label="${escapeHTML(`${p.title} screenshots`)}">
      ${screens
        .map(
          (s) => `
        <figure class="screens__item">
          <img src="${escapeHTML(s.src)}" alt="${escapeHTML(s.alt)}" width="480" height="1039" loading="lazy">
          <figcaption class="meta">${escapeHTML(s.label)}</figcaption>
        </figure>`
        )
        .join("")}
    </div>`;
}

function renderProjectCard(p, mini = false) {
  const metrics = (p.metrics || []).length
    ? `<ul class="pcard__metrics">${p.metrics
        .map((m) => `<li><span class="mono">${escapeHTML(m.value)}</span> <span>${escapeHTML(m.label)}</span></li>`)
        .join("")}</ul>`
    : "";
  return `
    <article class="card pcard${mini ? " pcard--mini" : " reveal"}">
      <p class="meta">${escapeHTML([p.category, p.period].filter(Boolean).join(" · "))}</p>
      <h3 class="pcard__title">${escapeHTML(p.title)}</h3>
      <p class="pcard__desc">${escapeHTML(p.tagline)}</p>
      ${mini ? "" : metrics}
      ${mini ? "" : screenStrip(p)}
      ${chips(p.tech)}
      <div class="pcard__links">${linkList(p)}</div>
    </article>`;
}

function renderProjects(projects) {
  const hero = projects.find((p) => p.tier === "featured-hero");
  const featured = projects.filter((p) => p.tier === "featured");
  const more = projects.filter((p) => p.tier === "more");

  if (hero) {
    renderFeatured(hero);
    renderPipeline(hero);
  }
  $("#project-grid").innerHTML = featured.map((p) => renderProjectCard(p)).join("");

  const toggle = $("#more-toggle");
  const moreList = $("#project-more");
  if (more.length) {
    $("#more-line").textContent = `Also: ${more.map((p) => p.title).join(" · ")}.`;
    moreList.innerHTML = more.map((p) => renderProjectCard(p, true)).join("");
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      moreList.hidden = open;
      toggle.firstChild.textContent = open ? "Show all projects " : "Show fewer projects ";
    });
  }
  observeReveal($("#home"));
  observeReveal($("#projects"));
}

/*==================== SERVICES ====================*/
function renderServices({ services = [], process = [] }) {
  $("#services-grid").innerHTML = services
    .map(
      (s, i) => `
      <article class="service">
        <p class="service__n mono">${String(i + 1).padStart(2, "0")}</p>
        <h3 class="service__title">${escapeHTML(s.title)}</h3>
        <p class="service__summary">${escapeHTML(s.summary)}</p>
        ${s.proof ? `<p class="service__proof">Proof: <a href="${escapeHTML(s.proof.href)}">${escapeHTML(s.proof.text)}</a></p>` : ""}
      </article>`
    )
    .join("");

  $("#process-list").innerHTML = process
    .map(
      (p, i) =>
        `<li class="reveal"><p class="process__step"><span class="mono">${i + 1} · </span>${escapeHTML(p.step)}</p><p class="process__text">${escapeHTML(p.text)}</p></li>`
    )
    .join("");
  observeReveal($("#services"));
}

/*==================== STACK ====================*/
function renderSkills(groups) {
  const grid = $("#skills-grid");
  grid.innerHTML = groups
    .map(
      (g) => `
      <div class="stack__row reveal">
        <h3 class="stack__group">${escapeHTML(g.group)}</h3>
        ${chips(g.items)}
      </div>`
    )
    .join("");
  observeReveal(grid);
}

/*==================== EDUCATION ====================*/
function renderEducation(entries) {
  $("#education-list").innerHTML = entries
    .map(
      (e) => `
      <li>
        ${
          e.photo && present(e.photo.src)
            ? `<figure class="edu__photo">
          <img src="${escapeHTML(e.photo.src)}" alt="${escapeHTML(e.photo.alt)}" width="${e.photo.width || 1200}" height="${e.photo.height || 840}" loading="lazy">
          ${present(e.photo.caption) ? `<figcaption>${escapeHTML(e.photo.caption)}</figcaption>` : ""}
        </figure>`
            : ""
        }
        <p class="edu__title">${escapeHTML(e.title)}</p>
        <p class="edu__sub">${withBreaks(e.subtitle).replace(/<br>/g, " · ")}</p>
        <p class="edu__date meta">${escapeHTML(e.date)}</p>
      </li>`
    )
    .join("");
}

/*==================== CERTIFICATIONS ====================*/
function renderCertifications({ certifications = [], achievements = [] }) {
  $("#achievement-list").innerHTML = achievements
    .map(
      (a) =>
        `<li><span class="awards__result">${escapeHTML(a.result)}</span> - <span class="awards__detail">${escapeHTML(a.title)}, ${escapeHTML(a.detail)}</span></li>`
    )
    .join("");

  $("#cert-grid").innerHTML = certifications
    .map((c) => {
      const title = present(c.link)
        ? `<a href="${escapeHTML(c.link)}"${extAttrs(c.link)}>${escapeHTML(c.title)}<span class="sr-only">${newTab(c.link)}</span></a>`
        : escapeHTML(c.title);
      const year = present(c.year) ? `, ${escapeHTML(c.year)}` : "";
      return `<li>${title} <span class="certs__issuer">- ${escapeHTML(c.issuer)}${year}</span></li>`;
    })
    .join("");
}

/*==================== LOAD DATA ====================*/
const DATA = "packages/data/";
[
  ["experience.json", renderExperience, "#experience-list", "experience"],
  ["projects.json", renderProjects, "#project-grid", "projects"],
  ["services.json", renderServices, "#services-grid", "services"],
  ["skills.json", renderSkills, "#skills-grid", "skills"],
  ["qualifications.json", renderEducation, "#education-list", "education"],
  ["certifications.json", renderCertifications, "#cert-grid", "certifications"],
].forEach(([file, render, target, label]) => {
  loadJSON(DATA + file)
    .then(render)
    .catch((err) => {
      console.warn(err);
      showError($(target), label);
    });
});

observeReveal();

/*==================== MOBILE MENU ====================*/
const navMenu = $("#nav-menu");
const navToggle = $("#nav-toggle");
const navClose = $("#nav-close");
const navBackdrop = $("#nav-backdrop");
const mobileQuery = window.matchMedia("(max-width: 899px)");

function openMenu() {
  navMenu.classList.add("show-menu");
  navToggle.setAttribute("aria-expanded", "true");
  navBackdrop.hidden = false;
  document.addEventListener("keydown", menuKeys);
  const first = $(".nav__link", navMenu);
  if (first) first.focus();
}

function closeMenu({ restoreFocus = true } = {}) {
  if (!navMenu.classList.contains("show-menu")) return;
  navMenu.classList.remove("show-menu");
  navToggle.setAttribute("aria-expanded", "false");
  navBackdrop.hidden = true;
  document.removeEventListener("keydown", menuKeys);
  if (restoreFocus) navToggle.focus();
}

function menuKeys(e) {
  if (e.key === "Escape") {
    closeMenu();
    return;
  }
  if (e.key !== "Tab") return;
  // Trap focus inside the open sheet
  const focusables = $$("a[href], button:not([disabled])", navMenu);
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

navToggle.addEventListener("click", openMenu);
navClose.addEventListener("click", () => closeMenu());
navBackdrop.addEventListener("click", () => closeMenu());
$$(".nav__link").forEach((link) => link.addEventListener("click", () => closeMenu({ restoreFocus: false })));
mobileQuery.addEventListener("change", () => closeMenu({ restoreFocus: false }));

/*==================== ACTIVE NAV LINK ====================*/
const navLinks = new Map($$(".nav__link").map((a) => [a.getAttribute("href").slice(1), a]));
if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a, key) => {
          const active = key === entry.target.id;
          a.classList.toggle("is-active", active);
          if (active) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  $$("main section[id]").forEach((s) => sectionObserver.observe(s));
}

/*==================== SCROLL-UP ====================*/
const scrollUpBtn = $("#scroll-up");
let ticking = false;
window.addEventListener(
  "scroll",
  () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      scrollUpBtn.classList.toggle("show-scroll", window.scrollY > 560);
      ticking = false;
    });
  },
  { passive: true }
);

/*==================== THEME ====================*/
const themeButton = $("#theme-button");
const syncThemeButton = () => {
  const dark = document.body.classList.contains("dark-theme");
  themeButton.setAttribute("aria-pressed", String(dark));
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0a0c0e" : "#fafaf9");
};
syncThemeButton();
themeButton.addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark-theme");
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch (e) {
    /* storage unavailable: theme still applies for this visit */
  }
  syncThemeButton();
});

/*==================== CONTACT FORM (Formspree AJAX) ====================*/
const form = $("#contact-form");
const statusEl = $("#form-status");
const submitBtn = $("#contact-submit");
const submitLabel = $(".button__label", submitBtn);

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `form__status${type ? ` is-${type}` : ""}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fields = $$("input[required], textarea[required]", form);
  let firstInvalid = null;
  fields.forEach((f) => {
    const valid = f.checkValidity() && f.value.trim() !== "";
    f.setAttribute("aria-invalid", String(!valid));
    if (!valid && !firstInvalid) firstInvalid = f;
  });
  if (firstInvalid) {
    setStatus("Please fill in all fields with a valid email address.", "error");
    firstInvalid.focus();
    return;
  }

  submitBtn.disabled = true;
  submitLabel.textContent = "Sending…";
  setStatus("", "");

  try {
    const res = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.errors ? data.errors.map((er) => er.message).join(", ") : "";
      throw new Error(msg || `HTTP ${res.status}`);
    }
    form.reset();
    fields.forEach((f) => f.removeAttribute("aria-invalid"));
    setStatus("Thanks, your message has been sent. I'll get back to you soon.", "success");
  } catch (err) {
    console.warn("Contact form:", err);
    setStatus("Sorry, something went wrong. Please email me at tnithusikan@gmail.com.", "error");
  } finally {
    submitBtn.disabled = false;
    submitLabel.textContent = "Send message";
  }
});

/*==================== FOOTER YEAR ====================*/
$("#year").textContent = new Date().getFullYear();
