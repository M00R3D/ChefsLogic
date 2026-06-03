const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');
const Region = require('../models/Region');
const Evento = require('../models/Evento');
const Interaction = require('../models/Interaction');

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

function buildMonthlyLabels() {
  return MONTH_NAMES;
}

function buildWeekdayLabels() {
  return WEEKDAY_NAMES;
}

const DATE_RANGES = {
  today: 'Hoy',
  '7': 'Últimos 7 días',
  '30': 'Últimos 30 días',
  year: 'Este año'
};

function normalizeRange(range) {
  const key = String(range || '30').toLowerCase();
  if (Object.keys(DATE_RANGES).includes(key)) {
    return key;
  }
  return '30';
}

function buildDateRange(key) {
  const now = new Date();

  if (key === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (key === 'year') {
    return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  }

  const days = Number(key) || 30;
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return start;
}

async function renderDashboardPage(req, res) {
  try {
    const now = new Date();
    const rangeKey = normalizeRange(req.query.range);
    const rangeLabel = DATE_RANGES[rangeKey];
    const startDate = buildDateRange(rangeKey);
    const eventMatch = { fecha: { $gte: startDate, $lte: now } };

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalUsers,
      totalRecipes,
      totalIngredients,
      totalEvents,
      usersThisMonth,
      activeUsers
    ] = await Promise.all([
      User.countDocuments(),
      Recipe.countDocuments(),
      Ingredient.countDocuments(),
      Evento.countDocuments(),
      User.countDocuments({
        fecha_registro: {
          $gte: firstDayOfMonth,
          $lt: firstDayOfNextMonth
        }
      }),
      User.countDocuments({ isActive: true })
    ]);

    const [
      eventTypeCounts,
      topViewedRecipes,
      topLikedRecipes,
      mostActiveUsers,
      recipesPerUser,
      topIngredients,
      regionViews,
      registrationAggregation,
      activityAggregation,
      recentEvents
    ] = await Promise.all([
      Evento.aggregate([
        { $match: eventMatch },
        { $group: { _id: '$tipo', total: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Evento.aggregate([
        { $match: { ...eventMatch, tipo: 'ver_receta', receta_id: { $ne: null } } },
        { $group: { _id: '$receta_id', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 6 },
        {
          $lookup: {
            from: Recipe.collection.name,
            localField: '_id',
            foreignField: '_id',
            as: 'recipe'
          }
        },
        { $unwind: { path: '$recipe', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            total: 1,
            title: {
              $ifNull: ['$recipe.title', '$recipe.titulo']
            }
          }
        }
      ]),
      Recipe.find()
        .sort({ likes: -1 })
        .limit(6)
        .select('title titulo likes')
        .lean(),
      Evento.aggregate([
        { $match: { ...eventMatch, usuario_id: { $ne: null } } },
        { $group: { _id: '$usuario_id', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 6 },
        {
          $lookup: {
            from: User.collection.name,
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            total: 1,
            name: { $ifNull: ['$user.name', '$user.nombre'] }
          }
        }
      ]),
      Recipe.aggregate([
        { $group: { _id: { author: '$author', usuario_id: '$usuario_id' }, total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 6 }
      ]),
      Recipe.aggregate([
        { $unwind: '$ingredients' },
        { $match: { 'ingredients.ingredient': { $ne: null } } },
        { $group: { _id: '$ingredients.ingredient', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: Ingredient.collection.name,
            localField: '_id',
            foreignField: '_id',
            as: 'ingredient'
          }
        },
        { $unwind: { path: '$ingredient', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            total: 1,
            name: { $ifNull: ['$ingredient.name', '$ingredient.nombre'] }
          }
        }
      ]),
      Evento.aggregate([
        { $match: { ...eventMatch, tipo: 'ver_receta', receta_id: { $ne: null } } },
        {
          $lookup: {
            from: Recipe.collection.name,
            localField: 'receta_id',
            foreignField: '_id',
            as: 'recipe'
          }
        },
        { $unwind: { path: '$recipe', preserveNullAndEmptyArrays: true } },
        { $match: { 'recipe.region': { $ne: null } } },
        { $group: { _id: '$recipe.region', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 6 },
        {
          $lookup: {
            from: Region.collection.name,
            localField: '_id',
            foreignField: '_id',
            as: 'region'
          }
        },
        { $unwind: { path: '$region', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            total: 1,
            name: '$region.name'
          }
        }
      ]),
      User.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$fecha_registro' },
              month: { $month: '$fecha_registro' }
            },
            total: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Evento.aggregate([
        { $match: eventMatch },
        {
          $group: {
            _id: { dayOfWeek: { $dayOfWeek: '$fecha' } },
            total: { $sum: 1 }
          }
        },
        { $sort: { '_id.dayOfWeek': 1 } }
      ]),
      Evento.find(eventMatch)
        .sort({ fecha: -1 })
        .limit(10)
        .populate('usuario_id', 'name nombre')
        .populate('receta_id', 'title titulo')
        .lean()
    ]);

    const eventTotalsMap = eventTypeCounts.reduce((acc, entry) => {
      acc[entry._id] = entry.total;
      return acc;
    }, {});

    const eventSummary = {
      ver_receta: eventTotalsMap.ver_receta || 0,
      like: eventTotalsMap.like || 0,
      guardar_receta: eventTotalsMap.guardar_receta || 0,
      buscar_receta: eventTotalsMap.buscar_receta || 0,
      crear_receta: eventTotalsMap.crear_receta || 0
    };

    const topRecipesByLikes = topLikedRecipes.map((item) => ({
      title: item.title || item.titulo || 'Sin título',
      total: item.likes || 0
    }));

    const topUsersByRecipes = recipesPerUser.map((entry) => {
      const userId = String(entry._id.author || entry._id.usuario_id || '');
      return {
        userId,
        total: entry.total
      };
    });

    const recipeUserNames = await User.find({
      _id: { $in: topUsersByRecipes.map((item) => item.userId).filter(Boolean) }
    })
      .select('name nombre')
      .lean();

    const recipeOwnerNames = recipeUserNames.reduce((acc, user) => {
      acc[String(user._id)] = user.name || user.nombre || 'Usuario';
      return acc;
    }, {});

    const topRecipes = topViewedRecipes.map((item) => ({
      title: item.title || 'Receta eliminada',
      total: item.total || 0
    }));

    const topUsers = mostActiveUsers.map((item) => ({
      name: item.name || 'Usuario',
      total: item.total || 0
    }));

    const recipesByUser = topUsersByRecipes.map((item) => ({
      name: recipeOwnerNames[item.userId] || 'Usuario',
      total: item.total
    }));

    const monthlyLabels = buildMonthlyLabels();
    const monthlyCounts = Array(12).fill(0);
    registrationAggregation.forEach((entry) => {
      const monthIndex = (entry._id.month || 1) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        monthlyCounts[monthIndex] = entry.total;
      }
    });

    const weekdayLabels = buildWeekdayLabels();
    const weekdayCounts = Array(7).fill(0);
    activityAggregation.forEach((entry) => {
      const dayOfWeek = (entry._id && entry._id.dayOfWeek) || 1;
      const index = Math.max(0, Math.min(6, dayOfWeek - 1));
      weekdayCounts[index] = entry.total;
    });

    return res.render('dashboard', {
      pageTitle: "Chef's Logic | Dashboard",
      activeTab: 'dashboard',
      rangeKey,
      rangeLabel,
      totalUsers,
      totalRecipes,
      totalIngredients,
      totalEvents,
      eventsInRange: Object.values(eventSummary).reduce((sum, value) => sum + value, 0),
      usersThisMonth,
      activeUsers,
      eventSummary,
      topRecipes,
      topRecipesByLikes,
      topIngredients,
      topUsers,
      recipesByUser,
      regionViews,
      monthlyLabels,
      monthlyCounts,
      weekdayLabels,
      weekdayCounts,
      recentEvents,
      errorMessage: ''
    });
  } catch (error) {
    console.error('Dashboard render error:', error);
    return res.status(500).render('dashboard', {
      pageTitle: "Chef's Logic | Dashboard",
      activeTab: 'dashboard',
      rangeKey: '30',
      rangeLabel: DATE_RANGES['30'],
      totalUsers: 0,
      totalRecipes: 0,
      totalIngredients: 0,
      totalEvents: 0,
      eventsInRange: 0,
      usersThisMonth: 0,
      activeUsers: 0,
      eventSummary: { ver_receta: 0, like: 0, guardar_receta: 0, buscar_receta: 0, crear_receta: 0 },
      topRecipes: [],
      topRecipesByLikes: [],
      topIngredients: [],
      topUsers: [],
      recipesByUser: [],
      regionViews: [],
      monthlyLabels: buildMonthlyLabels(),
      monthlyCounts: Array(12).fill(0),
      weekdayLabels: buildWeekdayLabels(),
      weekdayCounts: Array(7).fill(0),
      recentEvents: [],
      errorMessage: 'No fue posible cargar el dashboard. Revisa la consola del servidor.'
    });
  }
}

module.exports = {
  renderDashboardPage
};
