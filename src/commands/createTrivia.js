const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

const UserStats = require("../models/UserStats");
const TriviaSetup = require("../models/TriviaSetup");
const ActiveTrivia = require("../models/ActiveTrivia");
const TriviaPing = require("../models/TriviaPing"); // Added TriviaPing model import
const { isAuthorized } = require("../utils/checkPermission");

const DURATIONS = {
  "1m": 60000,
  "10m": 600000,
  "1h": 3600000,
  "12h": 43200000,
  "1d": 86400000,
  "2d": 172800000,
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create-trivia")
    .setDescription("Launch an interactive trivia setup control panel")
    .setDefaultMemberPermissions(0) // Hides it from regular members natively in UI
    .addStringOption((opt) =>
      opt
        .setName("duration")
        .setDescription("Game duration")
        .setRequired(true)
        .addChoices(
          { name: "1 Minute", value: "1m" },
          { name: "10 Minutes", value: "10m" },
          { name: "1 Hour", value: "1h" },
          { name: "12 Hours", value: "12h" },
          { name: "1 Day", value: "1d" },
          { name: "2 Days", value: "2d" },
        ),
    )
    .addAttachmentOption((opt) =>
      opt
        .setName("img1")
        .setDescription("Primary image layout (Compulsory)")
        .setRequired(true),
    )
    .addAttachmentOption((opt) =>
      opt.setName("img2").setDescription("Secondary image layout (Optional)"),
    ),

  async execute(interaction) {
    const config = await TriviaSetup.findOne({
      configId: "SINGLE_SERVER_CONFIG",
    });
    if (config && config.triviaChannelId) {
      if (interaction.channel.id !== config.triviaChannelId) {
        return interaction.editReply({
          content: `❌ This command can only be used in the designated trivia channel: <#${config.triviaChannelId}>.`,
        });
      }
    }
    const allowed = await isAuthorized(interaction);
    if (!allowed) {
      return interaction.editReply({
        content: "❌ You are not authorized to create trivia games.",
      });
    }

    const duration = interaction.options.getString("duration");
    const img1 = interaction.options.getAttachment("img1");
    const img2 = interaction.options.getAttachment("img2");

    await TriviaSetup.findOneAndUpdate(
      { creatorId: interaction.user.id },
      {
        channelId: interaction.channel.id,
        question: "",
        duration,
        img1: img1.url,
        img2: img2?.url || null,
        options: [],
      },
      { upsert: true, new: true },
    );

    return this.renderSetupPanel(interaction, interaction.user.id);
  },

  async renderSetupPanel(interaction, creatorId) {
    const session = await TriviaSetup.findOne({ creatorId });
    if (!session) return;

    // Count individual option tiers dynamically
    const countTier = (t) => session.options.filter((o) => o.tier === t).length;
    const optimalCount = countTier("optimal");
    const suboptimalCount = countTier("suboptimal");
    const decentCount = countTier("decent");
    const badCount = countTier("bad");
    const totalOptions = session.options.length;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Create Trivia By Following Instructions Below")
      .setDescription(
        `**Question:** ${session.question ? `\`${session.question}\`` : "*Not added yet (Compulsory)*"}\n\n` +
          `**Option Tier Allocations (Max 3 each):**\n` +
          `🟢 Optimal (4 pts): \`[ ${optimalCount} / 3 ]\` ${optimalCount === 0 ? "❌ *Requires at least 1*" : "✅"}\n` +
          `🟡 Suboptimal (2 pts): \`[ ${suboptimalCount} / 3 ]\` ${suboptimalCount === 0 ? "❌ *Requires at least 1*" : "✅"}\n` +
          `🔵 Decent (1 pt): \`[ ${decentCount} / 3 ]\` ${decentCount === 0 ? "❌ *Requires at least 1*" : "✅"}\n` +
          `🔴 Bad (0 pts): \`[ ${badCount} / 3 ]\` ${badCount === 0 ? "❌ *Requires at least 1*" : "✅"}\n\n` +
          `**Configured Question List (${totalOptions} total options added):**\n` +
          (session.options
            .map(
              (o, idx) =>
                `**${idx + 1}.** [${o.tier.toUpperCase()}] ${o.text} — \`${o.pts} pts\``,
            )
            .join("\n") || "*No options configured.*"),
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`trivia_setup_question_${creatorId}`)
        .setLabel(session.question ? "Edit Question" : "✏️ Set Question")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`trivia_setup_add_${creatorId}`)
        .setLabel("➕ Add Option Slot")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(totalOptions >= 12),
      new ButtonBuilder()
        .setCustomId(`trivia_setup_clear_${creatorId}`)
        .setLabel("Clear All")
        .setStyle(ButtonStyle.Danger),
    );

    // --- ENFORCED COMPULSORY TIER CHECKS ---
    const canPublish =
      session.question &&
      optimalCount >= 1 &&
      suboptimalCount >= 1 &&
      decentCount >= 1 &&
      badCount >= 1;

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`trivia_setup_publish_${creatorId}`)
        .setLabel("🚀 Publish Trivia")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!canPublish),
    );

    return interaction.editReply({
      embeds: [embed],
      components: [row1, row2],
    });
  },

  async handleComponent(interaction) {
    const customId = interaction.customId;

    // 1. QUESTION POPUP MODAL
    if (
      interaction.isButton() &&
      customId.startsWith("trivia_setup_question_")
    ) {
      const creatorId = customId.replace("trivia_setup_question_", "");
      if (interaction.user.id !== creatorId)
        return interaction.reply({
          content: "❌ Not your session.",
          ephemeral: true,
        });

      const session = await TriviaSetup.findOne({ creatorId });
      const modal = new ModalBuilder()
        .setCustomId(`trivia_setup_qmodal_${creatorId}`)
        .setTitle("Set Trivia Question");

      const qInput = new TextInputBuilder()
        .setCustomId("q_text")
        .setLabel("Question")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(session?.question || "")
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(qInput));
      return interaction.showModal(modal);
    }

    if (
      interaction.isModalSubmit() &&
      customId.startsWith("trivia_setup_qmodal_")
    ) {
      await interaction.deferUpdate();
      const creatorId = customId.replace("trivia_setup_qmodal_", "");
      const questionText = interaction.fields.getTextInputValue("q_text");

      await TriviaSetup.findOneAndUpdate(
        { creatorId },
        { question: questionText },
      );
      return this.renderSetupPanel(interaction, creatorId);
    }

    // 2. OPTION POPUP MODAL (WITH MAX BOUND VALIDATION)
    if (interaction.isButton() && customId.startsWith("trivia_setup_add_")) {
      const creatorId = customId.replace("trivia_setup_add_", "");
      if (interaction.user.id !== creatorId)
        return interaction.reply({ content: "❌ Denied.", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`trivia_setup_optmodal_${creatorId}`)
        .setTitle("Configure Answer Node");

      const optText = new TextInputBuilder()
        .setCustomId("opt_text")
        .setLabel("Answer Text")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      const optTier = new TextInputBuilder()
        .setCustomId("opt_tier")
        .setLabel("Tier (optimal / suboptimal / decent / bad)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(optText),
        new ActionRowBuilder().addComponents(optTier),
      );
      return interaction.showModal(modal);
    }

    if (
      interaction.isModalSubmit() &&
      customId.startsWith("trivia_setup_optmodal_")
    ) {
      const creatorId = customId.replace("trivia_setup_optmodal_", "");
      const text = interaction.fields.getTextInputValue("opt_text");
      const tier = interaction.fields
        .getTextInputValue("opt_tier")
        .toLowerCase()
        .trim();

      const validTiers = { optimal: 4, suboptimal: 2, decent: 1, bad: 0 };
      if (!validTiers.hasOwnProperty(tier)) {
        return interaction.reply({
          content:
            "❌ Invalid tier! Must be exact: `optimal`, `suboptimal`, `decent`, or `bad`.",
          ephemeral: true,
        });
      }

      await interaction.deferUpdate();
      const session = await TriviaSetup.findOne({ creatorId });
      const currentTierCount = session.options.filter(
        (o) => o.tier === tier,
      ).length;

      if (currentTierCount >= 3) {
        return interaction.followUp({
          content: `❌ Limit configuration broken. You can only append up to 3 options for the **${tier}** category.`,
          ephemeral: true,
        });
      }

      await TriviaSetup.findOneAndUpdate(
        { creatorId },
        { $push: { options: { text, pts: validTiers[tier], tier } } },
      );

      return this.renderSetupPanel(interaction, creatorId);
    }

    if (interaction.isButton() && customId.startsWith("trivia_setup_clear_")) {
      await interaction.deferUpdate();
      const creatorId = customId.replace("trivia_setup_clear_", "");
      await TriviaSetup.findOneAndUpdate(
        { creatorId },
        { options: [], question: "" },
      );
      return this.renderSetupPanel(interaction, creatorId);
    }

    // 3. PUBLISHING LOGIC
    if (
      interaction.isButton() &&
      customId.startsWith("trivia_setup_publish_")
    ) {
      await interaction.deferUpdate();
      const creatorId = customId.replace("trivia_setup_publish_", "");
      const session = await TriviaSetup.findOne({ creatorId });
      if (!session) return;

      const targetChannel = interaction.guild.channels.cache.get(
        session.channelId,
      );
      if (!targetChannel)
        return interaction.followUp({
          content: "❌ Pipeline failure.",
          ephemeral: true,
        });

      const durationMs = DURATIONS[session.duration] || DURATIONS["1m"];
      const endTime = new Date(Date.now() + durationMs);
      const endTimestamp = Math.floor(endTime.getTime() / 1000);
      const shuffledOptions = shuffle([...session.options]);
      const triviaId = Date.now().toString();

      const mainEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(
          `## ${session.question || "Trivia Challenge"}\n\n` +
            shuffledOptions
              .map((o, i) => `-# Option ${i + 1} : ${o.text}`)
              .join("\n") +
            `\n\n🚨 Ends: <t:${endTimestamp}:F> (<t:${endTimestamp}:R>)`,
        )
        .setImage(session.img1);

      const embeds = [mainEmbed];
      if (session.img2)
        embeds.push(
          new EmbedBuilder().setColor(0x2b2d31).setImage(session.img2),
        );

      const select = new StringSelectMenuBuilder()
        .setCustomId(`trivia_vote_${triviaId}`)
        .setPlaceholder("Lock in your final answer...")
        .addOptions(
          shuffledOptions.map((o, i) => ({
            label: `Option ${i + 1}`,
            description: o.text.slice(0, 90),
            value: `${i}_${o.pts}`,
          })),
        );

      const btn = new ButtonBuilder()
        .setCustomId(`trivia_participants_${triviaId}`)
        .setLabel("View Participants")
        .setStyle(ButtonStyle.Secondary);

      // Fetch linked ping configuration for this guild
      const pingConfig = await TriviaPing.findOne({
        guildId: interaction.guild.id,
      });
      const pingContent = pingConfig ? `<@&${pingConfig.roleId}>` : "";

      const message = await targetChannel.send({
        content: pingContent, // Placed cleanly at the top of the message context
        embeds,
        components: [
          new ActionRowBuilder().addComponents(select),
          new ActionRowBuilder().addComponents(btn),
        ],
      });

      // Save game profile to the active tracker collection
      await ActiveTrivia.create({
        triviaId,
        channelId: session.channelId,
        messageId: message.id,
        question: session.question || "Trivia",
        endTime,
        img1: session.img1,
        img2: session.img2,
        options: shuffledOptions.map((o) => ({ text: o.text, pts: o.pts })),
        votes: [],
      });

      await TriviaSetup.deleteOne({ creatorId });
      await interaction.editReply({
        content: "🚀 **Trivia Published successfully!**",
        embeds: [],
        components: [],
      });

      try {
        await message.startThread({
          name: `Trivia: ${(session.question || "Game").slice(0, 50)}`,
          autoArchiveDuration: 60,
        });
      } catch (e) {
        console.error("Thread creation error bypassed safely:", e);
      }

      // Fire off automated execution countdown safety engine
      setTimeout(
        () => module.exports.resolveTriviaGame(interaction.client, triviaId),
        durationMs,
      );
      return;
    }

    // 4. SELECTION LOCKING (ONE VOTE RULE)
    if (
      interaction.isStringSelectMenu() &&
      customId.startsWith("trivia_vote_")
    ) {
      await interaction.deferUpdate();
      const triviaId = customId.replace("trivia_vote_", "");
      const [chosenIndex, pointsAwarded] = interaction.values[0].split("_");

      const game = await ActiveTrivia.findOne({ triviaId });
      if (!game)
        return interaction.followUp({
          content: "❌ This trivia has ended or doesn't exist.",
          ephemeral: true,
        });

      // Check if user already has an active vote registered
      const alreadyVoted = game.votes.some(
        (v) => v.userId === interaction.user.id,
      );
      if (alreadyVoted) {
        return interaction.followUp({
          content: "Your first vote is final! You cannot change your answer.",
          ephemeral: true,
        });
      }

      // Store selection in background cache inside ActiveTrivia collection
      await ActiveTrivia.findOneAndUpdate(
        { triviaId },
        {
          $push: {
            votes: {
              userId: interaction.user.id,
              optionIndex: Number(chosenIndex),
              pts: Number(pointsAwarded),
            },
          },
        },
      );

      return interaction.followUp({
        content: `Option Selected Successfully: **Option ${Number(chosenIndex) + 1}**.`,
        ephemeral: true,
      });
    }

    // 5. VIEW ACTIVE PARTICIPANTS
    if (interaction.isButton() && customId.startsWith("trivia_participants_")) {
      await interaction.deferUpdate();
      const triviaId = customId.replace("trivia_participants_", "");

      const game = await ActiveTrivia.findOne({ triviaId });
      const voterList =
        game?.votes?.map((v) => `<@${v.userId}>`).join(", ") ||
        "No participants yet.";

      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle("Trivia Participants")
            .setDescription(voterList),
        ],
        ephemeral: true,
      });
    }
  },

  // 6. SAFE REBOOT-PROOF RESOLUTION MODULE
  async resolveTriviaGame(client, triviaId) {
    try {
      const game = await ActiveTrivia.findOne({ triviaId });
      if (!game) return;

      const guild = client.guilds.cache.first(); // Find current context bounds
      const channel = guild?.channels.cache.get(game.channelId);
      if (!channel) return;

      let message;
      try {
        message = await channel.messages.fetch(game.messageId);
      } catch {
        // Safe exit if the message was deleted manually by admins
        await ActiveTrivia.deleteOne({ triviaId });
        return;
      }

      const grouped = {};
      game.votes.forEach((v) => {
        if (!grouped[v.optionIndex]) grouped[v.optionIndex] = [];
        grouped[v.optionIndex].push(v.userId);
      });

      // PUSH STATS TO PERMANENT PROFILES TRIVIA HISTORY RECORD ONLY AT RESOLUTION
      for (const vote of game.votes) {
        await UserStats.findOneAndUpdate(
          { userId: vote.userId },
          {
            $push: {
              triviaHistory: {
                triviaId: game.triviaId,
                option: vote.optionIndex,
                points: vote.pts,
                timestamp: new Date(),
              },
            },
          },
          { upsert: true },
        );
      }

      const resultDescription = game.options
        .map(
          (o, i) =>
            `**Option ${i + 1} (${o.pts} pts)** — *${o.text}*\n${(grouped[i] || []).map((id) => `<@${id}>`).join(" ") || "*No votes*"}`,
        )
        .join("\n\n");

      const embeds = [
        new EmbedBuilder()
          .setColor(0x2b2d31)
          .setDescription(`## ${game.question}`)
          .setImage(game.img1),
      ];
      if (game.img2)
        embeds.push(new EmbedBuilder().setColor(0x2b2d31).setImage(game.img2));

      embeds.push(
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("Trivia Over — Final Results")
          .setDescription(resultDescription),
      );

      await message.edit({
        content: "🚨 **This trivia challenge has concluded!**",
        embeds,
        components: [],
      });
      await ActiveTrivia.deleteOne({ triviaId });
    } catch (err) {
      console.error(
        "Critical error during game cleanup automation handler:",
        err,
      );
    }
  },
};
