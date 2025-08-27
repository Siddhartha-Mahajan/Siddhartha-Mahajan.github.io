/* Put in assets/js/main.js
   Interactions: nav toggle, copy email, research modal, projects filter, logo carousel arrows
*/
(function(){
  'use strict';

  // NAV toggle (mobile)
  const navToggle = document.getElementById('navToggle');
  const navList = document.getElementById('navList');
  if(navToggle && navList){
    navToggle.addEventListener('click', () => {
      const open = navList.classList.toggle('show');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    // close on link click (mobile)
    navList.addEventListener('click', (e) => {
      if(e.target.tagName === 'A' && window.innerWidth < 960){
        navList.classList.remove('show'); navToggle.setAttribute('aria-expanded','false');
      }
    });
  }

  // COPY EMAIL
  const copyBtn = document.getElementById('copyEmail');
  if(copyBtn){
    copyBtn.addEventListener('click', async () => {
      const email = 'siddharthamahajan03@gmail.com';
      try {
        await navigator.clipboard.writeText(email);
        copyBtn.textContent = 'Copied ✓';
      } catch(e){
        const ta = document.createElement('textarea');
        ta.value = email; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        copyBtn.textContent = 'Copied ✓';
      }
      setTimeout(()=> copyBtn.textContent = 'Copy email', 1800);
    });
  }

  // SET YEAR
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  /* -----------------------
     Research detail modal
     ----------------------- */
  const researchModal = document.getElementById('researchModal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const modalVenue = document.getElementById('modalVenue');
  const modalSummary = document.getElementById('modalSummary');
  const modalMethods = document.getElementById('modalMethods');
  const modalLinks = document.getElementById('modalLinks');

  function openResearchModal(details){
    modalTitle.textContent = details.title || '';
    modalVenue.textContent = (details.venue ? details.venue + ' · ' : '') + (details.date || '');
    modalSummary.textContent = details.summary || '';
    modalMethods.innerHTML = '';
    (details.methods || []).forEach(m => {
      const li = document.createElement('li'); li.textContent = m; modalMethods.appendChild(li);
    });
    modalLinks.innerHTML = '';
    if(details.doi){
      const a = document.createElement('a'); a.href = details.doi; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'View DOI'; a.className = 'btn small ghost';
      modalLinks.appendChild(a);
    }
    if(details.link){
      const a = document.createElement('a'); a.href = details.link; a.target = '_blank'; a.rel='noopener'; a.textContent='Link'; a.className='btn small ghost'; modalLinks.appendChild(a);
    }

    researchModal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    // trap focus (very small)
    modalClose.focus();
  }
  function closeResearchModal(){
    researchModal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.research-card .view-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.research-card');
      const raw = card.getAttribute('data-details');
      let details = {};
      try { details = JSON.parse(raw); } catch (err) { details.summary = card.querySelector('.rc-summary').textContent; details.title = card.querySelector('.rc-head h3').textContent; }
      openResearchModal(details);
    });
  });

  if(modalClose){
    modalClose.addEventListener('click', closeResearchModal);
  }
  // close modal on overlay click
  if(researchModal){
    researchModal.addEventListener('click', (e) => {
      if(e.target === researchModal) closeResearchModal();
    });
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape' && researchModal.getAttribute('aria-hidden') === 'false') closeResearchModal();
    });
  }

  /* -----------------------
     Projects filter & modals (project details)
     ----------------------- */
  const projFilter = document.getElementById('projFilter');
  const projectsList = document.getElementById('projectsList');
  if(projFilter && projectsList){
    projFilter.addEventListener('change', () => {
      const val = projFilter.value;
      document.querySelectorAll('#projectsList .project').forEach(p => {
        const k = p.dataset.kind || 'all';
        p.style.display = (val === 'all' || val === k) ? '' : 'none';
      });
    });
  }

  // project detail modal (reuse researchModal for simplicity)
  document.querySelectorAll('.modal-open').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const data = e.currentTarget.getAttribute('data-proj');
      let obj = {};
      try { obj = JSON.parse(data); } catch(err){}
      const details = {
        title: obj.title || 'Project',
        venue: '',
        date: '',
        summary: obj.desc || '',
        methods: [],
        link: obj.link || ''
      };
      openResearchModal(details);
    });
  });

  /* -----------------------
     Associations logo carousel arrows
     ----------------------- */
  const track = document.getElementById('logoTrack');
  const prev = document.querySelector('.logo-nav.prev');
  const next = document.querySelector('.logo-nav.next');

  if(track && prev && next){
    const scrollAmount = 320;
    prev.addEventListener('click', () => track.scrollBy({ left: -scrollAmount, behavior: 'smooth'}));
    next.addEventListener('click', () => track.scrollBy({ left: scrollAmount, behavior: 'smooth'}));

    // keyboard arrows when focus on track
    track.addEventListener('keydown', (e) => {
      if(e.key === 'ArrowLeft') { track.scrollBy({left: -160, behavior:'smooth'}); }
      if(e.key === 'ArrowRight'){ track.scrollBy({left: 160, behavior:'smooth'}); }
    });
  }

  /* -----------------------
     Small accessibility + progressive enhancement
     ----------------------- */
  // If no JS, links still work; JS adds modal & interactions.
})();
