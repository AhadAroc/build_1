const { MongoClient } = require('mongodb');
const { mongoUri, dbName } = require('./config');

const client = new MongoClient(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tls: true
});

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected successfully to MongoDB');
    return client.db(dbName);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

async function createPrimaryDevelopersTable() {
  try {
    const db = await connectToDatabase();
    // Check if the developers collection exists
    const collections = await db.listCollections({ name: 'developers' }).toArray();
    
    if (collections.length === 0) {
      // Create the developers collection if it doesn't exist
      await db.createCollection('developers');
      console.log('✅ Developers collection created');
    }
    
    // Ensure the index exists
    await db.collection('developers').createIndex({ user_id: 1 }, { unique: true });
    console.log('✅ Primary developers table setup complete');
    
    return true;
  } catch (error) {
    console.error('Error creating primary developers table:', error);
    throw error;
  }
}

async function setupDatabase() {
  const db = await connectToDatabase();
  console.log('✅ Database connected');
  
  // Ensure indexes for better query performance
  await db.collection('replies').createIndex({ user_id: 1, trigger_word: 1 }, { unique: true });
  await db.collection('developers').createIndex({ user_id: 1 }, { unique: true });
  
  console.log('✅ Indexes created');
}

async function getDevelopers() {
  const db = await connectToDatabase();
  return db.collection('developers').find().toArray();
}

async function getReplies() {
  const db = await connectToDatabase();
  return db.collection('replies').find().toArray();
}

async function addReply(reply) {
  const db = await connectToDatabase();
  return db.collection('replies').insertOne(reply);
}

async function updateReply(user_id, trigger_word, newData) {
  const db = await connectToDatabase();
  return db.collection('replies').updateOne(
    { user_id, trigger_word },
    { $set: newData }
  );
}

async function deleteReply(user_id, trigger_word) {
  const db = await connectToDatabase();
  return db.collection('replies').deleteOne({ user_id, trigger_word });
}

async function addDeveloper(developer) {
  const db = await connectToDatabase();
  return db.collection('developers').insertOne(developer);
}

async function removeDeveloper(user_id) {
  const db = await connectToDatabase();
  return db.collection('developers').deleteOne({ user_id });
}

module.exports = {
  connectToDatabase,
  setupDatabase,
  createPrimaryDevelopersTable,
  getDevelopers,
  getReplies,
  addReply,
  updateReply,
  deleteReply,
  addDeveloper,
  removeDeveloper
};
