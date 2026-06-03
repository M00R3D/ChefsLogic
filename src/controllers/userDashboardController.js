const mongoose = require('mongoose');
const Recipe    = require('../models/Recipe');
const Evento    = require('../models/Evento');
const Cookbook  = require('../models/Cookbook');
const User      = require('../models/User');

const DATE_RANGES = {
  today: 'Hoy',
  '7':   'Últimos 7 días',
  '30':  'Últimos 30 días',
  year:  'Este año'
};

function normalizeRange(range) {
  const key = String(range || '30').toLowerCase();
  return Object.keys(DATE_RANGES).includes(key) ? key : '30';
}

function buildDateRange(key) {
  const now = new Date();
  if (key === 'today') {
    const s = new Date(now); s.setHours(0,0,0,0); return s;
  }
  if (key === 'year') return new Date(now.getFullYear(), 0, 1);
  const s = new Date(now); s.setDate(now.getDate() - (Number(key) - 1)); s.setHours(0,0,0,0);
  return s;
}

async function renderUserDashboard(req, res) {
  const userId = req.session && req.session.userId;
  if (!userId) return res.redirect('/login');

  try {
    const uid = new mongoose.Types.ObjectId(String(userId));
    const now = new Date();
    const rangeKey   = normalizeRange(req.query.range);
    const rangeLabel = DATE_RANGES[rangeKey];
    const startDate  = buildDateRange(rangeKey);
    const eventMatch = { fecha: { $gte: startDate, $lte: now } };

    // All recipe IDs belonging to this user
    const myRecipes = await Recipe.find({ author: uid })
      .select('_id title titulo likes likeCount tags prepMinutes cookMinutes createdAt')
      .lean();

    const myRecipeIds = myRecipes.map(r => r._id);
    const totalMyRecipes = myRecipes.length;

    const eventMatchOnMyRecipes = {
      ...eventMatch,
      receta_id: { $in: myRecipeIds }
    };

    const [
      eventTypeCounts,
      topViewedMyRecipes,
      recentEventsOnMine,
      myTagAgg,
      myDailyActivity,
      myMonthlyCreations,
      savedCountAgg
    ] = await Promise.all([
      // How many of each event type on my recipes
      Evento.aggregate([
        { $match: eventMatchOnMyRecipes },
        { $group: { _id: '$tipo', total: { $sum: 1 } } }
      ]).catch(() => []),

      // Most visited of my recipes
      Evento.aggregate([
        { $match: { ...eventMatchOnMyRecipes, tipo: 'ver_receta' } },
        { $group: { _id: '$receta_id', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 8 },
        { $lookup: { from: Recipe.collection.name, localField: '_id', foreignField: '_id', as: 'recipe' } },
        { $unwind: { path: '$recipe', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, total: 1, title: { $ifNull: ['$recipe.title', '$recipe.titulo'] } } }
      ]).catch(() => []),

      // Recent events on my recipes
      Evento.find(eventMatchOnMyRecipes)
        .sort({ fecha: -1 })
        .limit(10)
        .populate('usuario_id', 'name nombre')
        .populate('receta_id', 'title titulo')
        .lean()
        .catch(() => []),

      // My tags distribution
      Recipe.aggregate([
        { $match: { author: uid } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
        { $project: { name: '$_id', total: 1 } }
      ]).catch(() => []),

      // Daily activity on my recipes (last 30 days)
      Evento.aggregate([
        { $match: { ...eventMatchOnMyRecipes } },
        { $group: { _id: { dayOfWeek: { $dayOfWeek: '$fecha' } }, total: { $sum: 1 } } },
        { $sort: { '_id.dayOfWeek': 1 } }
      ]).catch(() => []),

      // My recipes created per month
      Recipe.aggregate([
        { $match: { author: uid } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, total: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]).catch(() => []),

      // How many users saved each of my recipes
      User.aggregate([
        { $unwind: '$savedRecipes' },
        { $match: { savedRecipes: { $in: myRecipeIds } } },
        { $group: { _id: '$savedRecipes', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 8 },
        { $lookup: { from: Recipe.collection.name, localField: '_id', foreignField: '_id', as: 'recipe' } },
        { $unwind: { path: '$recipe', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, total: 1, title: { $ifNull: ['$recipe.title', '$recipe.titulo'] } } }
      ]).catch(() => [])
    ]);

    // Total likes on my recipes
    const totalLikes = myRecipes.reduce((s, r) => s + (r.likeCount || r.likes || 0), 0);

    // Avg prep time of my recipes
    const avgPrepTime = myRecipes.length
      ? Math.round(myRecipes.reduce((s, r) => s + (r.prepMinutes || 0) + (r.cookMinutes || 0), 0) / myRecipes.length)
      : null;

    // Event summary
    const eventTotalsMap = eventTypeCounts.reduce((acc, e) => { acc[e._id] = e.total; return acc; }, {});
    const eventSummary = {
      ver_receta:    eventTotalsMap.ver_receta    || 0,
      like:          eventTotalsMap.like          || 0,
      guardar_receta:eventTotalsMap.guardar_receta|| 0,
      buscar_receta: eventTotalsMap.buscar_receta || 0,
      crear_receta:  eventTotalsMap.crear_receta  || 0
    };

    // Top viewed recipes (formatted)
    const topRecipes = topViewedMyRecipes.map(r => ({
      title: r.title || 'Receta eliminada',
      total: r.total || 0
    }));

    // Top liked (from recipe model)
    const topByLikes = [...myRecipes]
      .sort((a, b) => (b.likeCount || b.likes || 0) - (a.likeCount || a.likes || 0))
      .slice(0, 8)
      .map(r => ({ title: r.title || r.titulo || 'Sin título', total: r.likeCount || r.likes || 0 }));

    // Top saved
    const topSaved = savedCountAgg.map(r => ({ title: r.title || 'Sin título', total: r.total || 0 }));

    // Tags for bar chart
    const topCategories = myTagAgg;

    // Monthly labels
    const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const monthlyCounts = Array(12).fill(0);
    myMonthlyCreations.forEach(e => {
      const idx = (e._id.month || 1) - 1;
      if (idx >= 0 && idx < 12) monthlyCounts[idx] = e.total;
    });

    const WEEKDAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const weekdayCounts = Array(7).fill(0);
    myDailyActivity.forEach(e => {
      const idx = (e._id.dayOfWeek || 1) - 1;
      if (idx >= 0 && idx < 7) weekdayCounts[idx] = e.total;
    });

    const payload = {
      pageTitle: "Chef's Logic | Mi Dashboard",
      activeTab: 'mi-dashboard',
      rangeKey,
      rangeLabel,
      lastUpdated: now.toISOString(),
      totalMyRecipes,
      myRecipes,
      totalLikes,
      avgPrepTime,
      eventSummary,
      topRecipes,
      topByLikes,
      topSaved,
      topCategories,
      monthlyLabels: MONTH_NAMES,
      monthlyCounts,
      weekdayLabels: WEEKDAY_NAMES,
      weekdayCounts,
      recentEvents: recentEventsOnMine,
      errorMessage: ''
    };

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json(payload);
    }

    return res.render('user-dashboard', payload);

  } catch (err) {
    console.error('User dashboard error:', err);
    return res.status(500).render('user-dashboard', {
      pageTitle: "Mi Dashboard",
      activeTab: 'mi-dashboard',
      rangeKey: '30',
      rangeLabel: DATE_RANGES['30'],
      lastUpdated: new Date().toISOString(),
      totalMyRecipes: 0,
      totalLikes: 0,
      avgPrepTime: null,
      eventSummary: { ver_receta:0, like:0, guardar_receta:0, buscar_receta:0, crear_receta:0 },
      topRecipes: [],
      topByLikes: [],
      topSaved: [],
      topCategories: [],
      monthlyLabels: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
      monthlyCounts: Array(12).fill(0),
      weekdayLabels: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
      weekdayCounts: Array(7).fill(0),
      recentEvents: [],
      errorMessage: 'No fue posible cargar tu dashboard.'
    });
  }
}

module.exports = { renderUserDashboard };
