const mongoose = require("mongoose");

const TriviaPingSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  roleId: { type: String, required: true },
});

module.exports = mongoose.model("TriviaPing", TriviaPingSchema);
