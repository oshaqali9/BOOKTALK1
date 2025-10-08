diff --git a/app/page.tsx b/app/page.tsx
index e86a943b8d9db4a56cd227b595f6a72b4a7fe196..37d300065744812f037452b452ba59008689f127 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -25,203 +25,291 @@ export default function Home() {
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
 
-  const { getRootProps, getInputProps, isDragActive } = useDropzone({
+  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
     onDrop,
     accept: {
       'application/pdf': ['.pdf'],
     },
     maxFiles: 1,
+    noClick: true,
   });
 
   // Chat handler
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
 
+  const dropzoneClasses = [
+    'mx-auto flex max-w-xl cursor-pointer flex-col items-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-center transition hover:border-white/40',
+    isDragActive ? 'border-blue-400/60 bg-blue-500/10 shadow-lg shadow-blue-500/20' : '',
+  ]
+    .filter(Boolean)
+    .join(' ');
+
   return (
-    <div className="min-h-screen bg-gray-100 p-4">
-      <div className="max-w-4xl mx-auto">
-        <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">
-          BookTalk
-        </h1>
-
-        {!document && (
-          <div
-            {...getRootProps()}
-            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
-              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
-            }`}
-          >
-            <input {...getInputProps()} />
-            {isUploading ? (
-              <div>
-                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
-                <p className="mt-4 text-gray-600">Processing your document...</p>
+    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
+      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/30 blur-3xl" />
+      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-purple-500/20 blur-3xl" />
+
+      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12 lg:px-12">
+        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
+          <div>
+            <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Your personal reading companion</p>
+            <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
+              <span className="bg-gradient-to-r from-sky-400 via-blue-300 to-purple-300 bg-clip-text text-transparent">
+                BookTalk
+              </span>
+            </h1>
+            <p className="mt-4 max-w-2xl text-base text-slate-300">
+              Upload a book or research paper and chat with it instantly. BookTalk turns lengthy PDFs into meaningful insights with conversational answers and verifiable citations.
+            </p>
+          </div>
+
+          <div className="grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-3">
+            {["Upload", "Ask", "Learn"].map((step, index) => (
+              <div key={step} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
+                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Step {index + 1}</p>
+                <p className="mt-2 text-lg font-medium text-white">{step}</p>
               </div>
-            ) : (
-              <>
-                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
-                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
-                </svg>
-                <p className="mt-4 text-lg text-gray-600">
-                  {isDragActive ? 'Drop your PDF here' : 'Drag & drop a PDF here, or click to select'}
-                </p>
-              </>
-            )}
+            ))}
           </div>
-        )}
+        </header>
 
-        {document && (
-          <div className="bg-white rounded-lg shadow-lg">
-            <div className="p-4 border-b">
-              <div className="flex items-center justify-between">
-                <div>
-                  <h2 className="font-semibold text-gray-800">{document.filename}</h2>
-                  <p className="text-sm text-gray-500">
-                    {document.total_pages} pages • {document.total_chunks} chunks
-                  </p>
+        {!document ? (
+          <div className="flex flex-1 items-center justify-center">
+            <div className="w-full max-w-3xl">
+              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-10 shadow-2xl backdrop-blur">
+                <div {...getRootProps({ className: dropzoneClasses, onClick: open })}>
+                  <input {...getInputProps()} />
+                  {isUploading ? (
+                    <div className="flex flex-col items-center gap-4">
+                      <div className="h-14 w-14 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
+                      <p className="text-base text-slate-300">Processing your document...</p>
+                    </div>
+                  ) : (
+                    <>
+                      <div className={`rounded-full bg-blue-500/10 p-5 text-blue-300 transition ${isDragActive ? 'scale-105 bg-blue-500/20 text-blue-200' : ''}`}>
+                        <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
+                          <path d="M12 16V4m0 0l4 4m-4-4L8 8" />
+                          <path d="M20 16.5a3.5 3.5 0 00-3.5-3.5h-.75" />
+                          <path d="M4 17a4 4 0 004 4h8a4 4 0 004-4" />
+                        </svg>
+                      </div>
+                      <h2 className="mt-6 text-2xl font-semibold text-white">Drop your PDF to begin</h2>
+                      <p className="mt-3 text-sm text-slate-300">
+                        {isDragActive
+                          ? 'Release to upload your document'
+                          : 'Drag & drop a PDF here, or click to browse your files. We currently support PDF uploads up to 10MB.'}
+                      </p>
+                      <button
+                        type="button"
+                        onClick={open}
+                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-400 hover:to-indigo-400"
+                      >
+                        Choose a PDF
+                      </button>
+                    </>
+                  )}
                 </div>
-                <button
-                  onClick={() => {
-                    setDocument(null);
-                    setMessages([]);
-                  }}
-                  className="text-sm text-red-600 hover:text-red-800"
-                >
-                  Upload New Document
-                </button>
               </div>
             </div>
+          </div>
+        ) : (
+          <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,320px)_1fr]">
+            <aside className="space-y-6">
+              <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
+                <div className="flex items-start justify-between gap-4">
+                  <div>
+                    <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Active document</p>
+                    <h2 className="mt-2 text-xl font-semibold text-white">{document.filename}</h2>
+                  </div>
+                  <button
+                    onClick={() => {
+                      setDocument(null);
+                      setMessages([]);
+                    }}
+                    className="text-xs font-medium text-rose-300 transition hover:text-rose-200"
+                  >
+                    Upload new
+                  </button>
+                </div>
+                <dl className="mt-6 grid grid-cols-2 gap-4 text-sm text-slate-300">
+                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
+                    <dt className="text-xs uppercase tracking-[0.35em] text-slate-400">Pages</dt>
+                    <dd className="mt-2 text-2xl font-semibold text-white">{document.total_pages}</dd>
+                  </div>
+                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
+                    <dt className="text-xs uppercase tracking-[0.35em] text-slate-400">Chunks</dt>
+                    <dd className="mt-2 text-2xl font-semibold text-white">{document.total_chunks}</dd>
+                  </div>
+                </dl>
+              </div>
+
+              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-300 backdrop-blur">
+                <h3 className="text-base font-semibold text-white">Tips for better answers</h3>
+                <ul className="mt-4 space-y-3">
+                  <li className="flex gap-3">
+                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-400" />
+                    Ask focused questions that reference chapters or sections.
+                  </li>
+                  <li className="flex gap-3">
+                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-purple-400" />
+                    Request summaries, comparisons, or key takeaways to deepen understanding.
+                  </li>
+                  <li className="flex gap-3">
+                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
+                    Follow up on answers to clarify details or explore related topics.
+                  </li>
+                </ul>
+              </div>
+            </aside>
 
-            <div className="h-96 overflow-y-auto p-4 space-y-4">
-              {messages.map((message, index) => (
-                <div
-                  key={index}
-                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
-                >
+            <section className="flex h-[560px] flex-col rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur">
+              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
+                <div>
+                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Conversation</p>
+                  <p className="mt-1 text-lg font-medium text-white">Chat about your document</p>
+                </div>
+                {isLoading && (
+                  <div className="flex items-center gap-2 text-xs text-slate-300">
+                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
+                    Thinking...
+                  </div>
+                )}
+              </div>
+
+              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
+                {messages.map((message, index) => (
                   <div
-                    className={`max-w-xl rounded-lg p-4 ${
-                      message.role === 'user'
-                        ? 'bg-blue-500 text-white'
-                        : 'bg-gray-200 text-gray-800'
-                    }`}
+                    key={index}
+                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                   >
-                    <ReactMarkdown className="prose prose-sm max-w-none">
-                      {message.content}
-                    </ReactMarkdown>
-                    
-                    {message.citations && message.citations.length > 0 && (
-                      <div className="mt-3 pt-3 border-t border-gray-300">
-                        <p className="text-xs font-semibold mb-1">Sources:</p>
-                        {message.citations.map((citation, i) => (
-                          <div key={i} className="text-xs mt-1">
-                            <span className="font-medium">Page {citation.page}:</span> {citation.text}
+                    <div
+                      className={`max-w-xl rounded-3xl border px-5 py-4 text-sm shadow-sm transition ${
+                        message.role === 'user'
+                          ? 'border-blue-500/20 bg-gradient-to-r from-blue-600/80 to-indigo-600/80 text-white'
+                          : 'border-white/10 bg-white/5 text-slate-100'
+                      }`}
+                    >
+                      <ReactMarkdown className="prose prose-invert prose-p:leading-relaxed prose-sm max-w-none">
+                        {message.content}
+                      </ReactMarkdown>
+
+                      {message.citations && message.citations.length > 0 && (
+                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-[0.75rem]">
+                          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-300">Sources</p>
+                          <div className="mt-2 space-y-2 text-slate-200">
+                            {message.citations.map((citation, i) => (
+                              <div key={i}>
+                                <span className="font-semibold text-slate-100">Page {citation.page}:</span> {citation.text}
+                              </div>
+                            ))}
                           </div>
-                        ))}
-                      </div>
-                    )}
+                        </div>
+                      )}
+                    </div>
                   </div>
-                </div>
-              ))}
-              {isLoading && (
-                <div className="flex justify-start">
-                  <div className="bg-gray-200 rounded-lg p-4">
-                    <div className="animate-pulse flex space-x-2">
-                      <div className="rounded-full bg-gray-400 h-2 w-2"></div>
-                      <div className="rounded-full bg-gray-400 h-2 w-2"></div>
-                      <div className="rounded-full bg-gray-400 h-2 w-2"></div>
+                ))}
+                {isLoading && (
+                  <div className="flex justify-start">
+                    <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
+                      <div className="flex items-center gap-2 text-slate-300">
+                        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-200" />
+                        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-300" />
+                        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
+                      </div>
                     </div>
                   </div>
-                </div>
-              )}
-            </div>
-
-            <form onSubmit={handleSubmit} className="p-4 border-t">
-              <div className="flex gap-2">
-                <input
-                  type="text"
-                  value={input}
-                  onChange={(e) => setInput(e.target.value)}
-                  placeholder="Ask a question about the document..."
-                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
-                  disabled={isLoading}
-                />
-                <button
-                  type="submit"
-                  disabled={isLoading || !input.trim()}
-                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
-                >
-                  Send
-                </button>
+                )}
               </div>
-            </form>
+
+              <form onSubmit={handleSubmit} className="border-t border-white/5 px-6 py-4">
+                <div className="flex gap-3">
+                  <input
+                    type="text"
+                    value={input}
+                    onChange={(e) => setInput(e.target.value)}
+                    placeholder="Ask a question about the document..."
+                    className="flex-1 rounded-full border border-white/10 bg-slate-950/60 px-5 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:opacity-60"
+                    disabled={isLoading}
+                  />
+                  <button
+                    type="submit"
+                    disabled={isLoading || !input.trim()}
+                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
+                  >
+                    Send
+                  </button>
+                </div>
+              </form>
+            </section>
           </div>
         )}
-      </div>
+      </main>
     </div>
   );
 }
