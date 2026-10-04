// Hero explainer: a 24-second illustrated story in seven scenes, sequenced with GSAP.
// The picture is one SVG; the on-screen lines are HTML so they stay large on any screen.
// Without GSAP, or when the visitor prefers reduced motion, the end card stands still and the seven lines show as a list.
(function () {
  var root = document.querySelector(".explainer");
  if (!root) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!gsap || reduce) { root.classList.add("is-static"); return; }

  function $(sel) { return root.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  var caption = $(".ex-caption");
  var lines = $$(".ex-lines li").map(function (li) { return li.textContent; });
  lines[lines.length - 1] = caption.textContent; // the end card already shows the headline; the caption carries the next step
  var segs = $$(".ex-seg");
  var fills = segs.map(function (s) { return s.querySelector("i"); });
  var toggle = $(".ex-toggle");

  // Scene lengths in seconds: problem, flowers, kit, made + fitted, gift, what they get back, end card.
  var DUR = [3.4, 3.0, 3.6, 3.0, 3.0, 4.4, 3.4];
  var START = [], TOTAL = 0;
  DUR.forEach(function (d) { START.push(TOTAL); TOTAL += d; });
  var T = START;

  var WORRIED = "M494 412 Q520 402 546 412", SMILE = "M490 404 Q520 428 550 404";

  var kitchen = $("#x-k"), nana = $("#x-nana"), arm = $("#x-arm"), lid = $("#x-lidg"), strain = $("#x-strain"),
      eyes = $("#x-eyes"), mouth = $("#x-mouth"), browL = $("#x-browL"), browR = $("#x-browR"), flowers = $$(".x-fl"),
      s3 = $("#x-s3"), s4 = $("#x-s4"), s5 = $("#x-s5"), s6 = $("#x-s6"), s7 = $("#x-s7");

  gsap.defaults({ ease: "power2.out" });
  var tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.9, onUpdate: render });

  // ---- reset for each loop ----
  tl.set([s3, s4, s5, s6, s7], { opacity: 0, pointerEvents: "none" }, 0)
    .set(flowers, { opacity: 0, y: -560 }, 0)
    .set(nana, { y: 0 }, 0)
    .set(eyes, { x: 5, y: 3 }, 0)
    .set(mouth, { attr: { d: WORRIED } }, 0)
    .set(browL, { rotation: -11, svgOrigin: "502 312" }, 0)
    .set(browR, { rotation: 11, svgOrigin: "538 312" }, 0);

  // She tries the lid: arm and lid strain together, then settle.
  function struggle(at, repeats) {
    tl.to(arm, { rotation: -2.4, svgOrigin: "650 580", duration: 0.17, yoyo: true, repeat: repeats, ease: "sine.inOut" }, at)
      .to(lid, { rotation: 2.4, svgOrigin: "980 414", duration: 0.17, yoyo: true, repeat: repeats, ease: "sine.inOut" }, at)
      .to(strain, { opacity: 1, duration: 0.17, yoyo: true, repeat: repeats, ease: "none" }, at);
  }

  // ---- 1 · the jar won't open ----
  struggle(T[0] + 0.5, 7);
  struggle(T[0] + 2.1, 5);
  tl.to(nana, { y: 8, duration: 0.35, ease: "power1.inOut" }, T[0] + 3.0);

  // ---- 2 · flowers arrive; the jar is still shut ----
  flowers.forEach(function (f, i) {
    tl.to(f, { opacity: 1, duration: 0.1 }, T[1] + 0.1 + i * 0.18)
      .to(f, { y: 0, duration: 0.85, ease: "bounce.out" }, T[1] + 0.1 + i * 0.18);
  });
  tl.to(eyes, { x: 9, y: -3, duration: 0.3 }, T[1] + 0.7)
    .to(mouth, { attr: { d: SMILE }, duration: 0.3 }, T[1] + 0.7)
    .to([browL, browR], { rotation: 0, duration: 0.3 }, T[1] + 0.7)
    .to(nana, { y: 0, duration: 0.3 }, T[1] + 0.7)
    .to(eyes, { x: 5, y: 3, duration: 0.3 }, T[1] + 1.85)
    .to(mouth, { attr: { d: WORRIED }, duration: 0.3 }, T[1] + 1.85)
    .to(browL, { rotation: -11, duration: 0.3 }, T[1] + 1.85)
    .to(browR, { rotation: 11, duration: 0.3 }, T[1] + 1.85);
  struggle(T[1] + 2.1, 3);

  // ---- 3 · the kit: box lands, lid off, four tools with their jobs ----
  var box3 = $("#x-box3"), lid3 = $("#x-lid3"), tissue = $("#x-tissue");
  var centres = [[280, 380], [610, 230], [990, 230], [1320, 380]];
  tl.set(lid3, { x: 0, rotation: 0, opacity: 1 }, T[2])
    .to(s3, { opacity: 1, duration: 0.45 }, T[2])
    .fromTo([box3, lid3, tissue], { y: -780 }, { y: 0, duration: 0.85, ease: "bounce.out" }, T[2] + 0.15)
    .to(lid3, { y: -420, x: -120, rotation: -14, svgOrigin: "845 600", duration: 0.55, ease: "power2.in" }, T[2] + 1.0)
    .to(lid3, { opacity: 0, duration: 0.25 }, T[2] + 1.25);
  $$(".x-it").forEach(function (it, i) {
    var img = it.querySelector("image"), lab = it.querySelector(".x-lab");
    tl.fromTo(img, { x: 830 - centres[i][0], y: 640 - centres[i][1], scale: 0.15, opacity: 0, transformOrigin: "50% 50%" },
              { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.5)" }, T[2] + 1.2 + i * 0.1)
      .fromTo(lab, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35 }, T[2] + 2.0 + i * 0.1);
  });

  // ---- 4 · made by hand in Ontario, fitted to them ----
  tl.to(s4, { opacity: 1, duration: 0.45 }, T[3])
    .fromTo($("#x-part"), { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 2.2, ease: "none" }, T[3] + 0.2)
    .fromTo($("#x-head"), { x: -16 }, { x: 16, duration: 0.3, yoyo: true, repeat: 7, ease: "sine.inOut" }, T[3] + 0.2)
    .fromTo($("#x-card4"), { x: 170, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, T[3] + 0.3)
    .fromTo($$(".x-ck"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.35, ease: "back.out(3)", stagger: 0.4 }, T[3] + 0.9)
    .fromTo($("#x-stamp4"), { scale: 2.2, opacity: 0, svgOrigin: "1350 800" }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.in" }, T[3] + 2.2);

  // ---- 5 · it arrives wrapped, with your card ----
  tl.to(s5, { opacity: 1, duration: 0.45 }, T[4])
    .fromTo($("#x-gift5"), { scale: 0.9, svgOrigin: "690 800" }, { scale: 1, duration: 0.6, ease: "back.out(1.6)" }, T[4] + 0.1)
    .fromTo($("#x-bow5"), { scale: 0, svgOrigin: "690 396" }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.55)" }, T[4] + 0.5)
    .fromTo($("#x-tag5"), { rotation: 50, opacity: 0, svgOrigin: "720 404" }, { rotation: 0, opacity: 1, duration: 0.9, ease: "elastic.out(1, 0.5)" }, T[4] + 0.9)
    .fromTo($("#x-card5"), { x: 460, rotation: 10, opacity: 0, svgOrigin: "1230 620" }, { x: 0, rotation: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, T[4] + 1.3);

  // ---- 6 · what they get back: three panels, one at a time ----
  tl.to(s6, { opacity: 1, duration: 0.45 }, T[5]);
  $$(".x-pan").forEach(function (pan, i) {
    var at = T[5] + 0.3 + i * 1.15;
    tl.fromTo(pan, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, at)
      .fromTo(pan.querySelector(".x-tick"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.4, ease: "back.out(3)" }, at + 0.55);
  });
  tl.fromTo($("#x-hi"), { scale: 0, svgOrigin: "860 436" }, { scale: 1, duration: 0.4, ease: "back.out(2.5)" }, T[5] + 1.95)
    .fromTo($("#x-dice"), { rotation: -200, x: 70, y: -50, svgOrigin: "1442 442" }, { rotation: 0, x: 0, y: 0, duration: 0.7, ease: "bounce.out" }, T[5] + 3.0);

  // ---- 7 · end card: the bounce, the promise, the button ----
  tl.set(s7, { pointerEvents: "auto" }, T[6])
    .to(s7, { opacity: 1, duration: 0.5 }, T[6])
    .fromTo($("#x-arc7"), { strokeDasharray: 230, strokeDashoffset: 230 }, { strokeDashoffset: 0, duration: 0.5 }, T[6] + 0.15)
    .fromTo($("#x-ball7"), { attr: { cy: -60 } }, { attr: { cy: 156 }, duration: 0.9, ease: "bounce.out" }, T[6] + 0.25)
    .fromTo($("#x-end-people"), { x: 70, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, T[6] + 0.3)
    .fromTo($$("#x-s7 .x-up"), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.12, ease: "power3.out" }, T[6] + 0.45)
    .fromTo($("#x-btn7"), { scale: 0.7, opacity: 0, svgOrigin: "290 850" }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" }, T[6] + 1.5)
    .to({}, { duration: 0.01 }, TOTAL - 0.01);

  // Gentle life that runs outside the story clock: steam from her tea, a small bob on the end card.
  gsap.fromTo($$("#x-steam path"), { y: 8, opacity: 0.75 }, { y: -22, opacity: 0, duration: 2.2, repeat: -1, ease: "none", stagger: 0.7 });
  gsap.to($$(".x-bob"), { y: -6, duration: 1.7, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.35 });

  // ---- caption + progress follow the clock, so seeking stays in step ----
  var current = -1;
  function render() {
    var t = tl.time(), i = START.length - 1;
    while (i > 0 && t < START[i]) i--;
    if (i !== current) {
      current = i;
      caption.textContent = lines[i];
      caption.classList.remove("is-in"); void caption.offsetWidth; caption.classList.add("is-in");
    }
    fills.forEach(function (f, k) {
      f.style.width = k < i ? "100%" : k === i ? Math.min(100, (t - START[i]) / DUR[i] * 100).toFixed(1) + "%" : "0";
    });
  }

  var userPaused = false, onScreen = true;
  function sync() {
    var run = !userPaused && onScreen && !document.hidden;
    if (run) tl.play(); else tl.pause();
    root.classList.toggle("is-paused", userPaused);
    toggle.setAttribute("aria-pressed", userPaused ? "true" : "false");
    toggle.setAttribute("aria-label", userPaused ? "Play the explainer" : "Pause the explainer");
  }
  toggle.addEventListener("click", function () { userPaused = !userPaused; sync(); });
  segs.forEach(function (seg, i) {
    seg.addEventListener("click", function () { tl.time(START[i] + 0.02); render(); });
  });
  document.addEventListener("visibilitychange", sync);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; sync(); }, { threshold: 0.25 }).observe(root);
  }

  root.exSeek = function (seconds) { userPaused = true; sync(); tl.time(seconds); render(); }; // for checking a frame by time
  tl.time(0.02);
  render();
  sync();
})();
