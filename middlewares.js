const { developerIds } = require('./config');
const { pool } = require('./database');

async function isAdminOrOwner(ctx, userId) {
    try {
        if (ctx.chat.type === 'private') return false;
        const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);
        return ['administrator', 'creator'].includes(chatMember.status);
    } catch (error) {
        console.error('خطأ في التحقق من المشرف:', error);
        return false;
    }
}

async function isDeveloper(ctx, userId) {
    return developerIds.has(userId.toString());
}

async function isSubscribed(ctx, userId) {
    try {
        const chatMember = await ctx.telegram.getChatMember('@ctrlsrc', userId);
        return ['member', 'administrator', 'creator'].includes(chatMember.status);
    } catch (error) {
        console.error('خطأ في التحقق من الاشتراك:', error);
        return false;
    }
}

function setupMiddlewares(bot) {
    // Add global middleware
    bot.use(async (ctx, next) => {
        try {
            // Log incoming messages
            console.log('Received message:', ctx.message);

            // Check for subscription before processing commands
            if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
                const userId = ctx.from.id;
                const isSubbed = await isSubscribed(ctx, userId);
                if (!isSubbed && !await isDeveloper(ctx, userId)) {
                    return ctx.reply('يرجى الاشتراك بقناة البوت للاستخدام', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'اشترك الآن', url: 'https://t.me/ctrlsrc' }],
                                [{ text: 'تحقق من الاشتراك', callback_data: 'check_subscription' }]
                            ]
                        }
                    });
                }
            }

            // Continue to the next middleware or command handler
            await next();
        } catch (error) {
            console.error('Error in middleware:', error);
        }
    });
}

function adminOnly(commandFunction) {
    return async (ctx) => {
        if (await isAdminOrOwner(ctx, ctx.from.id)) {
            return commandFunction(ctx);
        } else {
            return ctx.reply('❌ هذا الأمر مخصص للمشرفين فقط.');
        }
    };
}

// Add this new function
function setupMiddlewares(bot) {
    // You can add any global middleware here if needed
    // For example:
    // bot.use(async (ctx, next) => {
    //     // Some middleware logic
    //     await next();
    // });
}

module.exports = { 
    isAdminOrOwner, 
    isDeveloper, 
    isSubscribed, 
    adminOnly,
    setupMiddlewares  // Add this to the exports
};