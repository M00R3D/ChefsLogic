require('dotenv').config();
const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chefslogic';
    await mongoose.connect(uri);
    const titles = [
      'Mole negro oaxaqueño',
      'Tlayudas oaxaqueñas auténticas',
      'Tamales de mole oaxaqueño',
      'Ensalada de hoja santa y queso',
      'Chapulines con guacamole',
      'Pescado en hoja de plátano',
      'Sopa de piedra (versión)',
      'Mole verde con pollo'
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
