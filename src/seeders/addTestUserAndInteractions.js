require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Interaction = require('../models/Interaction');
const Evento = require('../models/Evento');

const TEST_EMAIL = 'a@mail.cm';
const TEST_NAME = 'usuario test';
const TEST_PASSWORD = '123123123';

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chefslogic';
  console.log('Connecting to DB', uri);
  await mongoose.connect(uri);

  // Create or update test user
  let user = await User.findOne({ email: TEST_EMAIL });
  const hash = await bcrypt.hash(TEST_PASSWORD, 10);

  if (!user) {
    user = await User.create({
      name: TEST_NAME,
      email: TEST_EMAIL,
      passwordHash: hash,
      role: 'usuario',
      avatarUrl: '',
      bio: 'Cuenta de prueba para interacciones'
    });
    console.log('Created test user:', user.email);
  } else {
    // ensure password hash and name
    const needsUpdate = user.passwordHash !== hash || user.name !== TEST_NAME;
    if (needsUpdate) {
      user.name = TEST_NAME;
      user.passwordHash = hash;
      await user.save();
      console.log('Updated test user password/name.');
    } else {
      console.log('Test user already exists.');
    }
  }

  // Fetch sample recipes (do not modify recipe documents - preserve image URLs)
  const recipes = await Recipe.find().select('_id').lean();
  if (!recipes || recipes.length === 0) {
    console.log('No recipes found in DB. Exiting.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Build a list of recipe ids to interact with (up to 20)
  const shuffled = recipes.map(r => r._id.toString()).sort(() => 0.5 - Math.random());
  const sample = shuffled.slice(0, Math.min(20, shuffled.length));

  // Ensure the test user has some authored recipes so `Mi Dashboard` shows data.
  // Reassign author on a small sample (3) of existing recipes to this user (idempotent).
  const toOwn = shuffled.slice(0, Math.min(3, shuffled.length));
  if (toOwn.length) {
    console.log('Assigning author to test user for recipes:', toOwn.slice(0,3).join(', '));
    const assignOps = toOwn.map((rid) => Recipe.updateOne(
      { _id: rid },
      { $set: { author: user._id, usuario_id: user._id, createdAt: new Date() } }
    ));
    await Promise.all(assignOps);
  }

  // Idempotent upserts for interactions
  const ops = [];
  for (let i = 0; i < sample.length; i++) {
    const recetaId = sample[i];
    if (i < 5) {
      // likes
      ops.push(Interaction.findOneAndUpdate(
        { user: user._id, recipe: recetaId, type: 'like' },
        {
          $setOnInsert: {
            type: 'like',
            targetType: 'recipe',
            user: user._id,
            recipe: recetaId,
            value: 1,
            tipo: 'like',
            usuario_id: user._id,
            receta_id: recetaId,
            fecha: new Date()
          }
        },
        { upsert: true, returnDocument: 'after' }
      ));

      // also add to user's likedRecipes
      ops.push(User.updateOne({ _id: user._id }, { $addToSet: { likedRecipes: recetaId } }));
    } else if (i < 10) {
      // saves
      ops.push(Interaction.findOneAndUpdate(
        { user: user._id, recipe: recetaId, type: 'save' },
        {
          $setOnInsert: {
            type: 'save',
            targetType: 'recipe',
            user: user._id,
            recipe: recetaId,
            value: 1,
            tipo: 'favorito',
            usuario_id: user._id,
            receta_id: recetaId,
            fecha: new Date()
          }
        },
        { upsert: true, returnDocument: 'after' }
      ));
      ops.push(User.updateOne({ _id: user._id }, { $addToSet: { savedRecipes: recetaId } }));
    } else if (i < 15) {
      // comments
      ops.push(Interaction.findOneAndUpdate(
        { user: user._id, recipe: recetaId, type: 'comment' },
        {
          $setOnInsert: {
            type: 'comment',
            targetType: 'recipe',
            user: user._id,
            recipe: recetaId,
            commentText: '¡Deliciosa receta de prueba!',
            comentario: '¡Deliciosa receta de prueba!',
            tipo: 'comentario',
            usuario_id: user._id,
            receta_id: recetaId,
            fecha: new Date()
          }
        },
        { upsert: true, returnDocument: 'after' }
      ));
    } else {
      // views
      ops.push(Interaction.findOneAndUpdate(
        { user: user._id, recipe: recetaId, type: 'view' },
        {
          $setOnInsert: {
            type: 'view',
            targetType: 'recipe',
            user: user._id,
            recipe: recetaId,
            value: 1,
            tipo: 'visualizacion',
            usuario_id: user._id,
            receta_id: recetaId,
            fecha: new Date()
          }
        },
        { upsert: true, returnDocument: 'after' }
      ));
    }

    // create a matching Evento (view or interaction event) idempotently
    ops.push(Evento.findOneAndUpdate(
      { usuario_id: user._id, receta_id: recetaId, tipo: 'ver_receta' },
      { $setOnInsert: { usuario_id: user._id, receta_id: recetaId, tipo: 'ver_receta', fecha: new Date() } },
      { upsert: true, returnDocument: 'after' }
    ));
  }

  await Promise.all(ops);

  // Ensure Evento records for other interaction types so dashboards show activity
  const eventOps = [];
  const liked = sample.slice(0, 5);
  const saved = sample.slice(5, 10);

  // likes events
  for (const recetaId of liked) {
    eventOps.push(Evento.findOneAndUpdate(
      { usuario_id: user._id, receta_id: recetaId, tipo: 'like' },
      { $setOnInsert: { usuario_id: user._id, receta_id: recetaId, tipo: 'like', fecha: new Date() } },
      { upsert: true, returnDocument: 'after' }
    ));
  }

  // guardar_receta events
  for (const recetaId of saved) {
    eventOps.push(Evento.findOneAndUpdate(
      { usuario_id: user._id, receta_id: recetaId, tipo: 'guardar_receta' },
      { $setOnInsert: { usuario_id: user._id, receta_id: recetaId, tipo: 'guardar_receta', fecha: new Date() } },
      { upsert: true, returnDocument: 'after' }
    ));
  }

  // crear_receta (one sample event) - idempotent by receta_id and tipo
  const createdReceta = sample[0];
  if (createdReceta) {
    eventOps.push(Evento.findOneAndUpdate(
      { usuario_id: user._id, receta_id: createdReceta, tipo: 'crear_receta' },
      { $setOnInsert: { usuario_id: user._id, receta_id: createdReceta, tipo: 'crear_receta', fecha: new Date() } },
      { upsert: true, returnDocument: 'after' }
    ));
  }

  // search events (buscar_receta) - several different timestamps
  const searches = ['tacos', 'pollo', 'postre'];
  for (let i = 0; i < searches.length; i++) {
    const ts = new Date(Date.now() - (i * 3600 * 1000));
    eventOps.push(Evento.findOneAndUpdate(
      { usuario_id: user._id, tipo: 'buscar_receta', fecha: ts },
      { $setOnInsert: { usuario_id: user._id, tipo: 'buscar_receta', fecha: ts, dispositivo: 'web' } },
      { upsert: true, returnDocument: 'after' }
    ));
  }

  await Promise.all(eventOps);

  console.log('Seeded interactions and events for user:', TEST_EMAIL);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seeder error:', err);
  process.exit(1);
});
