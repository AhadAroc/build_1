const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000 // 60 seconds timeout
};

const pool = mysql.createPool(dbConfig);
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

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
    });

module.exports = {
    pool,
    setupDatabase,
    createPrimaryDevelopersTable
};
