// Homepage hero: the kit tour. A short clip (rendered from our print files) plays once: the gift box opens and
// each piece is set down beside it, named as it lands. At the end the "Watch the 24-second story" button appears.
// People who ask for less motion, or whose browser won't autoplay, get the finished picture with every label at once.
(function () {
  var root = document.querySelector("[data-tour]");
  if (!root) return;
  var video = root.querySelector(".tour-video");
  var still = root.querySelector(".tour-still");
  var labels = Array.prototype.slice.call(root.querySelectorAll(".tour-labels li"));
  var caption = root.parentNode.querySelector(".tour-caption");
  var toggle = root.querySelector(".tour-toggle");
  var endLine = caption ? caption.getAttribute("data-end") : "";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // the line under the picture: the newest piece's name and what it does
  function setCaption(name, text) {
    if (!caption) return;
    var key = name + "|" + text;
    if (caption.getAttribute("data-now") === key) return;
    caption.setAttribute("data-now", key);
    caption.textContent = "";
    if (name) { var b = document.createElement("strong"); b.textContent = name + ". "; caption.appendChild(b); }
    caption.appendChild(document.createTextNode(text || ""));
    caption.classList.toggle("is-on", !!(name || text));
  }

  function showUpTo(t) {
    var latest = null;
    labels.forEach(function (li) {
      var on = t >= parseFloat(li.getAttribute("data-at"));
      li.classList.toggle("is-on", on);
      if (on) latest = li;
    });
    setCaption(latest ? latest.textContent.trim() : "", latest ? latest.getAttribute("data-say") : "");
  }

  function setToggle(state) {   // "pause" while playing, "replay" at the end
    if (!toggle) return;
    toggle.hidden = false;
    toggle.setAttribute("data-state", state);
    toggle.setAttribute("aria-label", state === "pause" ? "Pause the animation" : state === "play" ? "Play the animation" : "Play the animation again");
  }

  function finish() {
    root.classList.add("is-done");
    showUpTo(Infinity);
    setCaption("", endLine);
    if (video && !video.hidden) setToggle("replay"); else if (toggle) toggle.hidden = true;
  }

  function finishStill() {
    // the finished picture, no clip
    if (still && still.getAttribute("data-end")) { still.srcset = still.getAttribute("data-end"); still.src = still.getAttribute("data-end").split(" ")[0]; }
    if (video) video.hidden = true;
    finish();
  }

  if (reduce || !video || !video.canPlayType || !video.canPlayType("video/mp4")) { finishStill(); return; }

  var wide = (root.clientWidth || 600) * (window.devicePixelRatio || 1) > 900;
  var started = false;

  function start() {
    if (started) return;
    started = true;
    video.src = video.getAttribute(wide ? "data-src-large" : "data-src-small");
    video.load();
    var p = video.play();
    if (p && p.catch) p.catch(finishStill);   // autoplay refused (e.g. battery saver): show the finished picture
  }

  video.addEventListener("playing", function () { root.classList.add("is-playing"); setToggle("pause"); });
  video.addEventListener("timeupdate", function () { if (!root.classList.contains("is-done")) showUpTo(video.currentTime); });
  video.addEventListener("ended", finish);
  video.addEventListener("error", finishStill);

  if (toggle) toggle.addEventListener("click", function () {
    var state = toggle.getAttribute("data-state");
    if (state === "pause") { video.pause(); setToggle("play"); }
    else if (state === "play") { video.play(); setToggle("pause"); }
    else { root.classList.remove("is-done"); showUpTo(0); video.currentTime = 0; video.play(); setToggle("pause"); }
  });

  // start when the hero is on screen (it usually is, straight away)
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
    }, { threshold: 0.4 });
    io.observe(root);
  } else start();
})();
