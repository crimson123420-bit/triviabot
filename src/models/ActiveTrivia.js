const mongoose = require("mongoose");

const VoteSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    optionIndex: { type: Number, required: true },
    pts: { type: Number, required: true },
  },
  { _id: false },
);

const ActiveTriviaSchema = new mongoose.Schema({
  triviaId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  question: { type: String, required: true },
  endTime: { type: Date, required: true },
  img1: { type: String, required: true },
  img2: { type: String, default: null },
  options: [
    {
      text: { type: String, required: true },
      pts: { type: Number, required: true },
    },
  ],
  votes: { type: [VoteSchema], default: [] },
});

module.exports = mongoose.model("ActiveTrivia", ActiveTriviaSchema);
