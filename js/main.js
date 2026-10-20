// Page behaviour: navigation, reveal-on-scroll, GitHub stats and the contact form.
// The 3D background lives in background.js.

(function () {
    const GITHUB_USER = 'Joshypeace';

    // Bytes per language across public, non-fork repos (GitHub /languages API), October 2026.
    // Kept static because fetching every repo's languages would burn the anonymous rate limit.
    const LANGUAGES = [
        { name: 'TypeScript', bytes: 3959742, color: '#3178c6' },
        { name: 'C++', bytes: 189526, color: '#f34b7d' },
        { name: 'Dart', bytes: 143669, color: '#00b4ab' },
        { name: 'CSS', bytes: 94541, color: '#663399' },
        { name: 'HTML', bytes: 92483, color: '#e34c26' },
        { name: 'JavaScript', bytes: 36830, color: '#f1e05a' },
        { name: 'PL/pgSQL', bytes: 34648, color: '#336790' },
        { name: 'Python', bytes: 19996, color: '#3572a5' },
        { name: 'CMake', bytes: 18591, color: '#da3434' },
        { name: 'Other', bytes: 5110, color: '#64748b' } // Batchfile, C, Swift, Kotlin, Objective-C
    ];

    const LANGUAGE_COLORS = Object.fromEntries(LANGUAGES.map(l => [l.name, l.color]));

    const nav = document.getElementById('nav');
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    // ---------- Navigation ----------

    function onScroll() {
        nav.classList.toggle('scrolled', window.scrollY > 24);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const behindMenu = [document.querySelector('.skip-link'), document.getElementById('main'), document.querySelector('.footer')];

    function setMenu(open, { restoreFocus = false } = {}) {
        const wasOpen = document.body.classList.contains('menu-open');
        document.body.classList.toggle('menu-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        // Keep keyboard focus inside the overlay while it covers the page.
        behindMenu.forEach(el => { if (el) el.inert = open; });
        if (open && !wasOpen) mobileMenu.querySelector('a').focus();
        if (!open && wasOpen && restoreFocus) menuToggle.focus();
    }

    menuToggle.addEventListener('click', () => {
        const open = !document.body.classList.contains('menu-open');
        setMenu(open, { restoreFocus: !open });
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false, { restoreFocus: true });
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 960) setMenu(false); });

    // Highlight the nav link of the section currently in view.
    const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    const sections = navLinks
        .map(a => document.querySelector(a.getAttribute('href')))
        .filter(Boolean);

    if ('IntersectionObserver' in window) {
        const sectionObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const id = '#' + entry.target.id;
                navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        sections.forEach(s => sectionObserver.observe(s));
    }

    // ---------- Reveal on scroll ----------

    const reveals = document.querySelectorAll('.reveal');

    // Stagger siblings that share a parent so grids cascade in.
    reveals.forEach(el => {
        const siblings = Array.from(el.parentElement.children).filter(c => c.classList.contains('reveal'));
        const index = siblings.indexOf(el);
        if (index > 0) el.style.setProperty('--delay', Math.min(index * 0.08, 0.4) + 's');
    });

    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('in');
                revealObserver.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach(el => revealObserver.observe(el));
    } else {
        reveals.forEach(el => el.classList.add('in'));
    }

    // ---------- Language breakdown ----------

    const langBar = document.getElementById('langBar');
    const langLegend = document.getElementById('langLegend');
    const langTotal = document.getElementById('langTotal');
    const totalBytes = LANGUAGES.reduce((sum, l) => sum + l.bytes, 0);

    function formatPercent(bytes) {
        const pct = (bytes / totalBytes) * 100;
        return pct >= 10 ? pct.toFixed(1) + '%' : pct >= 0.1 ? pct.toFixed(2) + '%' : '<0.1%';
    }

    if (langBar && langLegend) {
        langBar.innerHTML = LANGUAGES.map(l =>
            `<span style="--c:${l.color};--w:${(l.bytes / totalBytes) * 100}%" title="${l.name} ${formatPercent(l.bytes)}"></span>`
        ).join('');
        langBar.setAttribute('aria-label', 'Language share: ' + LANGUAGES.map(l => `${l.name} ${formatPercent(l.bytes)}`).join(', '));

        langLegend.innerHTML = LANGUAGES.map(l =>
            `<li><span class="lang-dot" style="--c:${l.color}"></span><span class="lang-name">${l.name}</span><span class="lang-pct">${formatPercent(l.bytes)}</span></li>`
        ).join('');

        if (langTotal) langTotal.textContent = (totalBytes / 1e6).toFixed(1) + ' MB of source';

        if ('IntersectionObserver' in window) {
            const barObserver = new IntersectionObserver(entries => {
                if (entries.some(e => e.isIntersecting)) {
                    langBar.classList.add('in');
                    barObserver.disconnect();
                }
            }, { threshold: 0.4 });
            barObserver.observe(langBar);
        } else {
            langBar.classList.add('in');
        }
    }

    // ---------- Live GitHub profile ----------

    function setStat(name, value) {
        document.querySelectorAll(`[data-stat="${name}"]`).forEach(el => { el.textContent = value; });
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // Portfolio repos would only ever list themselves.
    const HIDDEN_REPOS = ['joshypeace.github.io', 'joshua-chilapondwa-portfolio'];

    function renderRecent(repos) {
        const list = document.getElementById('recentRepos');
        if (!list) return;
        const recent = repos
            .filter(r => !r.fork && !HIDDEN_REPOS.includes(r.name.toLowerCase()))
            .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
            .slice(0, 4);
        if (!recent.length) return;

        list.innerHTML = recent.map(r => {
            const lang = r.language || 'Other';
            const color = LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.Other;
            return `<li><a href="${escapeHtml(r.html_url)}" target="_blank" rel="noopener"><span class="lang-dot" style="--c:${color}"></span>${escapeHtml(r.name)}</a><span class="muted">${escapeHtml(lang)}</span></li>`;
        }).join('');
    }

    async function loadGitHub() {
        const cacheKey = 'gh-profile-v2';
        let data = null;

        try {
            const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
            if (cached && Date.now() - cached.at < 30 * 60 * 1000) data = cached;
        } catch (e) { /* storage unavailable; fetch instead */ }

        if (!data) {
            const headers = { Accept: 'application/vnd.github+json' };
            const [userRes, reposRes] = await Promise.all([
                fetch(`https://api.github.com/users/${GITHUB_USER}`, { headers }),
                fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`, { headers })
            ]);
            if (!userRes.ok || !reposRes.ok) return; // keep the static fallback values

            const user = await userRes.json();
            const repos = await reposRes.json();
            data = {
                at: Date.now(),
                user: { public_repos: user.public_repos, followers: user.followers, created_at: user.created_at },
                repos: repos.map(r => ({ name: r.name, html_url: r.html_url, language: r.language, fork: r.fork, pushed_at: r.pushed_at }))
            };
            try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) { /* ignore */ }
        }

        setStat('repos', data.user.public_repos);
        setStat('followers', data.user.followers);
        if (data.user.created_at) setStat('since', new Date(data.user.created_at).getFullYear());
        renderRecent(data.repos);
    }

    loadGitHub().catch(() => { /* offline or rate limited: static values stay in place */ });

    // ---------- Contact form ----------

    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');

    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const button = form.querySelector('button[type="submit"]');
            const label = button.innerHTML;

            button.disabled = true;
            button.innerHTML = 'Sending… <i class="fas fa-circle-notch fa-spin"></i>';
            status.className = 'form-status';
            status.textContent = '';

            try {
                const res = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { Accept: 'application/json' }
                });
                if (!res.ok) throw new Error('Request failed');
                form.reset();
                status.classList.add('success');
                status.textContent = "Thanks! Your message is on its way. I'll get back to you soon.";
            } catch (err) {
                status.classList.add('error');
                status.textContent = 'Something went wrong. Please email me directly at joshuachilapondwa2@gmail.com.';
            } finally {
                button.disabled = false;
                button.innerHTML = label;
            }
        });
    }

    // ---------- Footer ----------

    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
})();
