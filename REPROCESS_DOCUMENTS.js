// Document Reprocessing Script
// This will reprocess all documents to generate proper embeddings

async function reprocessAllDocuments() {
  console.log('🔄 Starting document reprocessing...\n');
  
  try {
    const { getAllDocuments, getChunksByDocument, deleteDocumentChunk } = await import('./src/services/db.js');
    const { processDocumentForRAG } = await import('./src/services/documentProcessor.js');
    
    // Get all documents
    const documents = await getAllDocuments();
    console.log(`📄 Found ${documents.length} documents to check`);
    
    if (documents.length === 0) {
      console.log('⚠️  No documents found');
      return;
    }
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const doc of documents) {
      console.log(`\n🔍 Checking document: "${doc.title}"`);
      
      try {
        // Check if document has chunks
        const chunks = await getChunksByDocument(doc.id);
        console.log(`   📊 Chunks: ${chunks.length}`);
        
        if (chunks.length === 0) {
          console.log('   ⚠️  No chunks found - processing...');
          await processDocumentForRAG(doc.id, doc.content);
          processedCount++;
          console.log('   ✅ Document processed');
        } else {
          // Check if chunks have embeddings
          const hasEmbeddings = chunks.some(c => 
            Array.isArray(c.embedding) && c.embedding.length > 0
          );
          
          if (!hasEmbeddings) {
            console.log('   ⚠️  Chunks exist but no embeddings - reprocessing...');
            
            // Delete existing chunks
            for (const chunk of chunks) {
              if (chunk.id) {
                await deleteDocumentChunk(chunk.id);
              }
            }
            
            // Reprocess with embeddings
            await processDocumentForRAG(doc.id, doc.content);
            processedCount++;
            console.log('   ✅ Document reprocessed with embeddings');
          } else {
            console.log('   ✅ Document already has embeddings - skipping');
            skippedCount++;
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Failed to process "${doc.title}":`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 REPROCESSING SUMMARY:');
    console.log(`✅ Processed: ${processedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (processedCount > 0) {
      console.log('\n🎉 Reprocessing complete! Your documents should now be searchable.');
      console.log('💡 Try asking questions about your documents in chat.');
    } else if (skippedCount > 0) {
      console.log('\n✅ All documents already have embeddings - no reprocessing needed.');
    } else {
      console.log('\n⚠️  No documents were processed. Check for errors above.');
    }
    
  } catch (error) {
    console.error('❌ Reprocessing failed:', error);
  }
}

// Make it available globally
window.reprocessAllDocuments = reprocessAllDocuments;

console.log('🔄 Reprocessing script loaded. Run reprocessAllDocuments() to fix all documents.');
