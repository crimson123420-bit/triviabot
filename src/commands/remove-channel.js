const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const TriviaSetup = require("../models/TriviaSetup");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-channel")
    .setDescription("Unlinks the designated trivia channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = await TriviaSetup.findOne({
      configId: "SINGLE_SERVER_CONFIG",
    });

    if (!config || !config.triviaChannelId) {
      // FIX: Changed from interaction.reply to interaction.editReply
      return interaction.editReply({
        content: "There is no channel currently linked.",
      });
    }

    config.triviaChannelId = null;
    await config.save();

    // FIX: Changed from interaction.reply to interaction.editReply
    return interaction.editReply({
      content:
        "Successfully unlinked the trivia channel. Trivia can now be created in any channel.",
    });
  },
};
