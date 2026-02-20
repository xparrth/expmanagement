/**
 * MOLTEN CORE — Dynamic Background + Interactions
 *
 * 8-layer live background:
 *  1. Deep dark base
 *  2. Perlin FBM noise colour wash (organic fluid regions)
 *  3. Deep magma blobs (mouse-repulsion + noise drift)
 *  4. Perlin-driven flow nodes (screen blend)
 *  5. Glowing cracks that spawn, glow, fade, respawn
 *  6. Rising ember / spark particles
 *  7. Heat shimmer bands (overlay blend)
 *  8. Mouse heat burst + vignette
 */

document.addEventListener('DOMContentLoaded', function () {
    initMoltenBackground();
    initPageEntrance();
    initFadeInAnimations();
    initFormValidations();
    initButtonLoadingStates();
    initTooltips();
    initKeyboardShortcuts();
    initCardTilt();
    initFloatingButtons();
    injectStyles();
});

/* ============================================================
   MOLTEN BACKGROUND
   ============================================================ */
function initMoltenBackground() {
    if (document.getElementById('lava-canvas')) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'lava-canvas';
    document.body.insertBefore(canvas, document.body.firstChild);

    const ctx = canvas.getContext('2d');
    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        buildCracks();
    });

    // Mouse
    const mouse = { x: W / 2, y: H / 2, active: false };
    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
    });

    // ── Perlin noise ──────────────────────────────────────────
    const perm = new Uint8Array(512);
    (function () {
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }
        for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    })();

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + t * (b - a); }
    function grad(h, x, y) {
        const g = h & 3, u = g < 2 ? x : y, v = g < 2 ? y : x;
        return (g & 1 ? -u : u) + (g & 2 ? -v : v);
    }
    function noise2(x, y) {
        const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
        const xf = x - Math.floor(x), yf = y - Math.floor(y);
        const u = fade(xf), v = fade(yf);
        const aa = perm[perm[xi]   + yi],   ab = perm[perm[xi]   + yi+1];
        const ba = perm[perm[xi+1] + yi],   bb = perm[perm[xi+1] + yi+1];
        return lerp(lerp(grad(aa,xf,yf),grad(ba,xf-1,yf),u), lerp(grad(ab,xf,yf-1),grad(bb,xf-1,yf-1),u), v);
    }
    function fbm(x, y, oct = 5) {
        let val = 0, amp = 0.5, freq = 1, max = 0;
        for (let i = 0; i < oct; i++) {
            val += noise2(x * freq, y * freq) * amp;
            max += amp; amp *= 0.5; freq *= 2.1;
        }
        return val / max;
    }

    // ── Blobs ─────────────────────────────────────────────────
    const blobs = Array.from({ length: 9 }, () => ({
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.35,
        r:  180 + Math.random() * 260,
        hue:   5 + Math.random() * 38,
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.004,
    }));

    // ── Flow nodes ────────────────────────────────────────────
    const flowNodes = Array.from({ length: 6 }, () => ({
        x:  Math.random() * W, y: Math.random() * H,
        r:  120 + Math.random() * 180,
        hue: 10 + Math.random() * 30,
        t:  Math.random() * 1000,
        speed: 0.0008 + Math.random() * 0.001,
    }));

    // ── Cracks ────────────────────────────────────────────────
    let cracks = [];
    function generateCrack() {
        const sx = Math.random() * W, sy = Math.random() * H;
        const pts = [{ x: sx, y: sy }];
        let angle = Math.random() * Math.PI * 2;
        for (let i = 0; i < 6 + Math.floor(Math.random() * 10); i++) {
            angle += (Math.random() - 0.5) * 1.2;
            const len = 20 + Math.random() * 60;
            pts.push({ x: pts[pts.length-1].x + Math.cos(angle)*len, y: pts[pts.length-1].y + Math.sin(angle)*len });
        }
        return { pts, life:0, maxLife: 180 + Math.random()*300, width: 0.3 + Math.random()*1.2, hue: 15 + Math.random()*35, delay: Math.random()*400 };
    }
    function buildCracks() { cracks = Array.from({ length: 18 }, generateCrack); }
    buildCracks();

    // ── Embers ────────────────────────────────────────────────
    function spawnEmber(anywhere) {
        return { x: Math.random()*W, y: anywhere ? Math.random()*H : H+10, vx:(Math.random()-0.5)*1.2, vy:-(0.5+Math.random()*2.2), r:0.8+Math.random()*2.5, life:0, maxLife:60+Math.random()*120, hue:10+Math.random()*45, twinkle:Math.random()*Math.PI*2 };
    }
    const embers = Array.from({ length: 80 }, () => spawnEmber(true));

    // ── Heat shimmer ──────────────────────────────────────────
    const shimmerStrips = Array.from({ length: 5 }, () => ({
        x: Math.random()*W, y: Math.random()*H,
        w: 60+Math.random()*140, h: 200+Math.random()*300,
        vx:(Math.random()-0.5)*0.3, vy:-(0.1+Math.random()*0.2),
        phase:Math.random()*Math.PI*2,
    }));

    let t = 0;

    function draw() {
        t++;

        // Base
        ctx.fillStyle = '#060200';
        ctx.fillRect(0, 0, W, H);

        // ── Layer 1: FBM noise colour wash ──
        const timeShift = t * 0.0006;
        ctx.save();
        const cols = Math.ceil(W/80), rows = Math.ceil(H/80);
        for (let gx = 0; gx <= cols; gx++) {
            for (let gy = 0; gy <= rows; gy++) {
                const px = gx*80, py = gy*80;
                const n  = fbm(px/W*3 + timeShift, py/H*3 + timeShift*0.7) * 0.5 + 0.5;
                const n2 = fbm(px/W*3 + 5, py/H*3 + 5) * 0.5 + 0.5;
                ctx.fillStyle = `hsla(${5+n*40},${80+n2*20}%,${8+n*22}%,${0.08+n*0.18})`;
                ctx.fillRect(px-40, py-40, 90, 90);
            }
        }
        ctx.restore();

        // ── Layer 2: deep magma blobs ──
        blobs.forEach(b => {
            b.phase += b.speed;
            const hueShift = b.hue + Math.sin(b.phase) * 15;
            const pulseR   = b.r   + Math.sin(b.phase * 1.3) * 30;

            if (mouse.active) {
                const dx = b.x - mouse.x, dy = b.y - mouse.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 220 && dist > 1) {
                    const force = (220-dist)/220 * 0.8;
                    b.vx += dx/dist * force;
                    b.vy += dy/dist * force;
                }
            }
            b.vx *= 0.995; b.vy *= 0.995;
            b.x += b.vx + noise2(b.x*0.003 + t*0.0005, b.y*0.003) * 0.6;
            b.y += b.vy + noise2(b.x*0.003, b.y*0.003 + t*0.0005) * 0.5;
            if (b.x < -b.r) b.x = W+b.r; if (b.x > W+b.r) b.x = -b.r;
            if (b.y < -b.r) b.y = H+b.r; if (b.y > H+b.r) b.y = -b.r;

            const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, pulseR);
            g.addColorStop(0,   `hsla(${hueShift},100%,52%,0.55)`);
            g.addColorStop(0.3, `hsla(${hueShift-8},95%,38%,0.40)`);
            g.addColorStop(0.7, `hsla(${hueShift-15},90%,22%,0.18)`);
            g.addColorStop(1,   `hsla(${hueShift},80%,10%,0)`);
            ctx.beginPath();
            ctx.arc(b.x, b.y, pulseR, 0, Math.PI*2);
            ctx.fillStyle = g; ctx.fill();
        });

        // ── Layer 3: flow nodes ──
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.12;
        flowNodes.forEach(fn => {
            fn.t += fn.speed;
            fn.x += noise2(fn.x*0.004, fn.t) * 1.5;
            fn.y += noise2(fn.y*0.004, fn.t+99) * 1.5;
            if (fn.x < 0) fn.x = W; if (fn.x > W) fn.x = 0;
            if (fn.y < 0) fn.y = H; if (fn.y > H) fn.y = 0;
            const pr = fn.r + Math.sin(fn.t*400)*20;
            const g = ctx.createRadialGradient(fn.x, fn.y, 0, fn.x, fn.y, pr);
            g.addColorStop(0, `hsl(${fn.hue},100%,65%)`);
            g.addColorStop(0.5, `hsl(${fn.hue+10},90%,45%)`);
            g.addColorStop(1, `hsl(${fn.hue},80%,20%)`);
            ctx.beginPath(); ctx.arc(fn.x, fn.y, pr, 0, Math.PI*2);
            ctx.fillStyle = g; ctx.fill();
        });
        ctx.restore();

        // ── Layer 4: glowing cracks ──
        cracks.forEach((crack, idx) => {
            if (t < crack.delay) return;
            crack.life++;
            if (crack.life > crack.maxLife) { cracks[idx] = generateCrack(); return; }
            const progress = crack.life / crack.maxLife;
            let alpha = progress < 0.1 ? progress/0.1 : progress < 0.6 ? 1 : 1-(progress-0.6)/0.4;
            const glow = 0.4 + Math.sin(t*0.08 + idx)*0.3;
            ctx.save();
            ctx.lineWidth = crack.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.shadowColor = `hsl(${crack.hue},100%,60%)`; ctx.shadowBlur = 8+glow*12;
            ctx.strokeStyle = `hsla(${crack.hue},100%,70%,${alpha*glow})`;
            ctx.beginPath();
            ctx.moveTo(crack.pts[0].x, crack.pts[0].y);
            crack.pts.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); });
            ctx.stroke();
            ctx.lineWidth = crack.width*0.3;
            ctx.strokeStyle = `hsla(60,100%,95%,${alpha*0.4*glow})`;
            ctx.shadowBlur = 4; ctx.stroke();
            ctx.restore();
        });

        // ── Layer 5: embers ──
        embers.forEach((e, idx) => {
            e.life++; e.twinkle += 0.12;
            e.x += e.vx + Math.sin(e.twinkle*0.7)*0.5;
            e.y += e.vy; e.vy -= 0.008;
            if (e.life > e.maxLife || e.y < -20) { embers[idx] = spawnEmber(false); return; }
            const progress = e.life / e.maxLife;
            let alpha = progress < 0.15 ? progress/0.15 : progress < 0.7 ? 1 : 1-(progress-0.7)/0.3;
            const tf = 0.6 + Math.sin(e.twinkle)*0.4;
            const r  = e.r * (1 - progress*0.5);
            const grd = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r*3);
            grd.addColorStop(0, `hsla(${e.hue},100%,70%,${alpha*tf*0.9})`);
            grd.addColorStop(0.4, `hsla(${e.hue},100%,55%,${alpha*tf*0.4})`);
            grd.addColorStop(1, `hsla(${e.hue},100%,40%,0)`);
            ctx.beginPath(); ctx.arc(e.x, e.y, r*3, 0, Math.PI*2);
            ctx.fillStyle = grd; ctx.fill();
            ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI*2);
            ctx.fillStyle = `hsla(${e.hue+30},100%,90%,${alpha*tf})`; ctx.fill();
        });

        // ── Layer 6: heat shimmer ──
        ctx.save();
        ctx.globalAlpha = 0.055;
        ctx.globalCompositeOperation = 'overlay';
        shimmerStrips.forEach(s => {
            s.phase += 0.04;
            s.x += s.vx + Math.sin(s.phase*0.5)*0.4; s.y += s.vy;
            if (s.y + s.h < 0) { s.y = H+20; s.x = Math.random()*W; }
            if (s.x < -s.w) s.x = W; if (s.x > W+s.w) s.x = 0;
            ctx.beginPath();
            for (let sy = 0; sy <= s.h; sy += 8) {
                const wx = s.x + Math.sin(sy*0.03 + s.phase)*12;
                sy === 0 ? ctx.moveTo(wx, s.y+sy) : ctx.lineTo(wx, s.y+sy);
            }
            ctx.lineWidth = s.w;
            ctx.strokeStyle = 'rgba(255,160,60,0.5)'; ctx.stroke();
        });
        ctx.restore();

        // ── Layer 7: mouse heat burst ──
        if (mouse.active) {
            const pr = 80 + Math.sin(t*0.08)*20;
            const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, pr);
            mg.addColorStop(0, 'rgba(255,200,80,0.18)');
            mg.addColorStop(0.4, 'rgba(255,120,20,0.10)');
            mg.addColorStop(1, 'rgba(255,60,0,0)');
            ctx.beginPath(); ctx.arc(mouse.x, mouse.y, pr, 0, Math.PI*2);
            ctx.fillStyle = mg; ctx.fill();
        }

        // ── Layer 8: vignette ──
        const vig = ctx.createRadialGradient(W/2, H/2, H*0.1, W/2, H/2, Math.max(W,H)*0.85);
        vig.addColorStop(0, 'rgba(5,2,0,0)');
        vig.addColorStop(0.6, 'rgba(5,2,0,0.15)');
        vig.addColorStop(1, 'rgba(3,1,0,0.82)');
        ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

        requestAnimationFrame(draw);
    }
    draw();
}

/* ============================================================
   PAGE ENTRANCE
   ============================================================ */
function initPageEntrance() {
    document.querySelectorAll('.card, .dashboard-card, .stat-card, .expense-card, .header-content, .stat-box').forEach((el, i) => {
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(28px)';
        el.style.transition = 'opacity 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.4,0,0.2,1)';
        setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, 80 + i * 65);
    });
}

/* ============================================================
   FADE IN ANIMATIONS
   ============================================================ */
function initFadeInAnimations() {
    const els = document.querySelectorAll('.fade-in');
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target;
            el.style.opacity = '0'; el.style.transform = 'translateY(20px)';
            requestAnimationFrame(() => {
                el.style.transition = 'opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)';
                el.style.opacity = '1'; el.style.transform = 'translateY(0)';
            });
            obs.unobserve(el);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => obs.observe(el));
}

/* ============================================================
   FORM VALIDATIONS
   ============================================================ */
function initFormValidations() {
    document.querySelectorAll('form').forEach(form => {
        const submit = form.querySelector('button[type="submit"]');
        if (!submit) return;
        const txt = (submit.textContent||'').toLowerCase();
        if (txt.includes('back') || txt.includes('logout')) return;
        form.addEventListener('submit', e => {
            let valid = true;
            form.querySelectorAll('[required]').forEach(field => {
                if (!field.value.trim()) {
                    valid = false; setFieldError(field, true);
                    field.addEventListener('input', () => setFieldError(field, false), { once: true });
                }
            });
            if (!valid) { e.preventDefault(); showNotification('Please fill in all required fields', 'error'); }
        });
        form.querySelectorAll('input[type="number"]').forEach(f => {
            f.addEventListener('input', () => { if (f.value < 0) f.value = 0; });
        });
    });
}
function setFieldError(field, hasError) {
    field.style.borderColor = hasError ? 'var(--red)' : '';
    field.style.boxShadow   = hasError ? '0 0 0 3px rgba(255,34,0,0.15), 0 0 12px rgba(255,34,0,0.2)' : '';
}

/* ============================================================
   BUTTON LOADING
   ============================================================ */
function initButtonLoadingStates() {
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', () => {
            const btn = form.querySelector('button[type="submit"]');
            if (!btn || btn.classList.contains('btn-secondary') || btn.classList.contains('btn-ghost')) return;
            btn.disabled = true; btn.style.opacity = '0.7';
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="animation:spin 0.8s linear infinite;flex-shrink:0"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>Processing…`;
        });
    });
}

/* ============================================================
   TOOLTIPS
   ============================================================ */
function initTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        el.addEventListener('mouseenter', function () {
            const tip = document.createElement('div');
            tip.className = 'mc-tooltip';
            tip.textContent = this.getAttribute('data-tooltip');
            document.body.appendChild(tip);
            const rect = this.getBoundingClientRect();
            tip.style.top  = (rect.top + window.scrollY - tip.offsetHeight - 10) + 'px';
            tip.style.left = (rect.left + rect.width/2 - tip.offsetWidth/2) + 'px';
            requestAnimationFrame(() => tip.classList.add('mc-tooltip--in'));
            this.addEventListener('mouseleave', () => { tip.classList.remove('mc-tooltip--in'); setTimeout(() => tip.remove(), 200); }, { once: true });
        });
    });
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { const b = document.querySelector('.btn-back,.btn-back-form,.btn-back-header'); if (b) b.click(); }
        if ((e.ctrlKey||e.metaKey) && e.key === 'Enter') { const f = document.activeElement?.closest('form'); if (f) f.requestSubmit(); }
    });
}

/* ============================================================
   CARD TILT
   ============================================================ */
function initCardTilt() {
    document.querySelectorAll('.dashboard-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const dx = (e.clientX - rect.left - rect.width/2)  / rect.width;
            const dy = (e.clientY - rect.top  - rect.height/2) / rect.height;
            card.style.transform = `translateY(-8px) rotateX(${-dy*7}deg) rotateY(${dx*7}deg)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transition = 'transform 0.5s cubic-bezier(0.4,0,0.2,1)';
            card.style.transform = '';
            setTimeout(() => card.style.transition = '', 500);
        });
    });
}

/* ============================================================
   FLOATING BUTTONS
   ============================================================ */
function initFloatingButtons() {
    document.querySelectorAll('.fab').forEach(fab => {
        if (fab.parentElement.classList.contains('fab-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'fab-wrapper';
        fab.parentNode.insertBefore(wrapper, fab);
        wrapper.appendChild(fab);
        const label = fab.getAttribute('data-fab-label');
        if (label) { const lbl = document.createElement('div'); lbl.className = 'fab-label'; lbl.textContent = label; wrapper.appendChild(lbl); }
    });
    const logout = document.querySelector('.logout-float');
    if (logout) {
        logout.style.opacity = '0'; logout.style.transform = 'translateY(16px)';
        logout.style.transition = 'opacity 0.5s 0.6s ease, transform 0.5s 0.6s ease';
        requestAnimationFrame(() => { logout.style.opacity = '1'; logout.style.transform = 'translateY(0)'; });
    }
}

/* ============================================================
   RIPPLE
   ============================================================ */
document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const ripple = document.createElement('span');
    ripple.className = 'mc-ripple';
    const rect = btn.getBoundingClientRect(), size = Math.max(rect.width, rect.height) * 1.5;
    ripple.style.cssText = `width:${size}px;height:${size}px;top:${e.clientY-rect.top-size/2}px;left:${e.clientX-rect.left-size/2}px;`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
});

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function showNotification(message, type = 'info') {
    const icons = {
        success:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        warning:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };
    const colors = { success:'#41ff8c', error:'#ff2200', warning:'#ffab00', info:'#ff6b1a' };
    const n = document.createElement('div');
    n.className = `mc-notification mc-notification--${type}`;
    n.style.setProperty('--acc', colors[type]||colors.info);
    n.innerHTML = `<span class="mc-notif-icon" style="color:${colors[type]||colors.info}">${icons[type]||icons.info}</span><span class="mc-notif-msg">${message}</span><button class="mc-notif-close" aria-label="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
    document.body.appendChild(n);
    n.querySelector('.mc-notif-close').addEventListener('click', () => dismiss(n));
    requestAnimationFrame(() => n.classList.add('mc-notification--in'));
    const timer = setTimeout(() => dismiss(n), 4000);
    function dismiss(el) { clearTimeout(timer); el.classList.remove('mc-notification--in'); setTimeout(() => el.remove(), 350); }
}
window.showNotification = showNotification;

/* ============================================================
   INJECTED STYLES
   ============================================================ */
function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
        @keyframes spin { to { transform:rotate(360deg); } }

        #lava-canvas { position:fixed; inset:0; width:100%; height:100%; z-index:0; pointer-events:none; }

        .mc-ripple { position:absolute; border-radius:50%; background:rgba(255,150,50,0.2); transform:scale(0); animation:mc-ripple-anim 0.6s linear; pointer-events:none; }
        @keyframes mc-ripple-anim { to { transform:scale(1); opacity:0; } }

        .mc-tooltip { position:absolute; background:rgba(10,5,0,0.95); backdrop-filter:blur(12px); border:1px solid rgba(255,107,26,0.3); color:#fff0e0; padding:0.4rem 0.75rem; border-radius:0.5rem; font-family:'Unbounded',sans-serif; font-size:0.62rem; letter-spacing:0.5px; white-space:nowrap; pointer-events:none; z-index:9999; opacity:0; transform:translateY(4px); transition:opacity 0.2s, transform 0.2s; box-shadow:0 4px 16px rgba(0,0,0,0.5),0 0 8px rgba(255,107,26,0.15); }
        .mc-tooltip--in { opacity:1; transform:translateY(0); }

        .mc-notification { position:fixed; bottom:2rem; right:2rem; background:rgba(10,5,0,0.94); backdrop-filter:saturate(180%) blur(20px); border:1px solid rgba(255,255,255,0.06); border-left:3px solid var(--acc,#ff6b1a); border-radius:0.75rem; padding:0.9rem 1rem; display:flex; align-items:center; gap:0.75rem; z-index:99999; max-width:380px; min-width:260px; box-shadow:0 8px 32px rgba(0,0,0,0.6),0 0 20px rgba(255,107,26,0.06); transform:translateX(120%); opacity:0; transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease; font-family:'Manrope',sans-serif; }
        .mc-notification--in { transform:translateX(0); opacity:1; }
        .mc-notif-icon { flex-shrink:0; display:flex; }
        .mc-notif-msg  { flex:1; font-size:0.875rem; color:#fff0e0; line-height:1.4; }
        .mc-notif-close { background:none; border:none; cursor:pointer; color:rgba(255,240,224,0.3); padding:0; display:flex; transition:color 0.15s; flex-shrink:0; }
        .mc-notif-close:hover { color:rgba(255,240,224,0.7); }
    `;
    document.head.appendChild(s);
}
