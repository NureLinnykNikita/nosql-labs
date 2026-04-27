const { getDb } = require("./db");

// ─── Фіксовані string-ID для зв'язків між колекціями 
const ids = {
  langEn: "lang_en", langDe: "lang_de", langFr: "lang_fr", langJa: "lang_ja",

  userAlice: "user_alice", userBob: "user_bob",
  userCarol: "user_carol", userDave: "user_dave",

  courseEnA1: "course_en_a1", courseEnB1: "course_en_b1",
  courseDe: "course_de", courseFr: "course_fr",

  lessonEn1: "lesson_en1", lessonEn2: "lesson_en2", lessonEn3: "lesson_en3",
  lessonEnB1_1: "lesson_enb1_1", lessonEnB1_2: "lesson_enb1_2",
  lessonDe1: "lesson_de1", lessonDe2: "lesson_de2",

  exEn1_1: "ex_en1_1", exEn1_2: "ex_en1_2",
  exEn2_1: "ex_en2_1", exDe1_1: "ex_de1_1",

  achFirst: "ach_first", achStreak7: "ach_streak7",
  achPerfect: "ach_perfect", achPolyglot: "ach_polyglot",
};

async function seed() {
  const db = getDb();

  // ── 1. languages 
  await db.collection("languages").deleteMany({});
  await db.collection("languages").insertMany([
    { _id: ids.langEn, code: "en", name: "English" },
    { _id: ids.langDe, code: "de", name: "German" },
    { _id: ids.langFr, code: "fr", name: "French" },
    { _id: ids.langJa, code: "ja", name: "Japanese" },
  ]);

  // ── 2. users 
  await db.collection("users").deleteMany({});
  await db.collection("users").insertMany([
    {
      _id: ids.userAlice, username: "alice", email: "alice@example.com",
      passwordHash: "$2b$10$abc123", avatarUrl: "https://i.pravatar.cc/100?u=alice",
      bio: "Люблю вивчати мови!", role: "user",
      nativeLanguageId: ids.langEn, createdAt: new Date("2024-01-10"),
    },
    {
      _id: ids.userBob, username: "bob", email: "bob@example.com",
      passwordHash: "$2b$10$def456", avatarUrl: null,
      bio: "Вивчаю японську", role: "user",
      nativeLanguageId: ids.langDe, createdAt: new Date("2024-02-15"),
    },
    {
      _id: ids.userCarol, username: "carol", email: "carol@example.com",
      passwordHash: "$2b$10$ghi789", avatarUrl: "https://i.pravatar.cc/100?u=carol",
      bio: null, role: "admin",
      nativeLanguageId: ids.langFr, createdAt: new Date("2024-03-01"),
    },
    {
      _id: ids.userDave, username: "dave", email: "dave@example.com",
      passwordHash: "$2b$10$jkl012", avatarUrl: null,
      bio: "Починаю з нуля", role: "user",
      nativeLanguageId: ids.langEn, createdAt: new Date("2024-04-20"),
    },
  ]);

  // ── 3. courses 
  await db.collection("courses").deleteMany({});
  await db.collection("courses").insertMany([
    {
      _id: ids.courseEnA1, title: "English for Beginners",
      description: "Базовий курс англійської мови", level: "A1",
      targetLanguageId: ids.langEn, createdAt: new Date("2024-01-01"),
    },
    {
      _id: ids.courseEnB1, title: "Intermediate English",
      description: "Курс для тих, хто вже знає основи", level: "B1",
      targetLanguageId: ids.langEn, createdAt: new Date("2024-01-15"),
    },
    {
      _id: ids.courseDe, title: "Deutsch A1",
      description: "Вивчення німецької з нуля", level: "A1",
      targetLanguageId: ids.langDe, createdAt: new Date("2024-02-01"),
    },
    {
      _id: ids.courseFr, title: "Français Débutant",
      description: "Французька для початківців", level: "A2",
      targetLanguageId: ids.langFr, createdAt: new Date("2024-02-10"),
    },
  ]);

  // ── 4. lessons 
  await db.collection("lessons").deleteMany({});
  await db.collection("lessons").insertMany([
    { _id: ids.lessonEn1, courseId: ids.courseEnA1, title: "Greetings", description: "Привітання та знайомство", sequence: 1 },
    { _id: ids.lessonEn2, courseId: ids.courseEnA1, title: "Numbers & Colors", description: "Числа та кольори", sequence: 2 },
    { _id: ids.lessonEn3, courseId: ids.courseEnA1, title: "Family", description: "Члени родини", sequence: 3 },
    { _id: ids.lessonEnB1_1, courseId: ids.courseEnB1, title: "Past Tense", description: "Минулий час", sequence: 1 },
    { _id: ids.lessonEnB1_2, courseId: ids.courseEnB1, title: "Conditionals", description: "Умовні речення", sequence: 2 },
    { _id: ids.lessonDe1, courseId: ids.courseDe, title: "Hallo!", description: "Привітання нім.", sequence: 1 },
    { _id: ids.lessonDe2, courseId: ids.courseDe, title: "Zahlen", description: "Числа", sequence: 2 },
  ]);

  // ── 5. exercises 
  await db.collection("exercises").deleteMany({});
  await db.collection("exercises").insertMany([
    { _id: ids.exEn1_1, lessonId: ids.lessonEn1, type: "translation", question: "Перекладіть: 'Hello, my name is Alice'", correctAnswer: "Привіт, мене звати Аліса", points: 10, sequence: 1 },
    { _id: ids.exEn1_2, lessonId: ids.lessonEn1, type: "writing", question: "Напишіть привітання англійською", correctAnswer: "Hello", points: 5, sequence: 2 },
    { _id: ids.exEn2_1, lessonId: ids.lessonEn2, type: "reading", question: "Яке число 'five'?", correctAnswer: "5", points: 5, sequence: 1 },
    { _id: ids.exDe1_1, lessonId: ids.lessonDe1, type: "translation", question: "Перекладіть: 'Guten Morgen'", correctAnswer: "Доброго ранку", points: 10, sequence: 1 },
  ]);

  // ── 6. enrollments 
  await db.collection("enrollments").deleteMany({});
  await db.collection("enrollments").insertMany([
    { userId: ids.userAlice, courseId: ids.courseEnB1, status: "active", progress: 60, enrolledAt: new Date("2024-01-20"), lastLessonId: ids.lessonEnB1_1 },
    { userId: ids.userAlice, courseId: ids.courseDe, status: "active", progress: 30, enrolledAt: new Date("2024-03-01"), lastLessonId: ids.lessonDe1 },
    { userId: ids.userBob, courseId: ids.courseEnA1, status: "completed", progress: 100, enrolledAt: new Date("2024-02-01"), completedAt: new Date("2024-03-15"), lastLessonId: ids.lessonEn3 },
    { userId: ids.userBob, courseId: ids.courseDe, status: "active", progress: 50, enrolledAt: new Date("2024-04-01"), lastLessonId: ids.lessonDe2 },
    { userId: ids.userCarol, courseId: ids.courseEnA1, status: "canceled", progress: 10, enrolledAt: new Date("2024-02-20") },
    { userId: ids.userDave, courseId: ids.courseEnA1, status: "active", progress: 20, enrolledAt: new Date("2024-04-25"), lastLessonId: ids.lessonEn1 },
  ]);

  // ── 7. exercise_progress
  await db.collection("exercise_progress").deleteMany({});
  await db.collection("exercise_progress").insertMany([
    { userId: ids.userAlice, exerciseId: ids.exEn1_1, isCorrect: true, earnedPoints: 10, attemptNumber: 1, userAnswer: "Привіт, мене звати Аліса", createdAt: new Date("2024-01-21") },
    { userId: ids.userAlice, exerciseId: ids.exEn1_2, isCorrect: false, earnedPoints: 0, attemptNumber: 1, userAnswer: "Hi", createdAt: new Date("2024-01-21") },
    { userId: ids.userAlice, exerciseId: ids.exEn1_2, isCorrect: true, earnedPoints: 5, attemptNumber: 2, userAnswer: "Hello", createdAt: new Date("2024-01-22") },
    { userId: ids.userBob, exerciseId: ids.exEn1_1, isCorrect: true, earnedPoints: 10, attemptNumber: 1, userAnswer: "Привіт, мене звати Аліса", createdAt: new Date("2024-02-02") },
    { userId: ids.userBob, exerciseId: ids.exEn2_1, isCorrect: true, earnedPoints: 5, attemptNumber: 1, userAnswer: "5", createdAt: new Date("2024-02-10") },
    { userId: ids.userDave, exerciseId: ids.exEn1_1, isCorrect: false, earnedPoints: 0, attemptNumber: 1, userAnswer: "Привіт", createdAt: new Date("2024-04-26") },
  ]);

  // ── 8. achievements 
  await db.collection("achievements").deleteMany({});
  await db.collection("achievements").insertMany([
    { _id: ids.achFirst, code: "FIRST_LESSON", title: "Перший крок", description: "Завершити перший урок", category: "progress", conditionType: "lessons_completed", conditionValue: 1 },
    { _id: ids.achStreak7, code: "STREAK_7", title: "Тижневий марафон", description: "Займатися 7 днів поспіль", category: "streak", conditionType: "streak_days", conditionValue: 7 },
    { _id: ids.achPerfect, code: "PERFECT_SCORE", title: "Перфекціоніст", description: "Виконати вправу без помилок з першої спроби", category: "accuracy", conditionType: "perfect_attempt", conditionValue: 1 },
    { _id: ids.achPolyglot, code: "POLYGLOT", title: "Поліглот", description: "Записатися на 3+ курси різними мовами", category: "exploration", conditionType: "courses_enrolled", conditionValue: 3 },
  ]);

  // ── 9. user_achievements
  await db.collection("user_achievements").deleteMany({});
  await db.collection("user_achievements").insertMany([
    { userId: ids.userAlice, achievementId: ids.achFirst, earnedAt: new Date("2024-01-21"), isNotified: true },
    { userId: ids.userAlice, achievementId: ids.achPerfect, earnedAt: new Date("2024-01-21"), isNotified: true },
    { userId: ids.userBob, achievementId: ids.achFirst, earnedAt: new Date("2024-02-02"), isNotified: true },
    { userId: ids.userBob, achievementId: ids.achPerfect, earnedAt: new Date("2024-02-02"), isNotified: false },
  ]);

  console.log("   Дані заповнено: 9 колекцій (languages, users, courses, lessons,");
  console.log("     exercises, enrollments, exercise_progress, achievements, user_achievements).");
  return ids;
}

module.exports = { seed };
