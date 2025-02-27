const { adminOnly } = require('./middlewares');
const { developerIds } = require('./handlers');
const { pool } = require('./database'); // Add this line to import the pool

function setupCommands(bot) {
    async function deleteLatestMessage(ctx) {
        try {
            if (!(await isAdminOrOwner(ctx, ctx.from.id))) {
                return ctx.reply('❌ هذا الأمر مخصص للمشرفين فقط.');
            }
    
            await ctx.deleteMessage();
            ctx.reply('✅ تم حذف آخر رسالة.');
        } catch (error) {
            console.error(error);
            ctx.reply('❌ حدث خطأ أثناء محاولة حذف الرسالة.');
        }
    }
    async function handleStartCommand(ctx) {
        try {
            const userId = ctx.from.id;
            if (await isDeveloper(ctx, userId)) {
                showDevPanel(ctx);
            } else if (await isAdminOrOwner(ctx, userId)) {
                showMainMenu(ctx);
            } else {
                const isSubbed = await isSubscribed(ctx, userId);
                if (isSubbed) {
                    updateActiveGroups(ctx);
                    showMainMenu(ctx);
                } else {
                    ctx.reply('يرجى الاشتراك بقناة البوت للاستخدام', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'اشترك الآن', url: 'https://t.me/ctrlsrc' }],
                                [{ text: 'تحقق من الاشتراك', callback_data: 'check_subscription' }]
                            ]
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error handling "بدء" command:', error);
            ctx.reply('❌ حدث خطأ أثناء معالجة الأمر. يرجى المحاولة مرة أخرى لاحقًا.');
        }
    }
    function showDevPanel(ctx) {
        const message = 'مرحبا عزيزي المطور الاساسي\nإليك ازرار التحكم بالاقسام\nتستطيع التحكم بجميع الاقسام فقط اضغط على القسم الذي تريده';
        const keyboard = {
            inline_keyboard: [
                [{ text: '• الردود •', callback_data: 'dev_replies' }],
                [{ text: '• الإذاعة •', callback_data: 'dev_broadcast' }],
                [{ text: 'السورس', callback_data: 'dev_source' }],
                [{ text: '• اسم البوت •', callback_data: 'dev_bot_name' }],
                [{ text: 'الاحصائيات', callback_data: 'dev_statistics' }],
                [{ text: 'المطورين', callback_data: 'dev_developers' }],
                [{ text: 'قريبا', callback_data: 'dev_welcome' }],
                [{ text: 'إلغاء', callback_data: 'dev_cancel' }]
            ]
        };
    
        if (ctx.callbackQuery) {
            ctx.editMessageText(message, { reply_markup: keyboard });
        } else {
            ctx.reply(message, { reply_markup: keyboard });
        }
    }
    async function isDeveloper(ctx, userId) {
        if (developerIds.has(userId.toString())) {
            return true;
        }
        try {
            const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);
            return chatMember.custom_title === 'مطور';
        } catch (error) {
            console.error('Error checking developer status:', error);
            return false;
        }
    }

    // Add this function to get the custom bot name for a chat
async function getCustomBotName(chatId) {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT custom_name FROM bot_custom_names WHERE chat_id = ?',
            [chatId]
        );
        connection.release();

        if (rows.length > 0) {
            return rows[0].custom_name;
        }
        return null;
    } catch (error) {
        console.error('Error retrieving custom bot name:', error);
        return null;
    }
}
    async function showUserId(ctx) {
        try {
            const userId = ctx.from.id;
            const firstName = ctx.from.first_name || 'User';
            const username = ctx.from.username ? `@${ctx.from.username}` : 'N/A';
            
            const message = `${firstName}\nمعرفي\n${username} ↫ معرفك ↓\n${userId}`;
            
            await ctx.replyWithHTML(`<code>${message}</code>`);
        } catch (error) {
            console.error('Error in showUserId:', error);
            ctx.reply('❌ حدث خطأ أثناء محاولة عرض معرف المستخدم.');
        }
    }
    
    async function handleStartCommand(ctx) {
        const userId = ctx.from.id;
    
        try {
            if (await isDeveloper(ctx, userId)) {
                showDevPanel(ctx);
            } else {
                const isSubbed = await isSubscribed(ctx, userId);
                if (isSubbed) {
                    updateActiveGroups(ctx);
                    showMainMenu(ctx);
                } else {
                    ctx.reply('يرجى الاشتراك بقناة البوت للاستخدام', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'اشترك الآن', url: 'https://t.me/ctrlsrc' }],
                                [{ text: 'تحقق من الاشتراك', callback_data: 'check_subscription' }]
                            ]
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error in start command:', error);
            ctx.reply('حدث خطأ أثناء التحقق من الصلاحيات. يرجى المحاولة مرة أخرى لاحقًا.');
        }
    }
   // ✅ Function to check if the user is admin or owner
async function isAdminOrOwner(ctx, userId) {
    try {
        if (ctx.chat.type === 'private') {
            return false; // Not a group chat
        }
        const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);
        return ['administrator', 'creator'].includes(chatMember.status);
    } catch (error) {
        console.error('Error checking user role:', error);
        return false;
    }
}
// ✅ Display main menu
function showMainMenu(ctx) {
    ctx.replyWithPhoto('https://postimg.cc/QBJ4V7hg/5c655f5c', {
        caption: '🤖 مرحبًا! أنا بوت الحماية. اختر خيارًا:',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📜 عرض الأوامر', callback_data: 'show_commands' }],
                [{ text: '📂 عرض المجموعات النشطة', callback_data: 'show_active_groups' }]
            ]
        }
    });
}

    // Handle the "بدء" command
    bot.hears('بدء', async (ctx) => {
        try {
            const userId = ctx.from.id;
            const isDM = ctx.chat.type === 'private';
    
            if (isDM && await isDeveloper(ctx, userId)) {
                // Show developer panel only in DM for developers
                await showDevPanel(ctx);
            } else if (await isAdminOrOwner(ctx, userId)) {
                // Show admin panel
                showMainMenu(ctx);
            } else if (isDM) {
                // For regular users in DM
                ctx.reply('مرحبًا! هذا البوت مخصص للاستخدام في المجموعات. يرجى إضافة البوت إلى مجموعتك للاستفادة من خدماته.');
            } else {
                // For regular users in groups
                ctx.reply('مرحبًا! يمكنك استخدام الأوامر المتاحة في المجموعة.');
            }
        } catch (error) {
            console.error('Error handling "بدء" command:', error);
            ctx.reply('❌ حدث خطأ أثناء معالجة الأمر. يرجى المحاولة مرة أخرى لاحقًا.');
        }
    });
    


    bot.start(async (ctx) => {
        handleStartCommand(ctx);
    });




        // Handle /start command
        bot.command('start', async (ctx) => {
            const userId = ctx.from.id;
            try {
                if (await isDeveloper(ctx, userId)) {
                    showDevPanel(ctx);
                } else {
                    const isSubbed = await isSubscribed(ctx, userId);
                    if (isSubbed) {
                        updateActiveGroups(ctx);
                        showMainMenu(ctx);
                    } else {
                        ctx.reply('يرجى الاشتراك بقناة البوت للاستخدام', {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: 'اشترك الآن', url: 'https://t.me/ctrlsrc' }],
                                    [{ text: 'تحقق من الاشتراك', callback_data: 'check_subscription' }]
                                ]
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Error in start command:', error);
                ctx.reply('حدث خطأ أثناء التحقق من الصلاحيات. يرجى المحاولة مرة أخرى لاحقًا.');
            }
        });
    
    // Send a joke
    async function sendJoke(ctx) {
        try {
            const jokes = [
                "واحد راح للدكتور قاله: يا دكتور صوتي راح... الدكتور: وانت جاي تدور عليه هنا؟",
                "مرة واحد راح لصاحبه البخيل، قال له: عندك شاي؟ قال: أيوة. قال: طيب ممكن كوباية ماية ساقعة؟",
                "واحد بيقول لصاحبه: تعرف إن النملة بتشيل 50 ضعف وزنها؟ صاحبه: ياه! أمال جوزها بيشيل كام؟",
                "مرة واحد بلديتنا راح يشتري تليفون، البائع قاله: دة موبايل نوكيا. قاله: لا مش عايز نوكيا، عايز واحد يرن بس",
                "واحد بيسأل صاحبه: إيه رأيك في الزواج؟ قاله: زي الحرب كده.. اللي بره نفسه يدخل واللي جوه نفسه يطلع"
            ];
            
            const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
            
            // Send the GIF
            await ctx.replyWithAnimation('https://media.giphy.com/media/fUYhyT9IjftxrxJXcE/giphy.gif?cid=ecf05e47tlilm6ghl00scnmkbgaype5bkcptjdqb0gw9flx0&ep=v1_gifs_search&rid=giphy.gif&ct=g');
            
            // Send the joke text
            await ctx.reply(`😂 إليك نكتة:\n\n${randomJoke}`);
        } catch (error) {
            console.error('Error in sendJoke:', error);
            ctx.reply('❌ عذرًا، حدث خطأ أثناء محاولة إرسال النكتة.');
        }
    }
    async function kickUser(ctx) {
        try {
            if (!(await isAdminOrOwner(ctx, ctx.from.id))) {
                return ctx.reply('❌ هذا الأمر مخصص للمشرفين فقط.');
            }
    
            const replyMessage = ctx.message.reply_to_message;
            if (!replyMessage) {
                return ctx.reply('❌ يجب الرد على رسالة المستخدم الذي تريد طرده.');
            }
    
            const userId = replyMessage.from.id;
            const userMention = `[${replyMessage.from.first_name}](tg://user?id=${userId})`;
    
            await ctx.telegram.kickChatMember(ctx.chat.id, userId);
            await ctx.telegram.unbanChatMember(ctx.chat.id, userId); // Unban to allow rejoining
    
            ctx.replyWithMarkdown(`✅ تم طرد المستخدم ${userMention} من المجموعة.`);
        } catch (error) {
            console.error(error);
            ctx.reply('❌ حدث خطأ أثناء محاولة طرد المستخدم.');
        }
    }
    
    
    
    // ✅ Demote user
    // ✅ Demote user
    async function demoteUser(ctx) {
        try {
            if (!(await isAdminOrOwner(ctx, ctx.from.id))) {
                return ctx.reply('❌ هذا الأمر مخصص للمشرفين فقط.');
            }
    
            let userId, userMention;
            const replyMessage = ctx.message.reply_to_message;
    
            if (replyMessage) {
                userId = replyMessage.from.id;
                userMention = `[${replyMessage.from.first_name}](tg://user?id=${userId})`;
            } else {
                const args = ctx.message.text.split(' ').slice(1);
                if (args.length === 0) {
                    return ctx.reply('❌ يجب الرد على رسالة المستخدم أو ذكر معرفه (@username) أو معرفه الرقمي.');
                }
                const username = args[0].replace('@', '');
                try {
                    const user = await ctx.telegram.getChatMember(ctx.chat.id, username);
                    userId = user.user.id;
                    userMention = `[${user.user.first_name}](tg://user?id=${userId})`;
                } catch (error) {
                    return ctx.reply('❌ لم يتم العثور على المستخدم. تأكد من المعرف أو قم بالرد على رسالة المستخدم.');
                }
            }
    
            const botInfo = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
            if (!botInfo || botInfo.status !== "administrator" || !botInfo.can_promote_members) {
                return ctx.reply('❌ البوت ليس لديه إذن "إدارة المستخدمين". يرجى تعديل صلاحيات البوت.');
            }
    
            const targetUserInfo = await ctx.telegram.getChatMember(ctx.chat.id, userId);
            if (targetUserInfo.status === 'creator') {
                return ctx.reply('❌ لا يمكن إزالة رتبة مالك المجموعة.');
            }
    
            if (targetUserInfo.status !== 'administrator') {
                return ctx.reply('❌ هذا المستخدم ليس مشرفًا بالفعل.');
            }
    
            await ctx.telegram.promoteChatMember(ctx.chat.id, userId, {
                can_change_info: false,
                can_post_messages: false,
                can_edit_messages: false,
                can_delete_messages: false,
                can_invite_users: false,
                can_restrict_members: false,
                can_pin_messages: false,
                can_promote_members: false
            });
    
            ctx.replyWithMarkdown(`✅ تم إزالة رتبة المستخدم ${userMention} بنجاح.`);
        } catch (error) {
            console.error('Error in demoteUser:', error);
            ctx.reply('❌ حدث خطأ أثناء محاولة إزالة رتبة المستخدم.');
        }
    }
    // ✅ Promote user to the specified role
    // ✅ Promote user to the specified role
    async function promoteUser(ctx, role) {
        try {
            if (!(await isAdminOrOwner(ctx, ctx.from.id))) {
                return ctx.reply('❌ هذا الأمر مخصص للمشرفين والمالك فقط.');
            }
    
            const args = ctx.message.text.split(' ').slice(1);
            if (args.length === 0) {
                return ctx.reply('❌ يجب ذكر معرف المستخدم (@username) أو الرد على رسالته لترقيته.');
            }
    
            let userId, userMention;
            if (ctx.message.reply_to_message) {
                userId = ctx.message.reply_to_message.from.id;
                userMention = `[${ctx.message.reply_to_message.from.first_name}](tg://user?id=${userId})`;
            } else {
                const username = args[0].replace('@', '');
                try {
                    const user = await ctx.telegram.getChat(username);
                    userId = user.id;
                    userMention = `[${user.first_name}](tg://user?id=${userId})`;
                } catch (error) {
                    return ctx.reply('❌ لم يتم العثور على المستخدم. تأكد من المعرف أو قم بالرد على رسالة المستخدم.');
                }
            }
    
            const connection = await pool.getConnection();
            let query, successMessage;
    
            switch (role) {
                case 'مطور':
                case 'developer':
                    query = 'INSERT INTO developers (user_id, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = ?';
                    successMessage = `✅ تم ترقية المستخدم ${userMention} إلى مطور.`;
                    break;
                case 'مطور ثانوي':
                case 'secondary_developer':
                    query = 'INSERT INTO secondary_developers (user_id, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = ?';
                    successMessage = `✅ تم ترقية المستخدم ${userMention} إلى مطور ثانوي.`;
                    break;
                case 'مطور أساسي':
                case 'primary_developer':
                    query = 'INSERT INTO primary_developers (user_id, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = ?';
                    successMessage = `✅ تم ترقية المستخدم ${userMention} إلى مطور أساسي.`;
                    break;
                default:
                    throw new Error('Invalid role specified: ' + role);
            }
    
            await connection.query(query, [userId, args[0], args[0]]);
            connection.release();
            ctx.replyWithMarkdown(successMessage);
        } catch (error) {
            console.error(`Error promoting user to ${role}:`, error);
            ctx.reply(`❌ حدث خطأ أثناء ترقية المستخدم إلى ${role}. الرجاء المحاولة مرة أخرى لاحقًا.`);
        }
    }
    // Function to handle secondary developer promotion
    async function promoteToSecondaryDeveloper(ctx) {
        try {
            // Check if the user is an admin or owner
            if (!(await isAdminOrOwner(ctx, ctx.from.id))) {
                return ctx.reply('❌ هذا الأمر مخصص للمشرفين والمالك فقط.');
            }
    
            const args = ctx.message.text.split(' ').slice(1);
            if (args.length === 0 && !ctx.message.reply_to_message) {
                return ctx.reply('❌ يجب ذكر معرف المستخدم (@username) أو الرد على رسالته لترقيته إلى مطور ثانوي.');
            }
    
            let userId, userMention;
            if (ctx.message.reply_to_message) {
                userId = ctx.message.reply_to_message.from.id;
                userMention = `[${ctx.message.reply_to_message.from.first_name}](tg://user?id=${userId})`;
            } else {
                const username = args[0].replace('@', '');
                try {
                    const user = await ctx.telegram.getChat(username);
                    userId = user.id;
                    userMention = `[${user.first_name}](tg://user?id=${userId})`;
                } catch (error) {
                    return ctx.reply('❌ لم يتم العثور على المستخدم. تأكد من المعرف أو قم بالرد على رسالة المستخدم.');
                }
            }
    
            const connection = await pool.getConnection();
            await connection.query(
                'INSERT INTO secondary_developers (user_id, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = ?',
                [userId, args[0] || ctx.message.reply_to_message.from.username, args[0] || ctx.message.reply_to_message.from.username]
            );
            connection.release();
    
            ctx.replyWithMarkdown(`✅ تم ترقية المستخدم ${userMention} إلى مطور ثانوي بنجاح.`);
        } catch (error) {
            console.error('Error promoting user to secondary developer:', error);
            ctx.reply('❌ حدث خطأ أثناء محاولة ترقية المستخدم إلى مطور ثانوي. الرجاء المحاولة مرة أخرى لاحقًا.');
        }
    }
    async function demoteUser(ctx, role) {
        try {
            if (!(await isAdminOrOwner(ctx, ctx.from.id))) {
                return ctx.reply('❌ هذا الأمر مخصص للمشرفين والمالك فقط.');
            }
    
            const args = ctx.message.text.split(' ').slice(1);
            if (args.length === 0) {
                return ctx.reply('❌ يجب ذكر معرف المستخدم (@username) أو الرد على رسالته لتنزيله.');
            }
    
            let userId, userMention;
            if (ctx.message.reply_to_message) {
                userId = ctx.message.reply_to_message.from.id;
                userMention = `[${ctx.message.reply_to_message.from.first_name}](tg://user?id=${userId})`;
            } else {
                const username = args[0].replace('@', '');
                try {
                    const user = await ctx.telegram.getChat(username);
                    userId = user.id;
                    userMention = `[${user.first_name}](tg://user?id=${userId})`;
                } catch (error) {
                    return ctx.reply('❌ لم يتم العثور على المستخدم. تأكد من المعرف أو قم بالرد على رسالة المستخدم.');
                }
            }
    
            const connection = await pool.getConnection();
            let query, successMessage;
    
            switch (role) {
                case 'developer':
                    query = 'DELETE FROM developers WHERE user_id = ?';
                    successMessage = `✅ تم تنزيل المستخدم ${userMention} من قائمة المطورين.`;
                    break;
                case 'secondary_developer':
                    query = 'DELETE FROM secondary_developers WHERE user_id = ?';
                    successMessage = `✅ تم تنزيل المستخدم ${userMention} من قائمة المطورين الثانويين.`;
                    break;
                case 'primary_developer':
                    query = 'DELETE FROM primary_developers WHERE user_id = ?';
                    successMessage = `✅ تم تنزيل المستخدم ${userMention} من قائمة المطورين الأساسيين.`;
                    break;
                default:
                    throw new Error('Invalid role specified');
            }
    
            await connection.query(query, [userId]);
            connection.release();
            ctx.replyWithMarkdown(successMessage);
        } catch (error) {
            console.error(`Error demoting user from ${role}:`, error);
            ctx.reply(`❌ حدث خطأ أثناء تنزيل المستخدم من ${role}. الرجاء المحاولة مرة أخرى لاحقًا.`);
        }
    }
    //call command
    async function callEveryone(ctx) {
        try {
            // Detailed permission check
            const botInfo = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
            console.log('Bot permissions:', JSON.stringify(botInfo, null, 2));
    
            if (!botInfo || botInfo.status !== "administrator") {
                return ctx.reply('❌ البوت ليس مشرفًا في هذه المجموعة.');
            }
    
            // Check for essential permissions
            const requiredPermissions = [
                'can_manage_chat',
                'can_delete_messages',
                'can_invite_users',
                'can_restrict_members',
                'can_pin_messages'
            ];
    
            const missingPermissions = requiredPermissions.filter(perm => !botInfo[perm]);
    
            if (missingPermissions.length > 0) {
                return ctx.reply(`❌ البوت يفتقد الصلاحيات التالية: ${missingPermissions.join(', ')}. يرجى تعديل صلاحيات البوت.`);
            }
    
            // Get chat information
            const chat = await ctx.telegram.getChat(ctx.chat.id);
    
            // Get chat administrators
            const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id);
    
            if (admins.length === 0) {
                return ctx.reply('❌ لم يتم العثور على مشرفين في المجموعة.');
            }
    
            // Mention administrators
            const chunkSize = 4096;
            let message = "🚨 نداء للمشرفين:\n";
            for (const admin of admins) {
                if (admin.user.is_bot) continue; // Skip bots
                const mention = `[${admin.user.first_name}](tg://user?id=${admin.user.id})`;
                if (message.length + mention.length > chunkSize) {
                    await ctx.reply(message, { parse_mode: "Markdown" });
                    message = "🚨 متابعة النداء للمشرفين:\n";
                }
                message += ` ${mention}`;
            }
    
            if (message !== "🚨 نداء للمشرفين:\n" && message !== "🚨 متابعة النداء للمشرفين:\n") {
                await ctx.reply(message, { parse_mode: "Markdown" });
            }
    
            // Send a general message for all members
            await ctx.reply("🔔 تنبيه لجميع الأعضاء! يرجى الانتباه إلى هذا الإعلان الهام.", { parse_mode: "Markdown" });
        } catch (error) {
            console.error('Error in callEveryone:', error);
            ctx.reply('❌ حدث خطأ أثناء محاولة نداء الجميع.');
        }
    }
    // Delete latest message
async function deleteLatestMessage(ctx) {
    try {
        if (!(await isAdminOrOwner(ctx, ctx.from.id))) {
            return ctx.reply('❌ هذا الأمر مخصص للمشرفين فقط.');
        }

        await ctx.deleteMessage();
        ctx.reply('✅ تم حذف آخر رسالة.');
    } catch (error) {
        console.error(error);
        ctx.reply('❌ حدث خطأ أثناء محاولة حذف الرسالة.');
    }
}
// Add this function to check if the chat is a group
function isGroupChat(ctx) {
    return ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
}

// Add this function to check if the user is a primary developer
async function isPrimaryDeveloper(ctx, userId) {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM primary_developers WHERE user_id = ?', [userId]);
        connection.release();
        return rows.length > 0;
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('primary_developers table does not exist. Creating it now...');
            await createPrimaryDevelopersTable();
            return false; // Assume no primary developers if the table didn't exist
        }
        console.error('Error checking primary developer status:', error);
        return false;
    }
}
bot.command('ترقية ثانوي', async (ctx) => {
    try {
        if (!(await isPrimaryDeveloper(ctx, ctx.from.id))) {
            return ctx.reply('❌ هذا الأمر مخصص للمطورين الأساسيين فقط.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0 && !ctx.message.reply_to_message) {
            return ctx.reply('❌ يجب ذكر معرف المستخدم (@username) أو الرد على رسالته لترقيته إلى مطور ثانوي.');
        }

        let userId, userMention;
        if (ctx.message.reply_to_message) {
            userId = ctx.message.reply_to_message.from.id;
            userMention = `[${ctx.message.reply_to_message.from.first_name}](tg://user?id=${userId})`;
        } else {
            const username = args[0].replace('@', '');
            try {
                const user = await ctx.telegram.getChat(username);
                userId = user.id;
                userMention = `[${user.first_name}](tg://user?id=${userId})`;
            } catch (error) {
                return ctx.reply('❌ لم يتم العثور على المستخدم. تأكد من المعرف أو قم بالرد على رسالة المستخدم.');
            }
        }

        const connection = await pool.getConnection();
        await connection.query(
            'INSERT INTO secondary_developers (user_id, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = ?',
            [userId, args[0] || ctx.message.reply_to_message.from.username, args[0] || ctx.message.reply_to_message.from.username]
        );
        connection.release();

        ctx.replyWithMarkdown(`✅ تم ترقية المستخدم ${userMention} إلى مطور ثانوي بنجاح.`);
    } catch (error) {
        console.error('Error promoting user to secondary developer:', error);
        ctx.reply('❌ حدث خطأ أثناء محاولة ترقية المستخدم إلى مطور ثانوي. الرجاء المحاولة مرة أخرى لاحقًا.');
    }
});

// Command handler for "ترقية_ثانوي"
bot.command('ترقية_ثانوي', promoteToSecondaryDeveloper);

// Text handler for "ترقية ثانوي" (without underscore)
bot.hears(/^ترقية ثانوي/, async (ctx) => {
    // Call the same function as the command handler
    await promoteToSecondaryDeveloper(ctx);
});
bot.command('تنزيل مطور', async (ctx) => {
    if (!(await isOwner(ctx, ctx.from.id))) {
        return ctx.reply('❌ هذا الأمر مخصص للمالك فقط.');
    }

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return ctx.reply('❌ يجب ذكر معرف المستخدم (@username) أو الرد على رسالته لتنزيله من المطورين.');
    }

    let userId, userMention;
    if (ctx.message.reply_to_message) {
        userId = ctx.message.reply_to_message.from.id;
        userMention = `[${ctx.message.reply_to_message.from.first_name}](tg://user?id=${userId})`;
    } else {
        const username = args[0].replace('@', '');
        try {
            const user = await ctx.telegram.getChat(username);
            userId = user.id;
            userMention = `[${user.first_name}](tg://user?id=${userId})`;
        } catch (error) {
            return ctx.reply('❌ لم يتم العثور على المستخدم. تأكد من المعرف أو قم بالرد على رسالة المستخدم.');
        }
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('DELETE FROM developers WHERE user_id = ?', [userId]);
        connection.release();
        ctx.replyWithMarkdown(`✅ تم تنزيل المستخدم ${userMention} من قائمة المطورين.`);
    } catch (error) {
        console.error('Error demoting developer:', error);
        ctx.reply('❌ حدث خطأ أثناء تنزيل المطور. الرجاء المحاولة مرة أخرى لاحقًا.');
    }
});
bot.command('ترقية_ثانوي', (ctx) => promoteUser(ctx, 'مطور ثانوي'));
bot.hears(/^ترقية ثانوي/, (ctx) => promoteUser(ctx, 'مطور ثانوي'));

bot.command('promote', (ctx) => promoteUser(ctx, 'مطور'));
bot.command('promote', (ctx) => promoteUser(ctx, 'developer'));

bot.command('تنزيل مطور', async (ctx) => {
    await demoteUser(ctx, 'developer');
});

bot.hears(/^تنزيل مطور/, async (ctx) => {
    await demoteUser(ctx, 'developer');
});
bot.command('كتم', adminOnly((ctx) => muteUser(ctx, true)));
bot.command('الغاء_كتم', adminOnly((ctx) => muteUser(ctx, false)));
bot.command('مسح', adminOnly((ctx) => deleteLatestMessage(ctx)));
bot.command('تثبيت', adminOnly((ctx) => pinMessage(ctx)));
bot.command('نكتة', adminOnly((ctx) => sendJoke(ctx)));
bot.command('طرد', adminOnly((ctx) => kickUser(ctx)));
// Add these lines to your existing command handlers
bot.hears(/^ترقية (مميز|ادمن|مدير|منشئ|منشئ اساسي|مطور|مطور ثانوي)/, (ctx) => {
    const role = ctx.match[1];
    promoteUser(ctx, role);
});

bot.hears('تنزيل', (ctx) => demoteUser(ctx));

// Handle "نكتة" text command
bot.hears('نكتة', adminOnly((ctx) => sendJoke(ctx)));
bot.command('مسح الصور', adminOnly((ctx) => deleteLatestPhotos(ctx)));
bot.command('ازالة الروابط', adminOnly((ctx) => removeLinks(ctx)));

bot.command('معرفي', (ctx) => showUserId(ctx));

bot.hears('معرفي', (ctx) => showUserId(ctx));
bot.command('تنزيل', adminOnly((ctx) => demoteUser(ctx)));
bot.hears('تنزيل', adminOnly((ctx) => demoteUser(ctx)));



bot.command('مسح', adminOnly((ctx) => deleteLatestMessage(ctx)));
bot.command('تثبيت', adminOnly((ctx) => pinMessage(ctx)));
bot.command('نكتة', adminOnly((ctx) => sendJoke(ctx)));
bot.command('طرد', adminOnly((ctx) => kickUser(ctx)));

// Handle "نكتة" text command
bot.hears('نكتة', adminOnly((ctx) => sendJoke(ctx)));
bot.command('مسح الصور', adminOnly((ctx) => deleteLatestPhotos(ctx)));
bot.command('ازالة_الروابط', adminOnly((ctx) => removeLinks(ctx)));

bot.command('معرفي', (ctx) => showUserId(ctx));

bot.hears('معرفي', (ctx) => showUserId(ctx));
bot.command('تنزيل', adminOnly((ctx) => demoteUser(ctx)));
bot.hears('تنزيل', adminOnly((ctx) => demoteUser(ctx)));

bot.command('كتم', adminOnly((ctx) => muteUser(ctx, true)));
bot.command('الغاء_كتم', adminOnly((ctx) => muteUser(ctx, false)));

bot.command('منع فيديو', adminOnly((ctx) => disableVideoSharing(ctx)));
bot.command('تفعيل فيديو', adminOnly((ctx) => enableVideoSharing(ctx)));

// Also add handlers for text commands without the slash
bot.hears('منع فيديو', adminOnly((ctx) => disableVideoSharing(ctx)));
bot.hears('تفعيل فيديو', adminOnly((ctx) => enableVideoSharing(ctx)));
bot.command('منع_متحركة', adminOnly((ctx) => disableGifSharing(ctx)));
bot.command('تفعيل_متحركة', adminOnly((ctx) => enableGifSharing(ctx)));

// Also add handlers for text commands without the underscore
bot.hears('منع متحركة', adminOnly((ctx) => disableGifSharing(ctx)));
bot.hears('تفعيل متحركة', adminOnly((ctx) => enableGifSharing(ctx)));
bot.command('ترقية_مطور', (ctx) => promoteUser(ctx, 'مطور'));
bot.hears(/^ترقية مطور/, (ctx) => promoteUser(ctx, 'مطور'));
bot.command('ترقية_اساسي', (ctx) => promoteUser(ctx, 'مطور أساسي'));
bot.hears(/^ترقية اساسي/, (ctx) => promoteUser(ctx, 'مطور أساسي'));

}


module.exports = { setupCommands };

