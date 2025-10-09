'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import { Upload, FileText, MessageSquare, Sparkles, Send, X } from 'lucide-react';
import type { ChatMessage, Document } from '@/types';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function Home() {
  const [document, setDocument] = useState<Document | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setDocument(data.document);
        setMessages([
          {
            role: 'assistant',
            content: `Successfully uploaded "${data.document.filename}". You can now ask questions about the content!`,
          },
        ]);
      } else {
        console.error('Upload error details:', data);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `Upload failed: ${data.error}${data.details ? ' — ' + data.details : ''}`,
          },
        ]);
      }
    } catch (error) {
      console.error('Upload exception:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Upload failed. Please try again.' },
      ]);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || !document) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: input,
          documentId: document.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `Error: ${data.error}`,
          },
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to get an answer. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const dropzoneClassName = cn(
    'flex cursor-pointer flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed p-10 text-center transition-colors sm:p-14',
    isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto max-w-6xl space-y-12 px-4 py-10">
        <header className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">BookTalk AI</h1>
          </div>
          <p className="mx-auto max-w-2xl text-base text-slate-600 sm:text-lg">
            Chat with your PDFs using advanced AI. Upload any document and get instant answers with citations.
          </p>
        </header>

        {!document ? (
          <section className="mx-auto w-full max-w-3xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <div {...getRootProps()} className={dropzoneClassName}>
                <input {...getInputProps()} />

                {isUploading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" />
                      <Upload className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-medium text-slate-900">Processing your document</p>
                      <p className="text-sm text-slate-500">Creating embeddings and analysing content...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-2xl bg-indigo-100 p-6 text-indigo-600">
                      <Upload className="h-12 w-12" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-semibold text-slate-900">
                        {isDragActive ? 'Drop it here' : 'Upload your PDF'}
                      </h3>
                      <p className="text-sm text-slate-600">Drag & drop your file or click to browse</p>
                      <p className="text-xs text-slate-500">Maximum file size: 10MB</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-10 grid gap-6 text-slate-600 sm:grid-cols-3">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Upload</h4>
                    <p className="text-sm text-slate-600">Drop your PDF file</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Chat</h4>
                    <p className="text-sm text-slate-600">Ask any question</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Learn</h4>
                    <p className="text-sm text-slate-600">Get instant answers</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <button
                    onClick={() => {
                      setDocument(null);
                      setMessages([]);
                    }}
                    className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
                  >
                    <span className="sr-only">Remove document</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div>
                  <h3 className="truncate text-base font-semibold text-slate-900">{document.filename}</h3>
                  <p className="mt-1 text-sm text-slate-500">Ready for questions</p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-2xl font-semibold text-indigo-600">{document.total_pages}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Pages</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-2xl font-semibold text-indigo-600">{document.total_chunks}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Chunks</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Helpful prompts
                </h4>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-400">•</span>
                    <span>Ask for summaries of specific chapters or sections.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-400">•</span>
                    <span>Compare two ideas or arguments from the book.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-400">•</span>
                    <span>Request definitions or explanations of key concepts.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex min-h-[500px] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100vh-240px)]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Chat assistant</h3>
                    <p className="text-sm text-slate-500">Ask anything about your document.</p>
                  </div>
                </div>
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="h-2 w-2 animate-ping rounded-full bg-indigo-400" />
                    Thinking
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
                {messages.map((message, index) => {
                  const isUser = message.role === 'user';
                  const bubbleClassName = cn(
                    'max-w-[90%] rounded-2xl px-5 py-4 text-sm leading-6 shadow-sm',
                    isUser ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-slate-100 text-slate-800'
                  );
                  const citationWrapperClassName = cn(
                    'mt-3 border-t pt-3 text-xs',
                    isUser ? 'border-indigo-400/60' : 'border-slate-300'
                  );
                  const citationClassName = cn(
                    'rounded-lg px-3 py-2',
                    isUser ? 'bg-indigo-500/40 text-indigo-50' : 'bg-white text-slate-600'
                  );

                  return (
                    <div key={index} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                      <div className={bubbleClassName}>
                        <ReactMarkdown className="space-y-2 whitespace-pre-wrap">{message.content}</ReactMarkdown>

                        {message.citations && message.citations.length > 0 && (
                          <div className={citationWrapperClassName}>
                            <p className="mb-2 font-semibold opacity-80">Sources</p>
                            <div className="space-y-2">
                              {message.citations.map((citation, citationIndex) => (
                                <div key={citationIndex} className={citationClassName}>
                                  <span className="font-semibold">Page {citation.page}:</span> {citation.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} className="border-t border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    placeholder="Ask a question about your document..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-base font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send className="h-5 w-5" />
                    Send
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}


