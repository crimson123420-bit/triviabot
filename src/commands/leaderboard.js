const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const UserStats = require("../models/UserStats");

const USERS_PER_PAGE = 10;

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getEntryMonth(entry) {
  const date = new Date(entry.timestamp);
  if (isNaN(date.getTime())) return "unknown";
  return getMonthKey(date);
}

function calculatePoints(user, timeframe) {
  return (user.triviaHistory || []).reduce((sum, entry) => {
    const points = entry.points || 0;
    if (timeframe === "all") return sum + points;
    return getEntryMonth(entry) === timeframe ? sum + points : sum;
  }, 0);
}

function calculateAttempts(user, timeframe) {
  return (user.triviaHistory || []).filter((entry) => {
    if (timeframe === "all") return true;
    return getEntryMonth(entry) === timeframe;
  }).length;
}

// Formats a YYYY-MM key into a human-readable string like "May 2026"
function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

async function buildLeaderboard(type, timeframe, page) {
  const users = await UserStats.find().lean();

  // --- DYNAMIC TIMEFRAME DROPDOWN GENERATION ---
  // Scan all history records to find every unique month that has game logs
  const uniqueMonths = new Set();
  users.forEach((u) => {
    (u.triviaHistory || []).forEach((entry) => {
      const mKey = getEntryMonth(entry);
      if (mKey !== "unknown") uniqueMonths.add(mKey);
    });
  });

  // Sort months newest to oldest
  const sortedMonths = Array.from(uniqueMonths).sort((a, b) =>
    b.localeCompare(a),
  );

  const processed = users.map((u) => {
    const points = calculatePoints(u, timeframe);
    const attempts = calculateAttempts(u, timeframe);

    return {
      userId: u.userId,
      points,
      attempts,
    };
  });

  const filtered = processed
    .filter((u) => (type === "points" ? u.points : u.attempts) > 0)
    .sort((a, b) =>
      type === "points" ? b.points - a.points : b.attempts - a.attempts,
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / USERS_PER_PAGE));
  page = Math.max(0, Math.min(page, totalPages - 1));

  const start = page * USERS_PER_PAGE;
  const slice = filtered.slice(start, start + USERS_PER_PAGE);

  const description =
    slice
      .map((u, i) => {
        const value = type === "points" ? u.points : u.attempts;
        return `**${start + i + 1}.** <@${u.userId}> • \`${value} ${type === "points" ? "pts" : "attempts"}\``;
      })
      .join("\n") || "*No active data recorded for this timeframe.*";

  // Format the timeframe footer label nicely
  const timeframeLabel =
    timeframe === "all" ? "All-Time" : formatMonthLabel(timeframe);

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`📊 ${type === "points" ? "Points" : "Attempts"} Leaderboard`)
    .setDescription(description)
    .setFooter({
      text: `Timeframe: ${timeframeLabel} • Page ${page + 1}/${totalPages}`,
    });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lb_toggle_points_${timeframe}_${page}`)
      .setEmoji("🏆")
      .setLabel("Points")
      .setStyle(
        type === "points" ? ButtonStyle.Primary : ButtonStyle.Secondary,
      ),

    new ButtonBuilder()
      .setCustomId(`lb_toggle_attempts_${timeframe}_${page}`)
      .setEmoji("🏅")
      .setLabel("Attempts")
      .setStyle(
        type === "attempts" ? ButtonStyle.Primary : ButtonStyle.Secondary,
      ),

    new ButtonBuilder()
      .setCustomId(`lb_prev_${type}_${timeframe}_${page}`)
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),

    new ButtonBuilder()
      .setCustomId(`lb_next_${type}_${timeframe}_${page}`)
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page + 1 >= totalPages),
  );

  // Build select menu options dynamically
  const menuOptions = [{ label: "All-Time", value: "all" }];

  // Add all months found in the database logs
  sortedMonths.forEach((mKey) => {
    menuOptions.push({
      label: formatMonthLabel(mKey),
      value: mKey,
    });
  });

  // Fallback check: If the database is completely brand new and empty, ensure the current month shows up
  if (sortedMonths.length === 0) {
    menuOptions.push({
      label: formatMonthLabel(getMonthKey()),
      value: getMonthKey(),
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`lb_menu_${type}_${timeframe}_${page}`)
    .setPlaceholder("Select Timeframe")
    .addOptions(menuOptions.slice(0, 25)); // Discord select menus max out at 25 options

  return {
    embeds: [embed],
    components: [buttons, new ActionRowBuilder().addComponents(menu)],
  };
}

module.exports = {
  publicDefer: true,

  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View trivia leaderboards"),

  async execute(interaction) {
    const payload = await buildLeaderboard("points", "all", 0);
    await interaction.editReply(payload);
  },

  async handleComponent(interaction) {
    await interaction.deferUpdate();

    const [, , typeFromId, timeframeFromId, pageFromId] =
      interaction.customId.split("_");
    const action = interaction.customId.split("_")[1];

    let type = typeFromId || "points";
    let timeframe = timeframeFromId || "all";
    let page = Number(pageFromId) || 0;

    if (interaction.isStringSelectMenu()) {
      timeframe = interaction.values[0];
    } else {
      if (action === "next") page++;
      if (action === "prev") page--;
      if (action === "toggle") {
        type = typeFromId;
      }
    }

    const payload = await buildLeaderboard(type, timeframe, page);
    await interaction.editReply(payload);
  },
};
