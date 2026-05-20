const Permission = require("../models/Permission");

async function isAuthorized(interaction) {
  const config = await Permission.findOne({ guildId: interaction.guild.id });
  if (!config) return false;

  // 1. Check if the user ID is explicitly authorized
  const isUser = config.authorizedUsers.includes(interaction.user.id);
  if (isUser) return true;

  // 2. Fetch or fallback safely to read the user's roles array
  // interaction.member.roles can be an array of IDs or a Manager depending on the event context
  const memberRoles = Array.isArray(interaction.member.roles)
    ? interaction.member.roles
    : interaction.member.roles.cache.map((role) => role.id);

  const hasRole = memberRoles.some((roleId) =>
    config.authorizedRoles.includes(roleId),
  );

  return hasRole;
}

module.exports = { isAuthorized };
