const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const uri = "mongodb://127.0.0.1:27017";
const dbName = "nosql_nure_project";
let db;

async function connect() {
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log(`✓ MongoDB підключено до '${dbName}'`);
}

// ─── USERS ────────────────────────────────────────────────────────────────────

app.get("/api/users", async (req, res) => {
  try {
    const { search, role } = req.query;
    const filter = {};
    if (search) filter.username = { $regex: search, $options: "i" };
    if (role) filter.role = role;
    const users = await db
      .collection("users")
      .find(filter)
      .project({ passwordHash: 0 })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { username, email, role = "user", bio } = req.body;
    if (!username || !email) return res.status(400).json({ error: "username та email обов'язкові" });
    const doc = { username, email, role, bio: bio || "", createdAt: new Date(), updatedAt: new Date() };
    const result = await db.collection("users").insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "Username або email вже існує" });
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { username, email, role, bio } = req.body;
    const update = { $set: { updatedAt: new Date() } };
    if (username) update.$set.username = username;
    if (email) update.$set.email = email;
    if (role) update.$set.role = role;
    if (bio !== undefined) update.$set.bio = bio;
    const result = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      update,
      { returnDocument: "after", projection: { passwordHash: 0 } }
    );
    if (!result) return res.status(404).json({ error: "Користувача не знайдено" });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Не знайдено" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── COURSES ──────────────────────────────────────────────────────────────────

app.get("/api/courses", async (req, res) => {
  try {
    const { level, search } = req.query;
    const filter = {};
    if (level) filter.level = level;
    if (search) filter.title = { $regex: search, $options: "i" };
    const courses = await db
      .collection("courses")
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "languages",
            localField: "targetLanguageId",
            foreignField: "_id",
            as: "language",
          },
        },
        { $unwind: { path: "$language", preserveNullAndEmpty: true } },
        {
          $project: {
            title: 1, level: 1, description: 1, createdAt: 1,
            languageName: "$language.name",
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 50 },
      ])
      .toArray();
    res.json(courses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/courses", async (req, res) => {
  try {
    const { title, description, level, targetLanguageId } = req.body;
    if (!title || !level) return res.status(400).json({ error: "title та level обов'язкові" });
    const doc = {
      title, description: description || "", level,
      targetLanguageId: targetLanguageId ? Number(targetLanguageId) : null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    const result = await db.collection("courses").insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/courses/:id", async (req, res) => {
  try {
    const { title, description, level } = req.body;
    const $set = { updatedAt: new Date() };
    if (title) $set.title = title;
    if (description !== undefined) $set.description = description;
    if (level) $set.level = level;
    const result = await db.collection("courses").findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set },
      { returnDocument: "after" }
    );
    if (!result) return res.status(404).json({ error: "Курс не знайдено" });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/courses/:id", async (req, res) => {
  try {
    const result = await db.collection("courses").deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Не знайдено" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── STATS (aggregation) ──────────────────────────────────────────────────────

app.get("/api/stats", async (req, res) => {
  try {
    const [userCount, courseCount, enrollCount] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("courses").countDocuments(),
      db.collection("enrollments").countDocuments(),
    ]);

    const coursesByLevel = await db
      .collection("courses")
      .aggregate([
        { $group: { _id: "$level", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const usersByRole = await db
      .collection("users")
      .aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    res.json({ userCount, courseCount, enrollCount, coursesByLevel, usersByRole });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GEODATA: LEARNING CENTERS ────────────────────────────────────────────────

// Ініціалізація геоіндексу
async function ensureGeoIndex() {
  await db.collection("learning_centers").createIndex({ location: "2dsphere" });
}

app.get("/api/geo/centers", async (req, res) => {
  try {
    const centers = await db.collection("learning_centers").find({}).toArray();
    res.json(centers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/geo/centers", async (req, res) => {
  try {
    const { name, description, type, lat, lng } = req.body;
    if (!name || lat == null || lng == null) {
      return res.status(400).json({ error: "name, lat, lng обов'язкові" });
    }
    const doc = {
      name,
      description: description || "",
      type: type || "school",
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      createdAt: new Date(),
    };
    const result = await db.collection("learning_centers").insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/geo/centers/:id", async (req, res) => {
  try {
    const { name, description, type, lat, lng } = req.body;
    const $set = {};
    if (name) $set.name = name;
    if (description !== undefined) $set.description = description;
    if (type) $set.type = type;
    if (lat != null && lng != null) {
      $set.location = { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] };
    }
    const result = await db.collection("learning_centers").findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set },
      { returnDocument: "after" }
    );
    if (!result) return res.status(404).json({ error: "Не знайдено" });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/geo/centers/:id", async (req, res) => {
  try {
    const result = await db.collection("learning_centers").deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Не знайдено" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// $near — центри поруч із заданою точкою
app.get("/api/geo/nearby", async (req, res) => {
  try {
    const { lat, lng, radius = 50000 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "lat та lng обов'язкові" });
    const centers = await db
      .collection("learning_centers")
      .find({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: parseFloat(radius),
          },
        },
      })
      .toArray();
    res.json(centers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// $geoWithin — центри в межах полігону міста
app.get("/api/geo/within-city", async (req, res) => {
  try {
    const { city } = req.query;

    // Приблизні координати міст України
    const cityPolygons = {
      kharkiv: [
        [36.05, 49.85], [36.35, 49.85], [36.35, 50.10], [36.05, 50.10], [36.05, 49.85]
      ],
      kyiv: [
        [30.20, 50.30], [30.80, 50.30], [30.80, 50.60], [30.20, 50.60], [30.20, 50.30]
      ],
      lviv: [
        [23.90, 49.77], [24.10, 49.77], [24.10, 49.90], [23.90, 49.90], [23.90, 49.77]
      ],
    };

    const polygon = cityPolygons[city?.toLowerCase()];
    if (!polygon) return res.status(400).json({ error: "Місто не підтримується (kharkiv/kyiv/lviv)" });

    const centers = await db
      .collection("learning_centers")
      .find({
        location: {
          $geoWithin: {
            $geometry: { type: "Polygon", coordinates: [polygon] },
          },
        },
      })
      .toArray();
    res.json(centers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

connect()
  .then(ensureGeoIndex)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✓ Сервер запущено: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Помилка запуску:", err);
    process.exit(1);
  });
