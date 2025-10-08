'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, Document } from '@/types';
import { Upload, FileText, MessageSquare, Sparkles, Send, X } from 'lucide-react';

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
        setMessages([{
          role: 'assistant',
          content: `Successfully uploaded "${data.document.filename}". You can now ask questions about the content!`,
        }]);
      } else {
        console.error('Upload error details:', data);
        alert(`Upload failed: ${data.error}${data.details ? '\n' + data.details : ''}`);
      }
    } catch (error) {
      console.error('Upload exception:', error);
      alert('Upload failed. Please try again.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error}`,
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to get an answer. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg shadow-purple-500/50">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              BookTalk AI
            </h1>
          </div>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Chat with your PDFs using advanced AI. Upload any document and get instant answers with citations.
          </p>
        </div>

        {!document ? (
          /* Upload Section */
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20">
              <div
                {...getRootProps()}
                className={`border-3 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-purple-400 bg-purple-500/20 scale-105'
                    : 'border-gray-400 hover:border-purple-400 hover:bg-white/5'
                }`}
              >
                <input {...getInputProps()} />
                
                {isUploading ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                      <Upload className="w-10 h-10 text-purple-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-white mb-2">Processing Your Document</p>
                      <p className="text-gray-300">Creating embeddings and analyzing content...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-8 rounded-3xl shadow-lg shadow-purple-500/50">
                        <Upload className="w-16 h-16 text-white" />
                      </div>
                      {isDragActive && (
                        <div className="absolute inset-0 bg-purple-400 rounded-3xl animate-ping opacity-75"></div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {isDragActive ? 'Drop it here!' : 'Upload Your PDF'}
                      </h3>
                      <p className="text-gray-300 text-lg">
                        Drag & drop your file or click to browse
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        Maximum file size: 10MB
                      </p>
                    </div>

                    <div className="flex gap-4 mt-4">
                      <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                        <FileText className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-gray-300">PDF Only</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-gray-300">AI Powered</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-6 mt-10">
                <div className="text-center">
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/50">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-1">Upload</h4>
                  <p className="text-sm text-gray-400">Drop your PDF file</p>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-500/50">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-1">Chat</h4>
                  <p className="text-sm text-gray-400">Ask any question</p>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-br from-orange-500 to-red-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/50">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-1">Learn</h4>
                  <p className="text-sm text-gray-400">Get instant answers</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Interface */
          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            {/* Sidebar */}
            <div className="space-y-6">
              {/* Document Info Card */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl shadow-lg shadow-purple-500/50">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <button
                    onClick={() => {
                      setDocument(null);
                      setMessages([]);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="font-semibold text-white mb-2 truncate">{document.filename}</h3>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-purple-400">{document.total_pages}</p>
                    <p className="text-xs text-gray-400 mt-1">Pages</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-pink-400">{document.total_chunks}</p>
                    <p className="text-xs text-gray-400 mt-1">Chunks</p>
                  </div>
                </div>
              </div>

              {/* Tips Card */}
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-400/30">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Pro Tips
                </h4>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Ask specific questions about chapters or topics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-400 mt-1">•</span>
                    <span>Request summaries or comparisons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Follow up with clarifying questions</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Chat Area */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 flex flex-col h-[calc(100vh-200px)]">
              {/* Chat Header */}
              <div className="border-b border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Chat Assistant</h3>
                      <p className="text-sm text-gray-400">Ask me anything about your document</p>
                    </div>
                  </div>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 shadow-lg ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                          : 'bg-white/10 text-white border border-white/20'
                      }`}
                    >
                      <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                        {message.content}
                      </ReactMarkdown>

                      {message.citations && message.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <p className="text-xs font-semibold mb-2 opacity-75">Sources:</p>
                          <div className="space-y-2 text-xs opacity-90">
                            {message.citations.map((citation, i) => (
                              <div key={i} className="bg-white/10 rounded-lg p-2">
                                <span className="font-semibold">Page {citation.page}:</span> {citation.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="border-t border-white/10 p-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about your document..."
                    className="flex-1 bg-white/5 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                  >
                    <Send className="w-5 h-5" />
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}