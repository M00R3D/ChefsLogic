require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Evento = require('../models/Evento');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function pickRandom(array) {
  if (!Array.isArray(array) || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

async function seedEventos() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chefslogic';
  console.log('Seeder de eventos: conectando a', uri);
  await mongoose.connect(uri);

  const users = await User.find({ email: { $in: ['admin@chefslogic.local', 'seeder@chefslogic.local', 'user@chefslogic.local'] } }).lean();
  const recipes = await Recipe.find().select('_id title slug author usuario_id fecha_publicacion likes').lean();

  if (!recipes.length) {
    console.warn('No se encontraron recetas. Ejecute primero recipeSeeder.');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (!users.length) {
    console.warn('No se encontraron usuarios seeds. Ejecute primero userSeeder.');
  }

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 90);

  const searchTerms = ['tacos', 'mole', 'pollo', 'postre', 'pescado', 'veganas', 'antojitos', 'ensalada', 'queso', 'chiles'];
  const events = [];

  console.log('  Borrando eventos antiguos...');
  await Evento.deleteMany({});

  for (const recipe of recipes) {
    const authorId = recipe.author || recipe.usuario_id || (users[0] && users[0]._id) || null;
    const viewCount = randomInt(20, 80);
    const likeCount = Math.max(1, Math.floor(viewCount * 0.18));
    const saveCount = Math.max(1, Math.floor(viewCount * 0.10));
    const createDate = recipe.fecha_publicacion ? new Date(recipe.fecha_publicacion) : randomDate(startDate, now);

    events.push({
      usuario_id: authorId,
      receta_id: recipe._id,
      tipo: 'crear_receta',
      fecha: createDate,
      dispositivo: 'web'
    });

    for (let i = 0; i < viewCount; i++) {
      events.push({
        usuario_id: pickRandom(users)?._id || authorId,
        receta_id: recipe._id,
        tipo: 'ver_receta',
        fecha: randomDate(createDate, now),
        dispositivo: 'web'
      });
    }

    for (let i = 0; i < likeCount; i++) {
      events.push({
        usuario_id: pickRandom(users)?._id || authorId,
        receta_id: recipe._id,
        tipo: 'like',
        fecha: randomDate(createDate, now),
        dispositivo: 'web'
      });
    }

    for (let i = 0; i < saveCount; i++) {
      events.push({
        usuario_id: pickRandom(users)?._id || authorId,
        receta_id: recipe._id,
        tipo: 'guardar_receta',
        fecha: randomDate(createDate, now),
        dispositivo: 'web'
      });
    }
  }

  for (let i = 0; i < 24; i++) {
    events.push({
      usuario_id: pickRandom(users)?._id || null,
      tipo: 'buscar_receta',
      fecha: randomDate(startDate, now),
      dispositivo: 'web'
    });
  }

  const topRecipes = recipes.slice(0, 8).map((recipe) => recipe.title || recipe.slug);
  for (let i = 0; i < 12; i++) {
    events.push({
      usuario_id: pickRandom(users)?._id || null,
      tipo: 'ver_receta',
      receta_id: pickRandom(recipes)._id,
      fecha: randomDate(new Date(now.getFullYear(), now.getMonth(), 1), now),
      dispositivo: 'web'
    });
  }

  console.log(`  Creando ${events.length} eventos de prueba...`);
  await Evento.insertMany(events);

  console.log('  Eventos seed creados correctamente.');
  await mongoose.disconnect();
  process.exit(0);
}

seedEventos().catch((err) => {
  console.error('ERROR en eventoSeeder:', err.message || err);
  process.exit(1);
});
