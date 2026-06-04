
/**
 * userSeeder.js
 * Seeder avanzado para poblar usuarios con fechas históricas
 * y mejorar visualización del dashboard analytics.
 *
 * Uso:
 * node src/seeders/userSeeder.js
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
    daysAgo: 0
  },

  {
    name: "Seeder User",
    email: "seeder@chefslogic.local",
    password: "changeme123",
    role: "usuario",
    daysAgo: 2
  },

  {
    name: "Usuario Demo",
    email: "user@chefslogic.local",
    password: "user12345",
    role: "usuario",
    daysAgo: 5
  },

  {
    name: "Carlos Ramirez",
    email: "carlos@chefslogic.local",
    password: "123456",
    role: "usuario",
    daysAgo: 9
  },

  {
    name: "Andrea Torres",
    email: "andrea@chefslogic.local",
    password: "123456",
    role: "usuario",
    daysAgo: 15
  },

  {
    name: "Luis Herrera",
    email: "luis@chefslogic.local",
    password: "123456",
    role: "usuario",
    daysAgo: 24
  },

  {
    name: "Fernanda Soto",
    email: "fernanda@chefslogic.local",
    password: "123456",
    role: "usuario",
    daysAgo: 41
  },

  {
    name: "Ricardo Vega",
    email: "ricardo@chefslogic.local",
    password: "123456",
    role: "usuario",
    daysAgo: 67
  },

  {
    name: "Valeria Cruz",
    email: "valeria@chefslogic.local",
    password: "123456",
    role: "usuario",
    daysAgo: 103
  },

  {
    name: "Daniel Morales",
    email: "daniel@chefslogic.local",
    password: "123456",
    role: "usuario",
    daysAgo: 180
  },

  {
    name: "Mariana Lopez",
    email: "mariana@chefslogic.local",
    password: "123456",
    role: "usuario",
    daysAgo: 290
  }
];

/**
 * Genera usuarios aleatorios adicionales
 * para llenar gráficas y métricas.
 */
function generateRandomUsers(amount = 40) {

  const generated = [];

  for (let i = 1; i <= amount; i++) {

    const daysAgo = Math.floor(Math.random() * 365);

    generated.push({
      name: `Usuario Random ${i}`,
      email: `random${i}@chefslogic.local`,
      password: "123456",
      role: "usuario",
      daysAgo
    });

  }

  return generated;
}

async function seedUsers() {

  const uri =
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/chefslogic";

  console.log("Seeder de usuarios: conectando a", uri);

  await mongoose.connect(uri);

  const ALL_USERS = [
    ...USERS,
    ...generateRandomUsers(40)
  ];

  let inserted = 0;
  let updated = 0;

  for (const user of ALL_USERS) {

    const passwordHash =
      await bcrypt.hash(user.password, 12);

    /**
     * Fecha histórica simulada
     */
    const registerDate = new Date();

    registerDate.setDate(
      registerDate.getDate() - (user.daysAgo || 0)
    );

    const payload = {

      name: user.name,
      email: user.email,

      passwordHash,

      nombre: user.name,
      correo: user.email,

      password: passwordHash,

      avatar: "default.png",

      fecha_registro: registerDate,

      role: user.role,
      rol: user.role,

      isActive: true,

      permissions: {
        canModerateIngredients:
          user.role === "admin",

        canDeleteAnyDocument:
          user.role === "admin",

        canApproveUserContent:
          user.role === "admin"
      }

    };

    const existing = await User.findOne({
      $or: [
        { email: user.email },
        { correo: user.email }
      ]
    });

    if (existing) {

      existing.set(payload);

      await existing.save();

      updated++;

      console.log(
        "↻ Actualizado:",
        user.email,
        `(${user.role})`,
        `- hace ${user.daysAgo} días`
      );

    } else {

      await User.create(payload);

      inserted++;

      console.log(
        "✔ Insertado:",
        user.email,
        `(${user.role})`,
        `- hace ${user.daysAgo} días`
      );

    }

  }

  console.log("\n=================================");
  console.log("Seeder completado");
  console.log("=================================");

  console.log("Usuarios insertados:", inserted);
  console.log("Usuarios actualizados:", updated);
  console.log("Total procesados:", ALL_USERS.length);

  await mongoose.disconnect();

  process.exit(0);
}

seedUsers().catch((err) => {

  console.error(
    "ERROR en userSeeder:",
    err.message || err
  );

  process.exit(1);

});
