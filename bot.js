const { Telegraf } = require('telegraf');
const { token } = require('./config');
const { setupDatabase, createPrimaryDevelopersTable } = require('./database');
const { setupCommands } = require('./commands');
const { setupActions } = require('./actions');
const { setupMiddlewares } = require('./middlewares');
const { setupHandlers } = require('./handlers');

const bot = new Telegraf(token);
const generalReplies = new Map();

let awaitingReplyWord = false;
let awaitingReplyResponse = false;
let tempReplyWord = '';

// Call these functions when your bot starts
(async () => {
    await createPrimaryDevelopersTable();
    await setupDatabase();
    setupMiddlewares(bot);
    setupCommands(bot);
    setupActions(bot);
    setupHandlers(bot);

    bot.launch().then(() => console.log('🚀 البوت يعمل...')).catch(err => console.error('Error starting bot:', err));
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));