// 3D "code tunnel" background.
// Syntax-coloured tokens from the languages I use float through space while wireframe
// structures mark each section. Scrolling flies the camera forward through the tunnel and
// shifts the palette per section. A CSS overlay (.bg-overlay) keeps the page content readable.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('bg-canvas');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const small = window.innerWidth < 760;

const BG_COLOR = 0x05070d;
const START_Z = 12;
const PATH_LENGTH = 110;
const TOKEN_COUNT = small ? 110 : 220;
const PARTICLE_COUNT = small ? 600 : 1400;

const TOKENS = {
    keyword: ['const', 'async', 'await', 'export', 'import', 'return', 'interface', 'class', '#include', 'def', 'final', 'satisfies', 'typeof', 'struct', 'enum', 'void'],
    type: ['<T>', 'Promise<void>', 'std::vector', 'Widget', 'QString', 'Prisma', 'React.FC', 'string[]', 'useState()', 'useEffect', 'Record<K, V>', 'NextRequest'],
    punct: ['=>', '{ }', '</>', '::', '&&', '[ ]', '( )', '===', '?.', '??', '->', '/* */', ';'],
    literal: ['"use client"', 'true', 'null', '0x1F', '200 OK', 'SELECT *', 'git push', 'npm run dev', 'pnpm build', '42', 'prisma migrate', 'cmake --build']
};
const CATEGORIES = Object.keys(TOKENS);

// One palette per page section: keyword, type, punct, literal, structure.
const PALETTES = [
    ['#c084fc', '#22d3ee', '#64748b', '#86efac', '#22d3ee'], // hero
    ['#a78bfa', '#818cf8', '#64748b', '#f0abfc', '#a78bfa'], // about
    ['#60a5fa', '#38bdf8', '#64748b', '#93c5fd', '#3b82f6'], // github
    ['#34d399', '#2dd4bf', '#64748b', '#bef264', '#34d399'], // stack
    ['#fbbf24', '#fb923c', '#64748b', '#fde68a', '#f59e0b'], // work
    ['#f472b6', '#22d3ee', '#64748b', '#c4b5fd', '#ec4899']  // contact
].map(p => p.map(c => new THREE.Color(c)));

function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const load = document.fonts.load('500 48px "JetBrains Mono"').catch(() => {});
    const timeout = new Promise(resolve => setTimeout(resolve, 1500));
    return Promise.race([load, timeout]);
}

const textureCache = new Map();

function tokenTexture(text) {
    if (textureCache.has(text)) return textureCache.get(text);

    const fontSize = 48;
    const font = `500 ${fontSize}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = font;
    const pad = 12;
    c.width = Math.ceil(ctx.measureText(text).width) + pad * 2;
    c.height = fontSize + pad * 2;

    // Resizing the canvas resets the context state.
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, pad, c.height / 2 + 2);

    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    const entry = { texture, aspect: c.width / c.height };
    textureCache.set(text, entry);
    return entry;
}

function rand(min, max) { return min + Math.random() * (max - min); }

function smoothstep(t) { return t * t * (3 - 2 * t); }

function buildStructure(kind) {
    let geometry;
    switch (kind) {
        case 0: geometry = new THREE.IcosahedronGeometry(3, 1); break;
        case 1: geometry = new THREE.TorusKnotGeometry(2.2, 0.55, 90, 10, 2, 3); break;
        case 2: geometry = new THREE.BoxGeometry(4, 4, 4, 3, 3, 3); break;
        case 3: geometry = new THREE.OctahedronGeometry(3.2, 1); break;
        case 4: geometry = new THREE.TorusGeometry(2.8, 0.06, 6, 64); break;
        default: geometry = new THREE.DodecahedronGeometry(3, 0);
    }

    const group = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({
        transparent: true,
        opacity: kind === 1 ? 0.18 : 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const edges = kind === 1 ? new THREE.WireframeGeometry(geometry) : new THREE.EdgesGeometry(geometry, 1);
    group.add(new THREE.LineSegments(edges, lineMaterial));

    if (kind === 4) {
        // Three gimbal rings instead of one.
        const ringB = group.children[0].clone();
        ringB.rotation.x = Math.PI / 2;
        const ringC = group.children[0].clone();
        ringC.rotation.y = Math.PI / 2;
        group.add(ringB, ringC);
    } else {
        const pointMaterial = new THREE.PointsMaterial({
            size: 0.09,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        group.add(new THREE.Points(geometry, pointMaterial));
    }

    group.userData.materials = group.children.map(child => child.material);
    group.userData.spin = new THREE.Vector3(rand(0.05, 0.12), rand(0.08, 0.18), rand(0.02, 0.06));
    return group;
}

async function init() {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: 'low-power' });
    } catch (e) {
        document.documentElement.classList.add('no-webgl');
        return;
    }

    await fontsReady();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(BG_COLOR, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(BG_COLOR, 0.045);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 160);
    camera.position.set(0, 0, START_Z);

    // Floating code tokens
    const sprites = [];
    const zNear = START_Z + 4;
    const zFar = START_Z - PATH_LENGTH - 30;
    for (let i = 0; i < TOKEN_COUNT; i++) {
        const category = CATEGORIES[i % CATEGORIES.length];
        const words = TOKENS[category];
        const { texture, aspect } = tokenTexture(words[Math.floor(Math.random() * words.length)]);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            opacity: rand(0.45, 0.95)
        });
        const sprite = new THREE.Sprite(material);
        const height = rand(0.35, 0.85);
        sprite.scale.set(height * aspect, height, 1);

        // Keep a clear lane down the middle so tokens don't sit right behind the text.
        let x = rand(-16, 16);
        let y = rand(-9, 9);
        if (Math.abs(x) < 3.5 && Math.abs(y) < 2.5) x += Math.sign(x || 1) * 4;
        sprite.position.set(x, y, rand(zFar, zNear));
        sprite.userData = { category: CATEGORIES.indexOf(category), baseY: y, phase: Math.random() * Math.PI * 2, speed: rand(0.2, 0.5) };
        scene.add(sprite);
        sprites.push(sprite);
    }

    // Star-like particles
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] = rand(-30, 30);
        positions[i * 3 + 1] = rand(-18, 18);
        positions[i * 3 + 2] = rand(zFar, zNear);
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
        color: 0x94a3b8,
        size: 0.05,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
    }));
    scene.add(particles);

    // Grid floor running the length of the tunnel
    const grid = new THREE.GridHelper(220, 110, 0x1e293b, 0x111827);
    grid.position.set(0, -8, START_Z - PATH_LENGTH / 2);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grid.material.depthWrite = false;
    scene.add(grid);

    // One wireframe structure per section, spaced along the camera path
    const structures = PALETTES.map((_, i) => {
        const group = buildStructure(i);
        const side = i % 2 === 0 ? 1 : -1;
        const x = small ? side * 2.2 : side * 6.5;
        const y = small ? 2.5 : rand(-0.5, 1.5);
        group.position.set(x, y, START_Z - 14 - i * (PATH_LENGTH / (PALETTES.length - 1)) * 0.92);
        scene.add(group);
        return group;
    });

    // ----- Scroll → camera + palette -----
    const sectionEls = Array.from(document.querySelectorAll('[data-section]'));
    let sectionTops = [];
    let maxScroll = 1;

    function measure() {
        sectionTops = sectionEls.map(el => el.getBoundingClientRect().top + window.scrollY);
        maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    }

    function sectionPosition() {
        // Fractional section index, measured at the middle of the viewport.
        const y = window.scrollY + window.innerHeight * 0.5;
        for (let i = sectionTops.length - 1; i >= 0; i--) {
            if (y >= sectionTops[i]) {
                const next = sectionTops[i + 1];
                if (next === undefined) return i;
                const t = (y - sectionTops[i]) / (next - sectionTops[i]);
                // Hold a section's palette, then blend in the final 35% before the next section.
                return i + smoothstep(Math.max(0, (t - 0.65) / 0.35));
            }
        }
        return 0;
    }

    const current = { z: START_Z, section: 0, mx: 0, my: 0 };
    const target = { z: START_Z, section: 0, mx: 0, my: 0 };

    function updateTargets() {
        const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
        target.z = START_Z - progress * PATH_LENGTH;
        target.section = sectionPosition();
    }

    const colorA = new THREE.Color();
    const tmp = new THREE.Color();
    const palette = PALETTES[0].map(c => c.clone());

    function applyPalette(position) {
        const i = Math.min(PALETTES.length - 1, Math.floor(position));
        const j = Math.min(PALETTES.length - 1, i + 1);
        const t = position - i;
        for (let k = 0; k < palette.length; k++) {
            palette[k].copy(colorA.copy(PALETTES[i][k]).lerp(tmp.copy(PALETTES[j][k]), t));
        }
        for (const sprite of sprites) {
            sprite.material.color.copy(palette[sprite.userData.category]);
        }
        for (const group of structures) {
            for (const material of group.userData.materials) material.color.copy(palette[4]);
        }
        grid.material.color.copy(tmp.copy(palette[4]).multiplyScalar(0.25));
    }

    window.addEventListener('pointermove', e => {
        target.mx = (e.clientX / window.innerWidth - 0.5) * 2;
        target.my = (e.clientY / window.innerHeight - 0.5) * 2;
        requestRender();
    }, { passive: true });

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        measure();
        updateTargets();
        requestRender();
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('load', onResize);
    window.addEventListener('scroll', () => { updateTargets(); requestRender(); }, { passive: true });

    // ----- Render loop -----
    const clock = new THREE.Clock();
    let running = false;
    let frame = 0;

    function render() {
        const still = reducedMotion.matches;
        const dt = Math.min(clock.getDelta(), 0.05);
        const time = clock.elapsedTime;
        const ease = still ? 1 : 1 - Math.pow(0.0015, dt); // frame-rate independent smoothing

        current.z += (target.z - current.z) * ease;
        current.section += (target.section - current.section) * ease;
        current.mx += (target.mx - current.mx) * ease * 0.6;
        current.my += (target.my - current.my) * ease * 0.6;

        camera.position.set(current.mx * 0.9, -current.my * 0.6, current.z);
        camera.rotation.set(-current.my * 0.03, -current.mx * 0.05, Math.sin(current.z * 0.03) * 0.04);

        if (!still) {
            for (const sprite of sprites) {
                const d = sprite.userData;
                sprite.position.y = d.baseY + Math.sin(time * d.speed + d.phase) * 0.25;
            }
            for (const group of structures) {
                const s = group.userData.spin;
                group.rotation.x += s.x * dt;
                group.rotation.y += s.y * dt;
                group.rotation.z += s.z * dt;
            }
            particles.rotation.z += dt * 0.004;
        }

        applyPalette(current.section);
        renderer.render(scene, camera);

        const settled = Math.abs(target.z - current.z) < 0.001 &&
            Math.abs(target.section - current.section) < 0.001 &&
            Math.abs(target.mx - current.mx) < 0.001 &&
            Math.abs(target.my - current.my) < 0.001;

        // With reduced motion we only draw when something changes.
        if (document.hidden || (still && settled)) {
            running = false;
            return;
        }
        frame = requestAnimationFrame(render);
    }

    function requestRender() {
        if (running) return;
        running = true;
        clock.getDelta(); // don't count idle time as one giant frame
        frame = requestAnimationFrame(render);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(frame);
            running = false;
        } else {
            requestRender();
        }
    });
    reducedMotion.addEventListener?.('change', requestRender);

    measure();
    updateTargets();
    current.z = target.z;
    current.section = target.section;
    requestRender();
}

init().catch(() => document.documentElement.classList.add('no-webgl'));
