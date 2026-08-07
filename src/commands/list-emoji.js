const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const AutoEmoji = require("../models/AutoEmoji");

module.exports = {
  publicDefer: false,
  data: new SlashCommandBuilder()
    .setName("list-emoji")
    .setDescription(
      "Display all auto-emoji triggers configured for this server.",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const emojiList = await AutoEmoji.find({ guildId: interaction.guildId });

    if (!emojiList.length) {
      return await interaction.editReply({
        content: "ℹNo auto-emoji triggers found for this server.",
      });
    }

    const formattedList = emojiList
      .map((item) => `• **\`${item.keyword}\`** ➔ ${item.emoji}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("Auto-Emoji Triggers")
      .setColor(0x57f287)
      .setDescription(formattedList)
      .setFooter({ text: "Reactions trigger only on exact string matches." });

    await interaction.editReply({ embeds: [embed] });
  },
};
