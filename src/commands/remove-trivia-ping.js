const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const TriviaPing = require("../models/TriviaPing");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-trivia-ping")
    .setDescription("remove the configured trivia ping role")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Hard runtime verification fail-safe
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.editReply({
        content:
          "Access Denied: This command is strictly reserved for Server Administrators.",
      });
    }

    const guildId = interaction.guild.id;

    // Attempt to locate and delete the ping setup document for this server
    const deletedConfig = await TriviaPing.findOneAndDelete({ guildId });

    if (!deletedConfig) {
      return interaction.editReply({
        content:
          "No active trivia ping configuration was found for this server.",
      });
    }

    return interaction.editReply({
      content:
        "Successfully removed the trivia ping role! New trivia posts will no longer ping anyone.",
    });
  },
};
