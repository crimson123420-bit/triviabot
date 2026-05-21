require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  MessageFlags,
} = require("discord.js");
const mongoose = require("mongoose");
const fs = require("node:fs");
const path = require("node:path");

const UserStats = require("./models/UserStats");
const TriviaSetup = require("./models/TriviaSetup");
const ActiveTrivia = require("./models/ActiveTrivia"); // Import new model cache line

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");
    await mongoose.connection.db
      .collection("triviasetups")
      .dropIndex("configId_1")
      .catch(() => null);
    // REBOOT RESOLUTION RESUMPTION CHECK ENGINE
    client.once("ready", async () => {
      console.log(`🤖 Logged into system client pipeline: ${client.user.tag}`);
      const createTriviaCmd = client.commands.get("create-trivia");

      if (createTriviaCmd?.resolveTriviaGame) {
        const activeGames = await ActiveTrivia.find();
        const now = Date.now();

        activeGames.forEach((game) => {
          const remainingTime = new Date(game.endTime).getTime() - now;
          if (remainingTime <= 0) {
            // Game expired while bot was offline - execute wrap-up cleanly immediately
            createTriviaCmd.resolveTriviaGame(client, game.triviaId);
          } else {
            // Re-establish tracking timers dynamically out of database state configurations
            setTimeout(
              () => createTriviaCmd.resolveTriviaGame(client, game.triviaId),
              remainingTime,
            );
          }
        });
      }
    });
  })
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  try {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command?.data?.name && command?.execute) {
      client.commands.set(command.data.name, command);
    }
  } catch (err) {
    console.error(`❌ Failed loading command ${file}:`, err);
  }
}

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // FIX: Clean, up-to-date Message Flag usage preventing deprecation warnings
      if (command.publicDefer) {
        await interaction.deferReply(); // Publicly viewable by the whole server
      } else {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }); // Stays private
      }
      return await command.execute(interaction);
    }

    if (interaction.isModalSubmit()) {
      const id = interaction.customId;
      if (id.startsWith("trivia_modal_") || id.startsWith("trivia_setup_")) {
        const command = client.commands.get("create-trivia");
        if (command?.handleComponent)
          return await command.handleComponent(interaction);
      }
      return;
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const id = interaction.customId;
      let commandFile = null;

      if (id.startsWith("lb_")) {
        commandFile = client.commands.get("leaderboard");
      } else if (id.startsWith("profile_")) {
        commandFile = client.commands.get("profile");
      } else if (
        id.startsWith("trivia_vote_") ||
        id.startsWith("trivia_participants_") ||
        id.startsWith("trivia_part_select_") ||
        id.startsWith("trivia_setup_")
      ) {
        commandFile = client.commands.get("create-trivia");
      }

      if (!commandFile?.handleComponent) return;
      return await commandFile.handleComponent(interaction);
    }
  } catch (err) {
    console.error("MASTER ENGINE ERROR PIPELINE INTERCEPT:", err);
  }
});

client.login(process.env.TOKEN);
