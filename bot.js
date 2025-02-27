const { Telegraf } = require('telegraf');
const { token } = require('./config');
const { setupDatabase, createPrimaryDevelopersTable } = require('./database');
const { setupCommands } = require('./commands');
const { setupActions } = require('./actions');
const { setupMiddlewares } = require('./middlewares');
const { setupHandlers } = require('./handlers');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Bot server is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const bot = new Telegraf(token);
const generalReplies = new Map();

let awaitingReplyWord = false;
let awaitingReplyResponse = false;
let tempReplyWord = '';

// Call these functions when your bot starts
(async () => {
  try {
    await createPrimaryDevelopersTable();
    await setupDatabase();
    setupMiddlewares(bot);
    setupCommands(bot);
    setupActions(bot);
    setupHandlers(bot);

    bot.launch().then(() => console.log('🚀 البوت يعمل...')).catch(err => console.error('Error starting bot:', err));
  } catch (error) {
    console.error('Error during startup:', error);
    // Don't exit the process, let the express server continue running
    console.log('Bot may not be fully functional due to startup errors');
  }
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
