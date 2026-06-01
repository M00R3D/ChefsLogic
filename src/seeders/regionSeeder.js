/**
 * regionSeeder.js
 * Inserta (o actualiza) las 7 regiones gastronómicas mexicanas oficiales.
 * Usa upsert para que pueda ejecutarse múltiples veces sin duplicados.
 *
 * Uso:
 *   node src/seeders/regionSeeder.js
 */

require("dotenv").config();

const mongoose = require("mongoose");
const Region   = require("../models/Region");

// ── Datos oficiales de las 7 regiones ─────────────────────────────────────────

const REGIONS = [
  {
    name:        "Noroeste",
    slug:        "noroeste",
    description: "Gastronomía costera con protagonismo de mariscos, pescados, carnes asadas y trigo. Influencia de las culturas indígenas seris, yaquis y mayos.",
    states:      ["Baja California", "Baja California Sur", "Chihuahua", "Sinaloa", "Sonora"],
    climate:     "seco",
    spiceLevel:  2,
    icon:        "🌊"
  },
  {
    name:        "Noreste",
    slug:        "noreste",
    description: "Cocina de frontera con carnes a la parrilla, cabrito, machaca y platillos de influencia tex-mex. Tradición vaquera y minera muy marcada.",
    states:      ["Coahuila", "Durango", "Nuevo León", "San Luis Potosí", "Tamaulipas"],
    climate:     "seco",
    spiceLevel:  2,
    icon:        "🥩"
  },
  {
    name:        "Occidente",
    slug:        "occidente",
    description: "Región del tequila, la birria y la cocina tapatía. Rica en chiles, maíz y platillos festivos. Jalisco es su corazón gastronómico.",
    states:      ["Aguascalientes", "Colima", "Guanajuato", "Jalisco", "Michoacán", "Nayarit", "Querétaro", "Zacatecas"],
    climate:     "templado",
    spiceLevel:  3,
    icon:        "🌮"
  },
  {
    name:        "Centro-Sur",
    slug:        "centro-sur",
    description: "El corazón culinario del país. Moles, chiles en nogada, tlayudas, tamales y antojitos de todo tipo. Ciudad de México como epicentro gastronómico.",
    states:      ["Ciudad de México", "Estado de México", "Hidalgo", "Morelos", "Puebla", "Tlaxcala"],
    climate:     "templado",
    spiceLevel:  4,
    icon:        "🏛️"
  },
  {
    name:        "Oriente",
    slug:        "oriente",
    description: "Fusión de ingredientes del Golfo, vainilla, chiles secos y cocina veracruzana. Los mariscos conviven con platillos de selva y montaña.",
    states:      ["Hidalgo", "Puebla", "Tabasco", "Veracruz", "San Luis Potosí"],
    climate:     "tropical",
    spiceLevel:  3,
    icon:        "🌿"
  },
  {
    name:        "Sur",
    slug:        "sur",
    description: "Casa del mole negro, el mezcal artesanal, los tlayudas y la cocina zapoteca y mixteca. Oaxaca concentra una de las tradiciones culinarias más ricas de México.",
    states:      ["Guerrero", "Oaxaca", "Chiapas"],
    climate:     "tropical",
    spiceLevel:  4,
    icon:        "🫙"
  },
  {
    name:        "Sureste",
    slug:        "sureste",
    description: "Cocina maya con achiote, cochinita pibil, sopa de lima y mariscos del Caribe. La influencia peninsular le da un carácter único dentro de la gastronomía mexicana.",
    states:      ["Campeche", "Quintana Roo", "Tabasco", "Veracruz", "Yucatán"],
    climate:     "tropical",
    spiceLevel:  3,
    icon:        "🌴"
  }
];

// ── Función principal ──────────────────────────────────────────────────────────

async function seedRegions() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chefslogic";

  console.log("────────────────────────────────────────────");
  console.log("  Chef's Logic — Seeder de Regiones");
  console.log("────────────────────────────────────────────");
  console.log(`  Conectando a: ${uri}\n`);

  await mongoose.connect(uri);
  console.log(`  MongoDB: conectado a "${mongoose.connection.name}"\n`);

  let inserted = 0;
  let updated  = 0;

  for (const region of REGIONS) {
    const existing = await Region.findOne({ slug: region.slug });

    if (existing) {
      existing.set(region);
      await existing.save();
      console.log(`  ↻ Actualizada: ${region.name} (${region.slug})`);
      updated++;
    } else {
      await Region.create(region);
      console.log(`  ✔ Insertada:   ${region.name} (${region.slug})`);
      inserted++;
    }
  }

  console.log(`\n  Resumen:`);
  console.log(`    Regiones insertadas : ${inserted}`);
  console.log(`    Regiones actualizadas: ${updated}`);
  console.log(`    Total procesadas    : ${REGIONS.length}`);
  console.log("\n────────────────────────────────────────────");
  console.log("  Seeder completado correctamente.");
  console.log("────────────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

// ── Ejecución ─────────────────────────────────────────────────────────────────

seedRegions().catch((err) => {
  console.error("\n  ERROR en el seeder de regiones:");
  console.error(" ", err.message || err);
  process.exit(1);
});
