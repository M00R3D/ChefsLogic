require('dotenv').config();
const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chefslogic';
    await mongoose.connect(uri);
    const titles = [
      'Cochinita pibil clásica',
      'Sopa de lima',
      'Panuchos y salbutes mixtos',
      'Pescado tikin-xic',
      'Relleno negro (versión sureste)',
      'Ensalada de naranja agria',
      'Tamales de chaya',
      'Pollo tikin-xic en hojas'
    ];

    for (const title of titles) {
      const r = await Recipe.findOne({ title }).lean();
      console.log('TITLE:', title, 'FOUND?', Boolean(r));
      if (r) console.log(' imageUrl=', r.imageUrl, '\n imagen_principal=', r.imagen_principal);
      console.log('---');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
