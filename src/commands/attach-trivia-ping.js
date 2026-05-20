const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const TriviaPing = require("../models/TriviaPing");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("attach-trivia-ping")
    .setDescription(
      "Link a role that gets pinged whenever a new trivia is published",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption((opt) =>
      opt
        .setName("role")
        .setDescription("The role to notification-ping")
        .setRequired(true),
    ),

  async execute(interaction) {
    // Hard runtime verification fail-safe
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.editReply({
        content:
          "Access Denied: This is strictly reserved for Server Administrators.",
      });
    }

    const guildId = interaction.guild.id;
    const role = interaction.options.getRole("role");

    await TriviaPing.findOneAndUpdate(
      { guildId },
      { roleId: role.id },
      { upsert: true, new: true },
    );

    return interaction.editReply({
      content: `Successfully linked **${role.name}** as the official trivia ping!`,
    });
  },
};
