const mongoose = require("mongoose");

const GuildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  triviaChannelId: { type: String, default: null },
});

module.exports = mongoose.model("GuildConfig", GuildConfigSchema);
