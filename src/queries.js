const { getDb } = require("./db");

function header(title) {
  const line = "─".repeat(70);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

function print(label, data) {
  console.log(`\n ${label}`);
  if (Array.isArray(data)) {
    data.forEach((d, i) => console.log(`   [${i + 1}]`, JSON.stringify(d, null, 0)));
  } else {
    console.log("  ", JSON.stringify(data, null, 2));
  }
}

// ─── 1. CREATE 
async function demoCreate() {
  header("БЛОК 1 — CREATE: Додавання документів");
  const db = getDb();

  // Додавання одного документа
  const r1 = await db.collection("users").insertOne({
    username: "ivan",
    email: "ivan@example.com",
    role: "user",
    createdAt: new Date(),
  });
  print("insertOne — додано нового користувача 'ivan'", { insertedId: r1.insertedId });

  // Додавання декількох документів
  const r2 = await db.collection("achievements").insertMany([
    { code: "SPEED_DEMON", title: "Швидкісний учень", category: "speed" },
    { code: "NIGHT_OWL", title: "Нічна сова", category: "habit" },
  ]);
  print("insertMany — додано 2 нових досягнення", { insertedCount: r2.insertedCount });
}

// ─── 2. READ 
async function demoRead() {
  header("БЛОК 2 — READ: Вибірка даних");
  const db = getDb();

  // Вибірка з однієї колекції
  const user = await db.collection("users").findOne({ username: "alice" });
  print("findOne — читання з однієї колекції (користувач 'alice')", user);

  // Вибірка з декількох колекцій 
  const coursesWithLang = await db
    .collection("courses")
    .aggregate([
      {
        $lookup: {
          from: "languages",
          localField: "targetLanguageId",
          foreignField: "_id",
          as: "language",
        },
      },
      { $unwind: "$language" },
      {
        $project: {
          _id: 0,
          title: 1,
          level: 1,
          languageName: "$language.name",
        },
      },
    ])
    .toArray();
  print("aggregate $lookup — вибірка з 2 колекцій (Курси + Назва мови)", coursesWithLang);
}

// ─── 3. FILTER 
async function demoFilter() {
  header("БЛОК 3 — FILTER: Фільтрація за умовами");
  const db = getDb();

  // Фільтрація за однією умовою
  const a1Courses = await db.collection("courses").find({ level: "A1" }).toArray();
  print("Фільтр за 1 умовою (level: 'A1')", a1Courses.map((c) => c.title));

  // Фільтрація за декількома умовами
  const goodProgress = await db
    .collection("enrollments")
    .find({ status: "active", progress: { $gt: 40 } })
    .toArray();
  print("Фільтр за декількома умовами (активні курси з прогресом > 40%)",
    goodProgress.map((e) => ({ status: e.status, progress: `${e.progress}%` }))
  );
}

// ─── 4. UPDATE 
async function demoUpdate() {
  header("БЛОК 4 — UPDATE: Оновлення даних");
  const db = getDb();

  // Оновлення за наявності умови
  const r1 = await db.collection("users").updateOne(
    { username: "alice" },
    { $set: { bio: "Оновлене біо: люблю подорожувати!" } }
  );
  print("updateOne з умовою (оновлено bio для 'alice')", { modifiedCount: r1.modifiedCount });

  // Оновлення БЕЗ умов 
  const r2 = await db.collection("courses").updateMany(
    {},
    { $set: { lastChecked: new Date() } }
  );
  print("updateMany БЕЗ умов (додано поле 'lastChecked' всім курсам)", { modifiedCount: r2.modifiedCount });
}

// ─── 5. DELETE 
async function demoDelete() {
  header("БЛОК 5 — DELETE: Видалення даних");
  const db = getDb();

  // Видалення з умовою
  const r1 = await db.collection("users").deleteOne({ username: "ivan" });
  print("deleteOne — видалено користувача 'ivan'", { deletedCount: r1.deletedCount });

  const r2 = await db.collection("enrollments").deleteMany({ status: "canceled" });
  print("deleteMany — видалено всі скасовані записи", { deletedCount: r2.deletedCount });
}

// ─── 6. SEARCH & AGGREGATION
async function demoSearch() {
  header("БЛОК 6 — SEARCH & AGGREGATION: Пошук та аналітика");
  const db = getDb();

  // Функція пошуку
  const searchResults = await db
    .collection("courses")
    .find({ title: { $regex: "english", $options: "i" } })
    .sort({ level: 1 })
    .toArray();
  print("Пошук за регулярним виразом (курси, що містять 'english')", searchResults.map(c => c.title));

  // Агрегація даних 
  const coursesByLevel = await db
    .collection("courses")
    .aggregate([
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  print("Агрегація ($group + $sort) — підрахунок курсів за їх рівнями", coursesByLevel);
}

async function demoAggregation() {
  // все у demoSearch
}

module.exports = {
  demoCreate,
  demoRead,
  demoFilter,
  demoUpdate,
  demoDelete,
  demoSearch,
  demoAggregation,
};
