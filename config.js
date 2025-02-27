module.exports = {
    token: '7511592050:AAH1IMH8kG6UolhwwzIOW-Pf2UUM04hEdTM',
    mongoUri: 'mongodb+srv://Amr:NidisuSI@cluster0.ay6fa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
    dbName: 'replays',
    developerIds: new Set(['7308214106']),
    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dpxowt5m5',
        api_key: process.env.CLOUDINARY_API_KEY || '248273337268518',
        api_secret: process.env.CLOUDINARY_API_SECRET || 'SihooJWz6cMi5bNDAU26Tmf-tIw'
    }
};
