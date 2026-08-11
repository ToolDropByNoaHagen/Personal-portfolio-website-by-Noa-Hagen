/* ========================================================================
   # CONFIG -- de belangrijkste instellingen, allemaal op een plek
   Verander hier waarden en sla op; de rest hoef je niet aan te raken.
   Verander steeds EEN regel tegelijk, dan zie je wat elke waarde doet.
   ========================================================================= */
const CONFIG = {
  // --- Je 3D-model ---
  // Zet je bestand in de map "Assets/" en zet hier het pad.
  // Laat op null staan om een simpele placeholder-vorm te tonen.
  modelPath: "Assets/hp_victus_gaming_laptop.glb",

  // Kleur van de placeholder-vorm (alleen zichtbaar als modelPath = null)
  shapeColor: 0x3ddc97,

  /* === DE 3 REGELBARE DINGEN === */

  // 1) ROTATIESNELHEID -- hoe snel het object vanzelf draait. 0 = stil.
  autoRotateSpeed: 0.003,

  // 2) MUISREACTIE -- hoe sterk het object je muis volgt. 0 = uit.
  mouseInfluence: 0.5,

  // 3) SCROLL-KOPPELING -- meedraaien tijdens scrollen. 0 = uit.
  scrollInfluence: 0.8,

  // --- Klik-en-sleep 360 graden ---
  dragToRotate: true,
  dragSensitivity: 0.005,

  /* === GROOTTE & UITERLIJK VAN HET MODEL === */

  // GROOTTE: 0.8 = 80% van het kader. Kleiner: 0.5. Groter: 1.2.
  modelFill: 0.8,

  // KLEUR van het object.
  //   bijna-zwart (aanrader): 0x2a2a2e
  //   puur zwart: 0x000000 | wit: 0xffffff | groen: 0x3ddc97
  //   originele kleuren van het model behouden: null
  forceColor: 0x2a2a2e,

  // GLANS: metalness 0 = mat, 1 = spiegelend. roughness laag = glanzend.
  metalness: 0.1,
  roughness: 0.85,

  // RANDLICHT: zachte gloed rond de vorm zodat hij niet wegvalt.
  //   NIET op zwart (0x000000) zetten -- dat = GEEN gloed.
  //   Uit: null. Wit: 0xffffff. Grijs (aanrader): 0x555555.
  outlineColor: 0x555555,
  outlineStrength: 0.35,
};


/* ========================================================================
   # 3D OBJECT (Three.js)
   ========================================================================= */
(function init3D() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0.5, 7);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // --- Licht ---
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  // Zacht licht van onderaf, zodat donkere modellen niet wegvallen
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(0, -3, 4);
  scene.add(fill);

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(5, 6, 5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x88aaff, 0.8);
  rim.position.set(-6, 2, -4);
  scene.add(rim);

  // Alles draait om deze groep (pivot), zodat het model netjes centreert
  const pivot = new THREE.Group();
  scene.add(pivot);
  let car = null;

  // --- Placeholder-vorm (als er geen model is) ---
  function makePlaceholder() {
    const geo = new THREE.IcosahedronGeometry(2, 0);
    const mat = new THREE.MeshStandardMaterial({ color: CONFIG.shapeColor, wireframe: true });
    car = new THREE.Mesh(geo, mat);
    pivot.add(car);
  }

  // --- Eigen model laden (.glb / .gltf) ---
  function loadModel(path) {
    const loader = new THREE.GLTFLoader();
    loader.load(
      path,
      (gltf) => {
        car = gltf.scene;

        // Materialen aanpassen: elk onderdeel krijgt een gloednieuw,
        // gegarandeerd MASSIEF materiaal. Zo negeren we elk glas-/
        // transparant-materiaal dat het .glb-bestand zelf meelevert.
        car.traverse((child) => {
          if (!child.isMesh) return;

          const oud = child.material;

          const nieuw = new THREE.MeshStandardMaterial({
            color: (CONFIG.forceColor !== null)
              ? new THREE.Color(CONFIG.forceColor)
              : (oud && oud.color ? oud.color.clone() : new THREE.Color(0xffffff)),
            metalness: CONFIG.metalness,
            roughness: CONFIG.roughness,
            map: (oud && oud.map) ? oud.map : null,   // behoud textuur als die er is
            transparent: false,                        // ALTIJD massief
            opacity: 1,
            depthWrite: true,
            side: THREE.DoubleSide,                    // geen "gaten" bij draaien
          });

          if (CONFIG.outlineColor !== null) {
            nieuw.emissive = new THREE.Color(CONFIG.outlineColor);
            nieuw.emissiveIntensity = CONFIG.outlineStrength;
          }

          child.material = nieuw;
        });

        // Automatisch centreren en op maat schalen
        const box = new THREE.Box3().setFromObject(car);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        car.position.sub(center);
        const grootste = Math.max(size.x, size.y, size.z);
        const schaal = (2.5 / grootste) * CONFIG.modelFill;
        car.scale.setScalar(schaal);

        pivot.add(car);
      },
      undefined,
      (err) => {
        console.warn('3D-model niet gevonden, gebruik placeholder:', err);
        makePlaceholder();
      }
    );
  }

  if (CONFIG.modelPath) loadModel(CONFIG.modelPath);
  else makePlaceholder();

  // --- Muis-parallax ---
  const mouse = { x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // --- Scroll-koppeling ---
  let scrollRot = 0;
  window.addEventListener('scroll', () => {
    const max = document.body.scrollHeight - window.innerHeight;
    scrollRot = (max > 0 ? window.scrollY / max : 0) * CONFIG.scrollInfluence;
  });

  // --- Klik-en-sleep 360 graden ---
  let dragging = false, lastX = 0, lastY = 0, dragX = 0, dragY = 0;
  if (CONFIG.dragToRotate) {
    canvas.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      dragX += (e.clientX - lastX) * CONFIG.dragSensitivity;
      dragY += (e.clientY - lastY) * CONFIG.dragSensitivity;
      lastX = e.clientX; lastY = e.clientY;
    });

    canvas.addEventListener('touchstart', (e) => {
      dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchend', () => { dragging = false; });
    window.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      dragX += (e.touches[0].clientX - lastX) * CONFIG.dragSensitivity;
      dragY += (e.touches[0].clientY - lastY) * CONFIG.dragSensitivity;
      lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    }, { passive: true });
  }

  // --- Animatie-loop ---
  let autoSpin = 0;
  function animate() {
    requestAnimationFrame(animate);
    autoSpin += CONFIG.autoRotateSpeed;

    pivot.rotation.y = autoSpin + (mouse.x * CONFIG.mouseInfluence) + scrollRot + dragX;
    pivot.rotation.x = (mouse.y * CONFIG.mouseInfluence * 0.5) + dragY;

    renderer.render(scene, camera);
  }
  animate();

  // --- Meeschalen met venstergrootte ---
  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  });
})();


/* ========================================================================
   # MOBIEL MENU (hamburger)
   ========================================================================= */
(function initMenu() {
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('navMobile');
  if (!burger || !menu) return;
  burger.addEventListener('click', () => menu.classList.toggle('is-open'));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menu.classList.remove('is-open')));
})();


/* ========================================================================
   # SCROLL-REVEAL ANIMATIES
   ========================================================================= */
(function initReveal() {
  const items = document.querySelectorAll('.reveal-up');
  if (!items.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      } else {
        entry.target.classList.remove('is-visible');
      }
    });
  }, { threshold: 0.15 });
  items.forEach((item, i) => {
    item.style.transitionDelay = `${(i % 4) * 0.08}s`;
    obs.observe(item);
  });
})();

/* ========================================================================
   # UITGAANDE PAGINA-TRANSITIE
   Klik op een link met class "js-transition" -> wit vlak veegt in beeld,
   daarna gaat de browser naar de nieuwe pagina.
   ========================================================================= */
(function initPageTransition() {
  const veil = document.getElementById('pageTransition');
  const links = document.querySelectorAll('a.js-transition');
  if (!veil || !links.length || typeof gsap === 'undefined') return;

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const url = link.getAttribute('href');
      if (!url) return;
      e.preventDefault();
      gsap.to(veil, {
        xPercent: -100,
        duration: 0.6,
        ease: 'power3.inOut',
        onComplete: () => { window.location.href = url; },
      });
    });
  });
})();

/* ========================================================================
   # HERO ACHTERGROND PARALLAX
   Achtergrondfoto beweegt licht mee tijdens het scrollen door de hero.
   ========================================================================= */
(function initHeroParallax() {
  const hero = document.querySelector('.hero');
  if (!hero || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  gsap.to(hero, {
    backgroundPosition: "center 30%",
    ease: "none",
    scrollTrigger: {
      trigger: hero,
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });
})();