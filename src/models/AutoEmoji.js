const mongoose = require("mongoose");

const autoEmojiSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  keyword: { type: String, required: true },
  emoji: { type: String, required: true },
});

autoEmojiSchema.index({ guildId: 1, keyword: 1 }, { unique: true });

module.exports = mongoose.model("AutoEmoji", autoEmojiSchema);
