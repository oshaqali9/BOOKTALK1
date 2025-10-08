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
    
    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfData = await pdf(buffer);
        text = pdfData.text;
        // Split by page (this is a simplified approach)
        pageTexts = pdfData.text.split('\n\n\n').filter(p => p.trim());
        
        // If no pages detected, treat entire text as one page
        if (pageTexts.length === 0 && text.trim()) {
          pageTexts = [text];
        }
        
        console.log('PDF parsed. Pages:', pageTexts.length);
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json({ 
          error: 'Failed to parse PDF', 
          details: pdfError instanceof Error ? pdfError.message : 'Unknown error' 
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
        total_pages: pageTexts.length,
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
            embedding: embeddingResponse.data[0].embedding,
          };
        })
      );

      console.log('Embeddings created successfully');

      // Store chunks with embeddings
      const { error: chunksError } = await supabase
        .from('chunks')
        .insert(
          chunksWithEmbeddings.map(chunk => ({
            document_id: chunk.document_id,
            content: chunk.content,
            page_number: chunk.page_number,
            chunk_index: chunk.chunk_index,
            embedding: chunk.embedding,
          }))
        );

      if (chunksError) {
        console.error('Error storing chunks:', chunksError);
        return NextResponse.json({ 
          error: 'Failed to store chunks',
          details: chunksError.message,
          code: chunksError.code 
        }, { status: 500 });
      }

      // Update document with actual chunk count
      const { error: updateError } = await supabase
        .from('documents')
        .update({ total_chunks: allChunks.length })
        .eq('id', docData.id);

      if (updateError) {
        console.error('Error updating document chunk count:', updateError);
      }

      console.log('Upload complete!');

      return NextResponse.json({
        success: true,
        document: {
          ...docData,
          total_chunks: allChunks.length
        },
        message: `Successfully processed ${file.name} with ${allChunks.length} chunks`,
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
}