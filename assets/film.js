// The 24-second story, played in a dialog from the hero's "Watch" button, with one large caption per scene.
// Without <dialog> support the button falls back to opening the video file itself.
(function () {
  var dlg = document.getElementById("film");
  var openers = document.querySelectorAll("[data-film]");
  if (!dlg || !openers.length) return;
  var video = dlg.querySelector("video");
  var caption = dlg.querySelector(".film-caption");
  var LINES = [
    "When someone you love is recovering, simple things get hard.",
    "Flowers are kind. But the jar is still shut.",
    "So we make gift boxes of simple tools, matched to their recovery.",
    "Each one is made by hand in Ontario and fitted to them.",
    "It arrives wrapped as a gift, with a letter for them and one for you.",
    "They do more on their own, and game night is back.",
    "The get-well gift that actually helps."
  ];
  var DUR = [3.4, 3.0, 3.6, 3.0, 3.0, 4.6, 3.4], START = [], t0 = 0;
  DUR.forEach(function (d) { START.push(t0); t0 += d; });

  function sync() {
    var t = video.currentTime || 0, i = START.length - 1;
    while (i > 0 && t < START[i]) i--;
    if (caption.textContent !== LINES[i]) caption.textContent = LINES[i];
  }
  video.addEventListener("timeupdate", sync);
  video.addEventListener("ended", function () { caption.innerHTML = 'The get-well gift that actually helps. <a href="join.html">Join the list</a>'; });

  function open() {
    if (typeof dlg.showModal !== "function") { window.location.href = video.querySelector("source").src; return; }
    dlg.showModal();
    video.currentTime = 0; sync();
    var p = video.play(); if (p && p.catch) p.catch(function () { video.controls = true; });
  }
  function close() { video.pause(); dlg.close(); }
  Array.prototype.forEach.call(openers, function (b) { b.addEventListener("click", open); });
  dlg.querySelector("[data-film-close]").addEventListener("click", close);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
  dlg.addEventListener("close", function () { video.pause(); });
  video.addEventListener("click", function () { if (video.paused) video.play(); else video.pause(); });
})();
