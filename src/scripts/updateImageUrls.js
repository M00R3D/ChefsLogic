require('dotenv').config();
const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');

// Usage:
// BASE_IMAGE_URL=https://cdn.example.com node src/scripts/updateImageUrls.js --dry
// If BASE_IMAGE_URL is provided, local paths beginning with /uploads/ will be replaced with BASE_IMAGE_URL + path
// If not provided, the script will use an external search-based image URL (Unsplash) based on recipe title.

const args = process.argv.slice(2);
const DRY = args.includes('--dry') || args.includes('-d');

async function main() {
  const MONGO = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chefslogic';
  const BASE = process.env.BASE_IMAGE_URL || '';
  const SEARCH_SERVICE = process.env.SEARCH_IMAGE_SERVICE_URL || 'https://source.unsplash.com/800x520/?';

  await mongoose.connect(MONGO);
  console.log('Connected to', MONGO);

  const recipes = await Recipe.find().select('title titulo imageUrl imagen_principal _id').lean();
  console.log(`Found ${recipes.length} recipes`);

  const updates = [];

  for (const r of recipes) {
    const id = r._id;
    const title = r.title || r.titulo || 'image';
    const current = (r.imageUrl || r.imagen_principal || '').trim();

    let newUrl = current;
    const queryText = encodeURIComponent(title.substring(0, 60));
    const searchUrl = `${SEARCH_SERVICE}${queryText}`;

    if (!current) {
      newUrl = searchUrl;
    } else if (/^\//.test(current)) {
      if (BASE) {
        newUrl = `${BASE.replace(/\/$/, '')}${current}`;
      } else {
        newUrl = searchUrl;
      }
    } else if (/^https?:\/\//i.test(current)) {
      newUrl = current;
    } else if (/^data:image\//i.test(current)) {
      newUrl = current;
    } else {
      if (BASE) {
        newUrl = `${BASE.replace(/\/$/, '')}/${current.replace(/^\.\//, '')}`;
      } else {
        newUrl = searchUrl;
      }
    }

    if (newUrl !== current) {
      updates.push({ id, current, newUrl });
    }
  }

  console.log(`Prepared ${updates.length} updates`);
  if (updates.length === 0) {
    await mongoose.disconnect();
    console.log('No changes required. Exiting.');
    return;
  }

  if (DRY) {
    console.table(updates.slice(0, 100));
    console.log('Dry run: no changes saved.');
    await mongoose.disconnect();
    return;
  }

  for (const u of updates) {
    await Recipe.updateOne({ _id: u.id }, { $set: { imageUrl: u.newUrl, imagen_principal: u.newUrl } });
    console.log(`Updated ${u.id} -> ${u.newUrl}`);
  }

  console.log('All updates applied.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
