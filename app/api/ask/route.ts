import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// --- Types -----------------------------------------------------------------
type RetrievedChunk = {
  page_number: number;
  content: string;
  // add other columns from your Supabase table if needed (e.g., id, embedding)
};

// --- Clients ---------------------------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

    // 1️⃣ Retrieve the top chunks for this document
    const { data, error } = await supabase
      .from("chunks")
      .select("page_number, content")
      .eq("document_id", documentId)
      .limit(5);

    if (error) throw error;

    const chunks: RetrievedChunk[] = data ?? [];

    // 2️⃣ Build the context string
    const context = chunks
      .map((chunk: RetrievedChunk, i: number) => `[Page ${chunk.page_number}]: ${chunk.content}`)
      .join("\n\n");

    // 3️⃣ Ask OpenAI using the retrieved context
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that answers only using the provided document context.",
        },
        {
          role: "user",
          content: `Answer the question using the context below.\n\nContext:\n${context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.2,
    });

    const answer = completion.choices[0].message.content ?? "No answer.";

    // 4️⃣ Return response
    return NextResponse.json({
      answer,
      citations: chunks.map((c) => ({
        page: c.page_number,
        text: c.content.slice(0, 150) + "...",
      })),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
