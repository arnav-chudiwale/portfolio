/* ================================================
   main.js — Portfolio Interactivity
   ================================================ */

// Intersection Observer for fade-in animations
document.addEventListener('DOMContentLoaded', () => {
  const fadeEls = document.querySelectorAll('.fade-up');
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });
    
    fadeEls.forEach(el => observer.observe(el));
  } else {
    // Fallback: show everything immediately
    fadeEls.forEach(el => el.classList.add('visible'));
  }

  // Mobile nav toggle
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('active');
      toggle.classList.toggle('active');
    });

    // Close mobile nav on link click
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('active');
        toggle.classList.remove('active');
      });
    });
  }

  // Smooth scroll for anchor links (same page)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Nav background on scroll
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        nav.style.background = 'rgba(10, 22, 40, 0.98)';
      } else {
        nav.style.background = 'rgba(10, 22, 40, 0.92)';
      }
    }, { passive: true });
  }

  // ========================================
  // LIGHTBOX
  // ========================================
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const img = document.getElementById('lightboxImg');
    const caption = document.getElementById('lightboxCaption');
    const counter = document.getElementById('lightboxCounter');
    const closeBtn = lightbox.querySelector('.lightbox__close');
    const backdrop = lightbox.querySelector('.lightbox__backdrop');
    const prevBtn = lightbox.querySelector('.lightbox__nav--prev');
    const nextBtn = lightbox.querySelector('.lightbox__nav--next');
    const zoomInBtn = document.getElementById('lightboxZoomIn');
    const zoomOutBtn = document.getElementById('lightboxZoomOut');
    const zoomResetBtn = document.getElementById('lightboxZoomReset');

    const galleryItems = document.querySelectorAll('.project-gallery__item[data-lightbox]');
    const images = [];
    galleryItems.forEach(item => {
      const imgEl = item.querySelector('img');
      const capEl = item.querySelector('figcaption');
      images.push({
        src: imgEl.src,
        alt: imgEl.alt,
        caption: capEl ? capEl.textContent : ''
      });
    });

    let currentIndex = 0;
    let currentZoom = 1;
    let panX = 0, panY = 0;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    function showImage(index) {
      currentIndex = index;
      currentZoom = 1;
      panX = 0;
      panY = 0;
      img.style.transform = 'scale(1) translate(0px, 0px)';
      img.src = images[index].src;
      img.alt = images[index].alt;
      caption.textContent = images[index].caption;
      counter.textContent = (index + 1) + ' / ' + images.length;
    }

    function openLightbox(index) {
      showImage(index);
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }

    function navigate(direction) {
      let next = currentIndex + direction;
      if (next < 0) next = images.length - 1;
      if (next >= images.length) next = 0;
      showImage(next);
    }

    function applyTransform() {
      img.style.transform = 'scale(' + currentZoom + ') translate(' + panX + 'px, ' + panY + 'px)';
    }

    function zoom(delta) {
      currentZoom = Math.max(0.5, Math.min(5, currentZoom + delta));
      if (currentZoom <= 1) { panX = 0; panY = 0; }
      applyTransform();
    }

    // Open on click
    galleryItems.forEach((item, i) => {
      item.addEventListener('click', () => openLightbox(i));
    });

    // Close
    closeBtn.addEventListener('click', closeLightbox);
    backdrop.addEventListener('click', closeLightbox);

    // Navigation
    if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));

    // Zoom controls
    zoomInBtn.addEventListener('click', () => zoom(0.4));
    zoomOutBtn.addEventListener('click', () => zoom(-0.4));
    zoomResetBtn.addEventListener('click', () => {
      currentZoom = 1; panX = 0; panY = 0;
      applyTransform();
    });

    // Mouse wheel zoom
    lightbox.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoom(e.deltaY > 0 ? -0.2 : 0.2);
    }, { passive: false });

    // Pan (drag) when zoomed
    img.addEventListener('mousedown', (e) => {
      if (currentZoom > 1) {
        isDragging = true;
        dragStart = { x: e.clientX - panX, y: e.clientY - panY };
        img.classList.add('dragging');
        e.preventDefault();
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        panX = e.clientX - dragStart.x;
        panY = e.clientY - dragStart.y;
        applyTransform();
      }
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
      img.classList.remove('dragging');
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === '+' || e.key === '=') zoom(0.4);
      if (e.key === '-') zoom(-0.4);
      if (e.key === '0') { currentZoom = 1; panX = 0; panY = 0; applyTransform(); }
    });
  }

  // ========================================
  // PROJECT TIMELINE TRACKER
  // ========================================
  function initTimeline(scrollContainerId, trackId, cardsId) {
    const scrollContainer = document.getElementById(scrollContainerId);
    const track = document.getElementById(trackId);
    const cardsContainer = document.getElementById(cardsId);
    if (!scrollContainer || !track || !cardsContainer) return;

    const dots = track.querySelectorAll('.projects-scroll__dot');
    const cards = cardsContainer.querySelectorAll('.projects-scroll__card');
    if (!dots.length || !cards.length) return;

    // Activate first dot by default
    dots[0].classList.add('active');

    function updateTimeline() {
      const viewportCenter = window.innerHeight / 2;

      cards.forEach((card, i) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        // Card is "active" when its center is in the viewport
        const isActive = rect.top < viewportCenter + 100 && rect.bottom > viewportCenter - 100;

        if (i < dots.length) {
          if (isActive) {
            dots[i].classList.add('active');
          }
          // Keep previous dots active (trail effect)
          if (rect.bottom < viewportCenter + 100) {
            dots[i].classList.add('active');
          }
        }
      });

      // Reset dots that are below current scroll position
      let lastActive = -1;
      cards.forEach((card, i) => {
        const rect = card.getBoundingClientRect();
        if (rect.top < viewportCenter + 100) {
          lastActive = i;
        }
      });
      dots.forEach((dot, i) => {
        if (i > lastActive) {
          dot.classList.remove('active');
        } else {
          dot.classList.add('active');
        }
      });
    }

    window.addEventListener('scroll', updateTimeline, { passive: true });
    updateTimeline();
  }

  initTimeline('projectsScroll', 'projectsTrack', 'projectsCards');
  initTimeline('wipScroll', 'wipTrack', 'wipCards');
});
