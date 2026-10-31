/* Interactive figures for "Don't Get Stuck: A Metric for Scanpath Prediction".
   Every <figure class="widget" data-widget="..."> in index.html is filled in here.
   c1–c4 plot the decay factor of one case; c5 scores whole scanpaths with
   M = sqrt(E_tot · T_tot). The simulations follow the equations in the post. */
(function () {
"use strict";

/* ---------------- helpers ---------------- */
const P_STEPS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5];
const LO = 1e-4;                       // floor of the log scale
const fmt = v => v == null ? "—" : v === 0 ? "0" : (v >= 0.01 ? v.toFixed(3) : v.toPrecision(2));
const num = v => String(+(+v).toFixed(2));
const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const jit = (c, i, a) => [c[0] + (hash(i, 1) - .5) * 2 * a, c[1] + (hash(i, 2) - .5) * 2 * a];
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
function tex(s) {
  try { if (window.katex) return katex.renderToString(s, { throwOnError: false }); } catch (e) { /* fall through */ }
  return "<code>" + esc(s) + "</code>";
}
const sw = cls => `<span class="sw ${cls}"></span>`;
const item = (swatch, txt) => `<span class="item">${swatch}<span>${txt}</span></span>`;
const ICON_PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.5h2.75v9H2.5zM6.75 1.5H9.5v9H6.75z" fill="currentColor"/></svg>';

/* ---------------- simulations (follow the equations exactly) ---------------- */
const BLOB_E = [44, 45];
function exploreFrames(zones, frozen, P) {
  const fr = []; let k = 0, l = 0, pos = BLOB_E;
  zones.forEach((z, i) => {
    const f = { i, zone: z, step: null, D: null, env: null, n: 0, k: 0, l: 0, cont: false, event: null };
    if (z === "in") { k = 0; l = 0; f.pos = jit(BLOB_E, i, 5); }
    else {
      const start = i === 0 || zones[i - 1] === "in";
      if (start) { k = 1; l = 0; f.step = "G"; f.event = "start"; }
      else if (frozen.has(i)) { l++; f.step = "L"; }
      else { k++; f.step = "G"; }
      f.k = k; f.l = l; f.n = k + l; f.cont = !start;
      f.D = Math.pow(P.p, k / P.Ng + l / P.Nl);
      f.env = Math.pow(P.p, (k + l) / P.Ng);
      if (f.step === "L") f.pos = [pos[0] + (hash(i, 7) - .5) * .6, pos[1] + (hash(i, 8) - .5) * .6];
      else {
        let q = [94 + hash(i, 3) * 54, 14 + hash(i, 4) * 62];
        if (!start && Math.hypot(q[0] - pos[0], q[1] - pos[1]) < 16) q = [94 + ((q[0] - 94 + 28) % 54), q[1]];
        f.pos = q;
      }
    }
    pos = f.pos; fr.push(f);
  });
  return fr;
}
function trackOne(P) {
  const T = 90, zones = [];
  if (P.leave >= 90) for (let i = 0; i < T; i++) zones.push("in");
  else while (zones.length < T) {
    for (let i = 0; i < P.leave && zones.length < T; i++) zones.push("in");
    for (let i = 0; i < P.away && zones.length < T; i++) zones.push("out");
  }
  const fr = []; let n = 0; const C = [80, 45];
  zones.forEach((z, i) => {
    let event = null;
    if (i === 0) { n = 1; event = "start"; }
    else if (z === "in" && zones[i - 1] === "out") { n = 1; event = "restart"; }
    else n++;
    const D = Math.pow(P.p, n / P.Ng);
    fr.push({ i, zone: z, step: "G", n, l: 0, D, env: null, event, cont: true,
      pos: z === "in" ? jit(C, i, 5) : [124 + hash(i, 5) * 28, 10 + hash(i, 6) * 22] });
  });
  return fr;
}
const CENTERS = { 1: [[80, 43]], 2: [[46, 43], [114, 43]], 3: [[38, 28], [122, 28], [80, 62]],
  4: [[36, 25], [124, 25], [36, 63], [124, 63]], 5: [[32, 24], [128, 24], [80, 44], [32, 66], [128, 66]] };
function trackMany(P) {
  const T = 60, C = CENTERS[P.m], fr = []; let l = 0, prev = -1;
  for (let i = 0; i < T; i++) {
    const r = Math.floor(i / P.dwell) % P.m, n = i + 1; let event = null, step = "G";
    if (i === 0) { l = 0; event = "start"; }
    else if (r !== prev) { l = 0; event = "switch"; }
    else if (P.m >= 2) { l++; step = "L"; }
    fr.push({ i, zone: "in", step, n, l, region: r, event, cont: true,
      D: Math.pow(P.p, (n - l) / P.Ng + l / P.Nl), env: Math.pow(P.p, n / P.Ng), pos: jit(C[r], i, 4) });
    prev = r;
  }
  return fr;
}

/* ---------------- the small "video frame" ---------------- */
function scene(card, blobs, o) {
  const fr = card.frames, t = card.t, f = fr[t], gid = card.root.id + "-glow", R = o.r || 16;
  let s = `<defs><radialGradient id="${gid}"><stop offset="0" style="stop-color:var(--salient);stop-opacity:.75"/><stop offset="1" style="stop-color:var(--salient);stop-opacity:0"/></radialGradient></defs>`;
  s += `<rect class="sc-bg" x="0" y="0" width="160" height="90"/>`;
  blobs.forEach((c, k) => {
    s += `<circle cx="${c[0]}" cy="${c[1]}" r="${R}" fill="url(#${gid})"/>`;
    if (o.labels) s += `<text class="sc-lab" x="${c[0]}" y="${c[1] + R - 1}" text-anchor="middle">${"ABCDE"[k]}</text>`;
  });
  if (o.highlight != null) { const c = blobs[o.highlight]; s += `<circle class="sc-ring" cx="${c[0]}" cy="${c[1]}" r="${R - 5}"/>`; }
  const pts = []; for (let j = Math.max(0, t - 5); j <= t; j++) pts.push(fr[j].pos.map(v => v.toFixed(1)).join(","));
  s += `<polyline class="sc-trail" points="${pts.join(" ")}"/>`;
  if (o.box && f.zone === "out") {
    const b = o.box;
    if (t > 0 && fr[t - 1].zone === "out") { const q = fr[t - 1].pos; s += `<rect class="sc-box prev" x="${(q[0] - b / 2).toFixed(1)}" y="${(q[1] - b / 2).toFixed(1)}" width="${b}" height="${b}"/>`; }
    s += `<rect class="sc-box ${f.step === "L" ? "local" : "global"}" x="${(f.pos[0] - b / 2).toFixed(1)}" y="${(f.pos[1] - b / 2).toFixed(1)}" width="${b}" height="${b}"/>`;
  }
  s += `<circle class="sc-gaze" cx="${f.pos[0].toFixed(1)}" cy="${f.pos[1].toFixed(1)}" r="2.6"/>`;
  s += `<text class="sc-t" x="4" y="8">t = ${t + 1}</text>`;
  return `<svg viewBox="0 0 160 90" role="img" aria-label="Video frame ${t + 1}: predicted fixation and salient regions">${s}</svg>`;
}

/* ---------------- the four cases ---------------- */
const pCtl = { type: "pstep", id: "p", label: "<i>p</i>, decay after <i>N</i> steps" };
const SPECS = {
c1: {
  label: "Exploration decay over 48 frames",
  defaults: { Ng: 6.29, p: 0.01, out: 8, gap: 4 }, t0: 6,
  controls: [
    { type: "preset", id: "ds", label: "Calibration", options: [{ name: "DIEM", values: { Ng: 6.29 } }, { name: "Hollywood", values: { Ng: 3.07 } }] },
    { type: "range", id: "Ng", label: "<i>N</i><sub>g</sub> (global)", min: 1, max: 15, step: 0.01, show: v => num(v) + " frames" },
    pCtl,
    { type: "range", id: "out", label: "Frames outside", min: 1, max: 30, step: 1, show: v => v + " frames" },
    { type: "range", id: "gap", label: "Frames back inside", min: 1, max: 15, step: 1, show: v => v + " frames" }
  ],
  sim(P) {
    const T = 48, z = []; z.push("in", "in");
    while (z.length < T) { for (let i = 0; i < P.out && z.length < T; i++) z.push("out"); for (let i = 0; i < P.gap && z.length < T; i++) z.push("in"); }
    return exploreFrames(z, new Set(), { ...P, Nl: P.Ng });
  },
  legend: () => item(sw("sw-line global"), "decay outside, every step global") + item(sw("sw-band salient"), "inside a salient region: no exploration score"),
  band: f => f.zone === "in" ? "band-salient" : null,
  strip: f => f.zone === "in" ? "c-salient" : "c-global", stripLabel: "zone", points: true,
  scene: c => scene(c, [BLOB_E], { r: 20, box: 14 }),
  readout(c, f) {
    const P = c.params;
    const chips = `<div class="chips"><span>frame <b>${f.i + 1}</b></span><span>${f.zone === "in" ? "inside" : "outside"}</span><span>run counter <b>n = ${f.n}</b></span></div>`;
    const eq = f.zone === "in" ? `<span class="txt">Inside the salient region: no exploration score, and the run counter is 0. The next excursion starts again at n = 1.</span>`
      : tex(`D_E(t)=p^{\\,n/N_g}=${P.p}^{\\,${f.n}/${num(P.Ng)}}=${fmt(f.D)}`);
    return chips + `<div class="ro-eq">${eq}</div>`;
  },
  factors: P => `each frame outside: × ${fmt(Math.pow(P.p, 1 / P.Ng))}`,
  caption: P => `Each excursion starts at p<sup>1/N<sub>g</sub></sup> = ${fmt(Math.pow(P.p, 1 / P.Ng))} and keeps falling while the model stays outside. After N<sub>g</sub> = ${num(P.Ng)} frames it reaches p. Coming back inside ends the run, so short excursions are cheap and long ones fade out.`,
  cols: ["frame", "zone", "n", "D_E"], row: f => [f.i + 1, f.zone === "in" ? "inside" : "outside", f.n, fmt(f.D)]
},
c2: {
  label: "Exploration decay with frozen frames over two excursions",
  defaults: { Ng: 6.29, Nl: 2.42, p: 0.01, x: 10 }, t0: 5,
  init: () => ({ f1: new Set([2, 3]), f2: new Set(), pattern: "early" }),
  controls: [
    { type: "preset", id: "ds", label: "Calibration", options: [{ name: "DIEM", values: { Ng: 6.29, Nl: 2.42 } }, { name: "Hollywood", values: { Ng: 3.07, Nl: 2.22 } }] },
    { type: "range", id: "x", label: "Frames outside", min: 4, max: 16, step: 1, show: v => v + " frames" },
    { type: "range", id: "Ng", label: "<i>N</i><sub>g</sub> (global)", min: 1, max: 15, step: 0.01, show: v => num(v) + " frames" },
    { type: "range", id: "Nl", label: "<i>N</i><sub>l</sub> (local)", min: 0.5, max: 15, step: 0.01, show: v => num(v) + " frames" },
    pCtl,
    { type: "pattern", id: "pat", label: "Freezes in the 1st excursion", options: [
      { name: "Never", key: "never", make: x => [] },
      { name: "Early", key: "early", make: x => [2, 3] },
      { name: "Late", key: "late", make: x => [x - 3, x - 2, x - 1] },
      { name: "All", key: "all", make: x => Array.from({ length: x - 1 }, (_, j) => j + 1) }] }
  ],
  hint: "Click a cell of the step strip to freeze or unfreeze that frame.",
  sim(P, S) {
    const x = P.x, s1 = 2, s2 = 2 + x + 3, z = [];
    if (S.pattern) { const o = SPECS.c2.controls.find(c => c.type === "pattern").options.find(o => o.key === S.pattern); S.f1 = new Set(o.make(x)); S.f2 = new Set(); }
    const push = (v, n) => { for (let i = 0; i < n; i++) z.push(v); };
    push("in", 2); push("out", x); push("in", 3); push("out", x); push("in", 2);
    const fz = new Set();
    S.f1.forEach(o => { if (o > 0 && o < x) fz.add(s1 + o); });
    S.f2.forEach(o => { if (o > 0 && o < x) fz.add(s2 + o); });
    const fr = exploreFrames(z, fz, P);
    fr.forEach(f => { if (f.zone === "out") { const inFirst = f.i < s2; f.run = inFirst ? 1 : 2; f.off = f.i - (inFirst ? s1 : s2); } });
    return fr;
  },
  canClick: f => f.zone === "out" && f.off > 0,
  click(card, i) { const f = card.frames[i]; const set = f.run === 1 ? card.state.f1 : card.state.f2; if (set.has(f.off)) set.delete(f.off); else set.add(f.off); card.state.pattern = null; },
  legend: () => item(sw("sw-line global"), "global (moving)") + item(sw("sw-line local"), "local (frozen)") + item(sw("sw-dash"), "if it kept moving") + item(sw("sw-band salient"), "salient region"),
  band: f => f.zone === "in" ? "band-salient" : null,
  strip: f => f.zone === "in" ? "c-salient" : f.step === "L" ? "c-local" : "c-global", stripLabel: "step", points: true, envLine: true,
  scene: c => scene(c, [BLOB_E], { r: 20, box: 14 }),
  readout(c, f) {
    const P = c.params;
    const chips = `<div class="chips"><span>frame <b>${f.i + 1}</b></span><span>${f.zone === "in" ? "inside" : f.step === "L" ? "outside · local step (box barely moved)" : "outside · global step"}</span><span><b>k = ${f.k}</b>, <b>ℓ = ${f.l}</b></span></div>`;
    if (f.zone === "in") return chips + `<div class="ro-eq"><span class="txt">Inside the salient region: no exploration score. The counters k and ℓ are reset, so frozen frames from the last run no longer count.</span></div>`;
    return chips + `<div class="ro-eq">${tex(`D_E(t)=p^{\\,k/N_g+\\ell/N_l}=${P.p}^{\\,${f.k}/${num(P.Ng)}+${f.l}/${num(P.Nl)}}=${fmt(f.D)}`)}</div>` +
      `<div class="ro-eq">${tex(`\\text{if it had kept moving: }p^{\\,(k+\\ell)/N_g}=${fmt(f.env)}`)}</div>`;
  },
  factors: P => `global step: × ${fmt(Math.pow(P.p, 1 / P.Ng))}<br>local step: × ${fmt(Math.pow(P.p, 1 / P.Nl))}`,
  caption: P => `A frozen frame multiplies the score by p<sup>1/N<sub>l</sub></sup> = ${fmt(Math.pow(P.p, 1 / P.Nl))} instead of p<sup>1/N<sub>g</sub></sup> = ${fmt(Math.pow(P.p, 1 / P.Ng))}, so one frozen frame costs as much as ${num(P.Ng / P.Nl)} moving frames. The extra decay stays for the rest of the run. Only going back inside clears it, which is why the second excursion starts over.`,
  cols: ["frame", "zone", "step", "k", "ℓ", "D_E", "kept moving"],
  row: f => [f.i + 1, f.zone === "in" ? "inside" : "outside", f.step === "L" ? "local" : f.step === "G" ? "global" : "—", f.zone === "in" ? "—" : f.k, f.zone === "in" ? "—" : f.l, fmt(f.D), fmt(f.env)]
},
c3: {
  label: "Tracking decay over 90 frames",
  defaults: { Ng: 30, p: 0.01, leave: 25, away: 5 }, t0: 40,
  controls: [
    { type: "range", id: "leave", label: "Frames inside", min: 5, max: 90, step: 1, show: v => v >= 90 ? "never leaves" : v + " frames" },
    { type: "range", id: "away", label: "Frames away", min: 1, max: 15, step: 1, show: v => v + " frames" },
    { type: "range", id: "Ng", label: "<i>N</i><sub>g</sub> (global)", min: 5, max: 60, step: 1, show: v => v + " frames" },
    { type: "pstep", id: "p", label: "<i>p</i><sub>T</sub>, decay after <i>N</i> steps" }
  ],
  sim: P => trackOne(P),
  legend: () => item(sw("sw-line global"), "tracking decay") + item(sw("sw-band away"), "outside: T(t) is scaled by a small w(t)") + item(sw("sw-evt"), "comes back, clock restarts"),
  band: f => f.zone === "out" ? "band-away" : null,
  strip: f => f.zone === "out" ? "c-away" : "c-salient", stripLabel: "zone", points: false, evt: f => f.event === "restart",
  scene: c => scene(c, [[80, 45]], { r: 20 }),
  readout(c, f) {
    const P = c.params;
    const chips = `<div class="chips"><span>frame <b>${f.i + 1}</b></span><span>${f.zone === "in" ? "on the salient region" : "away (outside)"}${f.event === "restart" ? " · came back" : ""}</span><span>clock <b>n = ${f.n}</b></span></div>`;
    let eq = tex(`D_T(t)=p_T^{\\,n/N_g}=${P.p}^{\\,${f.n}/${P.Ng}}=${fmt(f.D)}`);
    if (f.zone === "out") eq += `<div class="txt">The clock keeps running while away. The score is still w(t)·A<sub>T</sub>·D<sub>T</sub>(t), but w(t) &lt; θ makes it small.</div>`;
    return chips + `<div class="ro-eq">${eq}</div>`;
  },
  factors: P => `each frame: × ${fmt(Math.pow(P.p, 1 / P.Ng))}`,
  caption: P => P.leave >= 90 ? `The model never leaves, so the decay never resets and the score fades towards zero. After N<sub>g</sub> = ${P.Ng} frames it is down to p.` : `Leaving does not reset the clock; it keeps running while the model is away. Coming back restarts it at n = 1, so the tracking reward is restored only after a real excursion.`,
  cols: ["frame", "zone", "n", "D_T"], row: f => [f.i + 1, f.zone === "in" ? "inside" : "away", f.n, fmt(f.D)]
},
c4: {
  label: "Tracking decay with several salient regions over 60 frames",
  defaults: { m: 2, dwell: 5, Ng: 30, Nl: 10, p: 0.01 }, t0: 5,
  controls: [
    { type: "range", id: "m", label: "Salient regions", min: 1, max: 5, step: 1, hero: true, show: v => v + (v == 1 ? " region" : " regions") },
    { type: "range", id: "dwell", label: "Frames per region", min: 2, max: 20, step: 1, show: v => v + " frames" },
    { type: "range", id: "Ng", label: "<i>N</i><sub>g</sub> (global)", min: 5, max: 60, step: 1, show: v => v + " frames" },
    { type: "range", id: "Nl", label: "<i>N</i><sub>l</sub> (local)", min: 2, max: 40, step: 1, show: v => v + " frames" },
    { type: "pstep", id: "p", label: "<i>p</i><sub>T</sub>, decay after <i>N</i> steps" }
  ],
  sim: P => trackMany(P),
  legend: P => item(sw("sw-line global"), "global step") + (P.m >= 2 ? item(sw("sw-line local"), "local step (same region)") + item(sw("sw-evt"), "switch") : "") + item(sw("sw-dash"), "global envelope"),
  band: () => null,
  strip: f => f.step === "L" ? "c-local" : "c-global", stripLabel: "step", stripText: f => "ABCDE"[f.region], points: false, envLine: true, evt: f => f.event === "switch",
  scene: c => { const f = c.frames[c.t]; return scene(c, CENTERS[c.params.m], { r: 16, labels: true, highlight: f.region }); },
  readout(c, f) {
    const P = c.params;
    const what = f.event === "switch" ? "switched, ℓ reset to 0" : f.step === "L" ? "same region, local step" : P.m === 1 ? "only one region, global step" : "global step";
    const chips = `<div class="chips"><span>frame <b>${f.i + 1}</b></span><span>region <b>${"ABCDE"[f.region]}</b> · ${what}</span><span><b>n = ${f.n}</b>, <b>ℓ = ${f.l}</b></span></div>`;
    return chips + `<div class="ro-eq">${tex(`D_T(t)=p_T^{\\,(n-\\ell)/N_g+\\ell/N_l}=${P.p}^{\\,(${f.n}-${f.l})/${P.Ng}+${f.l}/${P.Nl}}=${fmt(f.D)}`)}</div>` +
      `<div class="ro-eq">${tex(`\\text{envelope: }p_T^{\\,n/N_g}=${fmt(f.env)}`)}</div>`;
  },
  factors: P => `global step: × ${fmt(Math.pow(P.p, 1 / P.Ng))}<br>local step: × ${fmt(Math.pow(P.p, 1 / P.Nl))}`,
  caption: P => P.m === 1 ? `With one salient region there is nothing to switch to. ℓ never grows, so the curve is the plain global decay and sits on the envelope. Add a second region to see the local decays.` : `With two or more regions, every frame on the same region adds the faster local decay. A switch resets ℓ to 0 and the score jumps back up to the global envelope, not to 1. From two regions up, the curve depends only on how long the model stays before switching, not on how many regions there are.`,
  cols: ["frame", "region", "step", "n", "ℓ", "D_T", "envelope"],
  row: f => [f.i + 1, "ABCDE"[f.region] + (f.event === "switch" ? " (switch)" : ""), f.step === "L" ? "local" : "global", f.n, f.l, fmt(f.D), fmt(f.env)]
}
};

/* ---------------- shared figure shell + interaction ---------------- */
function shell(fig, o) {
  const inner = document.createElement("div");
  inner.className = "w-inner";
  inner.innerHTML =
    `<div class="w-top"><div class="w-scene" data-scene></div><div class="w-controls" data-controls></div></div>` +
    `<div class="w-toolbar"><div class="w-legend" data-legend></div><div class="w-tools">` +
      `<button class="w-btn" type="button" data-play>${ICON_PLAY}<span>Play</span></button>` +
      (o.log ? `<label class="w-chk"><input type="checkbox" data-log> log scale</label>` : "") +
    `</div></div>` +
    `<div class="w-chart" data-chart tabindex="0" role="group" aria-label="${o.label}. Use the left and right arrow keys to step through the frames."></div>` +
    `<p class="w-hint">Hover over the chart, or focus it and press ← →, to step through the frames.</p>` +
    `<div class="w-readout" data-readout></div>` +
    (o.totals ? `<div class="w-totals" data-totals></div>` : "") +
    `<details class="w-table" data-table><summary>Frame-by-frame values</summary><div class="w-tbl-wrap"></div></details>`;
  fig.insertBefore(inner, fig.querySelector("figcaption"));
  const q = s => inner.querySelector(s);
  return { scene: q("[data-scene]"), controls: q("[data-controls]"), legend: q("[data-legend]"),
    play: q("[data-play]"), log: q("[data-log]"), chart: q("[data-chart]"), readout: q("[data-readout]"),
    totals: q("[data-totals]"), det: q("[data-table]"), caption: fig.querySelector("[data-caption]") };
}
function setPlaying(card, on) { card.el.play.innerHTML = (on ? ICON_PAUSE : ICON_PLAY) + `<span>${on ? "Pause" : "Play"}</span>`; }
function stop(card) { clearInterval(card.timer); card.timer = null; setPlaying(card, false); }
function wire(card, ms) {
  const el = card.el, last = () => card.frames.length - 1;
  el.play.addEventListener("click", () => {
    if (card.timer) { stop(card); return; }
    if (card.t >= last()) card.t = 0;
    setPlaying(card, true);
    card.onHover(card);
    card.timer = setInterval(() => {
      card.t++;
      if (card.t >= last()) { card.t = last(); stop(card); }
      card.onHover(card);
    }, ms);
  });
  el.chart.addEventListener("pointermove", e => pick(card, e));
  el.chart.addEventListener("pointerdown", e => pick(card, e));
  el.chart.addEventListener("keydown", e => {
    if (e.target.closest && e.target.closest(".clickable")) return;   // cells handle their own keys
    const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    let t = card.t;
    if (d) t += d; else if (e.key === "Home") t = 0; else if (e.key === "End") t = last(); else return;
    e.preventDefault();
    if (card.timer) stop(card);
    card.t = Math.max(0, Math.min(last(), t));
    card.onHover(card);
  });
  el.det.addEventListener("toggle", () => { if (el.det.open) card.onTable(card); });
  card.root.addEventListener("stage:hide", () => { if (card.timer) stop(card); });   // swapped out of the side column
  new ResizeObserver(() => card.onDraw(card)).observe(el.chart);
}
function pick(card, e) {
  const g = card.geo; if (!g || !card.svg) return;
  const r = card.svg.getBoundingClientRect();
  const i = Math.floor((e.clientX - r.left - g.M.l) / g.cw);
  if (i < 0 || i >= card.frames.length || i === card.t) return;
  if (card.timer) stop(card);
  card.t = i; card.onHover(card);
}

/* ---------------- one case card ---------------- */
function makeCard(fig, id) {
  const spec = SPECS[id], el = shell(fig, { log: true, label: spec.label });
  const card = { id, spec, root: fig, el, params: { ...spec.defaults }, state: spec.init ? spec.init() : {},
    t: spec.t0 || 0, log: false, timer: null, onHover: hover, onDraw: draw, onTable: table };
  const inputs = {};
  spec.controls.forEach(c => {
    const wrap = document.createElement("div"); wrap.className = "ctl" + (c.hero ? " hero" : "");
    if (c.type === "preset" || c.type === "pattern") {
      wrap.innerHTML = `<span class="ctl-label">${c.label}</span><div class="seg" role="group"></div>`;
      const seg = wrap.querySelector(".seg");
      c.options.forEach(o => {
        const b = document.createElement("button"); b.type = "button"; b.textContent = o.name;
        b.addEventListener("click", () => {
          if (c.type === "preset") Object.assign(card.params, o.values);
          else { card.state.f1 = new Set(o.make(card.params.x)); card.state.f2 = new Set(); card.state.pattern = o.key; }
          refresh(card);
        });
        b._match = c.type === "preset" ? () => Object.keys(o.values).every(k => Math.abs(card.params[k] - o.values[k]) < 1e-9) : () => card.state.pattern === o.key;
        seg.appendChild(b);
      });
      inputs[c.id] = { c, seg };
    } else {
      const isP = c.type === "pstep", uid = `${fig.id}-${c.id}`;
      wrap.innerHTML = `<label class="ctl-label" for="${uid}"><span>${c.label}</span><output id="${uid}-out" for="${uid}"></output></label>` +
        `<input type="range" id="${uid}" min="${isP ? 0 : c.min}" max="${isP ? P_STEPS.length - 1 : c.max}" step="${isP ? 1 : c.step}">`;
      const inp = wrap.querySelector("input"), out = wrap.querySelector("output");
      inp.addEventListener("input", () => { card.params[c.id] = isP ? P_STEPS[+inp.value] : +inp.value; refresh(card); });
      inputs[c.id] = { c, inp, out, isP };
    }
    el.controls.appendChild(wrap);
  });
  if (spec.hint) { const n = document.createElement("p"); n.className = "w-note"; n.textContent = spec.hint; el.controls.appendChild(n); }
  card.factorsEl = document.createElement("p"); card.factorsEl.className = "w-factors"; el.controls.appendChild(card.factorsEl);
  card.inputs = inputs;
  el.log.addEventListener("change", e => { card.log = e.target.checked; draw(card); });
  el.chart.addEventListener("click", e => { const c = e.target.closest && e.target.closest(".clickable"); if (c) toggleCell(card, +c.dataset.i); });
  el.chart.addEventListener("keydown", e => {
    const c = e.target.closest && e.target.closest(".clickable");
    if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleCell(card, +c.dataset.i); }
  });
  wire(card, 150);
  refresh(card);
}
function toggleCell(card, i) {
  if (!card.spec.click) return;
  card.spec.click(card, i); card.t = i; refresh(card);
  const c = card.el.chart.querySelector(`.clickable[data-i="${i}"]`); if (c) c.focus();
}
function refresh(card) {
  const s = card.spec, P = card.params;
  card.frames = s.sim(P, card.state);
  if (card.t > card.frames.length - 1) card.t = card.frames.length - 1;
  Object.values(card.inputs).forEach(o => {
    if (o.seg) { [...o.seg.children].forEach(b => b.setAttribute("aria-pressed", b._match() ? "true" : "false")); return; }
    o.inp.value = o.isP ? P_STEPS.indexOf(P[o.c.id]) : P[o.c.id];
    o.out.textContent = o.isP ? String(P[o.c.id]) : o.c.show(P[o.c.id]);
  });
  card.factorsEl.innerHTML = s.factors(P);
  card.el.legend.innerHTML = s.legend(P);
  if (card.el.caption) card.el.caption.innerHTML = s.caption(P);
  draw(card);
  if (card.el.det.open) table(card);
}
function draw(card) {
  const { spec, frames } = card, box = card.el.chart;
  const compact = card.root.classList.contains("on-stage");      // in the sticky side column
  const W = Math.max(280, Math.floor(box.clientWidth || 600)), H = compact ? 200 : W < 520 ? 250 : 280;
  const M = { l: 46, r: 14, t: 24, b: 58 }, pw = W - M.l - M.r, ph = H - M.t - M.b, T = frames.length, cw = pw / T;
  const X = i => M.l + (i + .5) * cw;
  const Y = v => card.log ? M.t + ph * (Math.log10(Math.max(v, LO)) / Math.log10(LO)) : M.t + ph * (1 - v);
  let s = "";
  // shaded zones
  for (let i = 0; i < T;) {
    const b = spec.band(frames[i]); if (!b) { i++; continue; }
    let j = i; while (j + 1 < T && spec.band(frames[j + 1]) === b) j++;
    s += `<rect class="${b}" x="${(M.l + i * cw).toFixed(1)}" y="${M.t}" width="${((j - i + 1) * cw).toFixed(1)}" height="${ph}"/>`; i = j + 1;
  }
  // grid + y axis
  const yt = card.log ? [1, 0.1, 0.01, 0.001, 1e-4] : [0, 0.25, 0.5, 0.75, 1];
  yt.forEach(v => {
    const y = Y(v).toFixed(1);
    s += `<line class="${v === 0 || v === 1e-4 ? "base" : "grid"}" x1="${M.l}" x2="${M.l + pw}" y1="${y}" y2="${y}"/>`;
    s += `<text class="tick" x="${M.l - 8}" y="${y}" dy="0.32em" text-anchor="end">${card.log && v < 0.001 ? "10⁻⁴" : v}</text>`;
  });
  s += `<text class="axis-t" x="${M.l - 8}" y="${M.t - 11}" text-anchor="end">decay</text>`;
  // p reference line
  const p = card.params.p, yp = Y(p);
  s += `<line class="pline" x1="${M.l}" x2="${M.l + pw}" y1="${yp.toFixed(1)}" y2="${yp.toFixed(1)}"/>`;
  s += `<text class="plabel" x="${M.l + pw - 4}" y="${(yp - 5).toFixed(1)}" text-anchor="end">p = ${p}</text>`;
  // envelope / "if it had kept moving"
  if (spec.envLine) {
    let d = "";
    frames.forEach((f, i) => { if (f.env == null) return; const pt = `${X(i).toFixed(1)},${Y(f.env).toFixed(1)}`; d += (i > 0 && frames[i - 1].env != null && f.cont) ? `L${pt}` : `M${pt}`; });
    s += `<path class="env" d="${d}"/>`;
  }
  // decay segments, coloured by the step that leads into each frame
  frames.forEach((f, i) => {
    if (i === 0 || f.D == null) return; const g = frames[i - 1]; if (g.D == null || !f.cont) return;
    s += `<line class="seg-l ${f.step === "L" ? "s-local" : "s-global"}" x1="${X(i - 1).toFixed(1)}" y1="${Y(g.D).toFixed(1)}" x2="${X(i).toFixed(1)}" y2="${Y(f.D).toFixed(1)}"/>`;
  });
  if (spec.points) frames.forEach((f, i) => {
    if (f.D == null) return;
    s += `<circle class="pt ${f.step === "L" ? "f-local" : "f-global"}" cx="${X(i).toFixed(1)}" cy="${Y(f.D).toFixed(1)}" r="4"/>`;
  });
  // step strip
  const sy = M.t + ph + 8, sh = 15, gap = cw > 5 ? 1.5 : 0;
  s += `<text class="axis-t" x="${M.l - 8}" y="${sy + sh / 2}" dy="0.35em" text-anchor="end">${spec.stripLabel}</text>`;
  frames.forEach((f, i) => {
    const x0 = M.l + i * cw + gap / 2, w = Math.max(1, cw - gap), click = spec.canClick && spec.canClick(f);
    const lab = click ? ` tabindex="0" role="button" aria-label="Frame ${i + 1}: ${f.step === "L" ? "frozen" : "moving"}. Activate to ${f.step === "L" ? "unfreeze" : "freeze"}."` : "";
    s += `<rect class="cell ${spec.strip(f)}${click ? " clickable" : ""}" data-i="${i}" x="${x0.toFixed(1)}" y="${sy}" width="${w.toFixed(1)}" height="${sh}" rx="2"${lab}/>`;
    if (spec.stripText && cw >= 9.5) s += `<text class="cell-t" x="${X(i).toFixed(1)}" y="${sy + sh / 2}" dy="0.36em" text-anchor="middle">${spec.stripText(f)}</text>`;
    if (spec.evt && spec.evt(f)) s += `<line class="evt" x1="${(M.l + i * cw).toFixed(1)}" x2="${(M.l + i * cw).toFixed(1)}" y1="${sy - 4}" y2="${sy + sh + 4}"/>`;
  });
  // x axis
  const ty = sy + sh + 18, st = [1, 2, 5, 10, 15, 20, 30].find(k => k * cw >= 30) || 30;
  s += `<text class="axis-t" x="${M.l - 8}" y="${ty}" text-anchor="end">frame</text>`;
  for (let fn = st; fn <= T; fn += st) s += `<text class="tick" x="${X(fn - 1).toFixed(1)}" y="${ty}" text-anchor="middle">${fn}</text>`;
  s += `<g class="hv"></g>`;
  box.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${spec.label}">${s}</svg>`;
  card.svg = box.firstChild; card.hv = card.svg.querySelector(".hv");
  card.geo = { M, cw, X, Y, sy, sh, ph };
  hover(card);
}
function hover(card) {
  const g = card.geo, f = card.frames[card.t]; if (!g || !f) return;
  const x = g.X(card.t).toFixed(1);
  let s = `<line class="hv-line" x1="${x}" x2="${x}" y1="${g.M.t}" y2="${g.sy - 2}"/>`;
  s += `<rect class="hv-cell" x="${(g.M.l + card.t * g.cw - 1).toFixed(1)}" y="${g.sy - 2}" width="${(g.cw + 2).toFixed(1)}" height="${g.sh + 4}" rx="3"/>`;
  if (f.D != null) s += `<circle class="hv-dot ${f.step === "L" ? "f-local" : "f-global"}" cx="${x}" cy="${g.Y(f.D).toFixed(1)}" r="5.5"/>`;
  card.hv.innerHTML = s;
  card.el.scene.innerHTML = card.spec.scene(card);
  card.el.readout.innerHTML = card.spec.readout(card, f);
}
function table(card) {
  const s = card.spec;
  card.el.det.querySelector(".w-tbl-wrap").innerHTML = `<table><thead><tr>${s.cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${card.frames.map(f => `<tr>${s.row(f).map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

/* ---------------- final score: both terms on one scanpath ---------------- */
const FP = { pE: 0.01, NgE: 6.29, NlE: 2.42, pT: 0.01, NgT: 30, NlT: 10, AT: 1, theta: 0.3 };
const PK = [[46, 43], [114, 43]], SIG = 10, BOX = 14, NF = 120;
const Sal = (x, y) => Math.max(...PK.map(c => Math.exp(-((x - c[0]) ** 2 + (y - c[1]) ** 2) / (2 * SIG * SIG))));
const Ent = (x, y) => 0.64 + 0.14 * Math.sin(x / 7.3) * Math.cos(y / 5.1);
const iou = (a, b) => { const i = Math.max(0, BOX - Math.abs(a[0] - b[0])) * Math.max(0, BOX - Math.abs(a[1] - b[1])); return i / (2 * BOX * BOX - i); };
function spot(i, prev) {
  for (let k = 0; k < 60; k++) {
    const q = [8 + hash(i * 13 + k, 11) * 144, 10 + hash(i * 13 + k, 12) * 72];
    if (Sal(q[0], q[1]) < 0.2 && (!prev || Math.hypot(q[0] - prev[0], q[1] - prev[1]) > 18)) return q;
  }
  return [80, 82];
}
const SCEN = [
  { key: "good", name: "Explores + tracks", segs: [["A", 8], ["B", 8], ["A", 6], ["move", 5], ["B", 8], ["A", 8], ["move", 4], ["B", 8], ["A", 7], ["B", 7], ["move", 5]],
    cap: "The model moves between A and B and makes a short excursion every 20 to 30 frames. Each switch lifts T back up to its envelope, each return restarts the tracking clock, and each excursion earns a new burst of E. Both totals are well above zero, so M is the highest of the five scanpaths." },
  { key: "stuck", name: "Stuck on A", segs: [["A", NF]],
    cap: "Two regions are present, so every frame on A after the first is a local step. T falls with the fast local decay and never recovers. E stays 0, so M = 0." },
  { key: "switch", name: "Switches only", segs: [["A", 8], ["B", 8]],
    cap: "Each switch puts T back on the global envelope, but the envelope keeps falling because the model never leaves to restart the clock. E stays 0, so M = 0 however well it tracks." },
  { key: "wander", name: "Wanders outside", segs: [["move", NF]],
    cap: "E gets one run that fades within a few frames, and the run never ends because the model never comes back. T is small because w(t) is small outside, so M is small too." },
  { key: "frozen", name: "Frozen outside", segs: [["freeze", NF]],
    cap: "Like wandering, but every frame after the first is a local step, so E collapses even faster and M is the lowest of the non-zero scores." }
];
function finalFrames(segs) {
  const pos = [], kind = []; let si = 0;
  while (pos.length < NF) {
    const [k, n] = segs[si % segs.length]; si++;
    for (let j = 0; j < n && pos.length < NF; j++) {
      const i = pos.length, prev = pos[i - 1];
      if (k === "A" || k === "B") pos.push(jit(PK[k === "A" ? 0 : 1], i, 3.5));
      else if (k === "move") pos.push(spot(i, prev));
      else pos.push(j === 0 ? spot(i, prev) : [prev[0] + (hash(i, 7) - .5) * .6, prev[1] + (hash(i, 8) - .5) * .6]);
      kind.push(k);
    }
  }
  const P = FP, fr = []; let k = 0, l = 0, n = 0, lt = 0, prevC = null, wasAway = false, sumE = 0, sumT = 0;
  pos.forEach((g, i) => {
    const w = Sal(g[0], g[1]), H = Ent(g[0], g[1]), low = w < P.theta, plow = i > 0 && fr[i - 1].zone === "out";
    // exploration: counters live inside each run of frames with w < θ
    let E = 0, step = null;
    if (!low) { k = 0; l = 0; }
    else {
      if (!plow) { k = 1; l = 0; step = "G"; }
      else if (iou(g, pos[i - 1]) > 0.9) { l++; step = "L"; }
      else { k++; step = "G"; }
      E = (1 - w) * H * Math.pow(P.pE, k / P.NgE + l / P.NlE);
    }
    // tracking: clock n restarts on coming back; ℓ counts same-peak steps since the last switch
    const c = Math.hypot(g[0] - PK[0][0], g[1] - PK[0][1]) <= Math.hypot(g[0] - PK[1][0], g[1] - PK[1][1]) ? 0 : 1;
    let event = null;
    if (!low && wasAway) { n = 0; lt = 0; prevC = null; event = "back"; }
    const moved = prevC !== null && c !== prevC;
    if (moved) { lt = 0; event = "switch"; }
    n++;
    if (!moved && prevC !== null) lt++;            // two peaks in every frame
    const Tt = w * P.AT * Math.pow(P.pT, (n - lt) / P.NgT + lt / P.NlT);
    prevC = c; wasAway = low; sumE += E; sumT += Tt;
    fr.push({ i, pos: g, w, H, zone: low ? "out" : "in", step, k: low ? k : 0, l: low ? l : 0, n, lt, region: c, event, E, T: Tt, sumE, sumT, kind: kind[i] });
  });
  return fr;
}
SCEN.forEach(s => { s.frames = finalFrames(s.segs); const f = s.frames[NF - 1]; s.E = f.sumE; s.T = f.sumT; s.M = Math.sqrt(s.E * s.T); });

function makeFinal(fig) {
  const el = shell(fig, { log: false, totals: true, label: "E(t) and T(t) over 120 frames" });
  const card = { id: "c5", root: fig, el, t: 30, timer: null, scen: SCEN[0], onHover: hoverFinal, onDraw: drawFinal, onTable: tableFinal };
  card.frames = card.scen.frames;
  el.controls.innerHTML =
    `<div class="ctl wide"><span class="ctl-label">Scanpath</span><div class="seg" role="group" aria-label="Scanpath"></div></div>`;
  const seg = el.controls.querySelector(".seg");
  SCEN.forEach(s => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = s.name;
    b.addEventListener("click", () => select(s)); seg.appendChild(b); s.btn = b;
  });
  el.legend.innerHTML =
    item(sw("sw-area t"), "<i>T</i>(<i>t</i>), tracking") +
    item(sw("sw-area e"), "<i>E</i>(<i>t</i>), exploration") +
    item(sw("sw-cell salient"), "on A or B") +
    item(sw("sw-cell global"), "outside, moving") +
    item(sw("sw-cell local"), "outside, frozen") +
    item(sw("sw-evt"), "switch A ↔ B");
  el.totals.addEventListener("click", e => { const r = e.target.closest && e.target.closest("[data-k]"); if (r) select(SCEN.find(s => s.key === r.dataset.k)); });
  function select(s) { card.scen = s; card.frames = s.frames; if (card.timer) stop(card); update(); }
  function update() {
    SCEN.forEach(s => s.btn.setAttribute("aria-pressed", s === card.scen ? "true" : "false"));
    if (el.caption) el.caption.innerHTML = card.scen.cap;
    drawTotals(card);
    drawFinal(card);
    if (el.det.open) tableFinal(card);
  }
  wire(card, 110);
  update();
}
function drawFinal(card) {
  const fr = card.frames, box = card.el.chart;
  const compact = card.root.classList.contains("on-stage");
  const W = Math.max(280, Math.floor(box.clientWidth || 600)), H = compact ? 180 : W < 520 ? 240 : 270;
  const M = { l: 46, r: 14, t: 24, b: 52 }, pw = W - M.l - M.r, ph = H - M.t - M.b, N = fr.length, cw = pw / N;
  const X = i => M.l + (i + .5) * cw, Y = v => M.t + ph * (1 - v);
  let s = "";
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    const y = Y(v).toFixed(1);
    s += `<line class="${v === 0 ? "base" : "grid"}" x1="${M.l}" x2="${M.l + pw}" y1="${y}" y2="${y}"/>`;
    s += `<text class="tick" x="${M.l - 8}" y="${y}" dy="0.32em" text-anchor="end">${v}</text>`;
  });
  s += `<text class="axis-t" x="${M.l - 8}" y="${M.t - 11}" text-anchor="end">score</text>`;
  const area = key => `M${X(0).toFixed(1)},${Y(0)}` + fr.map((f, i) => `L${X(i).toFixed(1)},${Y(f[key]).toFixed(1)}`).join("") + `L${X(N - 1).toFixed(1)},${Y(0)}Z`;
  const lineT = fr.map((f, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(f.T).toFixed(1)}`).join("");
  let lineE = "", pen = false;          // draw E only around frames where it is non-zero
  fr.forEach((f, i) => {
    const on = f.E > 0 || (i > 0 && fr[i - 1].E > 0) || (i < N - 1 && fr[i + 1].E > 0);
    if (on) { lineE += `${pen ? "L" : "M"}${X(i).toFixed(1)},${Y(f.E).toFixed(1)}`; pen = true; } else pen = false;
  });
  s += `<path class="area-t" d="${area("T")}"/><path class="area-e" d="${area("E")}"/>`;
  s += `<path class="line-t" d="${lineT}"/><path class="line-e" d="${lineE}"/>`;
  const sy = M.t + ph + 8, sh = 13, gap = cw > 5 ? 1.5 : 0;
  s += `<text class="axis-t" x="${M.l - 8}" y="${sy + sh / 2}" dy="0.35em" text-anchor="end">where</text>`;
  fr.forEach((f, i) => {
    const cls = f.zone === "in" ? "c-salient" : f.step === "L" ? "c-local" : "c-global";
    s += `<rect class="cell ${cls}" x="${(M.l + i * cw + gap / 2).toFixed(1)}" y="${sy}" width="${Math.max(1, cw - gap).toFixed(1)}" height="${sh}" rx="1.5"/>`;
    if (f.event === "switch") s += `<line class="evt" x1="${(M.l + i * cw).toFixed(1)}" x2="${(M.l + i * cw).toFixed(1)}" y1="${sy - 4}" y2="${sy + sh + 4}"/>`;
  });
  const ty = sy + sh + 18, st = [5, 10, 15, 20, 30].find(k => k * cw >= 30) || 30;
  s += `<text class="axis-t" x="${M.l - 8}" y="${ty}" text-anchor="end">frame</text>`;
  for (let fn = st; fn <= N; fn += st) s += `<text class="tick" x="${X(fn - 1).toFixed(1)}" y="${ty}" text-anchor="middle">${fn}</text>`;
  s += `<g class="hv"></g>`;
  box.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="E(t) and T(t) for the scanpath: ${card.scen.name}">${s}</svg>`;
  card.svg = box.firstChild; card.hv = card.svg.querySelector(".hv");
  card.geo = { M, cw, X, Y, sy, sh, ph };
  hoverFinal(card);
}
function hoverFinal(card) {
  const g = card.geo, f = card.frames[card.t]; if (!g || !f) return;
  const x = g.X(card.t).toFixed(1);
  let s = `<line class="hv-line" x1="${x}" x2="${x}" y1="${g.M.t}" y2="${g.sy - 2}"/>`;
  s += `<rect class="hv-cell" x="${(g.M.l + card.t * g.cw - 1).toFixed(1)}" y="${g.sy - 2}" width="${(g.cw + 2).toFixed(1)}" height="${g.sh + 4}" rx="2.5"/>`;
  s += `<circle class="hv-dot f-salient" cx="${x}" cy="${g.Y(f.T).toFixed(1)}" r="5"/>`;
  if (f.E > 0) s += `<circle class="hv-dot f-global" cx="${x}" cy="${g.Y(f.E).toFixed(1)}" r="5"/>`;
  card.hv.innerHTML = s;
  card.el.scene.innerHTML = scene(card, PK, { r: 18, labels: true, box: BOX, highlight: f.zone === "in" ? f.region : null });
  card.el.readout.innerHTML = readFinal(f);
}
function readFinal(f) {
  const P = FP;
  const where = f.zone === "in" ? `on <b>${"AB"[f.region]}</b>` : f.step === "L" ? "outside · frozen (local step)" : "outside · moving (global step)";
  const ev = f.event === "switch" ? " · switched" : f.event === "back" ? " · came back" : "";
  let s = `<div class="chips"><span>frame <b>${f.i + 1}</b></span><span>${where}${ev}</span><span><b>w = ${f.w.toFixed(2)}</b></span>${f.zone === "out" ? `<span><b>A<sub>E</sub> = ${f.H.toFixed(2)}</b></span>` : ""}</div>`;
  const eE = f.zone === "out"
    ? tex(`E(t)=(1-w)\\,A_E\\,p_E^{\\,k/N^E_g+\\ell/N^E_l}=${(1 - f.w).toFixed(2)}\\cdot${f.H.toFixed(2)}\\cdot ${P.pE}^{\\,${f.k}/${P.NgE}+${f.l}/${P.NlE}}=${fmt(f.E)}`)
    : tex(`E(t)=0`) + ` <span class="txt">(inside a salient region)</span>`;
  const eT = tex(`T(t)=w\\,A_T\\,p_T^{\\,(n-\\ell)/N^T_g+\\ell/N^T_l}=${f.w.toFixed(2)}\\cdot ${P.AT}\\cdot ${P.pT}^{\\,(${f.n}-${f.lt})/${P.NgT}+${f.lt}/${P.NlT}}=${fmt(f.T)}`);
  const run = Math.sqrt(f.sumE * f.sumT);
  return s + `<div class="ro-eq">${eE}</div><div class="ro-eq">${eT}</div>` +
    `<div class="txt">So far (frames 1–${f.i + 1}): <i>E</i><sub>tot</sub> = <b>${f.sumE.toFixed(2)}</b>, <i>T</i><sub>tot</sub> = <b>${f.sumT.toFixed(2)}</b>, √(<i>E</i><sub>tot</sub>·<i>T</i><sub>tot</sub>) = <b>${run.toFixed(2)}</b></div>`;
}
function drawTotals(card) {
  const mx = k => Math.max(...SCEN.map(s => s[k])) || 1;
  const mE = mx("E"), mT = mx("T"), mM = mx("M");
  const cell = (v, m, cls) => `<span class="tot-cell"><span class="tot-bar ${cls}" style="width:calc((100% - 3.4em) * ${(v / m).toFixed(4)})"></span><span class="tot-val">${v.toFixed(2)}</span></span>`;
  card.el.totals.innerHTML =
    `<p class="w-totals-head">Totals over ${NF} frames · each column has its own scale · click a row to select it</p>` +
    `<div class="tot-head"><span>scanpath</span><span><i>E</i><sub>tot</sub></span><span><i>T</i><sub>tot</sub></span><span><i>M</i> = √(<i>E</i><sub>tot</sub>·<i>T</i><sub>tot</sub>)</span></div>` +
    SCEN.map(s => `<button type="button" class="tot-row" data-k="${s.key}" aria-pressed="${s === card.scen}"><span class="tot-name">${s.name}</span>${cell(s.E, mE, "e")}${cell(s.T, mT, "t")}${cell(s.M, mM, "m")}</button>`).join("");
}
function tableFinal(card) {
  const cols = ["frame", "where", "w", "A_E", "E(t)", "T(t)", "E_tot", "T_tot"];
  const rows = card.frames.map(f => [f.i + 1, f.zone === "in" ? "on " + "AB"[f.region] : f.step === "L" ? "outside, frozen" : "outside, moving",
    f.w.toFixed(2), f.zone === "out" ? f.H.toFixed(2) : "—", fmt(f.E), fmt(f.T), f.sumE.toFixed(2), f.sumT.toFixed(2)]);
  card.el.det.querySelector(".w-tbl-wrap").innerHTML = `<table><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

/* ---------------- start ---------------- */
function init() {
  document.querySelectorAll("figure.widget[data-widget]").forEach(fig => {
    const id = fig.dataset.widget;
    try { if (id === "c5") makeFinal(fig); else if (SPECS[id]) makeCard(fig, id); }
    catch (err) { console.error("Figure " + id + " failed to build:", err); }
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
