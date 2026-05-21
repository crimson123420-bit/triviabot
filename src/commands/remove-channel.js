const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const GuildConfig = require("../models/GuildConfig"); // Import the new schema

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-channel")
    .setDescription("Unlinks the designated trivia channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = await GuildConfig.findOne({ guildId: interaction.guild.id });

    if (!config || !config.triviaChannelId) {
      return interaction.editReply({
        content: "There is no channel currently linked.",
      });
    }

    config.triviaChannelId = null;
    await config.save(); // This works perfectly now because there are no required creator fields!

    return interaction.editReply({
      content:
        "Successfully unlinked the trivia channel. Trivia can now be created in any channel.",
    });
  },
};
