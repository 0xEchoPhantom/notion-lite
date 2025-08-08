import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Admin DB not available' }, { status: 503 });
    }

    console.log('🔍 Starting Firestore structure debug...');

    // Get all top-level collections
    const collections = await adminDb.listCollections();
    console.log('📁 Top-level collections:', collections.map(c => c.id));

    const debugData: any = {
      topLevelCollections: collections.map(c => c.id),
      details: {}
    };

    // Check each collection
    for (const collection of collections) {
      const collectionName = collection.id;
      console.log(`\n📂 Checking collection: ${collectionName}`);
      
      try {
        const snapshot = await collection.limit(5).get();
        console.log(`📊 ${collectionName} has ${snapshot.size} documents (showing first 5)`);
        
        debugData.details[collectionName] = {
          documentCount: snapshot.size,
          sampleDocuments: []
        };

        snapshot.docs.forEach((doc, index) => {
          console.log(`📄 Document ${index + 1}: ${doc.id}`);
          const data = doc.data();
          console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
          
          debugData.details[collectionName].sampleDocuments.push({
            id: doc.id,
            dataKeys: Object.keys(data),
            createdAt: data.createdAt?.toDate?.() || data.createdAt || 'No createdAt',
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || 'No updatedAt'
          });

          // If this is users collection, check subcollections
          if (collectionName === 'users') {
            console.log(`👤 User: ${doc.id}, checking subcollections...`);
          }
        });

        // Special handling for users collection
        if (collectionName === 'users' && snapshot.size > 0) {
          const firstUserDoc = snapshot.docs[0];
          const userSubcollections = await firstUserDoc.ref.listCollections();
          console.log(`📁 User ${firstUserDoc.id} subcollections:`, userSubcollections.map(c => c.id));
          
          debugData.details[collectionName].userSubcollections = userSubcollections.map(c => c.id);

          // Check pages subcollection
          const pagesSubcol = userSubcollections.find(c => c.id === 'pages');
          if (pagesSubcol) {
            const pagesSnapshot = await pagesSubcol.limit(3).get();
            console.log(`📄 User has ${pagesSnapshot.size} pages (showing first 3)`);
            debugData.details[collectionName].pagesCount = pagesSnapshot.size;
            debugData.details[collectionName].samplePages = [];

            pagesSnapshot.docs.forEach((pageDoc, index) => {
              console.log(`📃 Page ${index + 1}: ${pageDoc.id}`);
              const pageData = pageDoc.data();
              console.log(`   Page data keys: ${Object.keys(pageData).join(', ')}`);
              
              debugData.details[collectionName].samplePages.push({
                id: pageDoc.id,
                title: pageData.title || 'No title',
                dataKeys: Object.keys(pageData)
              });
            });

            // Check blocks in first page
            if (pagesSnapshot.size > 0) {
              const firstPageDoc = pagesSnapshot.docs[0];
              const blocksSnapshot = await firstPageDoc.ref.collection('blocks').limit(3).get();
              console.log(`🧱 First page has ${blocksSnapshot.size} blocks`);
              debugData.details[collectionName].blocksInFirstPage = blocksSnapshot.size;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error checking collection ${collectionName}:`, error);
        debugData.details[collectionName] = { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    console.log('✅ Debug complete');
    return NextResponse.json(debugData);

  } catch (error) {
    console.error('💥 Debug API error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
