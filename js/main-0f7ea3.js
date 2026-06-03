'use strict';

/* ── ANIMATED NUMBER COUNTER ────────────────────────────────── */
function wfCounter(el) {
  // Target comes from either `data-counter="N"` (old convention — value
  // in the attribute itself) or `data-counter` flag + `data-target="N"`
  // (newer convention used by the trust-bar variants). If neither gives
  // a finite number, leave the existing text untouched — that way a
  // statically-rendered value like "€4.2M" doesn't get overwritten
  // with "NaN" when the JS runs.
  const raw    = el.dataset.counter || el.dataset.target || '';
  const target = parseFloat(raw);
  if (!isFinite(target)) return;

  const prefix   = el.dataset.prefix  || '';
  const suffix   = el.dataset.suffix  || '';
  const duration = parseInt(el.dataset.duration || '2000');
  const compact  = el.dataset.format === 'compact';
  const decimals = el.dataset.decimals
    ? parseInt(el.dataset.decimals)
    : (String(target).includes('.') ? 2 : 0);
  const start    = performance.now();

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  const fmtOpts = compact
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };

  function tick(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const value    = target * easeOut(progress);

    el.textContent = prefix + value.toLocaleString('en', fmtOpts) + suffix;

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/* ── JACKPOT TICKER ──────────────────────────────────────────── */
function wfJackpot(el) {
  let value    = parseFloat(el.dataset.jackpot) || 0;
  const prefix = el.dataset.prefix || '€';
  const rate   = parseFloat(el.dataset.rate || '0.17'); // per tick

  function format(v) {
    return prefix + v.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  el.textContent = format(value);

  setInterval(() => {
    value += rate + Math.random() * rate;
    el.textContent = format(value);
  }, 800 + Math.random() * 400);
}

/* ── COUNTDOWN TIMER ─────────────────────────────────────────── */
function wfCountdown(el) {
  const endDate = new Date(el.dataset.countdown);
  if (isNaN(endDate)) return;

  function pad(n) { return String(n).padStart(2, '0'); }

  function render(diff) {
    if (diff <= 0) { el.innerHTML = '<span class="wf-text-muted">Offer ended</span>'; return; }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);

    const showDays = d > 0;

    el.innerHTML = (showDays ? `
      <div class="wf-countdown-box"><span class="wf-countdown-num">${d}</span><span class="wf-countdown-label">Days</span></div>
      <span class="wf-countdown-sep">:</span>` : '') + `
      <div class="wf-countdown-box"><span class="wf-countdown-num">${pad(h)}</span><span class="wf-countdown-label">Hours</span></div>
      <span class="wf-countdown-sep">:</span>
      <div class="wf-countdown-box"><span class="wf-countdown-num">${pad(m)}</span><span class="wf-countdown-label">Mins</span></div>
      <span class="wf-countdown-sep">:</span>
      <div class="wf-countdown-box"><span class="wf-countdown-num">${pad(s)}</span><span class="wf-countdown-label">Secs</span></div>`;
  }

  render(endDate - Date.now());
  setInterval(() => render(endDate - Date.now()), 1000);
}

/* ── INLINE COUNTDOWN (HH:MM:SS only, no date needed) ────────── */
function wfCountdownInline(el) {
  let h = parseInt(el.dataset.hours  || '23');
  let m = parseInt(el.dataset.minutes || '59');
  let s = parseInt(el.dataset.seconds || '59');

  function pad(n) { return String(n).padStart(2, '0'); }

  function render() {
    el.innerHTML = `
      <div class="wf-countdown-box"><span class="wf-countdown-num">${pad(h)}</span><span class="wf-countdown-label">Hrs</span></div>
      <span class="wf-countdown-sep">:</span>
      <div class="wf-countdown-box"><span class="wf-countdown-num">${pad(m)}</span><span class="wf-countdown-label">Min</span></div>
      <span class="wf-countdown-sep">:</span>
      <div class="wf-countdown-box"><span class="wf-countdown-num">${pad(s)}</span><span class="wf-countdown-label">Sec</span></div>`;
  }

  render();
  setInterval(() => {
    s--;
    if (s < 0) { s = 59; m--; }
    if (m < 0) { m = 59; h--; }
    if (h < 0) { h = 23; }
    render();
  }, 1000);
}

/* ── SLIDER ──────────────────────────────────────────────────── */
class WfSlider {
  constructor(root) {
    this.root    = root;
    this.track   = root.querySelector('.wf-slider-track');
    this.slides  = root.querySelectorAll('.wf-slide');
    this.btnPrev = root.querySelector('.wf-slider-prev');
    this.btnNext = root.querySelector('.wf-slider-next');
    this.dots    = root.querySelectorAll('.wf-dot');
    this.current = 0;
    this.total   = this.slides.length;
    this.startX  = 0;
    this.auto    = parseInt(root.dataset.auto || '0'); // ms, 0 = disabled
    this.timer   = null;
    if (this.total < 2) return;
    this.init();
  }

  init() {
    this.btnPrev?.addEventListener('click', () => this.go(this.current - 1));
    this.btnNext?.addEventListener('click', () => this.go(this.current + 1));

    this.dots.forEach((d, i) => d.addEventListener('click', () => this.go(i)));

    /* Touch / drag */
    this.track.addEventListener('touchstart', e => { this.startX = e.touches[0].clientX; }, { passive: true });
    this.track.addEventListener('touchend',   e => {
      const dx = this.startX - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 40) this.go(dx > 0 ? this.current + 1 : this.current - 1);
    });

    /* Mouse drag */
    let dragging = false;
    this.track.addEventListener('mousedown',  e => { this.startX = e.clientX; dragging = true; });
    this.track.addEventListener('mouseup',    e => {
      if (!dragging) return;
      dragging = false;
      const dx = this.startX - e.clientX;
      if (Math.abs(dx) > 40) this.go(dx > 0 ? this.current + 1 : this.current - 1);
    });
    this.track.addEventListener('mouseleave', () => { dragging = false; });

    if (this.auto > 0) this.startAuto();
    this.update();
  }

  go(index) {
    this.current = ((index % this.total) + this.total) % this.total;
    this.update();
    if (this.auto > 0) this.restartAuto();
  }

  update() {
    if (this.track) this.track.style.transform = `translateX(-${this.current * 100}%)`;
    this.slides.forEach((s, i) => s.classList.toggle('active', i === this.current));
    this.dots.forEach((d, i)   => d.classList.toggle('active', i === this.current));
    if (this.btnPrev) this.btnPrev.disabled = false;
    if (this.btnNext) this.btnNext.disabled = false;
  }

  startAuto()   { this.timer = setInterval(() => this.go(this.current + 1), this.auto); }
  restartAuto() { clearInterval(this.timer); this.startAuto(); }
}

/* ── TABS ────────────────────────────────────────────────────── */
function wfTabs(container) {
  const tabs   = container.querySelectorAll('[data-tab]');
  const panels = container.querySelectorAll('[data-panel]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t   => t.classList.remove('active'));
      panels.forEach(p => { p.hidden = (p.dataset.panel !== target); });
      tab.classList.add('active');
    });
  });
}

/* ── MOBILE MENU ─────────────────────────────────────────────── */
function wfMobileMenu() {
  document.querySelectorAll('[data-menu-toggle]').forEach(btn => {
    const targetSel = btn.dataset.menuToggle || '[data-menu]';
    const menu = document.querySelector(targetSel) || document.querySelector('.wf-mobile-nav');
    if (!menu) return;

    btn.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
}

/* ── SCROLL ANIMATIONS ───────────────────────────────────────── */
function wfScrollAnimations() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('wf-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-animate]').forEach(el => io.observe(el));
}

/* ── NUMBER FORMAT HELPER ────────────────────────────────────── */
function wfFormatNumber(n, decimals = 0) {
  return n.toLocaleString('en', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* ── LIVE PLAYER COUNT (fake but realistic) ──────────────────── */
function wfLiveCount(el) {
  // Two call conventions are supported:
  //   • legacy  : <span data-live-count="247"> …           → oscillates
  //               around 247, renders "247 players online"
  //   • modern  : <span data-live-count data-min="4200"     → oscillates
  //               data-max="6800">5,341</span>               inside the
  //               range, keeps ONLY the number (no "players online"
  //               suffix), preserves the component's own label markup
  const minRaw = el.dataset.min;
  const maxRaw = el.dataset.max;
  const hasRange = minRaw !== undefined && maxRaw !== undefined;

  if (hasRange) {
    const min = parseInt(minRaw);
    const max = parseInt(maxRaw);
    if (!isFinite(min) || !isFinite(max) || max <= min) return;
    const step = Math.max(1, Math.floor((max - min) / 400));
    // Seed from the rendered value if it parses, otherwise midpoint.
    const seed = parseInt((el.textContent || '').replace(/[^\d]/g, ''));
    let count = isFinite(seed) && seed >= min && seed <= max
      ? seed
      : Math.floor((min + max) / 2);
    el.textContent = wfFormatNumber(count);
    setInterval(() => {
      count += Math.floor(Math.random() * step * 2) - step;
      if (count < min) count = min;
      if (count > max) count = max;
      el.textContent = wfFormatNumber(count);
    }, 3500 + Math.random() * 2000);
    return;
  }

  // Legacy path — fixed starting value, oscillate by variance, render
  // "N players online" as before.
  let count = parseInt(el.dataset.liveCount || '247');
  const variance = parseInt(el.dataset.variance || '5');

  el.textContent = wfFormatNumber(count) + ' players online';

  setInterval(() => {
    count += Math.floor(Math.random() * variance * 2) - variance;
    count  = Math.max(50, count);
    el.textContent = wfFormatNumber(count) + ' players online';
  }, 4000 + Math.random() * 3000);
}

/* ── FAQ ACCORDION (single-open, smooth height + icon sync) ──── */
function cfFaqAccordion() {
  const groupSelectors = ['.faq01-wrap', '.faq03-grid', '.faq04-grid', '.faq05-list'];
  const DURATION = 280;
  const EASING   = 'cubic-bezier(.4,0,.2,1)';

  function openItem(item) {
    const summary = item.querySelector('summary');
    if (!summary) return;
    if (item._cfAnim) { item._cfAnim.cancel(); item._cfAnim = null; }

    item.setAttribute('open', '');
    item.classList.add('wf-faq-open');

    const startH = summary.offsetHeight;
    const endH   = item.offsetHeight;

    item.style.overflow = 'hidden';
    item.style.height   = startH + 'px';
    void item.offsetHeight;

    item._cfAnim = item.animate(
      [{ height: startH + 'px' }, { height: endH + 'px' }],
      { duration: DURATION, easing: EASING }
    );
    item._cfAnim.onfinish = () => {
      item.style.height   = '';
      item.style.overflow = '';
      item._cfAnim = null;
    };
  }

  function closeItem(item) {
    const summary = item.querySelector('summary');
    if (!summary) return;
    if (item._cfAnim) { item._cfAnim.cancel(); item._cfAnim = null; }

    const startH = item.offsetHeight;
    const endH   = summary.offsetHeight;

    item.classList.remove('wf-faq-open');
    item.style.overflow = 'hidden';
    item.style.height   = startH + 'px';
    void item.offsetHeight;

    item._cfAnim = item.animate(
      [{ height: startH + 'px' }, { height: endH + 'px' }],
      { duration: DURATION, easing: EASING }
    );
    item._cfAnim.onfinish = () => {
      item.removeAttribute('open');
      item.style.height   = '';
      item.style.overflow = '';
      item._cfAnim = null;
    };
  }

  groupSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(group => {
      const items = Array.from(group.querySelectorAll('details'));
      if (!items.length) return;

      items.forEach(item => {
        if (item.hasAttribute('open')) item.classList.add('wf-faq-open');

        const summary = item.querySelector('summary');
        if (!summary) return;

        summary.addEventListener('click', e => {
          e.preventDefault();
          const isOpen = item.classList.contains('wf-faq-open');
          if (isOpen) {
            closeItem(item);
          } else {
            items.forEach(other => {
              if (other !== item && other.classList.contains('wf-faq-open')) {
                closeItem(other);
              }
            });
            openItem(item);
          }
        });

        summary.addEventListener('keydown', e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            summary.click();
          }
        });
      });
    });
  });
}

/* ── AUTO INIT ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Dynamic footer year */
  document.querySelectorAll('[data-current-year]').forEach(el => {
    el.textContent = String(new Date().getFullYear());
  });

  /* Sliders */
  document.querySelectorAll('[data-slider]').forEach(el => new WfSlider(el));

  /* Tabs */
  document.querySelectorAll('[data-tabs]').forEach(el => wfTabs(el));

  /* Scroll animations */
  wfScrollAnimations();

  /* Mobile menu */
  wfMobileMenu();

  /* FAQ accordions (single-open) */
  cfFaqAccordion();

  /* Number counters — triggered by IntersectionObserver */
  const counterIo = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        wfCounter(e.target);
        counterIo.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('[data-counter]').forEach(el => counterIo.observe(el));

  /* Jackpot tickers */
  document.querySelectorAll('[data-jackpot]').forEach(el => wfJackpot(el));

  /* Countdown with date */
  document.querySelectorAll('[data-countdown]').forEach(el => wfCountdown(el));

  /* Inline countdown (HH:MM:SS) */
  document.querySelectorAll('[data-countdown-inline]').forEach(el => wfCountdownInline(el));

  /* Live player count */
  document.querySelectorAll('[data-live-count]').forEach(el => wfLiveCount(el));

});
