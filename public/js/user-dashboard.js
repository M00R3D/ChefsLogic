(function(){
  function el(sel, ctx){ return (ctx||document).querySelector(sel); }
  function findCardByTitle(title){
    const cards = Array.from(document.querySelectorAll('.dashboard-summary-grid .dashboard-small-card'));
    return cards.find(c => {
      const h = c.querySelector('h3');
      return h && String(h.textContent || '').trim().toLowerCase().indexOf(title.toLowerCase()) !== -1;
    }) || null;
  }

  async function fetchUserDashboard(range){
    const url = `/mi-dashboard?range=${encodeURIComponent(range||'7')}`;
    try{
      const res = await fetch(url, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
      if (!res.ok) throw new Error('No fue posible obtener datos');
      return await res.json();
    }catch(e){ console.warn('user-dashboard fetch failed', e); return null; }
  }

  function rangeLabelForKey(k){ return (k === 'today' ? 'hoy' : (k === '7' ? '7d' : (k === '30' ? '30d' : 'año'))); }

  function updateMyRecipesCard(data, rangeKey){
    if (!data) return;
    const card = findCardByTitle('Mis recetas');
    if (!card) return;

    const big = card.querySelector('.big-number');
    if (big) {
      const val = (typeof data.newMyRecipesInRange !== 'undefined') ? data.newMyRecipesInRange : (data.totalMyRecipes || 0);
      big.textContent = String(val);
    }

    // Ensure metric-top badge exists (similar to admin dashboard)
    let top = card.querySelector('.metric-top');
    if (!top) {
      top = document.createElement('div');
      top.className = 'metric-top';
      const icon = document.createElement('span'); icon.className = 'metric-icon'; icon.textContent = '👨‍🍳';
      const badge = document.createElement('span'); badge.className = 'metric-badge'; badge.textContent = `+${data.newMyRecipesInRange || 0} ${rangeLabelForKey(rangeKey)}`;
      top.appendChild(icon); top.appendChild(badge);
      card.insertBefore(top, card.firstChild);
    } else {
      const badge = top.querySelector('.metric-badge');
      if (badge) badge.textContent = `+${data.newMyRecipesInRange || 0} ${rangeLabelForKey(rangeKey)}`;
    }
    // Update other summary cards: Visitas totales, Likes recibidos, Guardados, Likes <range>
    try {
      const visitas = findCardByTitle('Visitas totales');
      if (visitas) {
        const v = visitas.querySelector('.big-number');
        if (v) v.textContent = String((data.eventSummary && typeof data.eventSummary.ver_receta !== 'undefined') ? data.eventSummary.ver_receta : (data.eventSummary ? (data.eventSummary.ver_receta||0) : 0));
        // ensure badge exists and update
        let top = visitas.querySelector('.metric-top');
        if (!top) {
          top = document.createElement('div'); top.className = 'metric-top';
          const icon = document.createElement('span'); icon.className = 'metric-icon'; icon.textContent = '👁️';
          const badge = document.createElement('span'); badge.className = 'metric-badge'; badge.textContent = `+${data.eventSummary && data.eventSummary.ver_receta ? data.eventSummary.ver_receta : 0} ${rangeLabelForKey(rangeKey)}`;
          top.appendChild(icon); top.appendChild(badge); visitas.insertBefore(top, visitas.firstChild);
        } else {
          const badge = top.querySelector('.metric-badge'); if (badge) badge.textContent = `+${data.eventSummary && data.eventSummary.ver_receta ? data.eventSummary.ver_receta : 0} ${rangeLabelForKey(rangeKey)}`;
        }
      }

      const likesCard = Array.from(document.querySelectorAll('.dashboard-summary-grid .dashboard-small-card')).find(c => {
        const h = c.querySelector('h3'); if (!h) return false; const txt = (h.textContent||'').trim(); return /^likes/i.test(txt) && !/recetas/i.test(txt);
      }) || findCardByTitle('Likes recibidos');
      if (likesCard) {
        const l = likesCard.querySelector('.big-number');
        const val = (data.eventSummary && typeof data.eventSummary.like !== 'undefined') ? data.eventSummary.like : (data.totalLikes || 0);
        if (l) l.textContent = String(val);
        let top = likesCard.querySelector('.metric-top');
        if (!top) {
          top = document.createElement('div'); top.className = 'metric-top';
          const icon = document.createElement('span'); icon.className = 'metric-icon'; icon.textContent = '❤';
          const badge = document.createElement('span'); badge.className = 'metric-badge'; badge.textContent = `+${data.eventSummary && data.eventSummary.like ? data.eventSummary.like : 0} ${rangeLabelForKey(rangeKey)}`;
          top.appendChild(icon); top.appendChild(badge); likesCard.insertBefore(top, likesCard.firstChild);
        } else {
          const badge = top.querySelector('.metric-badge'); if (badge) badge.textContent = `+${data.eventSummary && data.eventSummary.like ? data.eventSummary.like : 0} ${rangeLabelForKey(rangeKey)}`;
        }
      }

      const guardados = findCardByTitle('Guardados');
      if (guardados) {
        const g = guardados.querySelector('.big-number');
        if (g) g.textContent = String((data.eventSummary && typeof data.eventSummary.guardar_receta !== 'undefined') ? data.eventSummary.guardar_receta : 0);
        let top = guardados.querySelector('.metric-top');
        if (!top) {
          top = document.createElement('div'); top.className = 'metric-top';
          const icon = document.createElement('span'); icon.className = 'metric-icon'; icon.textContent = '🔖';
          const badge = document.createElement('span'); badge.className = 'metric-badge'; badge.textContent = `+${data.eventSummary && data.eventSummary.guardar_receta ? data.eventSummary.guardar_receta : 0} ${rangeLabelForKey(rangeKey)}`;
          top.appendChild(icon); top.appendChild(badge); guardados.insertBefore(top, guardados.firstChild);
        } else {
          const badge = top.querySelector('.metric-badge'); if (badge) badge.textContent = `+${data.eventSummary && data.eventSummary.guardar_receta ? data.eventSummary.guardar_receta : 0} ${rangeLabelForKey(rangeKey)}`;
        }
      }

      // The 'Likes <range>' card title includes the range; update any card whose h3 starts with 'Likes '
      const likesRangeCard = Array.from(document.querySelectorAll('.dashboard-summary-grid .dashboard-small-card')).find(c => {
        const h = c.querySelector('h3'); return h && (h.textContent||'').trim().toLowerCase().startsWith('likes ');
      });
      if (likesRangeCard) {
        const lr = likesRangeCard.querySelector('.big-number');
        if (lr) lr.textContent = String((data.eventSummary && typeof data.eventSummary.like !== 'undefined') ? data.eventSummary.like : 0);
      }
    } catch (e) { /* ignore UI update errors */ }
  }

  async function refresh(rangeKey){
    const data = await fetchUserDashboard(rangeKey) || window.__UD_INIT || {};
    updateMyRecipesCard(data, rangeKey || '7');
  }

  document.addEventListener('DOMContentLoaded', function(){
    const currentRange = new URLSearchParams(window.location.search).get('range') || '7';
    // intercept pill clicks to update in-place
    const pills = document.querySelectorAll('.filter-pills .pill');
    pills.forEach(p => p.addEventListener('click', function(ev){
      ev.preventDefault();
      const href = p.getAttribute('href') || '';
      const params = new URLSearchParams(href.split('?')[1] || '');
      const r = params.get('range') || currentRange;
      // update active class
      pills.forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      history.pushState(null, '', `?range=${encodeURIComponent(r)}`);
      refresh(r);
    }));

    // initial refresh
    refresh(currentRange);
    // support browser navigation
    window.addEventListener('popstate', function(){ refresh(new URLSearchParams(window.location.search).get('range') || '7'); });
  });
})();
