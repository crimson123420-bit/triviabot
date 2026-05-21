const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const GuildConfig = require("../models/GuildConfig"); // Import the new schema

module.exports = {
  data: new SlashCommandBuilder()
    .setName("link-channel")
    .setDescription("Links the trivia creation to a specific text channel.")
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

    await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { triviaChannelId: targetChannel.id },
      { upsert: true, new: true },
    );

    return interaction.editReply({
      content: `Successfully linked trivia creation to ${targetChannel}. Running \`/create-trivia\` is now restricted to this channel.`,
    });
  },
};
