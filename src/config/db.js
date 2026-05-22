const mongoose = require("mongoose");

function normalizeMongoUri(rawUri) {
  const defaultDbName = "chefslogic";
  let uri = String(rawUri || "").trim();

  if (!uri) {
    return "";
  }

  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    uri = `mongodb://${uri}`;
  }

  const [base, query = ""] = uri.split("?");
  const hasDbName = /^mongodb(\+srv)?:\/\/[^/]+\/.+/i.test(base);

  if (!hasDbName) {
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    uri = `${normalizedBase}${defaultDbName}${query ? `?${query}` : ""}`;
  }

  return uri;
}

async function connectDB() {
  const mongoUri = normalizeMongoUri(process.env.MONGODB_URI);

  if (!mongoUri) {
    console.warn("MONGODB_URI is not defined. Running without database connection.");
    return false;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log(`MongoDB URI in use: ${mongoUri}`);
    console.log(`MongoDB connected successfully to database: ${mongoose.connection.name}.`);
    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
