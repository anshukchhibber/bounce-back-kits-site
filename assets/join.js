// Every form on the site: the waitlist (quick and full), the follow-up after a quick join, the contact form and the keepsake order.
// Waitlist and contact forms post JSON to Formspree. The keepsake form (data-backend="forminit") posts multipart
// to Forminit (forminit.com/f/<id>, same request their SDK makes) so the photo travels with the design; if Forminit isn't configured or reachable, it falls
// back to Formspree without the file. With no form service configured at all, a pre-filled email opens.
//
// Markup hooks:
//   data-done="id"          the panel shown after a successful send
//   data-subject="Text"     first part of the email subject our team sees
//   data-show-if="#id"      shown (and its fields switched on) only while the checkbox or radio #id is checked
//   data-required-if="#id"  the field becomes required while #id is checked ([data-optional-tag] inside its label hides)
//   data-kit / data-topic   on a checkbox or radio: pre-checked when the page URL says ?kit=… or ?topic=…
//   data-kit-any            pre-checked when the URL names any kit
//   data-opens="id"         a link that opens the small form #id in place (and stays a link without JavaScript)
//   data-mode="name"        shown only when the page URL says ?kit=name (data-mode="default" otherwise)
//   a form inside a done panel is a follow-up: it is sent with the same email, kit and source as the form before it
(function () {
  var CONTACT_EMAIL = "anshuk.chhibber@gmail.com";
  var MAX_UPLOAD = 24 * 1024 * 1024; // Forminit allows 25 MB per submission
  var params = new URLSearchParams(window.location.search);

  // ---------- page modes: join.html?kit=other swaps the heading to "Tell us what they're recovering from" ----------
  var modeEls = document.querySelectorAll("[data-mode]");
  if (modeEls.length) {
    var wantedMode = params.get("kit") || "default";
    var known = Array.prototype.some.call(modeEls, function (el) { return el.getAttribute("data-mode") === wantedMode; });
    Array.prototype.forEach.call(modeEls, function (el) {
      el.hidden = el.getAttribute("data-mode") !== (known ? wantedMode : "default");
    });
  }

  function byId(sel) { return sel && sel.charAt(0) === "#" ? document.getElementById(sel.slice(1)) : null; }

  function setup(form) {
    var status = form.querySelector(".form-status");
    var done = document.getElementById(form.getAttribute("data-done"));
    var submitBtn = form.querySelector('button[type="submit"]');
    var subjectPrefix = form.getAttribute("data-subject") || "Join the list";

    // ---------- pre-check what the link asked for (?kit=one-hand, ?topic=ot) ----------
    ["kit", "topic"].forEach(function (key) {
      var wanted = params.get(key);
      if (!wanted) return;
      Array.prototype.forEach.call(form.querySelectorAll("input[data-" + key + "]"), function (box) {
        if (box.getAttribute("data-" + key) === wanted) box.checked = true;
      });
    });
    // keepsake: arriving from a kit page (?kit=one-hand) means "with a kit"
    if (params.get("kit")) Array.prototype.forEach.call(form.querySelectorAll("input[data-kit-any]"), function (r) { r.checked = true; });

    // ---------- fields that only apply sometimes ----------
    var showIfs = form.querySelectorAll("[data-show-if]");
    var requiredIfs = form.querySelectorAll("[data-required-if]");
    function updateConditionals() {
      Array.prototype.forEach.call(showIfs, function (el) {
        var trigger = byId(el.getAttribute("data-show-if"));
        var on = !!(trigger && trigger.checked);
        el.hidden = !on;
        // switched-off fields are not sent and not checked
        Array.prototype.forEach.call(el.querySelectorAll("input, textarea, select"), function (f) { f.disabled = !on; });
      });
      Array.prototype.forEach.call(requiredIfs, function (field) {
        var trigger = byId(field.getAttribute("data-required-if"));
        var on = !!(trigger && trigger.checked);
        field.required = on;
        var label = form.querySelector('label[for="' + field.id + '"] [data-optional-tag]');
        if (label) label.hidden = on;
      });
    }
    form.addEventListener("change", updateConditionals);
    updateConditionals();

    // a date can't be in the past
    Array.prototype.forEach.call(form.querySelectorAll('input[type="date"]'), function (d) {
      var t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
      d.min = t.toISOString().slice(0, 10);
    });

    // live character count for text areas with a limit
    Array.prototype.forEach.call(form.querySelectorAll("textarea[maxlength][data-count]"), function (ta) {
      var out = document.getElementById(ta.getAttribute("data-count"));
      if (!out) return;
      var tick = function () { out.textContent = (ta.maxLength - ta.value.length) + " characters left"; };
      ta.addEventListener("input", tick); tick();
    });

    // Plain key/value view of the form (Forminit "fi-*" names reduced to plain ones) for Formspree or email.
    function collect() {
      var data = {};
      new FormData(form).forEach(function (value, key) {
        key = key.replace(/^fi-(sender|text|select|file)-/, "");
        if (typeof value !== "string") {
          if (value.size) data[key] = value.name + " (not attached — ask for it)";
          return;
        }
        value = value.trim();
        if (!value) return;
        data[key] = data[key] ? data[key] + ", " + value : value;
      });
      if (data.kit && !data.kits) data.kits = data.kit;
      delete data.kit;
      var about = data.topic || (data.order ? data.order + (data.kits ? " · " + data.kits : "") : (data.kits || "Not sure yet"));
      data._subject = subjectPrefix + ": " + about + (data.source ? " · " + data.source : "");
      return data;
    }

    function setStatus(html, isInfo) {
      if (!status) return;
      status.innerHTML = html;
      status.classList.toggle("is-info", !!isInfo);
    }

    function showDone(fileWasSent, data) {
      if (!done) return;
      var note = done.querySelector("[data-if-no-upload]");
      if (note) note.hidden = !!fileWasSent;
      // a follow-up form in the done panel carries on with the same person and kit
      var follow = done.querySelector("form[data-join]");
      if (follow && data) {
        ["email", "kits", "source"].forEach(function (k) {
          var f = follow.querySelector('input[type="hidden"][name="' + k + '"]');
          if (f && data[k]) f.value = k === "source" ? data[k] + " (follow-up)" : data[k];
        });
      }
      form.hidden = true;
      done.hidden = false;
      done.focus();
    }

    function failed() {
      if (submitBtn) submitBtn.disabled = false;
      setStatus('That didn\'t go through. Please try again, or <a href="mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent(subjectPrefix) + '">email us</a> and we\'ll sort it out by hand.');
    }

    function mailtoFallback(data) {
      var labels = { name: "Name", topic: "About", message: "Message", organisation: "Clinic or organisation", order: "Order",
        kits: "Kit(s)", details: "What they're recovering from", when: "When they'd need it", needed_by: "Needed by",
        frame: "Frame", nameplate: "Nameplate", photo: "Photo", source: "Sent from" };
      var body = "Hi!\n\n";
      Object.keys(labels).forEach(function (key) {
        if (data[key]) body += labels[key] + ": " + data[key] + "\n";
      });
      window.location.href =
        "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent(data._subject) +
        "&body=" + encodeURIComponent(body);
      setStatus("Your email app should open with everything filled in. Just press send.", true);
    }

    function sendFormspree(data) {
      if (form.action.indexOf("FORM_ID") !== -1) { mailtoFallback(data); return; }
      if (submitBtn) submitBtn.disabled = true;
      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Form service returned " + res.status);
          showDone(false, data);
        })
        .catch(failed);
    }

    function sendForminit(formId) {
      var fd = new FormData(form);
      fd.delete("_gotcha");
      fd.set("fi-text-subject", collect()._subject);
      if (submitBtn) submitBtn.disabled = true;
      setStatus("Sending your design and photo…", true);
      fetch("https://forminit.com/f/" + encodeURIComponent(formId), {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Forminit returned " + res.status);
          setStatus("");
          showDone(true);
        })
        .catch(function () {
          // Don't lose the design: send the details without the file instead.
          setStatus("");
          sendFormspree(collect());
        });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setStatus("");

      var trap = form.querySelector('[name="_gotcha"]');
      if (trap && trap.value) { showDone(true); return; } // bots fill the hidden field; don't tip them off

      var fileField = form.getAttribute("data-require-file");
      if (fileField) {
        var input = form.querySelector('[name="' + fileField + '"]');
        var file = input && input.files && input.files[0];
        if (!file) {
          setStatus("Add the photo you'd like printed first.");
          if (input) input.focus();
          return;
        }
        if (file.size > MAX_UPLOAD) {
          setStatus("That photo is over 24 MB. Please choose a smaller copy.");
          return;
        }
      }

      var formId = form.getAttribute("data-form-id");
      if (form.getAttribute("data-backend") === "forminit" && formId && formId.indexOf("FORMINIT_ID") === -1) {
        sendForminit(formId);
      } else {
        sendFormspree(collect());
      }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("form[data-join]"), setup);

  // ---------- a button that opens a small form in place (homepage: "Recovering from something else?") ----------
  Array.prototype.forEach.call(document.querySelectorAll("[data-opens]"), function (btn) {
    var panel = document.getElementById(btn.getAttribute("data-opens"));
    if (!panel) return;
    btn.addEventListener("click", function (e) {
      e.preventDefault();   // without JavaScript it stays a plain link to the join page
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
      if (open) { var first = panel.querySelector("textarea, input:not([type=hidden])"); if (first) first.focus(); }
    });
  });

  // join.html?kit=other: they came to tell us what happened, so start them there
  if (params.get("kit") === "other") {
    var details = document.getElementById("join-details");
    if (details) details.focus({ preventScroll: true });
  }
})();
