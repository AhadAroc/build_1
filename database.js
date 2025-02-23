const mysql = require('mysql2/promise');
const { dbConfig } = require('./config');

const pool = mysql.createPool(dbConfig);

async function setupDatabase() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS replies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT,
                username VARCHAR(255),
                trigger_word VARCHAR(255),
                reply_text TEXT,
                media_type ENUM('text', 'sticker', 'photo') DEFAULT 'text',
                UNIQUE KEY unique_reply (user_id, trigger_word)
            )
        `);
        connection.release();
        console.log('✅ تم تهيئة قاعدة البيانات');
    } catch (error) {
        console.error('❌ خطأ في تهيئة قاعدة البيانات:', error);
    }
}
async function createPrimaryDevelopersTable() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS primary_developers (
                user_id BIGINT PRIMARY KEY,
                username VARCHAR(255)
            )
        `);
        connection.release();
        console.log('primary_developers table created or already exists');
    } catch (error) {
        console.error('Error creating primary_developers table:', error);
    }
}

// ... (keep all the existing code above)

// Replace the two separate module.exports statements with this single one:
module.exports = {
    pool,
    setupDatabase,
    createPrimaryDevelopersTable
};
