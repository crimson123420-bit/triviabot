const mongoose = require("mongoose");
require("dotenv").config();

const UserStats = require("./models/UserStats");

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("🌱 Connected to DB");

  const users = [];

  const now = new Date();

  // last 3 months
  const months = [];

  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setMonth(now.getMonth() - i);
    months.push(getMonthKey(d));
  }

  for (let i = 1; i <= 20; i++) {
    const userId = `dummy_user_${i}`;

    const triviaHistory = [];

    let totalPoints = 0;

    for (const month of months) {
      const entries = random(5, 15);

      for (let j = 0; j < entries; j++) {
        const points = random(0, 4);

        const fakeDate = new Date();
        fakeDate.setMonth(now.getMonth() - months.indexOf(month));

        const triviaId = fakeDate.getTime().toString();

        triviaHistory.push({
          triviaId,
          option: random(1, 4),
          points,
        });

        totalPoints += points;
      }
    }

    users.push({
      userId,
      totalPoints,
      triviaHistory,
    });
  }

  await UserStats.insertMany(users);

  console.log("✅ Inserted 20 dummy users with 3 months data");

  await mongoose.disconnect();
})();
