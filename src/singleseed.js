require("dotenv").config();

const mongoose = require("mongoose");

const UserStats = require("./models/UserStats");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected");

    const monthlyHistory = {
      "2025-01": 120,
      "2025-02": 340,
      "2025-03": 520,
      "2025-04": 780,
      "2025-05": 940,
      "2025-06": 1100,
      "2025-07": 1380,
      "2025-08": 1620,
      "2025-09": 1850,
      "2025-10": 2100,
      "2025-11": 2450,
      "2025-12": 2800,
    };

    const totalPoints = Object.values(monthlyHistory).reduce(
      (a, b) => a + b,
      0,
    );

    const triviaAttempted = Math.floor(totalPoints / 2.7);

    await UserStats.findOneAndUpdate(
      {
        userId: "660156869771264040",
      },
      {
        userId: "660156869771264040",
        totalPoints,
        triviaAttempted,
        monthlyHistory,
      },
      {
        upsert: true,
      },
    );

    console.log("✅ Dummy data added");

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
