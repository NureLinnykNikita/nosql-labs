const { MongoClient } = require("mongodb");

// Стандартна адреса локальної MongoDB
const uri = "mongodb://127.0.0.1:27017";
const dbName = "nosql_nure_project";

let client;
let db;

async function connect() {
  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log(`MongoDB — успішно підключено до БД '${dbName}' на локальному сервері`);
    return db;
  } catch (error) {
    console.error("Помилка підключення до MongoDB:", error);
    process.exit(1);
  }
}

async function disconnect() {
  if (client) {
    await client.close();
    console.log("MongoDB відключено.");
  }
}

function getDb() {
  if (!db) {
    throw new Error("БД не підключена. Виклич connect() спочатку.");
  }
  return db;
}

module.exports = { connect, disconnect, getDb };
