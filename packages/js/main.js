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
            if (el.classList.contains("pipeline-steps")) {
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
  const targets = $$("[data-count]:not([data-observed]), .chart:not([data-observed]), .pipeline-steps:not([data-observed])", root);
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

/*==================== DISCLOSURE ("Show details") ====================*/
// Long text sits behind a toggle so the page stays skimmable; the summary (tiles, metrics) stays visible
let disclosureCount = 0;
function disclosure(content, { show = "Show details", hide = "Hide details", buttonAfter = false } = {}) {
  if (!content.trim()) return "";
  const id = `details-${++disclosureCount}`;
  const button = `
    <button type="button" class="disclosure" aria-expanded="false" aria-controls="${id}" data-show="${escapeHTML(show)}" data-hide="${escapeHTML(hide)}">
      <span class="disclosure__label">${escapeHTML(show)}</span>${icon("chevron-down")}
    </button>`;
  const panel = `<div class="disclosure__panel" id="${id}" hidden>${content}</div>`;
  // buttonAfter: revealed text continues straight on from the preview, with the toggle below it
  return buttonAfter ? panel + button : button + panel;
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".disclosure");
  if (!btn || btn.classList.contains("clamp-toggle")) return;
  const panel = document.getElementById(btn.getAttribute("aria-controls"));
  const open = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", String(!open));
  $(".disclosure__label", btn).textContent = open ? btn.dataset.show : btn.dataset.hide;
  panel.hidden = open;
  if (open) {
    // Collapsing a long panel: keep its card in view instead of leaving the reader far below
    const target = btn.closest(".card") || btn;
    if (target.getBoundingClientRect().top < 0) target.scrollIntoView({ block: target === btn ? "center" : "start" });
  }
});

// Job details render in full inside a "clamp": collapsed, it shows the first bullet and fades
// the start of the next one out under a "Show more" button; expanded, it grows to full height.
function jobDetails(job) {
  return clampBlock(bulletList(job.bullets) + (job.projects || []).map(renderJobProject).join("") + chips(job.tech));
}

// Shared by experience and projects: full content, collapsed to the first bullet plus a faded peek
function clampBlock(content) {
  if (!content.trim()) return "";
  const id = `clamp-${++disclosureCount}`;
  return `
    <div class="clamp is-clamped" id="${id}">${content}</div>
    <button type="button" class="disclosure clamp-toggle" aria-expanded="false" aria-controls="${id}" data-show="Show more" data-hide="Show less">
      <span class="disclosure__label">Show more</span>${icon("chevron-down")}
    </button>`;
}

const CLAMP_PEEK = 64; // default px of the next item left visible (and faded) below the anchor

// Collapsed height = bottom of the anchor (default: the first bullet; data-anchor overrides) plus a
// peek of what follows. Re-measured on resize (first shown, window resized, a card inside expands).
function fitClamp(el) {
  if (!el || !el.classList.contains("is-clamped")) return;
  const btn = document.querySelector(`[aria-controls="${el.id}"]`);
  if (el.dataset.peekOnly) {
    // Nothing shown in full: just a fixed-height peek of the content under the fade
    if (!el.offsetParent) return;
    const peekHeight = Number(el.dataset.peekOnly);
    if (el.scrollHeight <= peekHeight + 48) return releaseClamp(el, btn);
    el.style.maxHeight = `${peekHeight}px`;
    if (btn) btn.hidden = false;
    return;
  }
  const anchor = el.dataset.anchor ? el.querySelector(el.dataset.anchor) : el.querySelector(".bullets li");
  if (!anchor || !el.offsetParent) {
    // Nothing worth collapsing (e.g. two or fewer projects): show everything
    if (el.dataset.anchor && !anchor) releaseClamp(el, btn);
    return;
  }
  const peek = Number(el.dataset.peek) || CLAMP_PEEK;
  const height = Math.ceil(anchor.getBoundingClientRect().bottom - el.getBoundingClientRect().top + peek);
  if (el.scrollHeight <= height + 48) {
    // Less than ~2 lines would be hidden: show it all, no fade, no button
    releaseClamp(el, btn);
    return;
  }
  el.style.maxHeight = `${height}px`;
  if (btn) btn.hidden = false;
}

function releaseClamp(el, btn) {
  el.classList.remove("is-clamped");
  el.style.maxHeight = "";
  setClampHidden(el, false);
  if (btn) btn.hidden = true;
}

// Content fully below the fold of a collapsed clamp is taken out of tab order and the a11y tree
function setClampHidden(el, hidden) {
  $$("[data-clamp-hide]", el).forEach((node) => {
    node.inert = hidden;
    if (hidden) node.setAttribute("aria-hidden", "true");
    else node.removeAttribute("aria-hidden");
  });
}

const clampObserver =
  "ResizeObserver" in window
    ? new ResizeObserver((entries) => entries.forEach((e) => fitClamp(e.target.closest(".clamp"))))
    : null;

function setupClamps(root = document) {
  $$(".clamp:not([data-clamp])", root).forEach((el) => {
    el.setAttribute("data-clamp", "");
    if (clampObserver) {
      clampObserver.observe(el);
      // An anchored clamp's height is capped, so also watch its content for growth (a card expanding)
      if (el.dataset.anchor && el.firstElementChild) clampObserver.observe(el.firstElementChild);
    }
    if (el.classList.contains("is-clamped")) setClampHidden(el, true);
    fitClamp(el);
  });
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".clamp-toggle");
  if (!btn) return;
  const el = document.getElementById(btn.getAttribute("aria-controls"));
  const open = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", String(!open));
  $(".disclosure__label", btn).textContent = open ? btn.dataset.show : btn.dataset.hide;

  if (!open) {
    // Expand: animate to the full height, then release the cap so content can reflow freely
    setClampHidden(el, false);
    el.style.maxHeight = `${el.scrollHeight}px`;
    el.classList.remove("is-clamped");
    const release = (ev) => {
      if (ev && (ev.target !== el || ev.propertyName !== "max-height")) return; // ignore bubbling from children
      el.removeEventListener("transitionend", release);
      if (btn.getAttribute("aria-expanded") === "true") el.style.maxHeight = "none";
    };
    if (reducedMotion) release();
    else el.addEventListener("transitionend", release);
  } else {
    // Collapse: pin the current height first so the transition has a start value
    el.style.maxHeight = `${el.scrollHeight}px`;
    void el.offsetHeight;
    el.classList.add("is-clamped");
    setClampHidden(el, true);
    fitClamp(el);
    const target = btn.closest(".card") || el;
    if (target.getBoundingClientRect().top < 0) target.scrollIntoView({ block: "start" });
  }
});

function renderExperience(jobs) {
  const list = $("#experience-list");
  const jobCard = (job) => `
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
          ${jobDetails(job)}
        </div>
      </article>`;

  $("#experience-count").textContent = `(${jobs.length})`;

  // Current role(s) as full cards; earlier roles as compact rows that open in place
  const current = jobs.filter((j) => j.current);
  const shown = current.length ? current : jobs.slice(0, 1);
  const earlier = jobs.filter((j) => !shown.includes(j));
  list.innerHTML = shown.map(jobCard).join("");

  if (earlier.length) {
    $("#experience-previous-list").innerHTML = earlier
      .map((job) => {
        const id = `prev-${++disclosureCount}`;
        const headline = job.headline || (job.highlights || [])[0];
        return `
        <li class="prev reveal" data-clamp-hide>
          <div class="prev__row">
            <p class="prev__dates meta">${escapeHTML(job.start)} - ${escapeHTML(job.end)}</p>
            <div class="prev__main">
              <h3 class="prev__role">${escapeHTML(job.role)} <span>· ${escapeHTML(job.company)}</span></h3>
              ${present(job.summary) ? `<p class="prev__summary">${escapeHTML(job.summary)}</p>` : ""}
            </div>
            ${headline ? `<p class="prev__result"><span class="mono">${escapeHTML(headline.value)}</span> <span>${escapeHTML(headline.label)}</span></p>` : ""}
            <button type="button" class="disclosure prev__toggle" aria-expanded="false" aria-controls="${id}" data-show="Details" data-hide="Hide"
                    aria-label="${escapeHTML(`Details: ${job.role}, ${job.company}`)}">
              <span class="disclosure__label">Details</span>${icon("chevron-down")}
            </button>
          </div>
          <div class="disclosure__panel prev__details" id="${id}" hidden>
            <p class="job__loc">${escapeHTML(job.location)}</p>
            ${tiles(job.highlights)}
            ${bulletList(job.bullets)}
            ${(job.projects || []).map(renderJobProject).join("")}
            ${chips(job.tech)}
          </div>
        </li>`;
      })
      .join("");
    $("#experience-previous").hidden = false;
    const prevToggle = $("#previous-toggle");
    prevToggle.dataset.show = `Show previous roles (${earlier.length})`;
    $(".disclosure__label", prevToggle).textContent = prevToggle.dataset.show;
  }
  observeReveal($("#experience"));
  setupClamps($("#experience"));
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

// The featured project's pipeline, as a row of stages (a signal pulses through them on screen)
function pipelineSteps(p) {
  if (!p.pipeline || !p.pipeline.length) return "";
  return `
    <ol class="pipeline-steps" aria-label="${escapeHTML(`${p.title.split(" - ")[0]} pipeline`)}">
      ${p.pipeline
        .map(
          (s, i) => `
        <li class="step${s.highlight ? " step--hi" : ""}" style="--i: ${i}">
          <p class="step__n">0${i + 1} · ${escapeHTML(s.stage)}</p>
          <p class="step__label">${escapeHTML(s.label)}</p>
        </li>`
        )
        .join("")}
    </ol>`;
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
      <div class="feature__head">
        <div class="feature__intro">
          <p class="meta">${escapeHTML([p.category || "Featured", p.status, p.period].filter(present).join(" · "))}</p>
          <h3 class="feature__title">${escapeHTML(p.title)}</h3>
          <p class="feature__tagline">${escapeHTML(p.tagline)}</p>
        </div>
        <div class="actions">
          ${button(links.live, "Live demo", "btn--primary", "external")}
          ${button(links.github, codeLabel(links.github || ""), "btn--ghost", "github")}
          ${button(links.architecture, "Architecture", "btn--ghost", "")}
        </div>
      </div>
      ${pipelineSteps(p)}
      <div class="feature__cols">
        <div class="feature__body">
          ${clampBlock(bulletList(p.bullets))}
          ${chips(p.tech)}
        </div>
        ${renderChart(p.evaluation)}
      </div>
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

function renderProjectCard(p, mini = false, collapsible = false) {
  const metrics = (p.metrics || []).length
    ? `<ul class="pcard__metrics">${p.metrics
        .map((m) => `<li><span class="mono">${escapeHTML(m.value)}</span> <span>${escapeHTML(m.label)}</span></li>`)
        .join("")}</ul>`
    : "";
  return `
    <article class="card pcard${mini ? " pcard--mini" : " reveal"}"${collapsible ? " data-clamp-hide" : ""}>
      <p class="meta">${escapeHTML([p.category, p.period].filter(Boolean).join(" · "))}</p>
      <h3 class="pcard__title">${escapeHTML(p.title)}</h3>
      <p class="pcard__desc">${escapeHTML(p.tagline)}</p>
      ${mini ? "" : metrics}
      ${mini ? "" : clampBlock(bulletList(p.bullets))}
      ${mini ? "" : screenStrip(p)}
      ${chips(p.tech)}
      <div class="pcard__links">${linkList(p)}</div>
    </article>`;
}

const VISIBLE_PROJECTS = 0; // under "All", only the featured project shows in full
const FILTER_LABELS = { all: "all", ai: "AI & ML", web: "web & mobile", research: "research" };

function renderProjects(projects) {
  const hero = projects.find((p) => p.tier === "featured-hero");
  const featured = projects.filter((p) => p.tier === "featured");
  const more = projects.filter((p) => p.tier === "more");

  $("#projects-count").textContent = `(${projects.length})`;
  if (hero) renderFeatured(hero);

  const apply = (filter) => renderProjectList({ hero, featured, more, filter });
  $$("#project-filters .filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$("#project-filters .filter").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      apply(btn.dataset.filter);
    })
  );
  apply("all");
  observeReveal($("#projects"));
}

// "All": two cards plus a faded peek and "Show N more". A filter: every match, nothing collapsed.
function renderProjectList({ hero, featured, more, filter }) {
  const matches = (p) => filter === "all" || (p.kinds || []).includes(filter);
  const shownFeatured = featured.filter(matches);
  const shownMore = more.filter(matches);
  const clampEl = $("#projects-clamp");
  const toggle = $("#projects-toggle");
  const collapse = filter === "all";

  $("#project-hero").hidden = !(hero && matches(hero));
  $("#project-grid").innerHTML = shownFeatured.map((p, i) => renderProjectCard(p, false, collapse && i >= VISIBLE_PROJECTS)).join("");
  $("#project-more").innerHTML = shownMore.map((p) => renderProjectCard(p, true)).join("");
  $("#more-wrap").hidden = !shownMore.length;

  // Reset the list's collapsed state for this view
  toggle.setAttribute("aria-expanded", "false");
  clampEl.style.maxHeight = "";
  if (collapse) {
    const hiddenCount = Math.max(0, shownFeatured.length - VISIBLE_PROJECTS) + shownMore.length;
    toggle.dataset.show = `Show ${hiddenCount} more project${hiddenCount === 1 ? "" : "s"}`;
    $(".disclosure__label", toggle).textContent = toggle.dataset.show;
    clampEl.classList.add("is-clamped");
    setClampHidden(clampEl, true);
  } else {
    releaseClamp(clampEl, toggle);
  }

  const count = shownFeatured.length + shownMore.length + ($("#project-hero").hidden ? 0 : 1);
  $("#filter-status").textContent =
    filter === "all" ? `Showing all ${count} projects` : `Showing ${count} ${FILTER_LABELS[filter]} project${count === 1 ? "" : "s"}`;

  observeReveal($("#projects"));
  setupClamps($("#projects"));
  if (collapse) fitClamp(clampEl);
}

/*==================== SERVICES ====================*/
function renderServices({ services = [], process = [] }) {
  // Compact numbered list: title + one line each
  $("#services-grid").innerHTML = services
    .map(
      (s, i) => `
      <li class="service">
        <span class="service__n mono" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
        <div>
          <h3 class="service__title">${escapeHTML(s.title)}</h3>
          <p class="service__summary">${escapeHTML(s.summary)}</p>
        </div>
      </li>`
    )
    .join("");

  // "How I work" as a small vertical timeline
  $("#process-list").innerHTML = process
    .map((p) => `<li><p class="process__step">${escapeHTML(p.step)}</p><p class="process__text">${escapeHTML(p.text)}</p></li>`)
    .join("");
  observeReveal($("#services"));
}

/*==================== STACK ====================*/
function renderSkills(groups) {
  const grid = $("#skills-grid");
  grid.innerHTML = groups
    .map(
      (g) => `
      <div class="stack__box reveal">
        <h3 class="stack__group">${escapeHTML(g.group)}</h3>
        ${chips(g.items)}
      </div>`
    )
    .join("");
  observeReveal(grid);
}

/*==================== EDUCATION ====================*/
// Degree with its photo side by side; earlier education as short lines underneath
function renderEducation(entries) {
  const [degree, ...earlier] = entries;
  if (!degree) return;
  const sub = (e) => withBreaks(e.subtitle).replace(/<br>/g, " · ");
  const photo = degree.photo && present(degree.photo.src) ? degree.photo : null;
  $("#education-card").innerHTML = `
    ${
      photo
        ? `<figure class="edu__photo">
        <img src="${escapeHTML(photo.src)}" alt="${escapeHTML(photo.alt)}" width="${photo.width || 1200}" height="${photo.height || 840}" loading="lazy">
        ${present(photo.caption) ? `<figcaption>${escapeHTML(photo.caption)}</figcaption>` : ""}
      </figure>`
        : ""
    }
    <div class="edu__main">
      <p class="panel__label mono">Education</p>
      <p class="edu__title">${escapeHTML(degree.title)}</p>
      <p class="edu__sub">${sub(degree)}</p>
      <p class="edu__date meta">${escapeHTML(degree.date)}</p>
      ${
        earlier.length
          ? `<ul class="edu__earlier">${earlier
              .map(
                (e) =>
                  `<li><span class="edu__earlier-title">${escapeHTML(e.title)}</span> <span class="edu__earlier-sub">${sub(e)}</span> <span class="meta">${escapeHTML(e.date)}</span></li>`
              )
              .join("")}</ul>`
          : ""
      }
    </div>`;
}

/*==================== CERTIFICATIONS ====================*/
function renderCertifications({ certifications = [], achievements = [] }) {
  $("#achievement-list").innerHTML = achievements
    .map(
      (a) =>
        `<li><span class="awards__result">${escapeHTML(a.result)}</span> - <span class="awards__detail">${escapeHTML(a.title)}, ${escapeHTML(a.detail)}</span></li>`
    )
    .join("");

  const certItem = (c) => {
    const title = present(c.link)
      ? `<a href="${escapeHTML(c.link)}"${extAttrs(c.link)}>${escapeHTML(c.title)}<span class="sr-only">${newTab(c.link)}</span></a>`
      : escapeHTML(c.title);
    const year = present(c.year) ? `, ${escapeHTML(c.year)}` : "";
    return `<li>${title} <span class="certs__issuer">- ${escapeHTML(c.issuer)}${year}</span></li>`;
  };
  // First three always visible; the rest behind "Show all"
  const shown = certifications.slice(0, 3);
  const rest = certifications.slice(3);
  $("#cert-grid").innerHTML = shown.map(certItem).join("");
  if (rest.length) {
    $("#cert-grid").insertAdjacentHTML(
      "afterend",
      disclosure(`<ul class="certs">${rest.map(certItem).join("")}</ul>`, {
        show: `Show all certificates (${certifications.length})`,
        hide: "Show fewer",
      })
    );
  }
}

/*==================== LOAD DATA ====================*/
const DATA = "packages/data/";
[
  ["experience.json", renderExperience, "#experience-list", "experience"],
  ["projects.json", renderProjects, "#project-grid", "projects"],
  ["services.json", renderServices, "#services-grid", "services"],
  ["skills.json", renderSkills, "#skills-grid", "skills"],
  ["qualifications.json", renderEducation, "#education-card", "education"],
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
