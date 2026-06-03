const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");

const OPENINGS_DATA = {
  GB_V1: {
    label: "GB V1",
    description: "A beginner friendly opening with 2244 land stats.",
    image:
      "https://cdn.discordapp.com/attachments/1511749592708808946/1511749654944026664/Screenshot_2026-02-04_135846.png?ex=6a219614&is=6a204494&hm=3f535d282cacd9e9138fca3c1a96cea7c8a889424cacbe41e46f2021e19c45fd&",
    youtube: "https://www.youtube.com/watch?v=sD06REakQpA",
  },
  Freddo_V1: {
    label: "Freddo V1",
    description: "A widely used opening with 3120 land stats.",
    image:
      "https://cdn.discordapp.com/attachments/1511749592708808946/1511772271897874442/image.png?ex=6a21ab24&is=6a2059a4&hm=a1fad0494ffd5a577ce6a8d1b195d202a1d48d1e702437eb00f4d74a1974cbd2&",
    youtube: "https://www.youtube.com/watch?v=Ybu4wJdK7vQ",
  },
};

module.exports = {
  publicDefer: true,

  data: new SlashCommandBuilder()
    .setName("opening")
    .setDescription("Openings for Territorial.io"),

  async execute(interaction) {
    // 1. Map options dynamically using the 'label' and 'description' keys from OPENINGS_DATA
    const menuOptions = Object.keys(OPENINGS_DATA).map((key) => ({
      label: OPENINGS_DATA[key].label,
      description: OPENINGS_DATA[key].description.slice(0, 95), // Safely capped for Discord character limits
      value: key,
    }));

    const menuCustomId = `local_opening_select_${interaction.id}`;

    const dropdown = new StringSelectMenuBuilder()
      .setCustomId(menuCustomId)
      .setPlaceholder("Select Opening")
      .addOptions(menuOptions);

    const row = new ActionRowBuilder().addComponents(dropdown);

    const initialEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Different Territorial.io Openings");

    const initialMessage = await interaction.editReply({
      embeds: [initialEmbed],
      components: [row],
    });

    // 2. Local self-contained collector (Keeps things functional without modifying your strict index.js file)
    const collector = initialMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 600000, // 10 minutes session duration
    });

    collector.on("collect", async (menuInteraction) => {
      // Prevent other players in the server from stealing the session control state
      if (menuInteraction.user.id !== interaction.user.id) {
        return await menuInteraction.reply({
          content:
            "Run the `/opening` command yourself to cycle through active strategy cards.",
          ephemeral: true,
        });
      }

      await menuInteraction.deferUpdate();

      const selectedValue = menuInteraction.values[0];
      const opening = OPENINGS_DATA[selectedValue];

      if (!opening) return;

      // 3. Assemble custom strategy card embed
      const responseEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(`${opening.label}`)
        .setDescription(opening.description)
        .setImage(opening.image)
        .setTimestamp();

      // YouTube checking block
      let contentMessage = "";
      if (opening.youtube) {
        contentMessage = `**Video Guide:** ${opening.youtube}`;
      }

      await menuInteraction.editReply({
        content: contentMessage || null,
        embeds: [responseEmbed],
        components: [row], // Keeps the select menu present below the active image cards
      });
    });

    // Handle automated drop-down disabling when the session expires safely
    collector.on("end", async () => {
      const disabledDropdown = new StringSelectMenuBuilder()
        .setCustomId(menuCustomId)
        .setPlaceholder(
          "This session has timed out. Execute /opening to refresh.",
        )
        .addOptions(menuOptions)
        .setDisabled(true);

      const disabledRow = new ActionRowBuilder().addComponents(
        disabledDropdown,
      );

      await interaction
        .editReply({
          components: [disabledRow],
        })
        .catch(() => null);
    });
  },
};
