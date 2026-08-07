const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const AutoEmoji = require("../models/AutoEmoji");

module.exports = {
  publicDefer: false,
  data: new SlashCommandBuilder()
    .setName("add-auto-emoji")
    .setDescription("Set an exact keyword trigger to auto-react with an emoji.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("keyword")
        .setDescription("The exact word or phrase to trigger on")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("emoji")
        .setDescription("The emoji to react with")
        .setRequired(true),
    ),

  async execute(interaction) {
    const keyword = interaction.options
      .getString("keyword")
      .trim()
      .toLowerCase();
    const emoji = interaction.options.getString("emoji").trim();

    await AutoEmoji.findOneAndUpdate(
      { guildId: interaction.guildId, keyword },
      { emoji },
      { upsert: true, new: true },
    );

    await interaction.editReply({
      content: `Auto-emoji set! Messages matching strictly \`${keyword}\` will react with ${emoji}`,
    });
  },
};
