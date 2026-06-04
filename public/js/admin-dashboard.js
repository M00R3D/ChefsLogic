// Admin dashboard client-side enhancements: polling, alerts, charts
(function(){
  if (!window.Chart) {
    console.warn('Chart.js not loaded; some charts will not render.');
  }

  // register datalabels plugin if available
  try {
    if (window.Chart && window.ChartDataLabels && typeof Chart.register === 'function') {
      Chart.register(window.ChartDataLabels);
    }
  } catch (e) { /* ignore */ }

  const init = window.__DASHBOARD_INIT || {};

  function el(id) { return document.getElementById(id); }

  function formatDate(ts) { return new Date(ts).toLocaleString('es-ES'); }

  const _shownAlerts = new Set();
  function showNotification(message, type='info', key){
    const container = el('dashboard-notifications');
    if (!container) return;
    // dedupe by key when provided
    // if an alert with this key exists, refresh its timer and return
    if (key) {
      const existing = container.querySelector(`[data-key="${String(key)}"]`);
      if (existing) {
        // bump to top
        container.prepend(existing);
        // reset removal timer attribute
        existing.dataset._ts = Date.now();
        return;
      }
      _shownAlerts.add(key);
    }
    const item = document.createElement('div');
    item.className = 'alert ' + (type === 'error' ? 'alert-error' : (type === 'success' ? 'alert-success' : 'alert'));
    if (key) item.setAttribute('data-key', String(key));
    item.style.marginBottom = '.5rem';
    item.style.transition = 'opacity 0.6s ease, transform 0.45s ease';
    item.textContent = message;
    container.prepend(item);
    // cap number of visible alerts to prevent unbounded growth
    const MAX_ALERTS = 6;
    while (container.children.length > MAX_ALERTS) {
      const last = container.lastElementChild;
      if (!last) break;
      const k = last.getAttribute && last.getAttribute('data-key');
      try { last.remove(); if (k) _shownAlerts.delete(k); } catch(e) { break; }
    }
    // auto dismiss
    const dismiss = () => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(-6px)';
      setTimeout(()=>{ try{ item.remove(); }catch(e){} if (key) _shownAlerts.delete(key); },600);
    };
    setTimeout(dismiss, 9000);
  }

  function checkAlerts(data){
    try{
      const thresholdInput = el('alert-threshold');
      const threshold = thresholdInput ? Number(thresholdInput.value || 100) : 100;
      const top = (data && data.topRecipes) || init.topRecipes || [];
      top.forEach((r) => {
        const total = Number(r.total || 0);
        if (total > threshold) {
          // use recipe id/title as dedupe key
          const key = r._id || r.id || r.title || `${r.title}-${r.total}`;
          showNotification(`Alerta: "${r.title || r.name}" supera ${threshold} interacciones (${total}).`, 'error', key);
        }
      });
    }catch(e){ console.error(e); }
  }

  async function fetchDashboard(range){
    const url = `/admin/dashboard?range=${encodeURIComponent(range || '7')}`;
    try{
      const res = await fetch(url, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
      if (!res.ok) throw new Error('No fue posible obtener datos');
      const data = await res.json();
      return data;
    }catch(e){
      console.warn('Dashboard fetch failed, backend may not support JSON:', e.message || e);
      return null;
    }
  }

  function updateCountsFrom(data){
    if (!data) return;
    // Update users card big-number to reflect range-specific new users
    try {
      const usersCard = document.querySelector('.users-card');
      if (usersCard) {
        const usersBig = usersCard.querySelector('.big-number');
        if (usersBig) usersBig.textContent = String(typeof data.newUsersInRange !== 'undefined' ? data.newUsersInRange : (data.totalUsers || 0));
        const badge = usersCard.querySelector('.metric-badge');
        if (badge && typeof data.newUsersInRange !== 'undefined') {
          // keep badge as rendered server-side; update count inside if present
          // badge content typically includes "+N" and range label; we only update the +N
          const txt = badge.textContent || '';
          const parts = String(txt).trim().split(/\s+/);
          if (parts && parts.length) {
            // Replace first numeric token with newUsersInRange
            parts[0] = (String((data.newUsersInRange || 0) >= 0 ? `+${data.newUsersInRange}` : `+0`));
            badge.textContent = parts.join(' ');
          }
        }
      }
    } catch (e) { /* ignore UI update errors */ }
    if (typeof data.totalRecipes !== 'undefined'){
      // Update summary cards more robustly: recipes and ingredients
      const nodes = Array.from(document.querySelectorAll('.dashboard-summary-grid .dashboard-small-card'));
      // nodes[0] => Total recetas, nodes[1] => Total ingredientes
      if (nodes && nodes[0]) {
        const elNum = nodes[0].querySelector('.big-number');
        if (elNum) elNum.textContent = String(typeof data.newRecipesInRange !== 'undefined' ? data.newRecipesInRange : (data.totalRecipes || 0));
      }
      if (nodes && nodes[1]) {
        const elNum = nodes[1].querySelector('.big-number');
        if (elNum) elNum.textContent = String(typeof data.newIngredientsInRange !== 'undefined' ? data.newIngredientsInRange : (data.totalIngredients || 0));
      }
    }
    if (typeof data.avgPrepTime !== 'undefined'){
      const avg = el('avg-prep-time'); if (avg) avg.textContent = String(data.avgPrepTime) + ' min';
    }
    const last = el('dashboard-last-updated'); if (last) last.textContent = formatDate(Date.now());
  }

  function renderCategoriesChart(categories){
    if (!window.Chart) return;
    const canvas = document.getElementById('categoriesChart');
    if (!canvas) return;
    try{
      const labels = (categories || []).map(c=>c.name||c[0]);
      const vals = (categories || []).map(c=>Number(c.total||c[1]||0));
      // avoid re-rendering if data identical
      const key = JSON.stringify({labels, vals});
      if (window.__categoriesChartDataKey === key) return;
      window.__categoriesChartDataKey = key;
      // destroy existing Chart.js instance attached to this canvas
      try {
        const existing = (typeof Chart.getChart === 'function') ? Chart.getChart(canvas) : window.__categoriesChartInstance;
        if (existing && typeof existing.destroy === 'function') existing.destroy();
      } catch(e) { /* ignore */ }
      // let Chart.js manage canvas sizing (handles devicePixelRatio internally — no blur)
      canvas.style.width = '100%';
      canvas.style.height = '320px';

      // sort descending so longest bar is on top
      const combined = labels.map((l,i)=>({label:l,val:vals[i]})).sort((a,b)=>b.val-a.val);
      const sortedLabels = combined.map(c=>c.label);
      const sortedVals   = combined.map(c=>c.val);

      window.__categoriesChartInstance = new Chart(canvas, {
        type: 'bar',
        data: { labels: sortedLabels, datasets:[{ data: sortedVals, backgroundColor: sortedLabels.map((_,i)=>`hsl(${i*40 % 360} 70% 60%)`), borderRadius: 4 }] },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { right: 90 } },
          scales: {
            x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(0,0,0,0.06)' } },
            y: { ticks: { autoSkip: false, font: { size: 13 } } }
          },
          plugins:{
            legend:{ display:false },
            datalabels: {
              color: '#2c1d13',
              formatter: function(value, context) {
                try {
                  const d = context.dataset && context.dataset.data ? context.dataset.data : [];
                  const total = d.reduce((s,v)=>s+Number(v||0),0) || 1;
                  const pct = Math.round((Number(value)/total)*100);
                  return `${value} (${pct}%)`;
                } catch (e) { return String(value); }
              },
              anchor: 'end',
              align: 'end',
              offset: 4,
              clamp: false,
              clip: false,
              font: { weight: '600', size: 12 }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  try {
                    const value = Number(context.parsed.x || 0);
                    const d = context.dataset && context.dataset.data ? context.dataset.data : [];
                    const total = d.reduce((s,v)=>s+Number(v||0),0) || 1;
                    const pct = Math.round((value/total)*100);
                    return `${context.label}: ${value} recetas (${pct}%)`;
                  } catch (e) { return `${context.label}: ${context.parsed || 0} recetas`; }
                }
              }
            }
          }
        }
      });
      // legend removed — nothing to populate here
    }catch(e){ console.error('categoriesChart', e); }
  }

  async function refresh(range){
    if (refresh._running) return; // prevent overlapping refreshes
    refresh._running = true;
    try {
      const data = await fetchDashboard(range) || window.__DASHBOARD_INIT || {};
      updateCountsFrom(data);
      checkAlerts(data);
      renderCategoriesChart(data.topCategories || init.topCategories || []);
      // update lists
      try{
        const savedList = el('top-saved-recipes'); if (savedList) {
          savedList.innerHTML = '';
          (data.topSavedRecipes || init.topSavedRecipes || []).slice(0,10).forEach(i=>{ const li=document.createElement('li'); li.textContent = `${i.title||i.name} — ${i.total} guardados`; savedList.appendChild(li); });
        }
        const categoriesList = el('top-categories'); if (categoriesList){ categoriesList.innerHTML=''; (data.topCategories || init.topCategories || []).slice(0,10).forEach(i=>{ const li=document.createElement('li'); li.textContent = `${i.name} — ${i.total} recetas`; categoriesList.appendChild(li); }); }
        const cookbooksList = el('top-cookbooks'); if (cookbooksList){ cookbooksList.innerHTML=''; (data.topCookbooks || init.topCookbooks || []).slice(0,10).forEach(i=>{ const li=document.createElement('li'); const followers = i.followersCount || i.followers || i.followers_count; const recipesCount = i.recipesCount || i.recipes || i.recipes_count; if (typeof followers !== 'undefined' && followers !== null) { li.textContent = `${i.title||i.name} — ${followers} seguidores`; } else if (typeof recipesCount !== 'undefined' && recipesCount !== null) { li.textContent = `${i.title||i.name} — ${recipesCount} recetas`; } else { li.textContent = `${i.title||i.name} — ${i.total || ''}`; } cookbooksList.appendChild(li); }); }
      }catch(e){console.error(e)}
    } finally {
      refresh._running = false;
    }
  }

  // UI wiring
  document.addEventListener('DOMContentLoaded', function(){
    const refreshBtn = el('dashboard-refresh');
    const liveBtn = el('dashboard-toggle-live');
    let live = false; let liveInterval = null;
    const currentRange = new URLSearchParams(window.location.search).get('range') || '7';
    // initial render from server data
    try{ renderCategoriesChart(window.__DASHBOARD_INIT && window.__DASHBOARD_INIT.topCategories); }catch(e){}
    refreshBtn && refreshBtn.addEventListener('click', () => refresh(currentRange));
    liveBtn && liveBtn.addEventListener('click', () => {
      live = !live; liveBtn.textContent = `Live: ${live ? 'On' : 'Off'}`;
      if (live) { if (!liveInterval) liveInterval = setInterval(()=>refresh(currentRange), 60_000); } else { if (liveInterval) { clearInterval(liveInterval); liveInterval = null; } }
    });
    // run one immediate refresh
    refresh(currentRange);
  });

})();
