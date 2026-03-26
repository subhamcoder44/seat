const fs = require('fs');
const mongoose = require('mongoose');
const dns = require('dns');

// Get MONGODB_URI from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const mongoUriMatch = envContent.match(/MONGODB_URI=(.*)/);
const MONGODB_URI = mongoUriMatch ? mongoUriMatch[1].trim() : null;

async function run() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  // Optional: Uncomment to use Google DNS if your local DNS fails to resolve SRV records
  // dns.setServers(['8.8.8.8', '8.8.4.4']);

  console.log('Testing connection to:', MONGODB_URI.replace(/:([^@]+)@/ , ':****@'));
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected successfully to MongoDB Atlas!');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
  } catch (err) {
    console.error('❌ Connection failed:');
    console.error(err.message);
    console.log('\nTIP: Ensure your current IP is whitelisted in MongoDB Atlas (Network Access).');
    if (err.message.includes('querySrv')) {
      console.log('TIP: Your local DNS might be blocking SRV lookups. Try uncommenting the DNS override in this script.');
    }
  } finally {
    await mongoose.disconnect();
  }
}

run();
