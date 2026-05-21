const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const Permission = require("../models/Permission");
const TriviaSetup = require("../models/TriviaSetup"); // 1. IMPORT YOUR TRIVIA SETUP MODEL
const GuildConfig = require("../models/GuildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("access-list")
    .setDescription(
      "Show all roles, individuals, and channels configured for the trivia engine",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.editReply({
        content:
          "❌ Access Denied: This command is strictly reserved for Server Administrators.",
      });
    }

    const guildId = interaction.guild.id;

    // 2. FETCH BOTH THE PERMISSIONS AND THE CHANNEL CONFIG PARALLEL
    const config = await Permission.findOne({ guildId });
    const channelConfig = await GuildConfig.findOne({ guildId });

    if (
      (!config ||
        (config.authorizedRoles.length === 0 &&
          config.authorizedUsers.length === 0)) &&
      (!channelConfig || !channelConfig.triviaChannelId)
    ) {
      return interaction.editReply({
        content:
          "No trivia configurations found. Use `/manage-access` or `/link-channel` to get started!",
      });
    }

    const rolesList =
      config && config.authorizedRoles.length > 0
        ? config.authorizedRoles.map((id) => `<@&${id}>`).join("\n")
        : "*None*";

    const usersList =
      config && config.authorizedUsers.length > 0
        ? config.authorizedUsers.map((id) => `<@${id}>`).join("\n")
        : "*None*";

    // 3. FORMAT THE DISCORD CHANNEL PING DYNAMICALLY
    const channelDisplay =
      channelConfig && channelConfig.triviaChannelId
        ? `<#${channelConfig.triviaChannelId}>`
        : "*No channel linked (Can be used anywhere)*";

    const listEmbed = new EmbedBuilder()
      .setTitle("Trivia System Dashboard")
      .setColor(0x5865f2)
      .addFields(
        { name: "👥 Authorized Roles", value: rolesList, inline: true },
        { name: "👤 Authorized Individuals", value: usersList, inline: true },
        // 4. ADD THE CHANNEL FIELD SPANNING THE FULL WIDTH BELOW THE ROLES/USERS
        {
          name: "Designated Trivia Creation Channel",
          value: channelDisplay,
          inline: false,
        },
      )
      .setFooter({ text: `Requested by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [listEmbed] });
  },
};
