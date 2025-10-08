diff --git a/app/api/upload/route.ts b/app/api/upload/route.ts
index dfd4a81db92c15beccd2d45cfc3cff7f6c45c4a5..e557e6a19a81e55e3c3fb274f70dcf788f551197 100644
--- a/app/api/upload/route.ts
+++ b/app/api/upload/route.ts
@@ -1,109 +1,125 @@
 import { NextRequest, NextResponse } from 'next/server';
 import pdf from 'pdf-parse';
 import { supabase } from '@/lib/supabase';
 import { openai } from '@/lib/openai';
 import { chunkText } from '@/lib/utils';
 import type { Chunk } from '@/types';
 
 export async function POST(request: NextRequest) {
   try {
     const formData = await request.formData();
     const file = formData.get('file') as File;
     
     if (!file) {
       return NextResponse.json({ error: 'No file provided' }, { status: 400 });
     }
 
     console.log('Processing file:', file.name);
 
     // Convert file to buffer
     const bytes = await file.arrayBuffer();
     const buffer = Buffer.from(bytes);
 
     // Extract text based on file type
     let text = '';
     let pageTexts: string[] = [];
-    
+    let totalPages = 0;
+
     if (file.name.toLowerCase().endsWith('.pdf')) {
       try {
-        const pdfData = await pdf(buffer);
+        const perPageTexts: string[] = [];
+        const pdfData = await pdf(buffer, {
+          pagerender: async (pageData: any) => {
+            const textContent = await pageData.getTextContent();
+            const pageText = textContent.items
+              .map((item: any) => ('str' in item ? item.str : ''))
+              .join(' ')
+              .replace(/\s+/g, ' ')
+              .trim();
+
+            perPageTexts.push(pageText);
+            return pageText;
+          },
+        });
+
         text = pdfData.text;
-        // Split by page (this is a simplified approach)
-        pageTexts = pdfData.text.split('\n\n\n').filter(p => p.trim());
-        
-        // If no pages detected, treat entire text as one page
+        pageTexts = perPageTexts.map(page => page.replace(/\s+/g, ' ').trim());
+
         if (pageTexts.length === 0 && text.trim()) {
-          pageTexts = [text];
+          pageTexts = [text.replace(/\s+/g, ' ').trim()];
         }
-        
-        console.log('PDF parsed. Pages:', pageTexts.length);
+
+        totalPages = pdfData.numpages || pageTexts.length;
+
+        console.log('PDF parsed. Pages:', totalPages, 'Extracted segments:', pageTexts.length);
       } catch (pdfError) {
         console.error('PDF parsing error:', pdfError);
-        return NextResponse.json({ 
-          error: 'Failed to parse PDF', 
-          details: pdfError instanceof Error ? pdfError.message : 'Unknown error' 
+        return NextResponse.json({
+          error: 'Failed to parse PDF',
+          details: pdfError instanceof Error ? pdfError.message : 'Unknown error'
         }, { status: 400 });
       }
     } else {
       return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF.' }, { status: 400 });
     }
 
     if (pageTexts.length === 0) {
       return NextResponse.json({ error: 'PDF appears to be empty or could not extract text' }, { status: 400 });
     }
 
     // Store document metadata (let Supabase generate the UUID)
     console.log('Storing document in database...');
     const { data: docData, error: docError } = await supabase
       .from('documents')
       .insert({
         filename: file.name,
-        total_pages: pageTexts.length,
+        total_pages: totalPages || pageTexts.length,
         total_chunks: 0, // Will update this later
       })
       .select()
       .single();
 
     if (docError) {
       console.error('Error storing document:', docError);
       return NextResponse.json({ 
         error: 'Failed to store document in database',
         details: docError.message,
         code: docError.code,
         hint: docError.hint || 'Check if database tables are properly created'
       }, { status: 500 });
     }
 
     console.log('Document stored with ID:', docData.id);
 
     // Process each page and create chunks
     const allChunks: Chunk[] = [];
     let chunkIndex = 0;
 
     for (let pageNum = 0; pageNum < pageTexts.length; pageNum++) {
       const pageText = pageTexts[pageNum];
+      if (!pageText) continue;
       const pageChunks = chunkText(pageText, 800, 100);
 
       for (const chunkContent of pageChunks) {
         allChunks.push({
           content: chunkContent,
           page_number: pageNum + 1,
           chunk_index: chunkIndex++,
           document_id: docData.id, // Use the Supabase-generated UUID
         });
       }
     }
 
     console.log(`Creating embeddings for ${allChunks.length} chunks...`);
 
     // Create embeddings for all chunks
     try {
       const chunksWithEmbeddings = await Promise.all(
         allChunks.map(async (chunk) => {
           const embeddingResponse = await openai.embeddings.create({
             model: 'text-embedding-3-small',
             input: chunk.content,
           });
           
           return {
             ...chunk,
diff --git a/app/api/upload/route.ts b/app/api/upload/route.ts
index dfd4a81db92c15beccd2d45cfc3cff7f6c45c4a5..e557e6a19a81e55e3c3fb274f70dcf788f551197 100644
--- a/app/api/upload/route.ts
+++ b/app/api/upload/route.ts
@@ -158,26 +174,26 @@ export async function POST(request: NextRequest) {
       });
 
     } catch (embeddingError) {
       console.error('Embedding creation error:', embeddingError);
       
       // Clean up the document record if embedding fails
       await supabase.from('documents').delete().eq('id', docData.id);
       
       return NextResponse.json({ 
         error: 'Failed to create embeddings',
         details: embeddingError instanceof Error ? embeddingError.message : 'Unknown error',
         hint: 'Check your OpenAI API key and quota'
       }, { status: 500 });
     }
 
   } catch (error) {
     console.error('Upload error:', error);
     return NextResponse.json(
       { 
         error: 'Failed to process file',
         details: error instanceof Error ? error.message : 'Unknown error'
       },
       { status: 500 }
     );
   }
-}
+}
