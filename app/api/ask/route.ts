import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { openai } from "@/lib/openai";

// --- Types -----------------------------------------------------------------
type RetrievedChunk = {
  page_number: number;
  content: string;
  similarity: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Handler ---------------------------------------------------------------
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { question, documentId } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    const trimmed = String(question).trim().slice(0, 1000);
    if (!trimmed) {
      return NextResponse.json({ error: 'Empty question' }, { status: 400 });
    }

    // Optional: verify document exists when provided
    if (documentId) {
      const { data: docExists, error: docErr } = await supabase
        .from('documents')
        .select('id')
        .eq('id', documentId)
        .single();
      if (docErr) {
        return NextResponse.json({ error: 'Document lookup failed', details: docErr.message }, { status: 500 });
      }
      if (!docExists) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
    }

    // 1️⃣ Create embedding for the question
    console.log('Creating embedding for question:', question);
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: trimmed,
    });

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // 2️⃣ Search for relevant chunks using semantic search
    console.log('Searching for relevant chunks...');
    const { data: chunks, error: searchError } = await supabase
      .rpc('search_chunks', {
        query_embedding: questionEmbedding,
        match_count: 5,
        filter_document_id: documentId || null,
      });

    if (searchError) {
      console.error('Search error:', searchError);
      return NextResponse.json({ 
        error: 'Failed to search chunks',
        details: searchError.message 
      }, { status: 500 });
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find any relevant information to answer your question.",
        citations: [],
      });
    }

    console.log(`Found ${chunks.length} relevant chunks`);

    // 3️⃣ Build the context string
    const context = chunks
      .map((chunk: RetrievedChunk) => `[# Page ${chunk.page_number}] ${String(chunk.content).replace(/\s+/g, ' ').slice(0, 1200)}`)
      .join("\n\n");

    // 4️⃣ Ask OpenAI using the retrieved context
    console.log('Generating answer...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You answer strictly from the provided context. If the context lacks the answer, say you don't know. Always cite page numbers.",
        },
        {
          role: "user",
          content: `Context from the document:\n\n${context}\n\nQuestion: ${trimmed}`,
        },
      ],
      temperature: 0.2,
    });

    const answer = completion.choices[0].message.content ?? "No answer.";

    // 5️⃣ Return response with citations
    return NextResponse.json({
      answer,
      citations: chunks.map((c: RetrievedChunk) => ({
        page: c.page_number,
        text: c.content.slice(0, 150) + "...",
        similarity: c.similarity,
      })),
    });
  } catch (err: any) {
    console.error('Error in ask route:', err);
    return NextResponse.json({ 
      error: err.message || "Unknown error",
      details: err.stack 
    }, { status: 500 });
  }
}