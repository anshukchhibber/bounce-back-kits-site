// Lithophane keepsake builder — all client-side; the photo is never uploaded from this page.
// Draws the whole framed piece: printed frame, lithophane panel at the photo's own shape, and a
// separately printed nameplate fixed to the frame. Starts on an example picture.
(function () {
  var EXAMPLE_SRC = "assets/art/litho-example.svg";
  var EXAMPLE_CAPTION = "Get well soon, Nana";
  var LONG_SIDE = 440;   // panel's long edge in canvas pixels
  var FRAME = 24;        // frame border width
  var PLATE_H = 36;      // nameplate height: centred on the bottom edge, so it sits on the rail and overhangs below

  var canvas = document.getElementById("litho-canvas");
  var ctx = canvas.getContext("2d");
  var buffer = document.createElement("canvas");
  var photoInput = document.getElementById("photo-input");
  var captionInput = document.getElementById("caption-input");
  var backlitToggle = document.getElementById("backlit-toggle");
  var swatches = Array.prototype.slice.call(document.querySelectorAll(".swatch"));
  var exampleChip = document.getElementById("example-chip");
  var frameName = document.getElementById("frame-name");
  var frameField = document.getElementById("ks-frame");
  var photoHint = document.getElementById("photo-hint");

  var state = { img: null, example: true, frameColor: "#1E1B19", caption: "", backlit: true };

  function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  function containFit(imgW, imgH, boxW, boxH) {
    var scale = Math.min(boxW / imgW, boxH / imgH);
    var w = imgW * scale, h = imgH * scale;
    return { x: (boxW - w) / 2, y: (boxH - h) / 2, w: w, h: h };
  }

  // Panel takes the photo's own proportions (within reason) so the whole picture shows.
  function panelSize(img) {
    var ar = img ? (img.naturalWidth || img.width) / (img.naturalHeight || img.height) : 3 / 4;
    ar = Math.max(0.6, Math.min(1.67, ar));
    return ar >= 1 ? { w: LONG_SIDE, h: Math.round(LONG_SIDE / ar) } : { w: Math.round(LONG_SIDE * ar), h: LONG_SIDE };
  }

  // Light passes through thin plastic (light areas) and is held back by thick plastic (dark areas).
  // Lit: warm amber with the falloff of an LED behind the panel. Unlit: white plastic, relief only.
  function renderPanel(img, x0, y0, W, h) {
    buffer.width = W; buffer.height = h;
    var b = buffer.getContext("2d");
    b.fillStyle = "#FFFFFF";
    b.fillRect(0, 0, W, h);
    var fit = containFit(img.naturalWidth || img.width, img.naturalHeight || img.height, W, h);
    b.drawImage(img, fit.x, fit.y, fit.w, fit.h);
    var src = b.getImageData(0, 0, W, h).data; // throws if the canvas is tainted; caller falls back

    var n = W * h, L = new Float32Array(n), i;
    for (i = 0; i < n; i++) L[i] = (0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2]) / 255;

    var out = ctx.createImageData(W, h), o = out.data;
    var cx = W / 2, cy = h * 0.46, maxR = Math.sqrt(cx * cx + Math.max(cy, h - cy) * Math.max(cy, h - cy));
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < W; x++) {
        i = y * W + x;
        var l = L[i], R, G, B;
        if (state.backlit) {
          var dx = x - cx, dy = y - cy, r = Math.sqrt(dx * dx + dy * dy) / maxR;
          var t = Math.min(1, Math.pow(l, 0.95) * (1.06 - 0.3 * r * r));
          // Three-stop ramp: deep brown (thick) → amber → warm white (thin), like light through PLA.
          if (t < 0.5) { var u = t / 0.5; R = 46 + 156 * u; G = 26 + 104 * u; B = 12 + 48 * u; }
          else { var v2 = (t - 0.5) / 0.5; R = 202 + 53 * v2; G = 130 + 116 * v2; B = 60 + 160 * v2; }
        } else {
          var a = L[Math.max(0, i - W - 1)], c = L[Math.min(n - 1, i + W + 1)];
          var v = 236 - (1 - l) * 16 + (c - a) * 110;
          R = v; G = v - 3; B = v - 9;
        }
        if (y % 3 === 0) { R *= 0.965; G *= 0.965; B *= 0.965; } // print layer lines
        o[i * 4] = clamp(R); o[i * 4 + 1] = clamp(G); o[i * 4 + 2] = clamp(B); o[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(out, x0, y0);
  }

  // Fallback when pixels can't be read (e.g. opened from disk): filters only.
  function renderPanelFiltered(img, x0, y0, W, h) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, W, h); ctx.clip();
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x0, y0, W, h);
    var fit = containFit(img.naturalWidth || img.width, img.naturalHeight || img.height, W, h);
    ctx.filter = state.backlit ? "grayscale(1) contrast(1.15) brightness(1.05)" : "grayscale(1) contrast(0.5) brightness(1.4)";
    ctx.drawImage(img, x0 + fit.x, y0 + fit.y, fit.w, fit.h);
    ctx.filter = "none";
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = state.backlit ? "rgba(255, 196, 120, 0.9)" : "rgba(240, 236, 228, 0.6)";
    ctx.fillRect(x0, y0, W, h);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function isDark(hex) {
    var n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 128;
  }

  // Printed frame: solid colour, soft bevel, its own layer lines, and the panel sitting a little recessed.
  function drawFrame(fw, fh, pw, ph) {
    ctx.save();
    roundRect(0, 0, fw, fh, 12);
    ctx.fillStyle = state.frameColor;
    ctx.fill();
    ctx.clip();
    var bevel = ctx.createLinearGradient(0, 0, fw, fh);
    bevel.addColorStop(0, "rgba(255, 255, 255, 0.22)");
    bevel.addColorStop(0.5, "rgba(255, 255, 255, 0)");
    bevel.addColorStop(1, "rgba(0, 0, 0, 0.22)");
    ctx.fillStyle = bevel;
    ctx.fillRect(0, 0, fw, fh);
    ctx.fillStyle = isDark(state.frameColor) ? "rgba(255, 255, 255, 0.05)" : "rgba(46, 42, 38, 0.06)";
    for (var y = 0; y < fh; y += 3) ctx.fillRect(0, y, fw, 1);
    ctx.restore();
    // outer edge
    roundRect(0.75, 0.75, fw - 1.5, fh - 1.5, 12);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // recess: inner lip around the panel
    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = 3;
    ctx.strokeRect(FRAME - 1.5, FRAME - 1.5, pw + 3, ph + 3);
  }

  // Nameplate: a separate silk-gold print fixed over the bottom rail, with recessed lettering.
  function drawNameplate(text, fw, frameBottom) {
    ctx.font = "700 15px 'Bricolage Grotesque', Arial, sans-serif";
    var tw = Math.min(ctx.measureText(text).width, fw * 0.72);
    var w = Math.max(tw + 40, 110), h = PLATE_H;
    var x = (fw - w) / 2, y = frameBottom - h / 2;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    roundRect(x, y, w, h, 6);
    var gold = ctx.createLinearGradient(x, y, x, y + h);
    gold.addColorStop(0, "#F3DC97"); gold.addColorStop(0.45, "#D9B45E"); gold.addColorStop(1, "#B68C3B");
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(x, y, w, h, 6);
    ctx.clip();
    ctx.fillStyle = "rgba(90, 60, 20, 0.08)";
    for (var ly = y; ly < y + h; ly += 3) ctx.fillRect(x, ly, w, 1);
    ctx.restore();
    roundRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, 6);
    ctx.strokeStyle = "rgba(110, 76, 24, 0.7)"; ctx.lineWidth = 1.5; ctx.stroke();
    // fixing pins
    ctx.fillStyle = "#9C7630";
    [x + 9, x + w - 9].forEach(function (px) { ctx.beginPath(); ctx.arc(px, y + h / 2, 2.6, 0, Math.PI * 2); ctx.fill(); });
    // recessed text: light edge below, dark fill
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 240, 200, 0.7)";
    ctx.fillText(text, fw / 2, y + h / 2 + 1, fw * 0.72);
    ctx.fillStyle = "#4A3412";
    ctx.fillText(text, fw / 2, y + h / 2, fw * 0.72);
    ctx.textBaseline = "alphabetic";
  }

  function draw() {
    var caption = state.caption || (state.example ? EXAMPLE_CAPTION : "");
    var p = panelSize(state.img);
    var fw = p.w + FRAME * 2, fh = p.h + FRAME * 2;
    var overhang = caption ? PLATE_H / 2 + 6 : 0;
    canvas.width = fw;
    canvas.height = fh + overhang;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawFrame(fw, fh, p.w, p.h);
    if (state.img) {
      try { renderPanel(state.img, FRAME, FRAME, p.w, p.h); }
      catch (err) { renderPanelFiltered(state.img, FRAME, FRAME, p.w, p.h); }
    } else {
      ctx.fillStyle = state.backlit ? "#F6DFAE" : "#ECE8E1";
      ctx.fillRect(FRAME, FRAME, p.w, p.h);
    }
    if (caption) drawNameplate(caption, fw, fh);
  }

  function setImage(img, isExample) {
    state.img = img;
    state.example = isExample;
    if (exampleChip) exampleChip.hidden = !isExample;
    canvas.setAttribute("aria-label", isExample
      ? "Example keepsake: a framed lithophane of two people on a dock at sunset, with a nameplate"
      : "Preview of your photo as a framed lithophane");
    draw();
  }

  var example = new Image();
  example.onload = function () { if (state.example) setImage(example, true); };
  example.src = EXAMPLE_SRC;

  var photoName = document.getElementById("photo-name");
  var captionCount = document.getElementById("caption-count");
  var stage = document.getElementById("studio-stage");
  var maxLen = captionInput.maxLength > 0 ? captionInput.maxLength : 32;

  function loadPhoto(file) {
    if (!file) return;
    if (photoName) photoName.textContent = file.name;
    if (photoHint) photoHint.textContent = "Sent with your design · tap to change";
    var img = new Image();
    img.onload = function () {
      setImage(img, false);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = function () {
      // e.g. iPhone HEIC in browsers that can't display it: we still receive the original file.
      URL.revokeObjectURL(img.src);
      if (photoHint) photoHint.textContent = "No preview for this file type — we'll still receive it";
    };
    img.src = URL.createObjectURL(file);
  }

  photoInput.addEventListener("change", function () {
    loadPhoto(photoInput.files && photoInput.files[0]);
  });

  // Drop a photo straight onto the preview.
  if (stage) {
    ["dragenter", "dragover"].forEach(function (type) {
      stage.addEventListener(type, function (e) { e.preventDefault(); stage.classList.add("is-dragging"); });
    });
    ["dragleave", "drop"].forEach(function (type) {
      stage.addEventListener(type, function () { stage.classList.remove("is-dragging"); });
    });
    stage.addEventListener("drop", function (e) {
      e.preventDefault();
      var files = e.dataTransfer.files;
      if (!files || !files[0]) return;
      try { photoInput.files = files; } catch (err) { /* older browsers: preview only */ }
      loadPhoto(files[0]);
    });
  }

  captionInput.addEventListener("input", function () {
    state.caption = captionInput.value.trim();
    if (captionCount) captionCount.textContent = (maxLen - captionInput.value.length) + " characters left";
    draw();
  });

  backlitToggle.addEventListener("change", function () {
    state.backlit = backlitToggle.checked;
    draw();
  });

  swatches.forEach(function (btn) {
    btn.addEventListener("click", function () {
      swatches.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      btn.setAttribute("aria-pressed", "true");
      state.frameColor = btn.dataset.color;
      if (frameName) frameName.textContent = btn.dataset.name;
      if (frameField) frameField.value = btn.dataset.name;
      draw();
    });
  });

  // Redraw once the display font has loaded so the nameplate uses it.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  draw();
})();
