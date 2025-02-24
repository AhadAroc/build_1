module.exports = {
    token: '7511592050:AAH1IMH8kG6UolhwwzIOW-Pf2UUM04hEdTM', // استبدله بتوكن البوت الحقيقي
    dbConfig: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || ' ',
        database: process.env.DB_NAME || 'replays'
    },
    developerIds: new Set(['7308214106'])
};
