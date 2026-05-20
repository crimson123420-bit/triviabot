const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Permission = require("../models/Permission");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("manage-access")
    .setDescription("Manage who can create trivia")
    // Natively restricts visibility in the Discord client UI to Server Administrators
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("add-role")
        .setDescription("Authorize a role to create trivia quiz")
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("The role").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove-role")
        .setDescription("Deauthorize a role")
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("The role").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add-individual")
        .setDescription("Authorize a specific user to create trivia quiz")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The user").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove-individual")
        .setDescription("Deauthorize a specific user")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The user").setRequired(true),
        ),
    ),

  async execute(interaction) {
    // Hard check: Fail-safe runtime validation to guarantee non-admins can't bypass via modified payloads
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.editReply({
        content:
          "❌ Access Denied: This utility control suite is strictly reserved for Server Administrators.",
      });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let config = await Permission.findOne({ guildId });
    if (!config) config = new Permission({ guildId });

    if (sub === "add-role") {
      const role = interaction.options.getRole("role");
      if (config.authorizedRoles.includes(role.id))
        return interaction.editReply("Role is already authorized.");
      config.authorizedRoles.push(role.id);
      await config.save();
      return interaction.editReply(
        `Added **${role.name}** to authorized roles.`,
      );
    }

    if (sub === "remove-role") {
      const role = interaction.options.getRole("role");
      config.authorizedRoles = config.authorizedRoles.filter(
        (id) => id !== role.id,
      );
      await config.save();
      return interaction.editReply(
        `Removed **${role.name}** from authorized roles.`,
      );
    }

    if (sub === "add-individual") {
      const user = interaction.options.getUser("user");
      if (config.authorizedUsers.includes(user.id))
        return interaction.editReply("User is already authorized.");
      config.authorizedUsers.push(user.id);
      await config.save();
      return interaction.editReply(
        `Added **${user.username}** to authorized individuals.`,
      );
    }

    if (sub === "remove-individual") {
      const user = interaction.options.getUser("user");
      config.authorizedUsers = config.authorizedUsers.filter(
        (id) => id !== user.id,
      );
      await config.save();
      return interaction.editReply(
        `Removed **${user.username}** from authorized individuals.`,
      );
    }
  },
};
