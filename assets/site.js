// Site-wide progressive enhancement: mobile nav, nav shadow on scroll, reveal-on-scroll, mobile order bar.
// Everything works without this file; it only adds polish.
(function () {
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav-toggle");

  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  if (nav) {
    var onScroll = function () { nav.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  // Product pages: show the sticky order bar once the main Order button scrolls out of view.
  var bar = document.querySelector(".order-bar");
  var mainCta = document.querySelector("[data-main-cta]");
  if (bar && mainCta) {
    document.body.classList.add("has-order-bar");
    var syncBar = function () {
      var passed = mainCta.getBoundingClientRect().bottom < 0;
      bar.classList.toggle("is-visible", passed);
      bar.inert = !passed; // keep the off-screen button out of the tab order
    };
    window.addEventListener("scroll", syncBar, { passive: true });
    window.addEventListener("resize", syncBar);
    syncBar();

    // A bar link like href="#kit-email" scrolls back up and puts the cursor in the field.
    bar.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus({ preventScroll: true });
      });
    });
  }

  // Kit pages and the homepage: the flat-lay hotspots and the contents cards/labels highlight each other.
  var flatlay = document.querySelector(".flatlay");
  if (flatlay) {
    var linked = document.querySelectorAll("[data-item]");
    var setActive = function (n) {
      flatlay.classList.toggle("has-active", !!n);
      linked.forEach(function (el) { el.classList.toggle("is-active", !!n && el.getAttribute("data-item") === n); });
    };
    document.querySelectorAll(".fl-dot, .item-card, .fl-label").forEach(function (el) {
      var n = el.getAttribute("data-item");
      el.addEventListener("mouseenter", function () { setActive(n); });
      el.addEventListener("mouseleave", function () { setActive(null); });
      el.addEventListener("focusin", function () { setActive(n); });
      el.addEventListener("focusout", function () { setActive(null); });
    });
  }
})();
