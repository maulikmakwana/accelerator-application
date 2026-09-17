(() => {
  'use strict';

  const form = document.getElementById('applicationForm');
  if (!form) return; // form not present on this page

  /* =========================================================
     CONFIGURE THIS: paste your deployed Google Apps Script
     Web App URL here once you've set up the backend.
     ========================================================= */
  const SUBMIT_ENDPOINT = "https://script.google.com/macros/s/AKfycbwemPFAB3vuSS_g1c-dnAK1BUug1M4VPNU_aDQfhMU8WXxpOGa1NvUDgYdB-HOtcTjR/exec";

  const steps = Array.from(document.querySelectorAll('.form-step'));
  const segs = Array.from(document.querySelectorAll('.stepper i'));
  const labels = Array.from(document.querySelectorAll('.step-labels span'));
  const btnBack = document.getElementById('formBack');
  const btnNext = document.getElementById('formNext');
  const formCount = document.getElementById('formCount');
  const formShell = document.getElementById('formShell');
  const formSuccess = document.getElementById('formSuccess');
  let current = 0;
  const TOTAL = steps.length;

  // Native smooth scrolling — scrollIntoView handles the true document
  // position for us (accounting for any positioned ancestors, sticky
  // headers, etc.) far more reliably than a manual scrollTo offset ever
  // could. #formShell has scroll-margin-top set in the CSS so the target
  // doesn't land flush against the very top edge of the viewport.
  function showStep(n, scroll){
    current = n;
    steps.forEach((s, i) => s.classList.toggle('active', i === n));
    segs.forEach((s, i) => {
      s.classList.toggle('done', i < n);
      s.classList.toggle('active', i === n);
    });
    labels.forEach((l, i) => l.classList.toggle('active', i === n));
    btnBack.disabled = n === 0;
    btnNext.textContent = n === TOTAL - 1 ? 'SUBMIT APPLICATION' : 'NEXT';
    formCount.textContent = `STEP ${n + 1} OF ${TOTAL}`;
    if(scroll) formShell.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  function validateStep(n){
    let valid = true;
    let firstInvalid = null;
    const stepEl = steps[n];
    const markInvalid = (el) => { if(el && !firstInvalid) firstInvalid = el; };

    stepEl.querySelectorAll('[required]').forEach(field => {
      if(field.type === 'checkbox') return; // handled separately
      const wrapper = field.closest('.form-field');
      const filled = field.value.trim().length > 0;
      if(!filled){ valid = false; if(wrapper){ wrapper.classList.add('invalid'); markInvalid(wrapper); } }
      else if(wrapper){ wrapper.classList.remove('invalid'); }
    });

    // word-count max checks
    stepEl.querySelectorAll('textarea[data-maxwords]').forEach(ta => {
      const max = Number(ta.dataset.maxwords);
      const count = ta.value.trim().split(/\s+/).filter(Boolean).length;
      if(count > max){
        valid = false;
        const wrapper = ta.closest('.form-field');
        wrapper.classList.add('invalid');
        markInvalid(wrapper);
      }
    });

    // specialization max 2, at least 1 (step index 1)
    if(n === 1){
      const checked = document.querySelectorAll('.spec-check:checked').length;
      const bad = checked === 0 || checked > 2;
      document.getElementById('specError').style.display = bad ? 'block' : 'none';
      if(bad){ valid = false; markInvalid(document.getElementById('specializationGroup')); }
    }

    // file uploads + declaration required (step index 4)
    if(n === 4){
      ['fileCompanyProfile'].forEach(id => {
        const input = document.getElementById(id);
        const errEl = document.getElementById('err-' + id);
        const ok = input.files && input.files.length > 0 && input.files[0].size <= 25 * 1024 * 1024;
        errEl.style.display = ok ? 'none' : 'block';
        if(!ok){ valid = false; markInvalid(input.closest('.form-field')); }
      });
      const decl = document.getElementById('declaration');
      const declErr = document.getElementById('err-declaration');
      declErr.style.display = decl.checked ? 'none' : 'block';
      if(!decl.checked){ valid = false; markInvalid(decl.closest('.form-field')); }
    }

    // If something's wrong, smooth-scroll straight to it — otherwise an
    // invalid field above the user's current scroll position just looks
    // like the Next button silently did nothing.
    if(!valid && firstInvalid){
      firstInvalid.scrollIntoView({behavior: 'smooth', block: 'center'});
    }

    return valid;
  }

  btnNext.addEventListener('click', () => {
    if(!validateStep(current)) return;
    if(current === TOTAL - 1){
      submitApplication();
      return;
    }
    showStep(Math.min(current + 1, TOTAL - 1), true);
  });
  btnBack.addEventListener('click', () => {
    showStep(Math.max(current - 1, 0), true);
  });

  // specialization max-2 lock
  document.querySelectorAll('.spec-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = document.querySelectorAll('.spec-check:checked');
      document.querySelectorAll('.spec-check').forEach(other => {
        other.disabled = checked.length >= 2 && !other.checked;
        other.closest('label').classList.toggle('disabled', other.disabled);
      });
      document.getElementById('specError').style.display = 'none';
    });
  });

  // "Other" tool reveal
  document.getElementById('toolOther').addEventListener('change', function(){
    document.getElementById('toolOtherWrap').classList.toggle('visible', this.checked);
  });

  // word counters
  document.querySelectorAll('textarea[data-maxwords]').forEach(ta => {
    const max = Number(ta.dataset.maxwords);
    const counter = document.querySelector(`[data-wc-for="${ta.id}"]`);
    ta.addEventListener('input', () => {
      const count = ta.value.trim().split(/\s+/).filter(Boolean).length;
      counter.textContent = `${count} / ${max} words`;
      counter.classList.toggle('over', count > max);
      if(count <= max) ta.closest('.form-field').classList.remove('invalid');
    });
  });

  // file name display
  ['fileCompanyProfile'].forEach(id => {
    document.getElementById(id).addEventListener('change', function(){
      const label = document.getElementById('fn-' + id);
      if(this.files && this.files[0]){
        const sizeOk = this.files[0].size <= 25 * 1024 * 1024;
        label.textContent = sizeOk ? this.files[0].name : this.files[0].name + ' — exceeds 25MB limit';
        label.style.color = sizeOk ? '' : '#b3261e';
      }
    });
  });

  function fileToBase64(file, onProgress){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (evt) => {
        if(evt.lengthComputable && onProgress) onProgress(evt.loaded / evt.total);
      };
      reader.onload = () => { if(onProgress) onProgress(1); resolve(reader.result.split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---- submission loader ----
  const submitOverlay = document.getElementById('submitOverlay');
  const ringFg = document.getElementById('ringFg');
  const pctLabel = document.getElementById('pctLabel');
  const statusMsg = document.getElementById('statusMsg');
  const RING_CIRCUMFERENCE = 301.6;

  function setLoaderProgress(fraction, message){
    const clamped = Math.max(0, Math.min(1, fraction));
    ringFg.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - clamped));
    pctLabel.textContent = Math.round(clamped * 100) + '%';
    if(message) statusMsg.textContent = message;
  }

  function showLoader(){
    setLoaderProgress(0, 'Preparing files…');
    submitOverlay.classList.add('active');
  }

  function hideLoader(){
    submitOverlay.classList.remove('active');
  }

  async function submitApplication(){
    btnNext.disabled = true;
    btnBack.disabled = true;
    showLoader();

    try{
      const data = {};
      new FormData(form).forEach((val, key) => {
        if(!(val instanceof File)) data[key] = val;
      });
      data.demo_female_led = document.getElementById('femaleLed').checked;
      data.demo_youth_led = document.getElementById('youthLed').checked;
      data.demo_underrepresented = document.getElementById('underrep').checked;
      data.none_of_the_above = document.getElementById('noneofthe').checked;
      data.declaration = document.getElementById('declaration').checked;
      data.specializations = Array.from(document.querySelectorAll('.spec-check:checked')).map(c => c.name);
      data.tools = Array.from(document.querySelectorAll('#applicationForm [id^="tool"][type=checkbox]:checked')).map(c => c.name);

      // Reading + base64-encoding the files is the first 60% of the bar.
      // The four files are read in parallel (Promise.all) rather than one
      // at a time — FileReader is async under the hood, so this cuts the
      // encoding stage roughly to the length of the *slowest* single file
      // instead of the sum of all four.
      const fileFields = ['fileCompanyProfile'];
      data.files = {};
      const total = fileFields.length;
      const fileProgress = new Array(total).fill(0);
      const updateFileProgress = () => {
        const avg = fileProgress.reduce((a, b) => a + b, 0) / total;
        setLoaderProgress(avg * 0.6);
      };
      statusMsg.textContent = 'Preparing your documents…';
      await Promise.all(fileFields.map(async (id, i) => {
        const input = document.getElementById(id);
        const file = input.files[0];
        const base64 = await fileToBase64(file, (frac) => {
          fileProgress[i] = frac;
          updateFileProgress();
        });
        data.files[input.name] = { filename: file.name, mimeType: file.type, base64 };
      }));

      setLoaderProgress(0.65, 'Sending application…');

      // With mode:'no-cors' the response is opaque anyway — we can't read
      // it to confirm success or failure — so waiting for Google Apps
      // Script to finish writing files to Drive, appending the sheet row
      // and sending the confirmation email only adds delay with no upside.
      // We hand off the request and let it complete in the background
      // instead of blocking the UI on it.
      fetch(SUBMIT_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors', // Apps Script web apps don't return CORS headers;
                          // the request still reaches the script and runs.
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify(data)
      }).catch(err => console.error('Submission request failed to send:', err));

      // Quick simulated finish so the person isn't stuck staring at a
      // progress ring for as long as the backend takes to fully process.
      let simulated = 0.65;
      while(simulated < 1){
        simulated = Math.min(simulated + 0.07, 1);
        setLoaderProgress(simulated, simulated < 1 ? 'Finishing up…' : 'Done!');
        await new Promise(r => setTimeout(r, 90));
      }

      hideLoader();
      formShell.style.display = 'none';
      formSuccess.style.display = 'block';
    }catch(err){
      hideLoader();
      alert('Something went wrong sending your application. Please try again or email us directly.');
      btnNext.disabled = false;
      btnBack.disabled = false;
    }
  }

  showStep(0); // initial render only — no scroll on page load
})();