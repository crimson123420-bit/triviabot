const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const AutoEmoji = require("../models/AutoEmoji");

module.exports = {
  publicDefer: false,
  data: new SlashCommandBuilder()
    .setName("remove-auto-emoji")
    .setDescription("Remove an auto-emoji trigger keyword.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("keyword")
        .setDescription("The keyword to remove")
        .setRequired(true),
    ),

  async execute(interaction) {
    const keyword = interaction.options
      .getString("keyword")
      .trim()
      .toLowerCase();

    const deleted = await AutoEmoji.findOneAndDelete({
      guildId: interaction.guildId,
      keyword,
    });

    if (!deleted) {
      return await interaction.editReply({
        content: `No active auto-emoji rule found for keyword: \`${keyword}\``,
      });
    }

    await interaction.editReply({
      content: `Successfully removed auto-emoji reaction for \`${keyword}\`.`,
    });
  },
};
