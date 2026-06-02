/**
 * userSeeder.js
 * Crea usuarios base para demo, incluyendo admin con permisos de moderacion.
 * Uso: node src/seeders/userSeeder.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const USERS = [
  {
    name: "Admin Chef",
    email: "admin@chefslogic.local",
    password: "admin123",
    role: "admin",
    permissions: {
      canModerateIngredients: true,
      canDeleteAnyDocument: true,
      canApproveUserContent: true
    }
  },
  {
    name: "Seeder User",
    email: "seeder@chefslogic.local",
    password: "changeme123",
    role: "usuario",
    permissions: {
      canModerateIngredients: false,
      canDeleteAnyDocument: false,
      canApproveUserContent: false
    }
  },
  {
    name: "Usuario Demo",
    email: "user@chefslogic.local",
    password: "user12345",
    role: "usuario",
    permissions: {
      canModerateIngredients: false,
      canDeleteAnyDocument: false,
      canApproveUserContent: false
    }
  }
];

async function seedUsers() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chefslogic";
  console.log("Seeder de usuarios: conectando a", uri);
  await mongoose.connect(uri);

  let inserted = 0;
  let updated = 0;

  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const payload = {
      name: user.name,
      email: user.email,
      passwordHash,
      nombre: user.name,
      correo: user.email,
      password: passwordHash,
      avatar: "default.png",
      fecha_registro: new Date(),
      rol: user.role,
      role: user.role,
      permissions: user.permissions
    };

    const existing = await User.findOne({ $or: [{ email: user.email }, { correo: user.email }] });
    if (existing) {
      existing.set(payload);
      await existing.save();
      updated++;
      console.log("  ↻ Actualizado:", user.email, `(${user.role})`);
    } else {
      await User.create(payload);
      inserted++;
      console.log("  ✔ Insertado:", user.email, `(${user.role})`);
    }
  }

  console.log(`\nResumen usuarios: insertados=${inserted}, actualizados=${updated}`);
  await mongoose.disconnect();
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error("ERROR en userSeeder:", err.message || err);
  process.exit(1);
});
