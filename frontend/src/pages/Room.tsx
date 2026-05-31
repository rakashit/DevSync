import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { type RootState } from '../store/store';
import Editor, { type Monaco } from '@monaco-editor/react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, MessageSquareCode, Bot, Loader2, Send, FileCode2, Plus, Trash2, FolderOpen, GitPullRequest, Play, Terminal, X, Phone } from 'lucide-react';
import { fetchAIReview, fetchAIAutocomplete, fetchGitHubPR, executeCode } from '../services/api';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../components/ThemeProvider';
import { VideoChat } from '../components/VideoChat';

const SOCKET_SERVER_URL = 'http://localhost:5000';

interface ConnectedUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

const Room = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { theme } = useTheme();
  
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('index.js');
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isImportingPR, setIsImportingPR] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [isLoadingPR, setIsLoadingPR] = useState(false);

  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, any>>({});
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(240);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  
  const [comments, setComments] = useState<{line: number, text: string, author: string, resolved: boolean, id: string}[]>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!user || !id) return;

    socketRef.current = io(SOCKET_SERVER_URL, {
      query: {
        roomId: id,
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }
    });

    const socket = socketRef.current;

    socket.on('users_update', (users: ConnectedUser[]) => {
      setConnectedUsers(users);
    });

    socket.on('files_update', (updatedFiles: Record<string, string>) => {
      setFiles(updatedFiles);
      if (!updatedFiles[activeFile]) {
        const firstFile = Object.keys(updatedFiles)[0];
        if (firstFile) setActiveFile(firstFile);
      }
    });

    socket.on('file_change', ({ filePath, content }) => {
      setFiles(prev => ({ ...prev, [filePath]: content }));
    });

    socket.on('cursor_update', (data: any) => {
      setRemoteCursors(prev => ({ ...prev, [data.uid]: data }));
    });

    socket.on('comments_update', (updatedComments: any[]) => {
      setComments(updatedComments);
    });

    return () => {
      socket.disconnect();
    };
  }, [id, user]);

  useEffect(() => {
    if (!isDraggingTerminal) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      setTerminalHeight(Math.max(100, Math.min(newHeight, 800)));
    };
    
    const handleMouseUp = () => {
      setIsDraggingTerminal(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingTerminal]);

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setFiles(prev => ({ ...prev, [activeFile]: newCode }));
    socketRef.current?.emit('file_change', { filePath: activeFile, content: newCode });
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    socketRef.current?.emit('file_create', { filePath: newFileName.trim(), content: '// New file\n' });
    setActiveFile(newFileName.trim());
    setNewFileName('');
    setIsCreatingFile(false);
  };

  const handleImportPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prUrl.trim()) return;
    setIsLoadingPR(true);
    try {
      const data = await fetchGitHubPR(prUrl.trim());
      Object.entries(data.files).forEach(([path, content]) => {
        socketRef.current?.emit('file_create', { filePath: path, content });
      });
      setIsImportingPR(false);
      setPrUrl('');
      const importedPaths = Object.keys(data.files);
      if (importedPaths.length > 0) setActiveFile(importedPaths[0]);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoadingPR(false);
    }
  };

  const handleExecute = async () => {
    if (!activeFile) return;
    const currentLang = getLanguageFromFile(activeFile);
    if (currentLang !== 'javascript' && currentLang !== 'typescript' && currentLang !== 'python') {
      alert('Execution is only supported for JavaScript, TypeScript, and Python right now.');
      return;
    }
    
    setIsExecuting(true);
    setShowTerminal(true);
    setExecutionOutput('Executing...');
    try {
      const data = await executeCode(files[activeFile], currentLang);
      if (data.error) {
        setExecutionOutput(`Error:\n${data.error}\n\nOutput:\n${data.output}`);
      } else {
        setExecutionOutput(data.output || 'Execution completed with no output.');
      }
    } catch (error: any) {
      setExecutionOutput(`Failed to execute: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDeleteFile = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${filePath}?`)) return;
    socketRef.current?.emit('file_delete', { filePath });
  };

  const handleAiReview = async () => {
    setIsAiLoading(true);
    setAiReview(null);
    try {
      const data = await fetchAIReview(files[activeFile] || '', getLanguageFromFile(activeFile));
      setAiReview(data.review);
    } catch (error) {
      setAiReview("Failed to fetch AI review. Please check your configuration.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    editor.onDidChangeCursorPosition((e: any) => {
      if (socketRef.current && user) {
        socketRef.current.emit('cursor_change', {
          position: e.position,
          displayName: user.displayName || 'User',
          filePath: activeFile
        });
      }
    });

    editor.onMouseDown((e: any) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
        const line = e.target.position.lineNumber;
        setSelectedLine(line);
      } else {
        setSelectedLine(null);
      }
    });

    monaco.languages.registerInlineCompletionsProvider('*', {
      provideInlineCompletions: async (model: any, position: any) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });
        
        try {
          const response = await fetchAIAutocomplete(textUntilPosition, getLanguageFromFile(activeFile));
          return {
            items: [{
              insertText: response.completion,
              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
            }]
          };
        } catch (e) {
          return { items: [] };
        }
      },
      freeInlineCompletions() { }
    });
  };

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const newDecorations: any[] = [];
    Object.values(remoteCursors).forEach((cursorData: any) => {
      if (!cursorData.position || cursorData.filePath !== activeFile) return;
      newDecorations.push({
        range: new monacoRef.current.Range(
          cursorData.position.lineNumber, cursorData.position.column,
          cursorData.position.lineNumber, cursorData.position.column
        ),
        options: {
          className: 'remote-cursor',
          hoverMessage: { value: cursorData.displayName },
          isWholeLine: false,
        }
      });
    });
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
  }, [remoteCursors, activeFile]);

  const handleAddComment = () => {
    if (!newCommentText || selectedLine === null || !user) return;
    const comment = { 
      id: Math.random().toString(36).substring(7),
      line: selectedLine, 
      text: newCommentText, 
      author: user.displayName || 'User', 
      resolved: false 
    };
    socketRef.current?.emit('add_comment', comment);
    setNewCommentText('');
    setSelectedLine(null);
  };

  const getLanguageFromFile = (filename: string) => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.json')) return 'json';
    return 'plaintext';
  };

  const monacoTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'vs-dark' : 'light';

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-500 overflow-hidden font-sans">
      <header className="h-16 flex-none border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <MessageSquareCode className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide flex items-center gap-2">
              Workspace <span className="text-gray-300 dark:text-gray-700">/</span> <span className="font-mono text-xs opacity-70">{id}</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full pl-3 pr-1 py-1 border border-gray-200/50 dark:border-gray-700/50">
            <Users className="w-4 h-4 text-gray-500 mr-2" />
            <div className="flex -space-x-2">
              {connectedUsers.map((u, i) => (
                <Avatar key={`${u.uid}-${i}`} className="w-7 h-7 border-2 border-white dark:border-gray-900 shadow-sm">
                  <AvatarImage src={u.photoURL || undefined} alt={u.displayName || 'User'} />
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                    {u.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
          
          <ThemeToggle />
          
          <Button 
            size="sm" 
            onClick={() => setIsCallActive(!isCallActive)} 
            className={`flex items-center gap-2 rounded-full px-4 shadow-md hover:shadow-lg transition-all active:scale-95 border-0 ${isCallActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            <Phone className={`w-4 h-4 ${isCallActive ? 'rotate-[135deg]' : ''} transition-transform`} />
            {isCallActive ? 'Leave' : 'Join Call'}
          </Button>

          <Button 
            size="sm" 
            onClick={handleExecute} 
            disabled={isExecuting} 
            className="flex items-center gap-2 rounded-full px-5 shadow-lg transition-all active:scale-95 bg-green-600 hover:bg-green-500 text-white border-0 font-bold tracking-wide"
          >
            {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            RUN CODE
          </Button>

          <Button 
            size="sm" 
            onClick={handleAiReview} 
            disabled={isAiLoading} 
            className="flex items-center gap-2 rounded-full px-4 shadow-md hover:shadow-lg transition-all active:scale-95 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white border-0"
          >
            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            AI Review
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* File Explorer Sidebar */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181818] flex flex-col hidden md:flex z-10">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Explorer
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" title="Import GitHub PR" className="w-6 h-6 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800" onClick={() => setIsImportingPR(!isImportingPR)}>
                <GitPullRequest className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" title="New File" className="w-6 h-6 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800" onClick={() => setIsCreatingFile(!isCreatingFile)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <AnimatePresence>
              {isImportingPR && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleImportPR}
                  className="mb-2 px-2"
                >
                  <input
                    autoFocus
                    className="w-full bg-gray-100 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary mb-2"
                    placeholder="https://github.com/..."
                    value={prUrl}
                    onChange={(e) => setPrUrl(e.target.value)}
                    disabled={isLoadingPR}
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-6 flex-1 text-xs" onClick={() => setIsImportingPR(false)} disabled={isLoadingPR}>Cancel</Button>
                    <Button type="submit" size="sm" className="h-6 flex-1 text-xs" disabled={isLoadingPR}>
                      {isLoadingPR ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Import'}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isCreatingFile && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateFile}
                  className="mb-2 px-2"
                >
                  <input
                    autoFocus
                    className="w-full bg-gray-100 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary"
                    placeholder="filename.js"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onBlur={() => setIsCreatingFile(false)}
                  />
                </motion.form>
              )}
            </AnimatePresence>

            {Object.keys(files).sort().map(fileName => (
              <div 
                key={fileName}
                onClick={() => setActiveFile(fileName)}
                className={`flex items-center justify-between group px-2 py-1.5 rounded-md cursor-pointer mb-0.5 text-sm transition-colors ${activeFile === fileName ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2d2e]'}`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileCode2 className={`w-4 h-4 shrink-0 ${activeFile === fileName ? 'text-primary' : 'text-gray-400'}`} />
                  <span className="truncate">{fileName}</span>
                </div>
                <button 
                  onClick={(e) => handleDeleteFile(e, fileName)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Editor & Terminal Section */}
        <div className="flex-1 flex flex-col relative bg-[#1e1e1e]">
          <div className="flex-1 relative">
            {activeFile ? (
              <Editor
                key={activeFile}
                height="100%"
                language={getLanguageFromFile(activeFile)}
                theme={monacoTheme}
                value={files[activeFile] || ''}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                  wordWrap: 'on',
                  lineNumbersMinChars: 3,
                  glyphMargin: true,
                  padding: { top: 24, bottom: 24 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                }}
                loading={
                  <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-[#1e1e1e]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
                  </div>
                }
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-[#1e1e1e] text-gray-500">
                <div className="text-center">
                  <FileCode2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Select or create a file to start coding</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Terminal Panel */}
          <AnimatePresence>
            {showTerminal && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: terminalHeight, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-800 bg-[#1e1e1e] flex flex-col shrink-0 relative"
              >
                {/* Drag Handle */}
                <div 
                  className="absolute top-0 left-0 w-full h-1 cursor-row-resize z-50 hover:bg-primary/50 transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); setIsDraggingTerminal(true); }}
                />
                
                <div className="h-8 bg-[#252526] flex items-center justify-between px-4 border-b border-gray-800 mt-1">
                  <span className="text-xs text-gray-300 font-mono flex items-center gap-2">
                    <Terminal className="w-3 h-3" /> Terminal Output
                  </span>
                  <button onClick={() => setShowTerminal(false)} className="text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-auto font-mono text-xs text-gray-300 whitespace-pre-wrap custom-scrollbar">
                  {executionOutput}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Floating Video Chat */}
          <AnimatePresence>
            {isCallActive && socketRef.current && (
              <VideoChat 
                socket={socketRef.current} 
                roomId={id as string} 
                onClose={() => setIsCallActive(false)}
                connectedUsers={connectedUsers}
              />
            )}
          </AnimatePresence>
        </div>
        
        {/* Chat / Comments Sidebar */}
        <div className="w-[350px] border-l border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl flex flex-col hidden xl:flex shadow-2xl z-10 relative">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-white/50 dark:to-gray-950/50 pointer-events-none z-[-1]" />
          
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquareCode className="w-4 h-4 text-gray-400" />
              Thread
            </h2>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
            <AnimatePresence>
              {selectedLine !== null && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className="bg-white dark:bg-gray-800 border-2 border-primary/20 dark:border-primary/30 rounded-2xl p-4 shadow-lg mb-6 ring-4 ring-primary/5 dark:ring-primary/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-primary">New Comment</h3>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                      Line {selectedLine}
                    </span>
                  </div>
                  <textarea 
                    autoFocus
                    className="w-full text-sm p-3 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all placeholder:text-gray-400"
                    rows={3}
                    placeholder="Type your comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setSelectedLine(null)}>Cancel</Button>
                    <Button size="sm" className="rounded-full gap-2 shadow-md" onClick={handleAddComment}>
                      Post <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {comments.map((comment, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                key={comment.id || i} 
                className="group relative"
              >
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 mt-1 shrink-0 ring-2 ring-white dark:ring-gray-900 shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
                      {comment.author.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl rounded-tl-sm p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{comment.author}</span>
                      <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
                        Line {comment.line}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {comment.text}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {aiReview && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6"
              >
                <Avatar className="w-8 h-8 mt-1 shrink-0 ring-2 ring-white dark:ring-gray-900 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-800 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      DevSync AI Review
                    </span>
                    <span className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60">Automated</span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {aiReview}
                  </div>
                </div>
              </motion.div>
            )}

            {!aiReview && comments.length === 0 && selectedLine === null && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-3">
                <MessageSquareCode className="w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click on any line number in the<br/>editor to leave a comment.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Room;
