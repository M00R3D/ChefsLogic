async function fetchJson(url) {
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    return res.ok ? res.json() : { success: false, status: res.status };
  } catch (err) {
    console.error('fetchJson error', url, err);
    return { success: false, error: err.message };
  }
}

function makeBar(ctx, labels, data, label) {
  // destroy existing chart for this canvas to avoid duplicates
  try {
    const canvasId = ctx && ctx.canvas && ctx.canvas.id;
    window.__DASH_CHARTS = window.__DASH_CHARTS || {};
    if (canvasId && window.__DASH_CHARTS[canvasId]) {
      try { window.__DASH_CHARTS[canvasId].destroy(); } catch (e) { /* ignore */ }
      window.__DASH_CHARTS[canvasId] = null;
    }
  } catch (e) {}

  // prefer minimal animations for performance
  if (window.Chart && window.Chart.defaults) {
    window.Chart.defaults.animation = false;
  }

  const chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label, data, backgroundColor: 'rgba(54,162,235,0.6)' }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false }
  });

  try {
    const cid = ctx && ctx.canvas && ctx.canvas.id;
    if (cid) window.__DASH_CHARTS[cid] = chart;
  } catch (e) {}

  return chart;
}

function makeHorizontalBar(ctx, labels, data, label) {
  try {
    const canvasId = ctx && ctx.canvas && ctx.canvas.id;
    window.__DASH_CHARTS = window.__DASH_CHARTS || {};
    if (canvasId && window.__DASH_CHARTS[canvasId]) {
      try { window.__DASH_CHARTS[canvasId].destroy(); } catch (e) {}
      window.__DASH_CHARTS[canvasId] = null;
    }
  } catch (e) {}

  if (window.Chart && window.Chart.defaults) window.Chart.defaults.animation = false;

  const chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label, data, backgroundColor: 'rgba(255,159,64,0.7)' }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false }
  });

  try { const cid = ctx && ctx.canvas && ctx.canvas.id; if (cid) window.__DASH_CHARTS[cid] = chart; } catch (e) {}
  return chart;
}

async function render() {
  // Users
  try {
    const users = await fetchJson('/api/dashboard/users');
    if (users && users.success) {
      const elU = document.getElementById('chart-users-activity');
      if (elU && elU.getContext) {
        const uctx = elU.getContext('2d');
        makeBar(uctx, ['Registrados este mes', 'Activos'], [users.data.registeredThisMonth, users.data.activeUsers], 'Usuarios');
      }

      const elR = document.getElementById('chart-recipes-per-user');
      if (elR && elR.getContext) {
        const rctx = elR.getContext('2d');
        const rpLabels = (users.data.recipesPerUser || []).map(u => u.name || u.email || u._id);
        const rpData = (users.data.recipesPerUser || []).map(u => u.recipes || 0);
        makeHorizontalBar(rctx, rpLabels, rpData, 'Recetas por usuario (top)');
      }
    }
  } catch (err) {
    console.error('Error rendering users charts', err);
  }

  // Recipes
  try {
    const recipes = await fetchJson('/api/dashboard/recipes');
    if (recipes && recipes.success) {
      const elTv = document.getElementById('chart-top-viewed');
      if (elTv && elTv.getContext) {
        const tv = elTv.getContext('2d');
        makeBar(tv, (recipes.data.topViewed || []).map(r => r.title), (recipes.data.topViewed || []).map(r => r.vistas || 0), 'Vistas');
      }

      const elTl = document.getElementById('chart-top-liked');
      if (elTl && elTl.getContext) {
        const tl = elTl.getContext('2d');
        makeBar(tl, (recipes.data.topLiked || []).map(r => r.title), (recipes.data.topLiked || []).map(r => r.likes || r.likeCount || 0), 'Likes');
      }
    }
  } catch (err) {
    console.error('Error rendering recipes charts', err);
  }

  // Ingredients
  try {
    const ingredients = await fetchJson('/api/dashboard/ingredients');
    if (ingredients && ingredients.success) {
      const elIt = document.getElementById('chart-top-ingredients');
      if (elIt && elIt.getContext) {
        const it = elIt.getContext('2d');
        makeBar(it, (ingredients.data.mostUsed || []).map(i => i.name || i._id), (ingredients.data.mostUsed || []).map(i => i.count || 0), 'Uso en recetas');
      }

      const elIc = document.getElementById('chart-ingredient-categories');
      if (elIc && elIc.getContext) {
        const ic = elIc.getContext('2d');
        makeBar(ic, (ingredients.data.categories || []).map(c => c._id || 'otro'), (ingredients.data.categories || []).map(c => c.count || 0), 'Categorias');
      }
    }
  } catch (err) {
    console.error('Error rendering ingredients charts', err);
  }

  // Regions
  try {
    const regions = await fetchJson('/api/dashboard/regions');
    if (regions && regions.success) {
      const elRv = document.getElementById('chart-visits-regions');
      if (elRv && elRv.getContext) {
        const rv = elRv.getContext('2d');
        makeBar(rv, (regions.data.visitsByRegion || []).map(r => r.name || r._id), (regions.data.visitsByRegion || []).map(r => r.views || 0), 'Visitas');
      }

      const elRr = document.getElementById('chart-recipes-regions');
      if (elRr && elRr.getContext) {
        const rr = elRr.getContext('2d');
        makeBar(rr, (regions.data.recipesByRegion || []).map(r => r.name || r._id), (regions.data.recipesByRegion || []).map(r => r.recipes || 0), 'Recetas');
      }
    }
  } catch (err) {
    console.error('Error rendering regions charts', err);
  }

  // Trends
  try {
    const trends = await fetchJson('/api/dashboard/trends');
    if (trends && trends.success) {
      const elTw = document.getElementById('chart-top-week');
      if (elTw && elTw.getContext) {
        const tw = elTw.getContext('2d');
        makeBar(tw, (trends.data.topWeek || []).map(r => r.title), (trends.data.topWeek || []).map(r => r.views || 0), 'Top semanal (vistas)');
      }

      const elUg = document.getElementById('chart-users-growth');
      if (elUg && elUg.getContext) {
        const ug = elUg.getContext('2d');
        makeBar(ug, (trends.data.usersGrowth || []).map(d => d._id), (trends.data.usersGrowth || []).map(d => d.count || 0), 'Nuevos usuarios (día)');
      }
    }
  } catch (err) {
    console.error('Error rendering trends charts', err);
  }
}

document.addEventListener('DOMContentLoaded', render);
