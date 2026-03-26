/**
 * Migration script: Copy data from local MongoDB to MongoDB Atlas
 * 
 * Usage:
 *   node migrate-to-cloud.js
 * 
 * Requirements:
 *   - Local MongoDB must be running on localhost:27017
 *   - MONGODB_URI in .env.local must point to your Atlas cluster
 *   - Your current IP must be whitelisted in Atlas Network Access
 */

const fs = require('fs');
const dns = require('dns');

// Use Google DNS to resolve Atlas SRV records (local DNS may block them)
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://localhost:27017/exam_seat_mgmt';

const envContent = fs.readFileSync('.env.local', 'utf8');
const mongoUriMatch = envContent.match(/MONGODB_URI=(.*)/);
const CLOUD_URI = mongoUriMatch ? mongoUriMatch[1].trim() : null;

const COLLECTIONS_TO_MIGRATE = ['students', 'rooms', 'allocations'];

async function migrate() {
  if (!CLOUD_URI) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  let localConn, cloudConn;

  try {
    console.log('🔌 Connecting to local MongoDB...');
    localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('✅ Connected to local MongoDB');

    console.log('☁️  Connecting to MongoDB Atlas...');
    cloudConn = await mongoose.createConnection(CLOUD_URI, {
      serverSelectionTimeoutMS: 10000,
      tls: true,
      tlsAllowInvalidCertificates: false,
    }).asPromise();
    console.log('✅ Connected to MongoDB Atlas');

    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      const localCollection = localConn.db.collection(collectionName);
      const cloudCollection = cloudConn.db.collection(collectionName);

      const localDocs = await localCollection.find({}).toArray();

      if (localDocs.length === 0) {
        console.log(`⏭️  Skipping '${collectionName}' — no documents found locally.`);
        continue;
      }

      console.log(`📦 Migrating '${collectionName}' (${localDocs.length} documents)...`);

      // Use bulkWrite with upsert to avoid duplicates on re-run
      const ops = localDocs.map(doc => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      }));

      const result = await cloudCollection.bulkWrite(ops);
      console.log(`  ✅ Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`);
    }

    console.log('\n🎉 Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.message.includes('querySrv') || err.message.includes('ECONNREFUSED')) {
      console.log('\nTIP: Your IP may not be whitelisted in MongoDB Atlas.');
      console.log('     Go to Atlas → Network Access → Add IP Address → Add Current IP');
    }
    process.exit(1);
  } finally {
    if (localConn) await localConn.close();
    if (cloudConn) await cloudConn.close();
  }
}

migrate();
