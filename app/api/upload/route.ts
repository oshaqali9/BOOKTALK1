import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import { supabase } from '@/lib/supabase';
import { openai } from '@/lib/openai';
import { chunkText } from '@/lib/utils';
import type { Chunk } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate MIME and size (max 10MB)
    const maxBytes = 10 * 1024 * 1024;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF.' }, { status: 400 });
    }
    if ((file as any).size && (file as any).size > maxBytes) {
      return NextResponse.json({ error: 'File too large. Max size is 10MB.' }, { status: 413 });
    }

    // Convert to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text/pages from PDF
    let pageTexts: string[] = [];
    let totalPages = 0;

    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const perPageTexts: string[] = [];
        const pdfData: any = await pdf(buffer, {
          pagerender: async (pageData: any) => {
            const textContent = await pageData.getTextContent();
            const pageText = (textContent.items || [])
              .map((item: any) => ('str' in item ? item.str : ''))
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            perPageTexts.push(pageText);
            return pageText;
          },
        } as any);

        const text: string = pdfData.text || '';
        totalPages = pdfData.numpages || 0;
        pageTexts = perPageTexts.map(p => p.replace(/\s+/g, ' ').trim());
        if (pageTexts.length === 0 && text.trim()) {
          pageTexts = [text.replace(/\s+/g, ' ').trim()];
          totalPages = 1;
        }
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json(
          { error: 'Failed to parse PDF', details: pdfError instanceof Error ? pdfError.message : 'Unknown error' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF.' },
        { status: 400 }
      );
    }

    if (pageTexts.length === 0) {
      return NextResponse.json(
        { error: 'PDF appears to be empty or could not extract text' },
        { status: 400 }
      );
    }

    // Create document record (let DB generate UUID)
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({ filename: file.name, total_pages: totalPages || pageTexts.length, total_chunks: 0 })
      .select()
      .single();

    if (docError || !docData) {
      console.error('Error storing document:', docError);
      return NextResponse.json(
        { error: 'Failed to store document in database', details: docError?.message },
        { status: 500 }
      );
    }

    // Build chunks
    const allChunks: Chunk[] = [];
    let chunkIndex = 0;
    for (let pageNum = 0; pageNum < pageTexts.length; pageNum++) {
      const pageText = pageTexts[pageNum];
      if (!pageText) continue;
      const pageChunks = chunkText(pageText, 800, 100);
      for (const chunkContent of pageChunks) {
        allChunks.push({
          content: chunkContent,
          page_number: pageNum + 1,
          chunk_index: chunkIndex++,
          document_id: docData.id,
        });
      }
    }

    // Limits and batching
    const MAX_CHUNKS = 1000;
    const chunksToEmbed = allChunks.slice(0, MAX_CHUNKS);

    const CONCURRENCY = 64;
    const chunksWithEmbeddings: Chunk[] = [];
    for (let i = 0; i < chunksToEmbed.length; i += CONCURRENCY) {
      const batch = chunksToEmbed.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (chunk) => {
          const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: chunk.content });
          return { ...chunk, embedding: (res as any).data[0].embedding } as Chunk;
        })
      );
      chunksWithEmbeddings.push(...results);
    }

    // Persist chunks
    // Insert in DB batches
    const INSERT_BATCH = 500;
    for (let i = 0; i < chunksWithEmbeddings.length; i += INSERT_BATCH) {
      const slice = chunksWithEmbeddings.slice(i, i + INSERT_BATCH);
      const { error: chunkError } = await supabase.from('chunks').insert(slice as any);
      if (chunkError) {
        await supabase.from('documents').delete().eq('id', docData.id);
        console.error('Error storing chunks:', chunkError);
        return NextResponse.json({ error: 'Failed to store chunks', details: chunkError.message }, { status: 500 });
      }
    }

    // Update totals
    await supabase
      .from('documents')
      .update({ total_chunks: chunksWithEmbeddings.length })
      .eq('id', docData.id);

    return NextResponse.json({
      document: { ...docData, total_chunks: chunksWithEmbeddings.length },
      chunks: chunksWithEmbeddings.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


