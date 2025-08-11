const admin = require('firebase-admin');

// Check if service account exists
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  try {
    serviceAccount = require('../serviceAccount.json');
  } catch (error2) {
    console.error('❌ serviceAccountKey.json or serviceAccount.json not found!');
    process.exit(1);
  }
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function createAdminAccount() {
  const email = 'admin@dev.vn';
  const password = 'admin123456'; // Change this in production!
  
  try {
    // Check if user already exists
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      console.log(`✅ Admin account already exists: ${email} (${existingUser.uid})`);
      return existingUser;
    } catch (error) {
      // User doesn't exist, create it
      console.log(`Creating admin account: ${email}`);
    }
    
    // Create the admin user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: true,
      displayName: 'Admin'
    });
    
    console.log(`✅ Successfully created admin account:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log('\n⚠️  IMPORTANT: Please change the password after first login!');
    
    return userRecord;
    
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('\n🔐 Creating Admin Account\n');
  await createAdminAccount();
  console.log('\n✨ Done!');
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});