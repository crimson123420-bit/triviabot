const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const UserStats = require("../models/UserStats");

// Helper function to extract a YYYY-MM key from a trivia timestamp
function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Helper to calculate total points and monthly/daily historical breakdowns purely from the array
function parseHistoryData(triviaHistory) {
  let totalPoints = 0;
  const monthlyMap = {};
  const dailyMap = {};

  (triviaHistory || []).forEach((entry) => {
    const points = entry.points || 0;
    totalPoints += points;

    const date = new Date(entry.timestamp);
    if (isNaN(date.getTime())) return;

    // Build Month Key: YYYY-MM
    const mKey = getMonthKey(date);
    monthlyMap[mKey] = (monthlyMap[mKey] || 0) + points;

    // Build Day Key: YYYY-MM-DD
    const dKey = date.toISOString().split("T")[0];
    dailyMap[dKey] = (dailyMap[dKey] || 0) + points;
  });

  return { totalPoints, monthlyMap, dailyMap };
}

// Helper to safely format accuracy values without breaking on zero divisions
function calculateAccuracy(points, attempts) {
  if (!attempts || attempts === 0) return "0%";
  const ratio = (points / (attempts * 4000)) * 100;
  return ratio % 1 === 0 ? `${ratio}%` : `${ratio.toFixed(1)}%`;
}

module.exports = {
  publicDefer: true,

  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View trivia profile")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("View another user's profile"),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") || interaction.user;
    return this.renderMainProfile(interaction, target);
  },

  async renderMainProfile(interaction, target) {
    const stats = await UserStats.findOne({ userId: target.id });
    const reply = interaction.editReply.bind(interaction);

    if (!stats || !stats.triviaHistory || stats.triviaHistory.length === 0) {
      return reply({
        content: `❌ No stats found for **${target.username}**. Participate in trivia games to build a profile!`,
        embeds: [],
        components: [],
        files: [],
      });
    }

    const { totalPoints, monthlyMap } = parseHistoryData(stats.triviaHistory);

    const now = new Date();
    const currentMonthKey = getMonthKey(now);
    const currentMonthPoints = monthlyMap[currentMonthKey] || 0;

    const lifetimeAttempts = stats.triviaHistory.length;
    const monthlyAttempts = stats.triviaHistory.filter((entry) => {
      const d = new Date(entry.timestamp);
      return !isNaN(d.getTime()) && getMonthKey(d) === currentMonthKey;
    }).length;

    // Calculate accuracy strings
    const monthlyAccuracy = calculateAccuracy(
      currentMonthPoints,
      monthlyAttempts,
    );
    const lifetimeAccuracy = calculateAccuracy(totalPoints, lifetimeAttempts);

    // Dynamic rank calculations
    const allUsers = await UserStats.find().lean();
    let monthlyHigher = 0;
    let totalHigher = 0;

    allUsers.forEach((u) => {
      if (u.userId === target.id) return;
      const parsed = parseHistoryData(u.triviaHistory);

      if (parsed.totalPoints > totalPoints) totalHigher++;
      if ((parsed.monthlyMap[currentMonthKey] || 0) > currentMonthPoints)
        monthlyHigher++;
    });

    // Format current local month display name
    const monthName = now.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setAuthor({
        name: target.username,
        iconURL: target.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: `${monthName}`,
          value:
            `**Trivia Points:** ${currentMonthPoints} (#${monthlyHigher + 1})\n` +
            `**Attempted:** ${monthlyAttempts}\n` +
            `**Accuracy:** ${monthlyAccuracy}`,
          inline: true,
        },
        {
          name: "Lifetime",
          value:
            `**Trivia Points:** ${totalPoints} (#${totalHigher + 1})\n` +
            `**Attempted:** ${lifetimeAttempts}\n` +
            `**Accuracy:** ${lifetimeAccuracy}`,
          inline: true,
        },
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`profile_home_${target.id}`)
        .setEmoji("🏠")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),

      new ButtonBuilder()
        .setCustomId(`profile_monthly_${target.id}`)
        .setEmoji("📅")
        .setStyle(ButtonStyle.Secondary),
    );

    return reply({
      embeds: [embed],
      components: [row],
      files: [],
    });
  },

  async handleComponent(interaction) {
    if (!interaction.customId.startsWith("profile_")) return;

    await interaction.deferUpdate();

    const [, action, targetId] = interaction.customId.split("_");
    const target = await interaction.client.users.fetch(targetId);
    const stats = await UserStats.findOne({ userId: target.id });

    if (!stats || !stats.triviaHistory || stats.triviaHistory.length === 0) {
      return interaction.editReply({
        content: "❌ No stats found.",
        embeds: [],
        components: [],
        files: [],
      });
    }

    if (action === "home") {
      return this.renderMainProfile(interaction, target);
    }

    if (action === "monthly") {
      const { monthlyMap } = parseHistoryData(stats.triviaHistory);
      const sorted = Object.entries(monthlyMap).sort(([a], [b]) =>
        b.localeCompare(a),
      );

      let text =
        sorted.length === 0
          ? "No historical monthly data."
          : sorted
              .map(([month, points]) => {
                const [year, colMonth] = month.split("-");
                const date = new Date(Number(year), Number(colMonth) - 1, 1);
                const formatted = date.toLocaleString("default", {
                  month: "short",
                  year: "numeric",
                });

                const attempts = stats.triviaHistory.filter((entry) => {
                  const d = new Date(entry.timestamp);
                  return !isNaN(d.getTime()) && getMonthKey(d) === month;
                }).length;

                const accuracy = calculateAccuracy(points, attempts);

                return `> **${formatted}** — 🏆 \`${points} pts\` • 🎯 \`${attempts} att\` • 🎯 \`${accuracy} acc\``;
              })
              .join("\n");

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({
          name: `${target.username} • Monthly History`,
          iconURL: target.displayAvatarURL({ dynamic: true }),
        })
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setDescription(text)
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`profile_home_${target.id}`)
          .setEmoji("🏠")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`profile_monthly_${target.id}`)
          .setEmoji("📅")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );

      return interaction.editReply({
        embeds: [embed],
        components: [row],
        files: [],
      });
    }
  },
};
