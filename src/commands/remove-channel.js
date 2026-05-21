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
      return interaction.reply({
        content: "❌ There is no channel currently linked.",
        ephemeral: true,
      });
    }

    config.triviaChannelId = null;
    await config.save();

    return interaction.reply({
      content:
        "🗑️ Successfully unlinked the trivia channel. Trivia can now be created in any channel.",
      ephemeral: true,
    });
  },
};
