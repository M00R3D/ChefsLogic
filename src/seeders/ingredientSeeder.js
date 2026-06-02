/**
 * ingredientSeeder.js
 * Inserta ingredientes base representativos de la cocina mexicana.
 * Upsert idempotente; llena campos legacy y modernos.
 * Uso: node src/seeders/ingredientSeeder.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Ingredient = require('../models/Ingredient');
const User = require('../models/User');

const INGREDIENTS = [
  { nombre: 'Sal', name: 'Sal', categoria: 'condimento', category: 'condimento', cantidad: 1000, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'economico', tags: ['sal','base'] },
  { nombre: 'Maíz', name: 'Maíz', categoria: 'grano', category: 'grano', cantidad: 1000, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['maiz','base','masa'] },
  { nombre: 'Masa de maíz', name: 'Masa de maíz', categoria: 'grano', category: 'grano', cantidad: 1000, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['masa','tortilla','masa'] },
  { nombre: 'Tortilla de maíz', name: 'Tortilla de maíz', categoria: 'grano', category: 'grano', cantidad: 24, unidad: 'pieza', defaultUnit: 'pieza', precio_aprox: 0, accesibilidad: 'medio', tags: ['tortilla','base'] },
  { nombre: 'Frijol negro', name: 'Frijol negro', categoria: 'proteina', category: 'proteina', cantidad: 1000, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['frijol','legumbre'] },
  { nombre: 'Arroz', name: 'Arroz', categoria: 'grano', category: 'grano', cantidad: 1000, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['arroz'] },
  { nombre: 'Carne de res', name: 'Carne de res', categoria: 'proteina', category: 'proteina', cantidad: 1000, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['res','carne'] },
  { nombre: 'Carne de cerdo', name: 'Carne de cerdo', categoria: 'proteina', category: 'proteina', cantidad: 1000, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['cerdo','carne'] },
  { nombre: 'Pollo', name: 'Pollo', categoria: 'proteina', category: 'proteina', cantidad: 1000, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['pollo','carne'] },
  { nombre: 'Pescado blanco', name: 'Pescado blanco', categoria: 'proteina', category: 'proteina', cantidad: 1000, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['pescado','mariscos'] },
  { nombre: 'Camarón', name: 'Camarón', categoria: 'proteina', category: 'proteina', cantidad: 500, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'premium', tags: ['camaron','mariscos'] },
  { nombre: 'Tomate', name: 'Tomate', categoria: 'verdura', category: 'verdura', cantidad: 1, unidad: 'kg', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['tomate','base'] },
  { nombre: 'Tomatillo', name: 'Tomatillo', categoria: 'verdura', category: 'verdura', cantidad: 1, unidad: 'kg', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['tomatillo','salsa'] },
  { nombre: 'Cebolla', name: 'Cebolla', categoria: 'verdura', category: 'verdura', cantidad: 1, unidad: 'kg', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['cebolla'] },
  { nombre: 'Ajo', name: 'Ajo', categoria: 'verdura', category: 'verdura', cantidad: 200, unidad: 'g', defaultUnit: 'diente', precio_aprox: 0, accesibilidad: 'medio', tags: ['ajo'] },
  { nombre: 'Cilantro', name: 'Cilantro', categoria: 'verdura', category: 'verdura', cantidad: 1, unidad: 'manojo', defaultUnit: 'manojo', precio_aprox: 0, accesibilidad: 'medio', tags: ['cilantro','hierbas'] },
  { nombre: 'Nopal', name: 'Nopal', categoria: 'verdura', category: 'verdura', cantidad: 500, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['nopal','verdura'] },
  { nombre: 'Aguacate', name: 'Aguacate', categoria: 'fruta', category: 'fruta', cantidad: 1, unidad: 'kg', defaultUnit: 'pieza', precio_aprox: 0, accesibilidad: 'medio', tags: ['aguacate','fruta'] },
  { nombre: 'Limón', name: 'Limón', categoria: 'fruta', category: 'fruta', cantidad: 1, unidad: 'kg', defaultUnit: 'pieza', precio_aprox: 0, accesibilidad: 'medio', tags: ['limon','citrico'] },
  { nombre: 'Chile ancho', name: 'Chile ancho', categoria: 'chile', category: 'chile', cantidad: 200, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['chile','seco'] },
  { nombre: 'Chile guajillo', name: 'Chile guajillo', categoria: 'chile', category: 'chile', cantidad: 200, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['chile','seco'] },
  { nombre: 'Chile serrano', name: 'Chile serrano', categoria: 'chile', category: 'chile', cantidad: 100, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['chile','fresco'] },
  { nombre: 'Chile habanero', name: 'Chile habanero', categoria: 'chile', category: 'chile', cantidad: 100, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'premium', tags: ['chile','fresco'] },
  { nombre: 'Aceite vegetal', name: 'Aceite vegetal', categoria: 'aceite', category: 'aceite', cantidad: 1, unidad: 'l', defaultUnit: 'ml', precio_aprox: 0, accesibilidad: 'medio', tags: ['aceite'] },
  { nombre: 'Manteca de cerdo', name: 'Manteca de cerdo', categoria: 'aceite', category: 'aceite', cantidad: 500, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['manteca'] },
  { nombre: 'Queso fresco', name: 'Queso fresco', categoria: 'lacteo', category: 'lacteo', cantidad: 500, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['queso'] },
  { nombre: 'Crema', name: 'Crema', categoria: 'lacteo', category: 'lacteo', cantidad: 250, unidad: 'ml', defaultUnit: 'ml', precio_aprox: 0, accesibilidad: 'medio', tags: ['crema'] },
  { nombre: 'Achiote', name: 'Achiote', categoria: 'especia', category: 'especia', cantidad: 100, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['achiote','condimento'] },
  { nombre: 'Epazote', name: 'Epazote', categoria: 'verdura', category: 'verdura', cantidad: 1, unidad: 'manojo', defaultUnit: 'manojo', precio_aprox: 0, accesibilidad: 'medio', tags: ['epazote','hierbas'] },
  { nombre: 'Hoja santa', name: 'Hoja santa', categoria: 'verdura', category: 'verdura', cantidad: 1, unidad: 'manojo', defaultUnit: 'manojo', precio_aprox: 0, accesibilidad: 'medio', tags: ['hoja-santa'] },
  { nombre: 'Hoja de plátano', name: 'Hoja de plátano', categoria: 'otro', category: 'otro', cantidad: 10, unidad: 'pieza', defaultUnit: 'pieza', precio_aprox: 0, accesibilidad: 'medio', tags: ['hoja','envuelve'] },
  { nombre: 'Piloncillo', name: 'Piloncillo', categoria: 'otro', category: 'otro', cantidad: 500, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['piloncillo','dulce'] },
  { nombre: 'Chocolate de mesa', name: 'Chocolate de mesa', categoria: 'otro', category: 'otro', cantidad: 500, unidad: 'g', defaultUnit: 'g', precio_aprox: 0, accesibilidad: 'medio', tags: ['chocolate','mole'] }
];

function findByNameQuery(doc) {
  return { $or: [ { name: doc.name }, { nombre: doc.nombre } ] };
}

async function seedIngredients() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chefslogic';
  console.log('Seeder de ingredientes: conectando a', uri);
  await mongoose.connect(uri);

  let user = await User.findOne();
  if (!user) {
    const passwordHash = await bcrypt.hash('changeme123', 12);
    user = await User.create({ name: 'Seeder User', email: 'seeder@chefslogic.local', passwordHash, nombre: 'Seeder', correo: 'seeder@chefslogic.local', password: passwordHash, rol: 'chef', avatar: 'default.png', fecha_registro: new Date() });
    console.log('  Usuario seeder creado:', user.email);
  }

  let inserted = 0;
  let updated = 0;

  for (const doc of INGREDIENTS) {
    const payload = Object.assign({}, doc, {
      createdBy: user._id,
      name: doc.name,
      nombre: doc.nombre,
      category: doc.category || doc.categoria || 'otro',
      categoria: doc.categoria || doc.category || 'otro',
      defaultUnit: doc.defaultUnit || doc.unidad || 'g'
    });

    const existing = await Ingredient.findOne(findByNameQuery(payload));
    if (existing) {
      existing.set(payload);
      await existing.save();
      updated++;
      console.log('  ↻ Actualizado:', payload.name);
    } else {
      await Ingredient.create(payload);
      inserted++;
      console.log('  ✔ Insertado:', payload.name);
    }
  }

  console.log(`\nResumen: insertados=${inserted}, actualizados=${updated}`);
  await mongoose.disconnect();
  process.exit(0);
}

seedIngredients().catch((err) => {
  console.error('ERROR en ingredientSeeder:', err.message || err);
  process.exit(1);
});
