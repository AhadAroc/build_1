let awaitingReplyWord = false;
let awaitingReplyResponse = false;  // Add this line
let tempReplyWord = '';
//let command was removed from here 

// Make sure this is at the top of your file
const activeGroups = new Map();
// Add these variables at the top of your file
let awaitingBotName = false;
// Add these variables at the top of your file
let awaitingDeleteReplyWord = false;
const cloudinary = require('cloudinary').v2;

// Cloudinary configuration
cloudinary.config({
  cloud_name: 'dpxowt5m5',
  api_key: '248273337268518',
  api_secret: 'SihooJWz6cMi5bNDAU26Tmf-tIw' // Replace with your actual API secret
});

const { isDeveloper } = require('./middlewares');
const { pool } = require('./database'); // Add this line to import the pool


// ... (rest of the existing imports and variables)
function setupActions(bot) {
    async function showDevPanel(ctx) {
        // Check if the message is from a private chat (DM)
        if (ctx.chat.type !== 'private') {
            await ctx.reply('⚠️ يمكن استخدام لوحة التحكم في الرسائل الخاصة فقط.');
            return;
        }
    
        // Check if the user is a developer
        if (!(await isDeveloper(ctx, ctx.from.id))) {
            await ctx.reply('⛔ عذرًا، هذه اللوحة مخصصة للمطورين فقط.');
            return;
        }
    
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
        loadActiveGroupsFromDatabase();
        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, { reply_markup: keyboard });
        } else {
            await ctx.reply(message, { reply_markup: keyboard });
        }
    }
    async function showStatisticsMenu(ctx) {
        const message = 'قائمة الإحصائيات - اختر الإجراء المطلوب:';
        const keyboard = {
            inline_keyboard: [
                [{ text: '• الإحصائيات العامة •', callback_data: 'overall_stats' }],
                [{ text: '• المشتركين •', callback_data: 'subscribers_stats' }],
                [{ text: '• المجموعات •', callback_data: 'groups_stats' }],
                [{ text: '• جلب نسخة احتياطية •', callback_data: 'backup_data' }],
                [{ text: '• تنظيف المشتركين •', callback_data: 'clean_subscribers' }],
                [{ text: '• تنظيف المجموعات •', callback_data: 'clean_groups' }],
                [{ text: '🔙 رجوع', callback_data: 'back_to_dev_panel' }]
            ]
        };
    
        await ctx.editMessageText(message, { reply_markup: keyboard });
    }
    async function showSourceMenu(ctx) {
        const message = 'قائمة السورس - اختر الإجراء المطلوب:';
        const keyboard = {
            inline_keyboard: [
                [{ text: '• تاريخ اشتراك البوت •', callback_data: 'bot_subscription' }],
                [{ text: '• تحديث السورس •', callback_data: 'source_update' }],
                [{ text: '• مطور البوت الأساسي •', callback_data: 'main_bot_dev' }],
                [{ text: '• مبرمج السورس •', callback_data: 'source_programmer' }],
                [{ text: '• قناة السورس •', callback_data: 'source_channel' }],
                [{ text: '🔙 رجوع', callback_data: 'back_to_dev_panel' }]
            ]
        };
    
        await ctx.editMessageText(message, { reply_markup: keyboard });
    }
    async function getDevelopersList() {
        try {
            const connection = await pool.getConnection();
            const [rows] = await connection.query('SELECT user_id, username FROM developers');
            connection.release();
            return rows;
        } catch (error) {
            console.error('Error fetching developers list:', error);
            return [];
        }
    }
    async function createSecondaryDevelopersTable() {
        try {
            const connection = await pool.getConnection();
            await connection.query(`
                CREATE TABLE IF NOT EXISTS secondary_developers (
                    user_id BIGINT PRIMARY KEY,
                    username VARCHAR(255)
                )
            `);
            connection.release();
            console.log('secondary_developers table created or already exists');
        } catch (error) {
            console.error('Error creating secondary_developers table:', error);
        }
    }
 
    // Create a separate function to handle the broadcast logic
    async function handleBroadcast(ctx) {
        if (await isDeveloper(ctx, ctx.from.id)) {
            let message;
            if (ctx.match) {
                message = ctx.match[1];
            } else {
                message = ctx.message.text.split(' ').slice(1).join(' ');
            }
    
            if (!message) {
                return ctx.reply('الرجاء إدخال رسالة للإذاعة بعد الأمر. مثال:\nاذاعة مرحبا بالجميع!');
            }
    
            console.log(`Broadcasting message: "${message}"`);
            console.log(`Number of active groups: ${activeGroups.size}`);
            console.log('Active groups:', Array.from(activeGroups.entries()));
    
            if (activeGroups.size === 0) {
                return ctx.reply('لا توجد مجموعات نشطة لإرسال الإذاعة إليها.');
            }
    
            let successCount = 0;
            let failCount = 0;
    
            for (const [groupId, groupInfo] of activeGroups) {
                try {
                    console.log(`Attempting to send to group: ${groupInfo.title} (${groupId})`);
                    await ctx.telegram.sendMessage(groupId, message);
                    console.log(`Successfully sent to group: ${groupInfo.title} (${groupId})`);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to send broadcast to group ${groupId} (${groupInfo.title}):`, error);
                    failCount++;
                }
            }
    
            ctx.reply(`تم إرسال الإذاعة!\n\nتم الإرسال إلى: ${successCount} مجموعة\nفشل الإرسال إلى: ${failCount} مجموعة`);
        } else {
            ctx.reply('عذراً، هذا الأمر للمطورين فقط');
        }
    }
    async function populateActiveGroups(bot) {
        console.log('Populating active groups...');
        const chats = await bot.telegram.getMyCommands();
        for (const chat of chats) {
            try {
                const chatInfo = await bot.telegram.getChat(chat.chat.id);
                if (chatInfo.type === 'group' || chatInfo.type === 'supergroup') {
                    activeGroups.set(chatInfo.id, { title: chatInfo.title, id: chatInfo.id });
                    console.log(`Added group: ${chatInfo.title} (${chatInfo.id})`);
                }
            } catch (error) {
                console.error(`Error getting chat info for ${chat.chat.id}:`, error);
            }
        }
        console.log(`Populated ${activeGroups.size} active groups`);
    }
    
    // Call this function when your bot starts
    populateActiveGroups(bot);
    // Call this function when your bot starts
    createSecondaryDevelopersTable();
    async function createBotCustomNamesTable() {
        try {
            const connection = await pool.getConnection();
            await connection.query(`
                CREATE TABLE IF NOT EXISTS bot_custom_names (
                    chat_id BIGINT PRIMARY KEY,
                    custom_name VARCHAR(255) NOT NULL
                )
            `);
            connection.release();
            console.log('bot_custom_names table created or already exists');
        } catch (error) {
            console.error('Error creating bot_custom_names table:', error);
        }
    }
    // Add this function at the beginning of your file or before it's used
async function fetchRepliesFromDatabase() {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT trigger_word, reply_text FROM replies');
        connection.release();
        return rows;
    } catch (error) {
        console.error('Error fetching replies:', error);
        return [];
    }
}
// Add this function to create the groups table
async function createGroupsTable() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            DROP TABLE IF EXISTS groups
        `);
        await connection.query(`
            CREATE TABLE groups (
                group_id BIGINT PRIMARY KEY,
                title VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        connection.release();
        console.log('groups table created or recreated');
    } catch (error) {
        console.error('Error creating groups table:', error);
    }
}
async function markGroupAsInactive(groupId) {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            UPDATE groups
            SET is_active = FALSE
            WHERE group_id = ?
        `, [groupId]);
        connection.release();

        activeGroups.delete(groupId);
        console.log(`Marked group ${groupId} as inactive`);
    } catch (error) {
        console.error('Error marking group as inactive:', error);
    }
}
// Helper functions for statistics

async function getOverallStats() {
    try {
        const connection = await pool.getConnection();
        const [subscribersResult] = await connection.query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
        const [groupsResult] = await connection.query('SELECT COUNT(*) as count FROM groups WHERE is_active = 1');
        connection.release();

        const subscribers = subscribersResult[0].count;
        const groups = groupsResult[0].count;
        const total = subscribers + groups;

        return { subscribers, groups, total };
    } catch (error) {
        console.error('Error getting overall stats:', error);
        return { subscribers: 0, groups: 0, total: 0 };
    }
}

async function getSubscribersCount() {
    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
        connection.release();
        return result[0].count;
    } catch (error) {
        console.error('Error getting subscribers count:', error);
        return 0;
    }
}

async function getGroupsCount() {
    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query('SELECT COUNT(*) as count FROM groups WHERE is_active = 1');
        connection.release();
        return result[0].count;
    } catch (error) {
        console.error('Error getting groups count:', error);
        return 0;
    }
}

async function generateBackup() {
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.query('SELECT * FROM users');
        const [groups] = await connection.query('SELECT * FROM groups');
        const [developers] = await connection.query('SELECT * FROM developers');
        const [replies] = await connection.query('SELECT * FROM replies');
        connection.release();

        return {
            botId: bot.botInfo.id,
            botName: bot.botInfo.username,
            users,
            groups,
            developers,
            replies,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error generating backup:', error);
        return null;
    }
}

async function cleanSubscribers() {
    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query('UPDATE users SET is_active = 0 WHERE last_interaction < DATE_SUB(NOW(), INTERVAL 30 DAY)');
        connection.release();
        return result.affectedRows;
    } catch (error) {
        console.error('Error cleaning subscribers:', error);
        return 0;
    }
}

async function cleanGroups() {
    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query('UPDATE groups SET is_active = 0 WHERE last_interaction < DATE_SUB(NOW(), INTERVAL 30 DAY)');
        connection.release();
        return result.affectedRows;
    } catch (error) {
        console.error('Error cleaning groups:', error);
        return 0;
    }
}
async function updateLastInteraction(chatId, isGroup = false) {
    try {
        const connection = await pool.getConnection();
        const table = isGroup ? 'groups' : 'users';
        await connection.query(`
            INSERT INTO ${table} (id, last_interaction) 
            VALUES (?, NOW()) 
            ON DUPLICATE KEY UPDATE last_interaction = NOW()
        `, [chatId]);
        connection.release();
    } catch (error) {
        console.error(`Error updating last interaction for ${isGroup ? 'group' : 'user'}:`, error);
    }
}

// Call this function when initializing the database
createGroupsTable();
    // Update the updateActiveGroups function
    async function updateActiveGroups(ctx) {
        if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
            try {
                const connection = await pool.getConnection();
                await connection.query(`
                    INSERT INTO groups (group_id, title, is_active, last_activity)
                    VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
                    ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    is_active = TRUE,
                    last_activity = CURRENT_TIMESTAMP
                `, [ctx.chat.id, ctx.chat.title]);
                connection.release();
                
                activeGroups.set(ctx.chat.id, { title: ctx.chat.title, id: ctx.chat.id });
                console.log(`Added/Updated group: ${ctx.chat.title} (${ctx.chat.id})`);
            } catch (error) {
                console.error('Error updating group in database:', error);
                // You might want to add some error handling here, such as notifying an admin
            }
        }
    }
    async function loadActiveGroupsFromDatabase() {
        try {
            const connection = await pool.getConnection();
            const [rows] = await connection.query(`
                SELECT group_id, title
                FROM groups
                WHERE is_active = TRUE
            `);
            connection.release();
    
            activeGroups.clear();
            for (const row of rows) {
                activeGroups.set(row.group_id, { title: row.title, id: row.group_id });
            }
            console.log(`Loaded ${activeGroups.size} active groups from database`);
        } catch (error) {
            console.error('Error loading active groups from database:', error);
        }
    }
    function showRepliesMenu(ctx) {
        const message = 'قسم الردود - اختر الإجراء المطلوب:';
        const keyboard = {
            inline_keyboard: [
                [{ text: '• اضف رد عام •', callback_data: 'add_general_reply' }],
                [{ text: '• حذف رد عام •', callback_data: 'delete_general_reply' }],
                [{ text: '• عرض الردود العامة •', callback_data: 'list_general_replies' }],
                [{ text: '❌ حذف جميع الردود', callback_data: 'delete_all_replies' }],
                [{ text: '🔙 رجوع', callback_data: 'back_to_dev_panel' }]
            ]
        };
    
        ctx.editMessageText(message, { reply_markup: keyboard });
    }

 



    

    // Modify the delete_general_reply action handler
bot.action('delete_general_reply', async (ctx) => {
    if (await isDeveloper(ctx, ctx.from.id)) {
        await ctx.answerCbQuery('حذف رد عام');
        ctx.reply('أرسل الكلمة التي تريد حذف الرد لها:');
        awaitingDeleteReplyWord = true;
    } else {
        ctx.answerCbQuery('عذراً، هذا الأمر للمطورين فقط', { show_alert: true });
    }
});
bot.action('delete_all_replies', async (ctx) => {
    if (await isDeveloper(ctx, ctx.from.id)) {
        await ctx.answerCbQuery();
        const confirmKeyboard = {
            inline_keyboard: [
                [{ text: '✅ نعم، احذف جميع الردود', callback_data: 'confirm_delete_all_replies' }],
                [{ text: '❌ لا، إلغاء العملية', callback_data: 'cancel_delete_all_replies' }]
            ]
        };
        ctx.editMessageText('⚠️ تحذير: هل أنت متأكد أنك تريد حذف جميع الردود؟ هذا الإجراء لا يمكن التراجع عنه.', { reply_markup: confirmKeyboard });
    } else {
        ctx.answerCbQuery('عذراً، هذا الأمر للمطورين فقط', { show_alert: true });
    }
});

bot.action('confirm_delete_all_replies', async (ctx) => {
    if (await isDeveloper(ctx, ctx.from.id)) {
        try {
            const connection = await pool.getConnection();
            await connection.query('DELETE FROM replies');
            connection.release();
            ctx.answerCbQuery('تم حذف جميع الردود بنجاح', { show_alert: true });
            showRepliesMenu(ctx);
        } catch (error) {
            console.error('Error deleting all replies:', error);
            ctx.answerCbQuery('حدث خطأ أثناء حذف الردود', { show_alert: true });
        }
    } else {
        ctx.answerCbQuery('عذراً، هذا الأمر للمطورين فقط', { show_alert: true });
    }
});

bot.action('cancel_delete_all_replies', async (ctx) => {
    await ctx.answerCbQuery('تم إلغاء عملية الحذف');
    showRepliesMenu(ctx);
});
    bot.action('dev_broadcast', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery();
            ctx.reply('لإرسال رسالة إذاعة، استخدم الأمر التالي:\n/اذاعة [الرسالة]\n\nمثال:\n/اذاعة مرحبا بالجميع!');
        } else {
            ctx.answerCbQuery('عذراً، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    bot.action('list_general_replies', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery('عرض الردود العامة');
            const replies = await fetchRepliesFromDatabase();
            let replyList = 'الردود العامة:\n\n';
            if (replies.length > 0) {
                replies.forEach((reply, index) => {
                    replyList += `${index + 1}. الكلمة: ${reply.trigger_word}\nالرد: ${reply.reply_text}\n\n`;
                });
            } else {
                replyList += 'لا توجد ردود عامة حالياً.';
            }
            ctx.reply(replyList);
        } else {
            ctx.answerCbQuery('عذراً، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    
    
    bot.action('change_bot_name', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery();
            ctx.reply('الرجاء إرسال الاسم الجديد للبوت:');
            awaitingBotName = true;
        }
    });
    
    bot.action('show_current_bot_name', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery();
            const currentBotName = ctx.botInfo.first_name;
            ctx.reply(`اسم البوت الحالي هو: ${currentBotName}`);
        }
    });
    bot.command('update_groups', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            updateActiveGroups(ctx);
            ctx.reply(`Groups updated. Current count: ${activeGroups.size}`);
        }
    });
    bot.command('debug_groups', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            let debugMessage = `Active Groups (${activeGroups.size}):\n\n`;
            for (const [groupId, groupInfo] of activeGroups) {
                debugMessage += `${groupInfo.title} (${groupId})\n`;
            }
            ctx.reply(debugMessage);
        }
    });
    // Update the broadcast command handler
    bot.command('اذاعة', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            const message = ctx.message.text.split(' ').slice(1).join(' ');
            if (!message) {
                return ctx.reply('الرجاء إدخال رسالة للإذاعة بعد الأمر. مثال:\n/اذاعة مرحبا بالجميع!');
            }
    
            console.log(`Broadcasting message: "${message}"`);
            console.log(`Number of active groups: ${activeGroups.size}`);
    
            let successCount = 0;
            let failCount = 0;
    
            for (const [groupId, groupInfo] of activeGroups) {
                try {
                    await ctx.telegram.sendMessage(groupId, message);
                    console.log(`Successfully sent to group: ${groupInfo.title} (${groupId})`);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to send broadcast to group ${groupId} (${groupInfo.title}):`, error);
                    failCount++;
                }
            }
    
            ctx.reply(`تم إرسال الإذاعة بنجاح!\n\nتم الإرسال إلى: ${successCount} مجموعة\nفشل الإرسال إلى: ${failCount} مجموعة`);
        } else {
            ctx.reply('عذراً، هذا الأمر للمطورين فقط');
        }
    });

 // Existing broadcast command
 bot.command('اذاعة', handleBroadcast);

 // Add this new hears handler
 bot.hears(/^اذاعة (.+)/, handleBroadcast);


    bot.command('تنزيل مطور', async (ctx) => {
        await demoteUser(ctx, 'developer');
    });
    
    bot.hears(/^تنزيل مطور/, async (ctx) => {
        await demoteUser(ctx, 'developer');
    });
    // Add these lines to your existing command handlers
bot.hears(/^ترقية (مميز|ادمن|مدير|منشئ|منشئ اساسي|مطور|مطور ثانوي)/, (ctx) => {
    const role = ctx.match[1];
    promoteUser(ctx, role);
});

bot.hears('تنزيل', (ctx) => demoteUser(ctx));


bot.on('left_chat_member', (ctx) => {
    if (ctx.message.left_chat_member.id === ctx.botInfo.id) {
        markGroupAsInactive(ctx.chat.id);
    }
});    


bot.on('text', async (ctx) => {
    console.log('Received text:', ctx.message.text);

    const userId = ctx.from.id;
    const username = ctx.from.username;
    const text = ctx.message.text.toLowerCase();

    if (awaitingReplyWord) {
        tempReplyWord = text;
        ctx.reply(`تم استلام الكلمة: "${tempReplyWord}". الآن أرسل الرد الذي تريد إضافته لهذه الكلمة:`);
        awaitingReplyWord = false;
        awaitingReplyResponse = true;
    } else if (awaitingReplyResponse) {
        const replyResponse = ctx.message.text;
        try {
            const connection = await pool.getConnection();
            await connection.query(
                'INSERT INTO replies (user_id, username, trigger_word, reply_text) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE reply_text = ?',
                [userId, username, tempReplyWord, replyResponse, replyResponse]
            );
            connection.release();
            ctx.reply(`تم إضافة الرد بنجاح!\nالكلمة: ${tempReplyWord}\nالرد: ${replyResponse}`);
        } catch (error) {
            console.error('Error saving reply:', error);
            ctx.reply('❌ حدث خطأ أثناء حفظ الرد.');
        }
        awaitingReplyResponse = false;
        tempReplyWord = '';
    } else if (awaitingDeleteReplyWord) {
        // Handle reply deletion
        try {
            const connection = await pool.getConnection();
            const [result] = await connection.query(
                'DELETE FROM replies WHERE user_id = ? AND LOWER(TRIM(trigger_word)) = LOWER(TRIM(?))',
                [userId, text.trim()]
            );
            connection.release();

            if (result.affectedRows > 0) {
                ctx.reply(`✅ تم حذف الرد للكلمة "${text}" بنجاح.`);
            } else {
                ctx.reply(`❌ لم يتم العثور على رد للكلمة "${text}".`);
            }
        } catch (error) {
            console.error('Error deleting reply:', error);
            ctx.reply('❌ حدث خطأ أثناء حذف الرد.');
        }
        awaitingDeleteReplyWord = false;
    } else {
        try {
            const connection = await pool.getConnection();
            const [rows] = await connection.query(
                'SELECT reply_text FROM replies WHERE (user_id = ? OR username = ?) AND LOWER(TRIM(trigger_word)) = LOWER(TRIM(?))',
                [userId, username, text.trim()]
            );
            connection.release();

            if (rows.length > 0) {
                ctx.reply(rows[0].reply_text);
            }
        } catch (error) {
            console.error('Error retrieving reply:', error);
        }
    }

    updateActiveGroups(ctx);
});


    //this fucks how the bot starts
    bot.on('message', async (ctx) => {
        console.log('Received message:', ctx.message);
    
        const userId = ctx.from.id;
        const username = ctx.from.username;
        const message = ctx.message;
    
        if (awaitingReplyResponse) {
            // Handle reply addition
            try {
                let mediaType = 'text';
                let replyText = null;
                let cloudinaryUrl = null;
    
                if (message.text) {
                    mediaType = 'text';
                    replyText = message.text.trim();
                } else if (message.photo || message.sticker || message.video || message.animation) {
                    let fileId;
                    if (message.photo) {
                        mediaType = 'photo';
                        fileId = message.photo[message.photo.length - 1].file_id;
                    } else if (message.sticker) {
                        mediaType = 'sticker';
                        fileId = message.sticker.file_id;
                    } else if (message.video) {
                        mediaType = 'video';
                        fileId = message.video.file_id;
                    } else if (message.animation) {
                        mediaType = 'gif';
                        fileId = message.animation.file_id;
                    }
    
                    // Get file path
                    const file = await ctx.telegram.getFile(fileId);
                    const filePath = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    
                    // Upload to Cloudinary
                    const uploadResult = await cloudinary.uploader.upload(filePath, {
                        resource_type: 'auto'
                    });
    
                    cloudinaryUrl = uploadResult.secure_url;
                    replyText = cloudinaryUrl;
                } else {
                    await ctx.reply('❌ نوع الرد غير مدعوم.');
                    return;
                }
    
                const connection = await pool.getConnection();
                await connection.query(
                    'INSERT INTO replies (user_id, username, trigger_word, reply_text, media_type) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE reply_text = ?, media_type = ?',
                    [userId, username, tempReplyWord.trim(), replyText, mediaType, replyText, mediaType]
                );
                connection.release();
                await ctx.reply(`✅ تم إضافة الرد بنجاح!\nالكلمة: ${tempReplyWord}\nنوع الرد: ${mediaType}`);
            } catch (error) {
                console.error('❌ خطأ أثناء حفظ الرد:', error);
                await ctx.reply('❌ حدث خطأ أثناء حفظ الرد.');
            }
            awaitingReplyResponse = false;
            tempReplyWord = '';
        } else {
            // Handle reply retrieval
            try {
                const connection = await pool.getConnection();
                const [rows] = await connection.query(
                    'SELECT reply_text, media_type FROM replies WHERE (user_id = ?) AND LOWER(TRIM(trigger_word)) = LOWER(TRIM(?)) LIMIT 1',
                    [userId, message.text.trim().toLowerCase()]
                );
                connection.release();
    
                if (rows.length > 0) {
                    const reply = rows[0];
    
                    switch (reply.media_type) {
                        case 'text':
                            await ctx.reply(reply.reply_text, { reply_to_message_id: ctx.message.message_id });
                            break;
                        case 'photo':
                            await ctx.replyWithPhoto(reply.reply_text, { reply_to_message_id: ctx.message.message_id });
                            break;
                        case 'sticker':
                            await ctx.replyWithSticker(reply.reply_text, { reply_to_message_id: ctx.message.message_id });
                            break;
                        case 'video':
                            await ctx.replyWithVideo(reply.reply_text, { reply_to_message_id: ctx.message.message_id });
                            break;
                        case 'gif':
                            await ctx.replyWithAnimation(reply.reply_text, { reply_to_message_id: ctx.message.message_id });
                            break;
                        default:
                            console.log('⚠️ وسائط غير معروفة:', reply.media_type);
                            break;
                    }
                } else {
                    console.log('🚫 لا يوجد رد محفوظ لهذه الكلمة:', message.text);
                }
            } catch (error) {
                console.error('Error retrieving reply:', error);
            }
        }
    
        updateActiveGroups(ctx);
    });
    
    
    bot.action('add_general_reply', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery('إضافة رد عام');
            ctx.reply('أرسل الكلمة التي تريد إضافة رد لها:');
            awaitingReplyWord = true;
        } else {
            ctx.answerCbQuery('عذرًا، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    
    function showDevelopersMenu(ctx) {
        const message = ' يرجى استخدام الاوامر لرفع مطور اساسي او مطور ثاني , قائمة المطورين - اختر الإجراء المطلوب:';
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '• المطورين •', callback_data: 'list_developers' },
                    { text: '• حذف المطورين •', callback_data: 'delete_developers' }
                ],
                [
                    { text: '• الثانويين •', callback_data: 'list_secondary_developers' },
                    { text: '• حذف الثانويين •', callback_data: 'delete_secondary_developers' }
                ],
                
                [{ text: '🔙 رجوع', callback_data: 'back_to_dev_panel' }]
            ]
        };
    
        ctx.editMessageText(message, { reply_markup: keyboard });
    }
    
    // Add a new function to show the bot name menu
    function showBotNameMenu(ctx) {
        const message = 'قسم اسم البوت - اختر الإجراء المطلوب:';
        const keyboard = {
            inline_keyboard: [
                [{ text: '• تغيير اسم البوت العام •', callback_data: 'change_bot_name' }],
        
               
                [{ text: '• عرض اسم البوت الحالي •', callback_data: 'show_current_bot_name' }],
                [{ text: '🔙 رجوع', callback_data: 'back_to_dev_panel' }]
            ]
        };
    
        ctx.editMessageText(message, { reply_markup: keyboard });
    }

    bot.action('list_developers', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery('عرض قائمة المطورين');
            try {
                const connection = await pool.getConnection();
                const [developers] = await connection.query('SELECT user_id, username FROM developers');
                connection.release();
    
                if (developers.length > 0) {
                    const developersList = await Promise.all(developers.map(async (dev, index) => {
                        let displayName = dev.username ? `@${dev.username}` : 'بدون معرف';
                        try {
                            const user = await ctx.telegram.getChat(dev.user_id);
                            displayName = user.username ? `@${user.username}` : user.first_name || 'بدون اسم';
                        } catch (error) {
                            console.error(`Error fetching user info for ${dev.user_id}:`, error);
                        }
                        return `${index + 1}. ${displayName} ↫ معرف ↓\n${dev.user_id}`;
                    }));
                    await ctx.reply(`قائمة المطورين:\n\n${developersList.join('\n\n')}`);
                } else {
                    await ctx.reply('لا يوجد مطورين حاليًا.');
                }
            } catch (error) {
                console.error('Error fetching developers:', error);
                await ctx.reply('❌ حدث خطأ أثناء جلب قائمة المطورين. الرجاء المحاولة مرة أخرى لاحقًا.');
            }
        } else {
            ctx.answerCbQuery('عذرًا، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    bot.action('bot_subscription', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText(
            '📅 معلومات اشتراك البوت:\n\n' +
            '🔹 حالة البوت: مجاني\n' +
            '🔸 هذه النسخة ليس لها اشتراك\n\n' +
            'للحصول على النسخة الكاملة المدفوعة، يرجى مراجعة قناة السورس.',
            {
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_to_source_menu' }]]
                }
            }
        );
    });
    
    bot.action('source_update', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText(
            '🔄 جاري تحديث البوت...\n\nيرجى الانتظار، سيتم إعلامك عند اكتمال التحديث.',
            {
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_to_source_menu' }]]
                }
            }
        );
    });
    
    bot.action('main_bot_dev', async (ctx) => {
        try {
            const connection = await pool.getConnection();
            const [rows] = await connection.query('SELECT * FROM developers LIMIT 1');
            connection.release();
    
            if (rows.length > 0) {
                const mainDev = rows[0];
                await ctx.answerCbQuery();
                await ctx.editMessageText(
                    '👨‍💻 معلومات مطور البوت الأساسي:\n\n' +
                    `🔹 الاسم: ${mainDev.username || 'غير محدد'}\n` +
                    `🔸 معرف تيليجرام: @${mainDev.username || 'غير محدد'}\n` +
                    `🔹 الرقم التعريفي: ${mainDev.user_id}\n\n` +
                    '🌟 شكراً لجهوده في تطوير وإدارة البوت!',
                    {
                        reply_markup: {
                            inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_to_source_menu' }]]
                        }
                    }
                );
            } else {
                await ctx.answerCbQuery('لم يتم العثور على معلومات المطور الأساسي', { show_alert: true });
            }
        } catch (error) {
            console.error('Error fetching main developer info:', error);
            await ctx.answerCbQuery('حدث خطأ أثناء جلب معلومات المطور الأساسي', { show_alert: true });
        }
    });
    
    bot.action('source_programmer', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: 'https://postimg.cc/WtX4j0ZG',
                caption: '🌟 مبرمج السورس\n\n' +
                         '👨‍💻 المطور: @Lorisiv\n\n' +
                         '🚀 مبرمج متميز ومبدع في عالم البرمجة وتطوير البوتات\n' +
                         '💡 صاحب أفكار مبتكرة وحلول تقنية متقدمة\n' +
                         '🔧 خبرة واسعة في تطوير وتحسين أداء البوتات\n\n' +
                         '📩 للتواصل والاستفسارات: @Lorisiv'
            },
            {
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_to_source_menu' }]]
                }
            }
        );
    })
    
    bot.action('source_channel', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText(
            '📢 قناة السورس الرسمية\n\n' +
            '🔗 الرابط: https://t.me/ctrlsrc\n\n' +
            '🌟 انضم الآن للحصول على:\n' +
            '• آخر التحديثات والإصدارات الجديدة\n' +
            '• نصائح وحيل لاستخدام البوت بشكل أفضل\n' +
            '• الدعم الفني والإجابة على استفساراتكم\n' +
            '• مشاركة الأفكار والاقتراحات لتطوير السورس\n\n' +
            '🚀 كن جزءًا من مجتمعنا المتنامي!',
            {
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_to_source_menu' }]]
                }
            }
        );
    });
    
    bot.action('back_to_source_menu', async (ctx) => {
        await ctx.answerCbQuery();
        try {
            await ctx.editMessageText('قائمة السورس - اختر الإجراء المطلوب:', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '• تاريخ اشتراك البوت •', callback_data: 'bot_subscription' }],
                        [{ text: '• تحديث السورس •', callback_data: 'source_update' }],
                        [{ text: '• مطور البوت الأساسي •', callback_data: 'main_bot_dev' }],
                        [{ text: '• مبرمج السورس •', callback_data: 'source_programmer' }],
                        [{ text: '• قناة السورس •', callback_data: 'source_channel' }],
                        [{ text: '🔙 رجوع', callback_data: 'back_to_dev_panel' }]
                    ]
                }
            });
        } catch (error) {
            if (error.description === 'Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message') {
                // If the message content is the same, we can ignore this error
                console.log('Message content is the same, no need to update');
            } else if (error.description === 'Bad Request: there is no text in the message to edit') {
                // If there's no text to edit (e.g., coming from an image message), send a new message
                await ctx.deleteMessage();
                await ctx.reply('قائمة السورس - اختر الإجراء المطلوب:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '• تاريخ اشتراك البوت •', callback_data: 'bot_subscription' }],
                            [{ text: '• تحديث السورس •', callback_data: 'source_update' }],
                            [{ text: '• مطور البوت الأساسي •', callback_data: 'main_bot_dev' }],
                            [{ text: '• مبرمج السورس •', callback_data: 'source_programmer' }],
                            [{ text: '• قناة السورس •', callback_data: 'source_channel' }],
                            [{ text: '🔙 رجوع', callback_data: 'back_to_dev_panel' }]
                        ]
                    }
                });
            } else {
                // For other errors, log them and inform the user
                console.error('Error in back_to_source_menu:', error);
                await ctx.reply('حدث خطأ أثناء العودة إلى قائمة السورس. الرجاء المحاولة مرة أخرى.');
            }
        }
    });
    bot.action('delete_developers', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery('حذف المطورين');
            try {
                const connection = await pool.getConnection();
                const [developers] = await connection.query('SELECT user_id, username FROM developers');
                connection.release();
    
                if (developers.length > 0) {
                    const keyboard = await Promise.all(developers.map(async (dev, index) => {
                        let displayName = dev.username ? `@${dev.username}` : 'بدون معرف';
                        try {
                            const user = await ctx.telegram.getChat(dev.user_id);
                            displayName = user.username ? `@${user.username}` : user.first_name || 'بدون اسم';
                        } catch (error) {
                            console.error(`Error fetching user info for ${dev.user_id}:`, error);
                        }
                        return [{
                            text: `${index + 1}. ${displayName}`,
                            callback_data: `confirm_delete_dev_${dev.user_id}`
                        }];
                    }));
    
                    keyboard.push([{ text: 'إلغاء', callback_data: 'cancel_delete_developers' }]);
    
                    await ctx.editMessageText('قائمة المطورين:', {
                        reply_markup: { inline_keyboard: keyboard }
                    });
                } else {
                    await ctx.editMessageText('لا يوجد مطورين لحذفهم.');
                }
            } catch (error) {
                console.error('Error fetching developers for deletion:', error);
                await ctx.editMessageText('❌ حدث خطأ أثناء جلب قائمة المطورين. الرجاء المحاولة مرة أخرى لاحقًا.');
            }
        } else {
            ctx.answerCbQuery('عذرًا، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    
    bot.action(/^confirm_delete_dev_(\d+)$/, async (ctx) => {
        const devIdToDelete = ctx.match[1];
        if (await isDeveloper(ctx, ctx.from.id)) {
            try {
                const connection = await pool.getConnection();
                const [developer] = await connection.query('SELECT username FROM developers WHERE user_id = ?', [devIdToDelete]);
                
                if (developer.length > 0) {
                    const devUsername = developer[0].username ? `@${developer[0].username}` : `User ID: ${devIdToDelete}`;
                    await ctx.editMessageText(`هل أنت متأكد من حذف المطور: ${devUsername}؟`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '• حذف •', callback_data: `delete_dev_${devIdToDelete}` }],
                                [{ text: 'إلغاء', callback_data: 'cancel_delete_developers' }]
                            ]
                        }
                    });
                } else {
                    await ctx.answerCbQuery('لم يتم العثور على المطور', { show_alert: true });
                }
                connection.release();
            } catch (error) {
                console.error('Error confirming developer deletion:', error);
                await ctx.answerCbQuery('❌ حدث خطأ أثناء تأكيد حذف المطور', { show_alert: true });
            }
        } else {
            ctx.answerCbQuery('عذرًا، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    
    bot.action(/^delete_dev_(\d+)$/, async (ctx) => {
        const devIdToDelete = ctx.match[1];
        if (await isDeveloper(ctx, ctx.from.id)) {
            try {
                const connection = await pool.getConnection();
                await connection.query('DELETE FROM developers WHERE user_id = ?', [devIdToDelete]);
                connection.release();
    
                await ctx.answerCbQuery('تم حذف المطور بنجاح');
                await ctx.editMessageText('تم حذف المطور بنجاح. تم إزالة جميع صلاحياته ورتبته.', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙 رجوع', callback_data: 'back_to_dev_panel' }]
                        ]
                    }
                });
            } catch (error) {
                console.error('Error deleting developer:', error);
                await ctx.answerCbQuery('❌ حدث خطأ أثناء حذف المطور', { show_alert: true });
            }
        } else {
            ctx.answerCbQuery('عذرًا، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    
    // Handle cancellation of developer deletion
    bot.action('cancel_delete_developers', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery('تم إلغاء عملية الحذف');
            showDevelopersMenu(ctx);
        } else {
            ctx.answerCbQuery('عذرًا، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });


    bot.action('overall_stats', async (ctx) => {
        await ctx.answerCbQuery();
        const stats = await getOverallStats();
        await ctx.editMessageText(
            `📊 الإحصائيات العامة:\n\n` +
            `👥 عدد المشتركين: ${stats.subscribers}\n` +
            `👥 عدد المجموعات: ${stats.groups}\n` +
            `📈 إجمالي المستخدمين: ${stats.total}`,
            { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_to_statistics' }]] } }
        );
    });
    
    bot.action('subscribers_stats', async (ctx) => {
        await ctx.answerCbQuery();
        const subscribersCount = await getSubscribersCount();
        await ctx.editMessageText(
            `👥 إحصائيات المشتركين:\n\n` +
            `عدد المشتركين النشطين: ${subscribersCount}`,
            { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_to_statistics' }]] } }
        );
    });
    
    bot.action('groups_stats', async (ctx) => {
        await ctx.answerCbQuery();
        const groupsCount = await getGroupsCount();
        await ctx.editMessageText(
            `👥 إحصائيات المجموعات:\n\n` +
            `عدد المجموعات النشطة: ${groupsCount}`,
            { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_to_statistics' }]] } }
        );
    });
    
    bot.action('backup_data', async (ctx) => {
        await ctx.answerCbQuery();
        const backupData = await generateBackup();
        await ctx.replyWithDocument(
            { source: Buffer.from(JSON.stringify(backupData)), filename: 'backup.json' },
            { caption: 'هذه نسخة احتياطية من بيانات البوت.' }
        );
    });
    
    bot.action('clean_subscribers', async (ctx) => {
        await ctx.answerCbQuery();
        const cleanedCount = await cleanSubscribers();
        await ctx.editMessageText(
            `🧹 تم تنظيف المشتركين:\n\n` +
            `تم إزالة ${cleanedCount} مشترك غير نشط.`,
            { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_to_statistics' }]] } }
        );
    });
    
    bot.action('clean_groups', async (ctx) => {
        await ctx.answerCbQuery();
        const cleanedCount = await cleanGroups();
        await ctx.editMessageText(
            `🧹 تم تنظيف المجموعات:\n\n` +
            `تم إزالة ${cleanedCount} مجموعة غير نشطة.`,
            { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_to_statistics' }]] } }
        );
    });
    
    bot.action('back_to_statistics', async (ctx) => {
        await ctx.answerCbQuery();
        await showStatisticsMenu(ctx);
    });

    // Add handlers for the new bot name actions
    bot.action('dev_bot_name', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery();
            showBotNameMenu(ctx);
        }
    });
    
   // Add new action handlers for custom chat names
bot.action('set_custom_chat_name', async (ctx) => {
    if (await isDeveloper(ctx, ctx.from.id)) {
        await ctx.answerCbQuery();
        ctx.reply('الرجاء إرسال الاسم الخاص للبوت في هذه المحادثة:');
        // Set a flag to indicate we're waiting for the custom name
        ctx.session.awaitingCustomChatName = true;
    }
});

bot.action('remove_custom_chat_name', async (ctx) => {
    if (await isDeveloper(ctx, ctx.from.id)) {
        await ctx.answerCbQuery();
        const chatId = ctx.chat.id;
        try {
            const connection = await pool.getConnection();
            await connection.query('DELETE FROM bot_custom_names WHERE chat_id = ?', [chatId]);
            connection.release();
            ctx.reply('✅ تم إزالة اسم البوت الخاص لهذه المحادثة.');
        } catch (error) {
            console.error('Error removing custom bot name:', error);
            ctx.reply('❌ حدث خطأ أثناء إزالة اسم البوت الخاص.');
        }
    }
});
    
    bot.action('show_current_bot_name', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery();
            const currentBotName = ctx.botInfo.first_name; // Get the current bot name
            ctx.reply(`اسم البوت الحالي هو: ${currentBotName}`);
        }
    });
    
    bot.action('dev_statistics', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery();
            showStatisticsMenu(ctx);
        }
    });
    
    
    
    
    
    bot.action('dev_developers', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery();
            showDevelopersMenu(ctx);
        }
    }); 
    // Update the back_to_dev_panel action handler
    bot.action('back_to_dev_panel', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery();
            showDevPanel(ctx);
        }
    });
    
    
  
    
   
    
    bot.action('list_secondary_developers', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery('عرض قائمة المطورين الثانويين');
            try {
                const connection = await pool.getConnection();
                const [secondaryDevs] = await connection.query('SELECT user_id, username FROM secondary_developers');
                connection.release();
    
                if (secondaryDevs.length > 0) {
                    const devsList = await Promise.all(secondaryDevs.map(async (dev, index) => {
                        let displayName = dev.username ? `@${dev.username}` : 'بدون معرف';
                        try {
                            const user = await ctx.telegram.getChat(dev.user_id);
                            displayName = user.username ? `@${user.username}` : user.first_name || 'بدون اسم';
                        } catch (error) {
                            console.error(`Error fetching user info for ${dev.user_id}:`, error);
                        }
                        return `${index + 1}. ${displayName} ↫ معرف ↓\n${dev.user_id}`;
                    }));
                    await ctx.reply(`قائمة المطورين الثانويين:\n\n${devsList.join('\n\n')}`);
                } else {
                    await ctx.reply('لا يوجد مطورين ثانويين حاليًا.');
                }
            } catch (error) {
                console.error('Error fetching secondary developers:', error);
                await ctx.reply('❌ حدث خطأ أثناء جلب قائمة المطورين الثانويين. الرجاء المحاولة مرة أخرى لاحقًا.');
            }
        } else {
            ctx.answerCbQuery('عذرًا، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    
    bot.action('delete_secondary_developers', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery('حذف المطورين الثانويين');
            try {
                const connection = await pool.getConnection();
                const [secondaryDevs] = await connection.query('SELECT user_id, username FROM secondary_developers');
                connection.release();
    
                if (secondaryDevs.length > 0) {
                    const keyboard = await Promise.all(secondaryDevs.map(async (dev, index) => {
                        let displayName = dev.username ? `@${dev.username}` : 'بدون معرف';
                        try {
                            const user = await ctx.telegram.getChat(dev.user_id);
                            displayName = user.username ? `@${user.username}` : user.first_name || 'بدون اسم';
                        } catch (error) {
                            console.error(`Error fetching user info for ${dev.user_id}:`, error);
                        }
                        return [{
                            text: `${index + 1}. ${displayName}`,
                            callback_data: `confirm_delete_secondary_dev_${dev.user_id}`
                        }];
                    }));
    
                    keyboard.push([{ text: 'إلغاء', callback_data: 'cancel_delete_secondary_developers' }]);
    
                    await ctx.editMessageText('قائمة المطورين الثانويين:', {
                        reply_markup: { inline_keyboard: keyboard }
                    });
                } else {
                    await ctx.editMessageText('لا يوجد مطورين ثانويين لحذفهم.');
                }
            } catch (error) {
                console.error('Error fetching secondary developers for deletion:', error);
                await ctx.editMessageText('❌ حدث خطأ أثناء جلب قائمة المطورين الثانويين. الرجاء المحاولة مرة أخرى لاحقًا.');
            }
        } else {
            ctx.answerCbQuery('عذرًا، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    
    bot.action(/^confirm_delete_secondary_dev_(\d+)$/, async (ctx) => {
        const devIdToDelete = ctx.match[1];
        if (await isDeveloper(ctx, ctx.from.id)) {
            try {
                const connection = await pool.getConnection();
                const [developer] = await connection.query('SELECT username FROM secondary_developers WHERE user_id = ?', [devIdToDelete]);
                
                if (developer.length > 0) {
                    const devUsername = developer[0].username ? `@${developer[0].username}` : `User ID: ${devIdToDelete}`;
                    await ctx.editMessageText(`هل أنت متأكد من حذف المطور الثانوي: ${devUsername}؟`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '• حذف •', callback_data: `delete_secondary_dev_${devIdToDelete}` }],
                                [{ text: 'إلغاء', callback_data: 'cancel_delete_secondary_developers' }]
                            ]
                        }
                    });
                } else {
                    await ctx.answerCbQuery('لم يتم العثور على المطور الثانوي', { show_alert: true });
                }
                connection.release();
            } catch (error) {
                console.error('Error confirming secondary developer deletion:', error);
                await ctx.answerCbQuery('حدث خطأ أثناء تأكيد الحذف', { show_alert: true });
            }
        } else {
            ctx.answerCbQuery('عذرًا، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    
    bot.action(/^delete_secondary_dev_(\d+)$/, async (ctx) => {
        const devIdToDelete = ctx.match[1];
        if (await isDeveloper(ctx, ctx.from.id)) {
            try {
                const connection = await pool.getConnection();
                await connection.query('DELETE FROM secondary_developers WHERE user_id = ?', [devIdToDelete]);
                connection.release();
                await ctx.editMessageText('تم حذف المطور الثانوي بنجاح.');
            } catch (error) {
                console.error('Error deleting secondary developer:', error);
                await ctx.editMessageText('❌ حدث خطأ أثناء حذف المطور الثانوي. الرجاء المحاولة مرة أخرى لاحقًا.');
            }
        } else {
            ctx.answerCbQuery('عذرًا، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    
    bot.action('cancel_delete_secondary_developers', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.editMessageText('تم إلغاء عملية حذف المطورين الثانويين.');
        } else {
            ctx.answerCbQuery('عذرًا، هذا الأمر للمطورين فقط', { show_alert: true });
        }
    });
    
   
    
    bot.action('dev_source', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery();
            showSourceMenu(ctx);
        }
    });
   

    bot.action('dev_replies', async (ctx) => {
        if (await isDeveloper(ctx, ctx.from.id)) {
            await ctx.answerCbQuery();
            showRepliesMenu(ctx);
        }
    });
    
    
    
    

    
    
    
    // Update the show_active_groups action handler
    bot.action('show_active_groups', async (ctx) => {
        try {
            const activeGroupsList = await getActiveGroups(ctx);
            await ctx.answerCbQuery(); // Clear the loading state
            await ctx.editMessageCaption(activeGroupsList, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back' }]]
                }
            });
        } catch (error) {
            console.error('Error showing active groups:', error);
            await ctx.answerCbQuery('حدث خطأ أثناء عرض المجموعات النشطة.');
        }
    });



    // ✅ Back to the main menu in the same message
bot.action('back', async (ctx) => {
    try {
        await ctx.answerCbQuery(); // Clear the loading state
        await ctx.editMessageCaption(
            '🤖 مرحبًا! أنا بوت الحماية. اختر خيارًا:',
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📜 عرض الأوامر', callback_data: 'show_commands' }],
                        [{ text: '📂 عرض المجموعات النشطة', callback_data: 'show_active_groups' }]
                    ]
                }
            }
        );
    } catch (error) {
        console.error('Error in back action:', error);
        await ctx.answerCbQuery('حدث خطأ أثناء العودة للقائمة الرئيسية.');
    }
});

function adminOnly(handler) {
    return async (ctx) => {
        try {
            const userId = ctx.from.id;
            const chatId = ctx.chat.id;

            // Check if the user is the owner
            if (ctx.from.username === 'Lorisiv') {
                return handler(ctx);
            }

            // Check subscription
            if (!await isSubscribed(ctx, userId)) {
                return ctx.reply('يرجى الاشتراك بخاص القناة للاستخدام', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'اشترك الآن', url: 'https://t.me/ctrlsrc' }]
                        ]
                    }
                });
            }

            const member = await ctx.telegram.getChatMember(chatId, userId);
            if (member.status === 'creator' || member.status === 'administrator') {
                return handler(ctx);
            } else {
                ctx.reply('❌ هذا الأمر مخصص للمشرفين فقط.');
            }
        } catch (error) {
            console.error('Error in adminOnly wrapper:', error);
            ctx.reply('❌ حدث خطأ أثناء التحقق من صلاحيات المستخدم.');
        }
    };
}
async function forceCheckSubscription(ctx) {
    const userId = ctx.from.id;
    try {
        const isSubbed = await isSubscribed(ctx, userId);
        if (isSubbed) {
            await ctx.answerCbQuery('✅ أنت مشترك في القناة.', { show_alert: true });
        } else {
            await ctx.answerCbQuery('❌ أنت غير مشترك في القناة. يرجى الاشتراك للاستمرار.', { show_alert: true });
            await ctx.reply('يرجى الاشتراك بقناة البوت للاستخدام', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'اشترك الآن', url: 'https://t.me/ctrlsrc' }],
                        [{ text: 'تحقق من الاشتراك', callback_data: 'check_subscription' }]
                    ]
                }
            });
        }
    } catch (error) {
        console.error('Error in forceCheckSubscription:', error);
        await ctx.answerCbQuery('❌ حدث خطأ أثناء التحقق من الاشتراك. يرجى المحاولة مرة أخرى لاحقًا.', { show_alert: true });
    }
}



// Add this function to get the custom bot name for a chat
async function getCustomBotName(chatId) {
    try {
        await createBotCustomNamesTable(); // Add this line
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT custom_name FROM bot_custom_names WHERE chat_id = ?',
            [chatId]
        );
        connection.release();
        return rows.length > 0 ? rows[0].custom_name : null;
    } catch (error) {
        console.error('Error retrieving custom bot name:', error);
        return null;
    }
}
// ✅ Show commands
// Show commands
bot.action('show_commands', adminOnly((ctx) => {
    ctx.editMessageCaption(
        '📜 قائمة الأوامر:\n' +
        '⌁︙/معرفي ↫ معرفك\n' +
        '⌁︙/ترقية مميز ↫ مميز\n' +
        '⌁︙/ترقية ادمن ↫ ادمن\n' +
        '⌁︙/ترقية مدير ↫ مدير\n' +
        '⌁︙/ترقية منشئ ↫ منشئ\n' +
        '⌁︙/تنزيل ↫ إزالة رتبة مستخدم\n' +
        '⌁︙/ترقية منشئ اساسي ↫ منشئ اساسي\n' +
        '⌁︙/ترقية مطور ↫ مطور\n' +
        '⌁︙/ترقية مطور ثانوي ↫ مطور ثانوي\n' +
        '⌁︙/ازالة رتبة ↫ تنزيل رتبة\n' +
        '⌁︙/رابط المجموعة ↫ رابط المجموعة\n' +
        '⌁︙/نداء الجميع ↫ نداء الكل\n' +
        '⌁︙/كتم ↫ كتم مستخدم\n' +
        '⌁︙/الغاء كتم ↫ إلغاء كتم مستخدم\n' +
        '⌁︙/مسح ↫ حذف آخر رسالة\n' +
        '⌁︙/تثبيت ↫ تثبيت رسالة\n' +
        '⌁︙/نكتة ↫ إرسال نكتة\n' +
        '⌁︙/طرد ↫ طرد مستخدم\n' +
        '⌁︙/مسح الصور ↫ حذف آخر الصور المرسلة\n' +
        '⌁︙/منع_الصور ↫ منع إرسال الصور\n' +
        '⌁︙/سماح_الصور ↫ السماح بإرسال الصور\n' +
        '⌁︙/ازالة_الروابط ↫ حذف الروابط في المجموعة\n' +
        '⌁︙/فتح روابط ↫ السماح بمشاركة الروابط\n' +
        '⌁︙/غلق روابط ↫ منع مشاركة الروابط\n' +
        '⌁︙/منع فيديو ↫ منع إرسال الفيديوهات\n' +
        '⌁︙/تفعيل فيديو ↫ السماح بإرسال الفيديوهات\n' +
        '⌁︙/منع متحركة ↫ منع إرسال الصور المتحركة\n' +
        '⌁︙/تفعيل متحركة ↫ السماح بإرسال الصور المتحركة\n',
        {
            reply_markup: {
                inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back' }]]
            }
        }
    );
}));


bot.action('check_subscription', forceCheckSubscription);

// Add this closing brace to close the setupActions function
}

module.exports = { setupActions };