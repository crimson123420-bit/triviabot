const mongoose = require("mongoose");

const TriviaHistorySchema = new mongoose.Schema(
  {
    triviaId: { type: String, required: true },
    option: { type: Number, required: true },
    points: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const UserStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  triviaHistory: {
    type: [TriviaHistorySchema],
    default: [],
  },
});

module.exports = mongoose.model("UserStats", UserStatsSchema);
