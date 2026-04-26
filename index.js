const { connect, disconnect } = require("./src/db");
const { seed } = require("./seed");
const {
  demoCreate,
  demoRead,
  demoFilter,
  demoUpdate,
  demoDelete,
  demoSearch,
  demoAggregation,
} = require("./src/queries");

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   Лабораторна робота — MongoDB / Система вивчення мов        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  await connect();
  await seed();

  await demoCreate();
  await demoRead();
  await demoFilter();
  await demoUpdate();
  await demoDelete();
  await demoSearch();
  await demoAggregation();

  console.log("\n\n✅  Всі демонстрації завершено успішно!\n");
  await disconnect();
}

main().catch((err) => {
  console.error("❌ Помилка:", err);
  process.exit(1);
});
