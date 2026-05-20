const mongoose = require("mongoose");

const OptionConfigSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    pts: { type: Number, required: true },
    tier: { type: String, required: true }, // "optimal", "suboptimal", "decent", "bad"
  },
  { _id: false },
);

const TriviaSetupSchema = new mongoose.Schema({
  creatorId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  question: { type: String, default: "" },
  duration: { type: String, required: true },
  img1: { type: String, required: true },
  img2: { type: String, default: null },
  options: { type: [OptionConfigSchema], default: [] },
});

module.exports = mongoose.model("TriviaSetup", TriviaSetupSchema);
