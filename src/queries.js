const { getDb } = require("./db");

function header(title) {
  const line = "─".repeat(60);
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


// БЛОК 1 — CREATE  (вставка документів)
async function demoCreate() {
  header("БЛОК 1 — CREATE: вставка нових документів");
  const db = getDb();

  // 1a. insertOne — новий користувач
  const newUser = {
    username: "ivan",
    email: "ivan@example.com",
    passwordHash: "$2b$10$ivan999",
    bio: "Хочу вивчити 5 мов",
    role: "user",
    createdAt: new Date(),
  };
  const r1 = await db.collection("users").insertOne(newUser);
  print("insertOne — новий користувач 'ivan'", { insertedId: r1.insertedId });

  // 1b. insertMany — нові досягнення
  const r2 = await db.collection("achievements").insertMany([
    {
      code: "SPEED_DEMON",
      title: "Швидкісний учень",
      description: "Виконати 10 вправ за 5 хвилин",
      category: "speed",
      conditionType: "exercises_in_minutes",
      conditionValue: 10,
    },
    {
      code: "NIGHT_OWL",
      title: "Нічна сова",
      description: "Займатися після 23:00",
      category: "habit",
      conditionType: "session_hour",
      conditionValue: 23,
    },
  ]);
  print("insertMany — 2 нових досягнення", {
    insertedCount: r2.insertedCount,
    ids: r2.insertedIds,
  });
}

// БЛОК 2 — READ (перегляд з однієї та декількох колекцій)
async function demoRead() {
  header("БЛОК 2 — READ: перегляд документів");
  const db = getDb();

  // 2a. find all — всі мови
  const langs = await db.collection("languages").find({}).toArray();
  print("find() — всі мови (1 колекція)", langs.map((l) => `${l.code}: ${l.name}`));

  // 2b. find all — всі курси
  const courses = await db.collection("courses").find({}).toArray();
  print(
    "find() — всі курси (1 колекція)",
    courses.map((c) => `[${c.level}] ${c.title}`)
  );

  // 2c. findOne — конкретний користувач
  const user = await db.collection("users").findOne({ username: "alice" });
  print("findOne({ username: 'alice' })", {
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });

  // 2d. lookup — курси + назва мови (декілька колекцій через $lookup)
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
          languageCode: "$language.code",
        },
      },
    ])
    .toArray();
  print("aggregate $lookup — курси + мова (2 колекції)", coursesWithLang);

  // 2e. lookup — enrollments + user + course (3 колекції)
  const enrollmentsFull = await db
    .collection("enrollments")
    .aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$user" },
      { $unwind: "$course" },
      {
        $project: {
          _id: 0,
          username: "$user.username",
          courseName: "$course.title",
          status: 1,
          progress: 1,
        },
      },
    ])
    .toArray();
  print(
    "aggregate $lookup — enrollments + users + courses (3 колекції)",
    enrollmentsFull
  );
}

// БЛОК 3 — FILTER (фільтрація за 1 та кількома умовами)
async function demoFilter() {
  header("БЛОК 3 — FILTER: фільтрація документів");
  const db = getDb();

  // 3a. Фільтр за 1 умовою — курси рівня A1
  const a1Courses = await db
    .collection("courses")
    .find({ level: "A1" })
    .toArray();
  print(
    "find({ level: 'A1' }) — курси рівня A1",
    a1Courses.map((c) => c.title)
  );

  // 3b. Фільтр за 1 умовою — активні записи
  const activeEnrollments = await db
    .collection("enrollments")
    .find({ status: "active" })
    .toArray();
  print(
    `find({ status: 'active' }) — активних записів: ${activeEnrollments.length}`,
    activeEnrollments.map((e) => ({
      userId: e.userId.toString().slice(-6),
      progress: `${e.progress}%`,
      status: e.status,
    }))
  );

  // 3c. Фільтр за кількома умовами ($and) — активні записи з прогресом > 40%
  const goodProgress = await db
    .collection("enrollments")
    .find({ status: "active", progress: { $gt: 40 } })
    .toArray();
  print(
    "find({ status:'active', progress:{$gt:40} }) — активні з прогресом > 40%",
    goodProgress.map((e) => ({
      status: e.status,
      progress: `${e.progress}%`,
    }))
  );

  // 3d. Фільтр $or — курси рівня A1 або A2
  const beginnerCourses = await db
    .collection("courses")
    .find({ $or: [{ level: "A1" }, { level: "A2" }] })
    .toArray();
  print(
    "find({ $or: [A1, A2] }) — курси для початківців",
    beginnerCourses.map((c) => `[${c.level}] ${c.title}`)
  );

  // 3e. Фільтр за текстом + роллю — адміни або контент-менеджери
  const staffUsers = await db
    .collection("users")
    .find({ role: { $in: ["admin", "contentManager"] } })
    .toArray();
  print(
    "find({ role: { $in: ['admin','contentManager'] } }) — персонал",
    staffUsers.map((u) => `${u.username} (${u.role})`)
  );

  // 3f. Фільтр за датою — користувачі, зареєстровані після 1 лютого 2024
  const cutoff = new Date("2024-02-01T00:00:00.000Z");
  const newUsers = await db
    .collection("users")
    .find({ createdAt: { $gte: cutoff } })
    .sort({ createdAt: 1 })
    .toArray();

  print(
    "find({ createdAt: { $gte: new Date('2024-02-01') } }) — нові користувачі",
    newUsers.map((u) => `${u.username} — ${u.createdAt.toISOString().slice(0, 10)}`)
  );

  // 3g. Фільтр по вправах — правильні відповіді з 1-ї спроби (isCorrect + attemptNumber)
  const perfectAttempts = await db
    .collection("exercise_progress")
    .find({ isCorrect: true, attemptNumber: 1 })
    .toArray();
  print(
    "find({ isCorrect:true, attemptNumber:1 }) — ідеальні відповіді",
    perfectAttempts.map((p) => ({
      user: p.userId.toString().slice(-6),
      points: p.earnedPoints,
      answer: p.userAnswer,
    }))
  );
}


// БЛОК 4 — UPDATE (оновлення з умовою і без)
async function demoUpdate() {
  header("БЛОК 4 — UPDATE: оновлення документів");
  const db = getDb();

  // 4a. updateOne — оновити bio конкретного користувача (за умовою)
  const r1 = await db
    .collection("users")
    .updateOne(
      { username: "alice" },
      { $set: { bio: "Люблю вивчати мови і подорожувати!", updatedAt: new Date() } }
    );
  print("updateOne({ username:'alice' }, $set bio) — оновлено:", {
    matchedCount: r1.matchedCount,
    modifiedCount: r1.modifiedCount,
  });
  const alice = await db.collection("users").findOne({ username: "alice" });
  print("alice після оновлення", { bio: alice.bio });

  // 4b. updateMany — позначити всі непрочитані досягнення як прочитані
  const r2 = await db
    .collection("user_achievements")
    .updateMany({ isNotified: false }, { $set: { isNotified: true } });
  print("updateMany({ isNotified:false }, $set true) — кількість оновлених:", {
    matchedCount: r2.matchedCount,
    modifiedCount: r2.modifiedCount,
  });

  // 4c. updateMany без попередньої умови — додати поле updatedAt усім курсам
  const r3 = await db
    .collection("courses")
    .updateMany({}, { $set: { updatedAt: new Date() } });
  print("updateMany({}, $set updatedAt) — додати поле всім курсам:", {
    modifiedCount: r3.modifiedCount,
  });

  // 4d. $inc — збільшити прогрес alice у курсі по id
  const enrollment = await db
    .collection("enrollments")
    .findOne({ status: "active", progress: { $lt: 100 } });
  if (enrollment) {
    await db
      .collection("enrollments")
      .updateOne(
        { _id: enrollment._id },
        { $inc: { progress: 10 }, $set: { updatedAt: new Date() } }
      );
    const updated = await db
      .collection("enrollments")
      .findOne({ _id: enrollment._id });
    print("$inc progress +10 для першого активного запису", {
      oldProgress: enrollment.progress,
      newProgress: updated.progress,
    });
  }

  // 4e. upsert — якщо запис не існує — створити, якщо існує — оновити
  const r5 = await db.collection("languages").updateOne(
    { code: "pl" },
    { $setOnInsert: { code: "pl", name: "Polish" } },
    { upsert: true }
  );
  print("upsert — мова 'pl' (Polish)", {
    upsertedId: r5.upsertedId,
    matchedCount: r5.matchedCount,
  });
}


// БЛОК 5 — DELETE
async function demoDelete() {
  header("БЛОК 5 — DELETE: видалення документів");
  const db = getDb();

  // 5a. deleteOne — видалити конкретного користувача 'ivan' (створеного у блоці 1)
  const r1 = await db.collection("users").deleteOne({ username: "ivan" });
  print("deleteOne({ username:'ivan' })", { deletedCount: r1.deletedCount });

  // 5b. deleteMany — видалити скасовані записи на курси
  const r2 = await db
    .collection("enrollments")
    .deleteMany({ status: "canceled" });
  print("deleteMany({ status:'canceled' }) — видалити скасовані записи", {
    deletedCount: r2.deletedCount,
  });

  // 5c. Перевірка — переконатися що canceled enrollment більше нема
  const canceled = await db
    .collection("enrollments")
    .countDocuments({ status: "canceled" });
  print("countDocuments({ status:'canceled' }) після видалення", {
    remaining: canceled,
  });
}


// БЛОК 6 — SEARCH (пошук)
async function demoSearch() {
  header("БЛОК 6 — SEARCH: пошук інформації");
  const db = getDb();

  // 6a. Пошук за регулярним виразом (без індексу) — курси, що містять "English"
  const englishCourses = await db
    .collection("courses")
    .find({ title: { $regex: "English", $options: "i" } })
    .toArray();
  print("find({ title: /English/i }) — пошук курсів", englishCourses.map((c) => c.title));

  // 6b. Пошук по декількох полях — вправи типу 'translation' з points >= 10
  const hardTranslations = await db
    .collection("exercises")
    .find({ type: "translation", points: { $gte: 10 } })
    .toArray();
  print(
    "find({ type:'translation', points:>=10 }) — складні переклади",
    hardTranslations.map((e) => `[${e.type}] ${e.question.slice(0, 40)} (${e.points} балів)`)
  );

  // 6c. Повнотекстовий пошук — використовуючи нативний індекс $text MongoDB
  await db.collection("courses").createIndex({ title: "text", description: "text" });

  const textSearch = await db
    .collection("courses")
    .find({ $text: { $search: "beginners початківців débutant" } })
    .toArray();

  print(
    "text search ($text) — 'beginners/початківців/débutant' у курсах",
    textSearch.map((c) => c.title)
  );

  // 6d. Проєкція — отримати лише потрібні поля
  const userEmails = await db
    .collection("users")
    .find({}, { projection: { _id: 0, username: 1, email: 1, role: 1 } })
    .toArray();
  print("find з projection — лише username, email, role", userEmails);

  // 6e. sort + limit — топ-3 записи за прогресом
  const topEnrollments = await db
    .collection("enrollments")
    .find({})
    .sort({ progress: -1 })
    .limit(3)
    .toArray();
  print(
    "find().sort({ progress: -1 }).limit(3) — топ 3 за прогресом",
    topEnrollments.map((e) => ({
      userId: e.userId.toString().slice(-6),
      progress: `${e.progress}%`,
      status: e.status,
    }))
  );
}


// БЛОК 7 — AGGREGATION (агрегація)
async function demoAggregation() {
  header("БЛОК 7 — AGGREGATION: агрегація даних");
  const db = getDb();

  // 7a. Кількість курсів по рівнях
  const coursesByLevel = await db
    .collection("courses")
    .aggregate([
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  print("$group by level — кількість курсів на кожному рівні", coursesByLevel);

  // 7b. Середній прогрес по статусах enrollment
  const avgProgressByStatus = await db
    .collection("enrollments")
    .aggregate([
      {
        $group: {
          _id: "$status",
          avgProgress: { $avg: "$progress" },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgProgress: -1 } },
    ])
    .toArray();
  print(
    "$group by status — середній прогрес по кожному статусу",
    avgProgressByStatus.map((r) => ({
      status: r._id,
      avgProgress: `${r.avgProgress.toFixed(1)}%`,
      count: r.count,
    }))
  );

  // 7c. Загальні бали кожного користувача (з exercise_progress)
  const totalPointsPerUser = await db
    .collection("exercise_progress")
    .aggregate([
      {
        $group: {
          _id: "$userId",
          totalPoints: { $sum: "$earnedPoints" },
          totalAttempts: { $sum: 1 },
          correctAnswers: { $sum: { $cond: ["$isCorrect", 1, 0] } },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          username: "$user.username",
          totalPoints: 1,
          totalAttempts: 1,
          correctAnswers: 1,
          accuracy: {
            $round: [
              { $multiply: [{ $divide: ["$correctAnswers", "$totalAttempts"] }, 100] },
              1,
            ],
          },
        },
      },
      { $sort: { totalPoints: -1 } },
    ])
    .toArray();
  print(
    "$group + $lookup + $project — рейтинг користувачів за балами",
    totalPointsPerUser.map((u) => ({
      username: u.username,
      totalPoints: u.totalPoints,
      accuracy: `${u.accuracy}%`,
    }))
  );

  // 7d. Кількість уроків у кожному курсі
  const lessonsPerCourse = await db
    .collection("lessons")
    .aggregate([
      {
        $group: {
          _id: "$courseId",
          lessonCount: { $sum: 1 },
          titles: { $push: "$title" },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $project: {
          _id: 0,
          courseName: "$course.title",
          lessonCount: 1,
          titles: 1,
        },
      },
      { $sort: { lessonCount: -1 } },
    ])
    .toArray();
  print("$group + $lookup — кількість уроків у кожному курсі", lessonsPerCourse);

  // 7e. $facet — одночасно: кількість за роллю та дата реєстрації
  const userFacets = await db
    .collection("users")
    .aggregate([
      {
        $facet: {
          byRole: [
            { $group: { _id: "$role", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          totalUsers: [{ $count: "count" }],
        },
      },
    ])
    .toArray();
  print("$facet — зріз даних по користувачах", {
    totalUsers: userFacets[0].totalUsers[0]?.count,
    byRole: userFacets[0].byRole,
  });

  // 7f. Pipeline — курси, які мають активні enrollments (зі статистикою)
  const activeCourseStats = await db
    .collection("enrollments")
    .aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$courseId",
          activeStudents: { $sum: 1 },
          avgProgress: { $avg: "$progress" },
          maxProgress: { $max: "$progress" },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $project: {
          _id: 0,
          course: "$course.title",
          level: "$course.level",
          activeStudents: 1,
          avgProgress: { $round: ["$avgProgress", 1] },
          maxProgress: 1,
        },
      },
      { $sort: { activeStudents: -1 } },
    ])
    .toArray();
  print("pipeline — статистика активних курсів", activeCourseStats);
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
