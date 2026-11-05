/* snowball.holdings · shared behaviour for all pages */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu: the button shows and hides the links below 760px
  var navToggle = document.querySelector('.nav-toggle');
  if (navToggle) {
    var nav = navToggle.closest('.nav');
    var setMenu = function (open) {
      nav.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    };
    navToggle.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); navToggle.focus(); }
    });
    nav.querySelectorAll('.nav-links a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 761px)');
      var onWide = function () { if (wide.matches) setMenu(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);
    }
  }

  // Counters: data-count="54" data-prefix="$" data-suffix="M"
  var counters = document.querySelectorAll('[data-count]');
  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = prefix + target + suffix; return; }
    var start = null, dur = 1900;
    function step(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - t, 3);
      el.textContent = prefix + Math.round(target * e) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(runCounter);
    }
  }

  // Snowball: rolls downhill, grows, absorbs the sector labels. Loops.
  var sb = document.getElementById('snowball');
  if (sb && sb.getContext) {
    var ctx = sb.getContext('2d');
    var DPR = Math.min(2, window.devicePixelRatio || 1);
    var W = 520, H = 360;
    sb.width = W * DPR; sb.height = H * DPR; ctx.scale(DPR, DPR);
    var sectors = ['Aquaculture', 'E-mobility', 'Fintech', 'Mining', 'Rare earths', 'Hospitality'];
    var x0 = 36, y0 = 150, x1 = 400, y1 = 292;          // slope, left to right, downhill
    var r0 = 12, r1 = 84;
    var DUR = 10000, PAUSE = 2600, TOTAL = DUR + PAUSE;
    var labelX = sectors.map(function (_, i) { return x0 + 60 + i * 62; });
    function slopeY(x) { return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
    var ang = Math.atan2(y1 - y0, x1 - x0);
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function frame(ms) {
      var tt = reduce ? 1 : ((ms % TOTAL) / DUR);
      var t = Math.min(1, tt);
      var p = ease(t);
      ctx.clearRect(0, 0, W, H);
      // slope line
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0 - 20, slopeY(x0 - 20)); ctx.lineTo(x1 + 30, slopeY(x1 + 30)); ctx.stroke();
      // faint grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (var gx = 20; gx < W; gx += 60) { ctx.beginPath(); ctx.moveTo(gx, 20); ctx.lineTo(gx, H - 20); ctx.stroke(); }
      var cx = x0 + (x1 - x0) * p;
      var r = r0 + (r1 - r0) * p;
      var cy = slopeY(cx) - r * Math.cos(ang) + 1;
      // trail
      var grad = ctx.createLinearGradient(x0, 0, cx, 0);
      grad.addColorStop(0, 'rgba(212,178,122,0)'); grad.addColorStop(1, 'rgba(212,178,122,0.35)');
      ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, slopeY(x0) - 1); ctx.lineTo(cx, slopeY(cx) - 1); ctx.stroke();
      // labels
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.textBaseline = 'middle';
      for (var i = 0; i < sectors.length; i++) {
        var lx = labelX[i], ly = slopeY(lx) - 22 - i * 2;
        var gone = (cx + r * 0.6) - lx;                  // >0 once the ball reaches the label
        var k = gone > 0 ? Math.max(0, 1 - gone / 60) : 1;
        if (k <= 0) continue;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.translate(lx, ly); ctx.scale(k, k);
        var tw = ctx.measureText(sectors[i].toUpperCase()).width + 18;
        ctx.fillStyle = 'rgba(14,26,46,0.9)'; ctx.strokeStyle = 'rgba(212,178,122,0.55)'; ctx.lineWidth = 1;
        roundRect(ctx, -tw / 2, -11, tw, 22, 11); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#D4B27A'; ctx.textAlign = 'center'; ctx.fillText(sectors[i].toUpperCase(), 0, 1);
        ctx.restore();
      }
      // ball
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(p * 9);
      var g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.7, '#E6EBF2'); g.addColorStop(1, '#B7C2D2');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
      for (var a = 0; a < 3; a++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.45 + a * 0.2), a * 1.2, a * 1.2 + 2.2); ctx.stroke(); }
      ctx.restore();
      // shadow under ball
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(cx + 4, slopeY(cx + 4) + 2, r * 0.9, r * 0.14, ang, 0, Math.PI * 2); ctx.fill();
      // tag
      ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.fillStyle = '#7E8CA3'; ctx.font = '400 11px "JetBrains Mono", monospace';
      ctx.fillText('C O M P O U N D I N G ,  N O T  T I M I N G', 36, H - 14);
      if (!reduce && running) requestAnimationFrame(frame);
    }
    var running = false, inView = true;
    function start() { if (!running && !reduce && inView && !document.hidden) { running = true; requestAnimationFrame(frame); } }
    function stop() { running = false; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (inView) start(); else stop(); }).observe(sb);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    function roundRect(c, x, y, w, h, rr) { c.beginPath(); c.moveTo(x + rr, y); c.arcTo(x + w, y, x + w, y + h, rr); c.arcTo(x + w, y + h, x, y + h, rr); c.arcTo(x, y + h, x, y, rr); c.arcTo(x, y, x + w, y, rr); c.closePath(); }
    function boot() { if (reduce) { requestAnimationFrame(frame); } else { start(); } }
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(boot); } else { boot(); }
  }

  // Map arcs: draw on scroll into view
  var map = document.getElementById('map');
  if (map && 'IntersectionObserver' in window && !reduce) {
    var mio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { map.classList.add('go'); mio.unobserve(map); } });
    }, { threshold: 0.3 });
    mio.observe(map);
  } else if (map) { map.classList.add('go'); }

  // Contact: preselect audience from #hash or a CTA card
  var sel = document.getElementById('f-type');
  function pick(h) {
    var idx = { fo: 0, founder: 1, platform: 2, recruiter: 3 }[h];
    if (sel && idx !== undefined) sel.selectedIndex = idx;
  }
  if (sel && location.hash) {
    var h0 = location.hash.replace('#', '');
    pick(h0);
    if ({ fo: 1, founder: 1, platform: 1, recruiter: 1 }[h0]) {
      var f0 = document.getElementById('contact-form');
      if (f0) setTimeout(function () { f0.scrollIntoView({ block: 'start' }); }, 50);
    }
  }
  document.querySelectorAll('.cta').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      pick(a.getAttribute('href').replace('#', ''));
      var f = document.getElementById('contact-form');
      if (f) { f.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); var n = document.getElementById('f-name'); if (n) setTimeout(function () { n.focus(); }, 500); }
    });
  });

  // Copy email
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () { var old = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = old; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); });
      } else { fallback(text); done(); }
    });
  });
  function fallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'absolute'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  // Portal sign-in: private release, no backend yet.
  var pf = document.getElementById('portal-form');
  if (pf) {
    pf.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var t = document.getElementById('portal-toast');
      t.hidden = false;
      t.textContent = 'The portal is in private release and sign-in is not open yet. If you are an investor, email gdp@snowball.holdings and we will send your credentials when your vehicle goes live.';
    });
  }

  // Contact form.
  // If FORM_ENDPOINT is set (e.g. a Google Apps Script web app that emails gdp@snowball.holdings),
  // the message is posted there; otherwise, or if the post fails, a pre-filled email opens instead.
  var FORM_ENDPOINT = '';
  var TO = 'gdp@snowball.holdings';
  var form = document.getElementById('contact-form');
  if (form) {
    var opened = Date.now();
    var toast = document.getElementById('form-toast');
    function say(html, ok) {
      toast.hidden = false;
      toast.innerHTML = html;
      toast.style.background = ok ? '' : '#FBEDEA';
      toast.style.color = ok ? '' : '#7A2318';
    }
    function mailto(who, name, msg) {
      var subject = encodeURIComponent('Enquiry from ' + (name || 'the website') + ' (' + who + ')');
      var body = encodeURIComponent(msg + '\n\n' + name);
      say('Your email app should open now with the message ready to send. If nothing happens, write to <strong>' + TO + '</strong>.', true);
      window.location.href = 'mailto:' + TO + '?subject=' + subject + '&body=' + body;
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var who = form.querySelector('#f-type').value;
      var nameEl = form.querySelector('#f-name'), msgEl = form.querySelector('#f-msg');
      var name = nameEl.value.trim(), msg = msgEl.value.trim();
      var hp = form.querySelector('#f-website');
      if (hp && hp.value) return;                       // honeypot: bots fill hidden fields
      if (!name || !msg) {
        say('Please add your name and a line about the question.', false);
        (name ? msgEl : nameEl).focus();
        return;
      }
      if (!FORM_ENDPOINT || Date.now() - opened < 2500) { mailto(who, name, msg); return; }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      fetch(FORM_ENDPOINT, { method: 'POST', body: new URLSearchParams({ name: name, type: who, message: msg }) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function () { form.reset(); say('Thank you, your message has been sent. We reply within two working days.', true); })
        .catch(function () { mailto(who, name, msg); })
        .then(function () { btn.disabled = false; });
    });
  }
})();
