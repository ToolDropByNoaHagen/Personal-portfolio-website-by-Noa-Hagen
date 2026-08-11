/* ========================================================================
   # ARCHIVE-PAGINA -- horizontale galerij + open-detail (foto naar links)
   Bevat: (1) zachte inkomende transitie, (2) horizontaal glijden,
   (3) klik op een boek -> foto slidet naar links, rechts faden uitleg +
   optionele link in zodra de foto op zijn plek staat.
   ========================================================================= */


/* ------------------------------------------------------------------------
   # 1. INKOMENDE TRANSITIE (zacht uitfaden)
   ------------------------------------------------------------------------ */
(function playIntroTransition() {
  const veil = document.getElementById('pageTransition');
  if (!veil || typeof gsap === 'undefined') return;
  gsap.set(veil, { opacity: 1 });
  gsap.to(veil, {
    opacity: 0, duration: 1.1, ease: 'power2.out', delay: 0.15,
    onComplete: () => { veil.style.display = 'none'; },
  });
})();

/* ------------------------------------------------------------------------
   # 2. HORIZONTAAL GLIJDEN (los / "zwevend")
   Werkt alleen als er GEEN project geopend is (anders staat de galerij stil).
   ------------------------------------------------------------------------ */
let horizontalST = null;
(function initHorizontalGallery() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const viewport = document.querySelector('.archive-viewport');
  const grid = document.querySelector('.archive-grid');
  if (!viewport || !grid) return;
  if (window.matchMedia('(max-width: 820px)').matches) return;

  const SMOOTHNESS = 2;
  const amount = () => grid.scrollWidth - window.innerWidth;

  const tween = gsap.to(grid, {
    x: () => -amount(),
    ease: 'none',
    scrollTrigger: {
      trigger: viewport,
      start: 'top top',
      end: () => '+=' + amount(),
      pin: true,
      scrub: SMOOTHNESS,
      invalidateOnRefresh: true,
    },
  });
  horizontalST = tween.scrollTrigger;
})();

/* ------------------------------------------------------------------------
   # 3. OPEN-DETAIL -- foto naar links, uitleg rechts
   ------------------------------------------------------------------------ */
(function initOpenDetail() {
  const items = document.querySelectorAll('.archive-item');
  const overlay = document.getElementById('detailOverlay');
  if (!items.length || !overlay) return;

  const coverEl = document.getElementById('detailCover');
  const titleEl = document.getElementById('detailTitle');
  const bodyEl  = document.getElementById('detailBody');
  const linkEl  = document.getElementById('detailLink');
  const closeEl = document.getElementById('detailClose');

  let isOpen = false;

  function openDetail(item) {
    if (isOpen) return;
    isOpen = true;

    // Data uit het JSON-blok in het boek lezen
    let data = {};
    const dataTag = item.querySelector('.archive-detail');
    try { data = JSON.parse(dataTag.textContent); } catch (e) { data = {}; }

    // Foto overnemen
    const img = item.querySelector('.archive-thumb img');
    coverEl.innerHTML = '';
    if (img) {
      const clone = document.createElement('img');
      clone.src = img.src; clone.alt = img.alt || '';
      coverEl.appendChild(clone);
    }

    // Tekst vullen
    titleEl.textContent = data.title || item.dataset.name || '';
    bodyEl.textContent = data.body || '';

    // Optionele link (leeg = geen knop)
    if (data.link && data.link.trim() !== '') {
      linkEl.href = data.link;
      linkEl.textContent = (data.linkText || 'Bekijk de website') + ' \u2192';
      linkEl.hidden = false;
    } else {
      linkEl.hidden = true;
    }

    // Overlay tonen
    overlay.style.display = 'block';
    document.body.classList.add('detail-open');

    if (typeof gsap !== 'undefined') {
      // Foto slidet van midden naar links
      gsap.fromTo('.detail-cover',
        { xPercent: 60, opacity: 0 },
        { xPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
          onComplete: () => {
            // Zodra de foto op zijn plek staat: tekst rechts infaden
            gsap.to('.detail-info', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
          }
        }
      );
    } else {
      document.querySelector('.detail-info').style.opacity = 1;
    }
  }

  function closeDetail() {
    if (!isOpen) return;
    isOpen = false;
    document.body.classList.remove('detail-open');

    if (typeof gsap !== 'undefined') {
      gsap.set('.detail-info', { opacity: 0, y: 20 });
      gsap.to('.detail-cover', {
        opacity: 0, duration: 0.35, ease: 'power2.in',
        onComplete: () => { overlay.style.display = 'none'; }
      });
    } else {
      overlay.style.display = 'none';
    }
  }

  items.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      openDetail(item);
    });
  });

  closeEl.addEventListener('click', closeDetail);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDetail(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });
})();