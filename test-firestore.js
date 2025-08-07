const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAbVESEsGaxHNfwtvPzwcsmW3eF9-i-sfo",
  authDomain: "notion-lite-5a525.firebaseapp.com",
  projectId: "notion-lite-5a525",
  storageBucket: "notion-lite-5a525.firebasestorage.app",
  messagingSenderId: "585095043065",
  appId: "1:585095043065:web:613b0b85303e7f85548f28"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirestore() {
  try {
    console.log('🧪 Testing Firestore connection...');
    
    // Test collection reference
    const testCollection = collection(db, 'test');
    
    // Add a test document
    console.log('📝 Adding test document...');
    const docRef = await addDoc(testCollection, {
      message: 'Hello from Notion-Lite test!',
      timestamp: new Date(),
      type: 'test'
    });
    console.log('✅ Document written with ID: ', docRef.id);
    
    // Read documents
    console.log('📖 Reading test documents...');
    const querySnapshot = await getDocs(testCollection);
    querySnapshot.forEach((doc) => {
      console.log('📄 Document data:', doc.id, '=>', doc.data());
    });
    
    // Clean up - delete test document
    console.log('🧹 Cleaning up test document...');
    await deleteDoc(doc(db, 'test', docRef.id));
    console.log('✅ Test document deleted');
    
    console.log('🎉 Firestore connection test successful!');
    
  } catch (error) {
    console.error('❌ Firestore test failed:', error);
  }
}

testFirestore().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
