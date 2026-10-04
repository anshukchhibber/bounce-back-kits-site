// Sign-up and keepsake forms.
// Waitlist forms post JSON to Formspree. The keepsake form (data-backend="forminit") posts multipart
// to Forminit (forminit.com/f/<id>, same request their SDK makes) so the photo travels with the design; if Forminit isn't configured or reachable, it falls
// back to Formspree without the file. With no form service configured at all, a pre-filled email opens.
(function () {
  var CONTACT_EMAIL = "anshuk.chhibber@gmail.com";
  var MAX_UPLOAD = 24 * 1024 * 1024; // Forminit allows 25 MB per submission

  function setup(form) {
    var status = form.querySelector(".form-status");
    var done = document.getElementById(form.getAttribute("data-done"));
    var submitBtn = form.querySelector('button[type="submit"]');
    var kitBoxes = Array.prototype.slice.call(form.querySelectorAll('input[type="checkbox"][name="kits"]'));
    var subjectPrefix = form.getAttribute("data-subject") || "Join the list";

    // Kit cards and kit pages link here as join.html?kit=one-hand — pre-check that kit.
    var wanted = new URLSearchParams(window.location.search).get("kit");
    kitBoxes.forEach(function (box) {
      if (box.dataset.kit === wanted) box.checked = true;
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
      data.kits = data.kits || data.kit || "(none picked)";
      delete data.kit;
      data._subject = subjectPrefix + ": " + data.kits + (data.source ? " · " + data.source : "");
      return data;
    }

    function setStatus(html, isInfo) {
      status.innerHTML = html;
      status.classList.toggle("is-info", !!isInfo);
    }

    function showDone(fileWasSent) {
      if (!done) return;
      var note = done.querySelector("[data-if-no-upload]");
      if (note) note.hidden = !!fileWasSent;
      form.hidden = true;
      done.hidden = false;
      done.focus();
    }

    function failed() {
      submitBtn.disabled = false;
      setStatus('That didn\'t go through. Please try again, or <a href="mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent(subjectPrefix) + '">email us</a> and we\'ll sort it out by hand.');
    }

    function mailtoFallback(data) {
      var labels = { name: "Name", kits: "Kit(s)", when: "When they'd need it", frame: "Frame", nameplate: "Nameplate", photo: "Photo", source: "Sent from" };
      var body = "Hi! " + (form.getAttribute("data-subject") ? "Here's my " + subjectPrefix.toLowerCase() + " design." : "Please add me to the list.") + "\n\n";
      Object.keys(labels).forEach(function (key) {
        if (data[key]) body += labels[key] + ": " + data[key] + "\n";
      });
      window.location.href =
        "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent(data._subject) +
        "&body=" + encodeURIComponent(body);
      setStatus("Your email app should open with everything filled in — just press send.", true);
    }

    function sendFormspree(data) {
      if (form.action.indexOf("FORM_ID") !== -1) { mailtoFallback(data); return; }
      submitBtn.disabled = true;
      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Form service returned " + res.status);
          showDone(false);
        })
        .catch(failed);
    }

    function sendForminit(formId) {
      var fd = new FormData(form);
      fd.delete("_gotcha");
      fd.set("fi-text-subject", collect()._subject);
      submitBtn.disabled = true;
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
          setStatus("That photo is over 24 MB — please choose a smaller copy.");
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
})();
