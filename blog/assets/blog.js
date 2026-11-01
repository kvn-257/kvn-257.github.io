// Blog post behaviour: TOC scroll-spy, reading progress bar, copy buttons.
// Loaded at the end of <body> in every post.
(function () {
  const links = Array.from(document.querySelectorAll('.toc a'));
  const targets = links
    .map(a => ({ link: a, section: document.querySelector(a.getAttribute('href')) }))
    .filter(t => t.section);

  const progressBar = document.getElementById('progress-bar');

  function update() {
    // A section is "current" once its top has scrolled up past this line
    // (just below the fixed nav).
    if (targets.length) {
      const activeLine = 140;
      let current = targets[0];
      for (const t of targets) {
        if (t.section.getBoundingClientRect().top <= activeLine) current = t;
      }
      // Near the bottom, short trailing sections can't reach the line; force the last one.
      const atBottom = window.innerHeight + window.scrollY >=
                       document.documentElement.scrollHeight - 2;
      if (atBottom) current = targets[targets.length - 1];

      for (const t of targets) {
        t.link.classList.toggle('active', t === current);
      }
    }

    if (progressBar) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
  }

  // One update per animation frame keeps scroll/resize smooth
  let ticking = false;
  function onScrollOrResize() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }
  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });
  update();

  // ---------- Copy-to-clipboard ----------
  const COPY_ICON = '<svg class="icon-copy" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M2.5 11V3.5A1.5 1.5 0 0 1 4 2H11"/></svg>';
  const CHECK_ICON = '<svg class="icon-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5L6.5 11.5L12.5 5"/></svg>';

  // Add a copy button to every <pre> that doesn't already have one (citation boxes do)
  document.querySelectorAll('pre').forEach(pre => {
    const parent = pre.parentElement;
    if (parent && parent.querySelector(':scope > .copy-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.setAttribute('aria-label', 'Copy code');
    btn.setAttribute('title', 'Copy');
    btn.innerHTML = COPY_ICON;
    btn._getText = () => (pre.querySelector('code') || pre).innerText.trim();
    pre.appendChild(btn);
  });

  // Click handlers for every copy button (citation boxes + injected <pre> buttons)
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      let text;
      if (typeof btn._getText === 'function') {
        text = btn._getText();
      } else {
        const target = document.querySelector(btn.getAttribute('data-copy-target'));
        if (!target) return;
        text = target.innerText.trim();
      }
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        // Clipboard may be unavailable (e.g. file:// or insecure context).
      }
      btn.innerHTML = CHECK_ICON;
      btn.classList.add('copied');
      clearTimeout(btn._copyResetTimer);
      btn._copyResetTimer = setTimeout(() => {
        btn.innerHTML = COPY_ICON;
        btn.classList.remove('copied');
      }, 1800);
    });
  });
})();

// ---------- Folded proofs ----------
// <details class="proof"> slides open and shut instead of jumping. Without JS, or with
// reduced motion, it is a plain <details>.
(function () {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('details.proof').forEach(d => {
    const summary = d.querySelector(':scope > summary');
    const body = d.querySelector(':scope > .proof-body');
    if (!summary || !body || !body.animate) return;
    let anim = null;

    summary.addEventListener('click', e => {
      if (calm.matches) return;
      e.preventDefault();
      const closing = d.open && !d.classList.contains('closing');
      // Current height, even mid-animation. A closed <details> still reports its hidden
      // content's height, so count that as 0.
      const from = d.open ? body.getBoundingClientRect().height : 0;
      if (anim) anim.cancel();
      if (closing) {
        d.classList.add('closing');
      } else {
        d.classList.remove('closing');
        d.open = true;
      }
      const to = closing ? 0 : body.scrollHeight;
      const ms = Math.min(560, Math.max(260, Math.abs(to - from) * 0.4));
      body.style.overflow = 'hidden';
      const a = anim = body.animate(
        [{ height: from + 'px', opacity: closing ? 1 : 0.2 }, { height: to + 'px', opacity: closing ? 0 : 1 }],
        { duration: ms, easing: 'cubic-bezier(.2,.7,.2,1)' }
      );
      a.finished.then(() => {
        if (anim !== a) return;
        anim = null;
        body.style.overflow = '';
        if (closing) { d.open = false; d.classList.remove('closing'); }
        window.dispatchEvent(new Event('resize'));   // let the progress bar and figure column catch up
      }).catch(() => {});   // cancelled by a second click: the new animation takes over
    });
  });
})();

// ---------- Side figures ("stage") ----------
// Opt-in with <article class="with-stage">. Each element with data-stage="<figure id>"
// marks where that figure's part of the text begins. On wide screens the figures move
// into a sticky column on the right; the one whose part is being read is shown, and the
// next one slides in when its part starts. On narrow screens they stay inline.
// Figures get "stage:show" / "stage:hide" events (used to pause animations).
(function () {
  const article = document.querySelector('article.with-stage');
  if (!article) return;
  const markers = Array.from(article.querySelectorAll('[data-stage]'));
  const figs = [...new Set(markers.map(m => document.getElementById(m.dataset.stage)).filter(Boolean))];
  if (!figs.length) return;

  const wide = window.matchMedia('(min-width: 1281px)');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const homes = new Map();
  const main = article.querySelector('.post-main') || article;
  // Text that says where the figure is: <span data-wide="on the right" data-narrow="below">
  const where = Array.from(article.querySelectorAll('[data-wide][data-narrow]'));
  const say = wideOn => where.forEach(el => { el.textContent = wideOn ? el.dataset.wide : el.dataset.narrow; });
  let stage = null, note = null, active = null, lastY = window.scrollY, manual = false;

  function enable() {
    stage = document.createElement('aside');
    stage.className = 'stage';
    stage.setAttribute('aria-label', 'Figures');
    note = document.createElement('p');
    note.className = 'stage-note';
    note.textContent = 'The interactive figure for each case appears here as you scroll to it.';
    stage.appendChild(note);
    figs.forEach(f => {
      const home = document.createComment('stage: ' + f.id);
      f.parentNode.insertBefore(home, f);
      homes.set(f, home);
      f.classList.add('on-stage');
      f.hidden = true;
      stage.appendChild(f);
    });
    article.appendChild(stage);
    // Scrolling the figure column by hand switches off the automatic follow (below)
    stage.addEventListener('wheel', () => { manual = true; }, { passive: true });
    stage.addEventListener('touchstart', () => { manual = true; }, { passive: true });
    document.body.classList.add('stage-on');
    say(true);
    active = null;
    update(true);
  }

  function disable() {
    figs.forEach(f => {
      const home = homes.get(f);
      if (home) { home.parentNode.insertBefore(f, home); home.remove(); }
      f.classList.remove('on-stage');
      f.hidden = false;
    });
    homes.clear();
    if (stage) stage.remove();
    stage = note = active = null;
    document.body.classList.remove('stage-on');
    say(false);
  }

  const line = () => window.innerHeight * 0.45;

  // Index of the marker that most recently crossed a line 45% down the viewport
  function currentIndex() {
    let idx = -1;
    markers.forEach((m, i) => { if (m.getBoundingClientRect().top <= line()) idx = i; });
    return idx;
  }

  // A figure taller than the column drifts up slowly while its part of the text is
  // read, so its bottom is in view by the end. Figures that fit never move.
  function follow(i) {
    const over = stage.scrollHeight - stage.clientHeight;
    if (over <= 1) return;
    const id = markers[i].dataset.stage;
    const a = markers[i].getBoundingClientRect().top;
    const endMarker = markers.slice(i + 1).find(m => m.dataset.stage !== id);
    const b = endMarker ? endMarker.getBoundingClientRect().top : main.getBoundingClientRect().bottom;
    const span = Math.max(1, b - a - window.innerHeight * 0.3);
    stage.scrollTop = over * Math.min(1, Math.max(0, (line() - a) / span));
  }

  function update(instant) {
    if (!stage) return;
    const down = window.scrollY >= lastY;
    lastY = window.scrollY;
    const i = currentIndex();
    const next = i >= 0 ? document.getElementById(markers[i].dataset.stage) : null;
    if (next !== active) {
      if (active) { active.hidden = true; active.dispatchEvent(new CustomEvent('stage:hide')); }
      note.hidden = !!next;
      manual = false;
      stage.scrollTop = 0;
      if (next) {
        next.hidden = false;
        if (!instant && !calm.matches && next.animate) {
          next.animate(
            [{ opacity: 0, transform: `translateY(${down ? 32 : -32}px)` }, { opacity: 1, transform: 'none' }],
            { duration: 340, easing: 'cubic-bezier(.2,.7,.2,1)' }
          );
        }
        next.dispatchEvent(new CustomEvent('stage:show'));
      }
      active = next;
    }
    if (active && !manual) follow(i);
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(false); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('load', () => update(true));
  wide.addEventListener('change', e => (e.matches ? enable() : disable()));
  if (wide.matches) enable();
})();
