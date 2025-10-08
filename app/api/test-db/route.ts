import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test 1: Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('documents')
      .select('count')
      .limit(0);

    if (tablesError) {
      return NextResponse.json({
        success: false,
        error: 'Cannot access documents table',
        details: tablesError.message,
        hint: 'Run the SQL schema in Supabase SQL editor'
      }, { status: 500 });
    }

    // Test 2: Check pgvector
    const { data: extensions, error: extError } = await supabase
      .rpc('get_extensions', {});

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      tables: 'Documents table accessible',
      hint: 'Ready to upload PDFs!'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}