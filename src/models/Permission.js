const mongoose = require("mongoose");

const PermissionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  authorizedRoles: { type: [String], default: [] },
  authorizedUsers: { type: [String], default: [] },
});

module.exports = mongoose.model("Permission", PermissionSchema);
