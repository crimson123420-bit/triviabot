const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const TriviaSetup = require("../models/TriviaSetup");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("link-channel")
    .setDescription(
      "Links the trivia creation system to a specific text channel.",
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where trivia must be created")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel("channel");

    // Permanently save to MongoDB
    await TriviaSetup.findOneAndUpdate(
      { configId: "SINGLE_SERVER_CONFIG" },
      { triviaChannelId: targetChannel.id },
      { upsert: true, new: true },
    );

    return interaction.reply({
      content: `Successfully linked trivia creation to ${targetChannel}. Running \`/create-trivia\` is now restricted to this channel.`,
      ephemeral: true,
    });
  },
};
