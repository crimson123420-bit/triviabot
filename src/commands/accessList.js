const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const Permission = require("../models/Permission");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("access-list")
    .setDescription(
      "Show all roles and individuals authorized to create trivia",
    )
    // Natively locks UI visibility and execution strictly to Server Administrators
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Hard check: Fail-safe runtime verification if Discord UI cache misbehaves
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.editReply({
        content:
          "❌ Access Denied: This command is strictly reserved for Server Administrators.",
      });
    }

    const guildId = interaction.guild.id;
    const config = await Permission.findOne({ guildId });

    if (
      !config ||
      (config.authorizedRoles.length === 0 &&
        config.authorizedUsers.length === 0)
    ) {
      return interaction.editReply({
        content:
          "⚠️ No authorized trainers found. Use `/manage-access` to get started!",
      });
    }

    const rolesList =
      config.authorizedRoles.length > 0
        ? config.authorizedRoles.map((id) => `<@&${id}>`).join("\n")
        : "*None*";

    const usersList =
      config.authorizedUsers.length > 0
        ? config.authorizedUsers.map((id) => `<@${id}>`).join("\n")
        : "*None*";

    const listEmbed = new EmbedBuilder()
      .setTitle("Trivia Access List")
      .setColor(0x5865f2)
      .addFields(
        { name: "👥 Authorized Roles", value: rolesList, inline: true },
        { name: "👤 Authorized Individuals", value: usersList, inline: true },
      )
      .setFooter({ text: `Requested by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [listEmbed] });
  },
};
