import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BookHeart, Send, Sparkles, CalendarDays, MoreHorizontal, Bold, Italic, Strikethrough, List, Type, Trash2 } from 'lucide-react';
import './App.css';

// --- Utility Functions ---
const formatDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDisplayDate = (dateString) => {
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const d = new Date(dateString);
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  return d.toLocaleDateString('en-US', options);
};

export default function App() {
  // Load from localStorage if available, otherwise start empty
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('bellenote-entries');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentNote, setCurrentNote] = useState('');
  const [columnsToShow, setColumnsToShow] = useState(14);
  const [showMenu, setShowMenu] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    strikeThrough: false,
    insertUnorderedList: false,
    fontName: 'Arial'
  });
  
  const sectionRef = useRef(null);
  const editorRef = useRef(null);

  // Save to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem('bellenote-entries', JSON.stringify(entries));
  }, [entries]);

  // --- Responsive Graph Calculation ---
  useEffect(() => {
    const calculateWidth = () => {
      if (sectionRef.current) {
        const sectionWidth = sectionRef.current.clientWidth;
        const availableWidth = sectionWidth - 40 - 30; // Account for padding & y-axis labels
        const colWidth = 18; // 14px width + 4px gap
        const cols = Math.floor(availableWidth / colWidth);
        setColumnsToShow(Math.max(cols, 8)); // Minimum 8 columns on tiniest screens
      }
    };

    calculateWidth();
    window.addEventListener('resize', calculateWidth);
    return () => window.removeEventListener('resize', calculateWidth);
  }, []);

  const handleSaveNote = () => {
    const plainText = currentNote.replace(/<[^>]*>?/gm, '').trim();
    if (!plainText) return;

    const now = new Date();
    const dateStr = formatDateString(now);
    
    const newEntry = {
      id: Date.now().toString(),
      dateStr: dateStr,
      text: currentNote,
      timestamp: now.getTime()
    };

    setEntries(prev => [newEntry, ...prev]);
    setCurrentNote('');
    if (editorRef.current) editorRef.current.innerHTML = '';
  };

  const handleResetLogs = () => {
    if (window.confirm("Are you sure you want to delete all your logs? This action cannot be undone.")) {
      setEntries([]);
      setShowMenu(false);
    }
  };

  const checkActiveFormats = () => {
    if (!editorRef.current) return;
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      fontName: document.queryCommandValue('fontName')?.replace(/['"]/g, '') || 'Arial'
    });
  };

  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      setCurrentNote(editorRef.current.innerHTML);
      checkActiveFormats();
    }
  };

  // --- Graph Logic ---
  const graphData = useMemo(() => {
    const today = new Date();
    const daysToShow = columnsToShow * 7;
    
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToShow + (7 - today.getDay()) % 7 - 7);
    
    // Ensure we start on a Sunday for the grid alignment
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1);
    }

    const grid = [];
    let currentDate = new Date(startDate);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - today.getDay())); 

    const entryDates = new Set(entries.map(e => e.dateStr));

    while (currentDate <= endDate) {
      const dateStr = formatDateString(currentDate);
      grid.push({
        dateStr,
        isFuture: currentDate > today,
        hasEntry: entryDates.has(dateStr),
        dateObj: new Date(currentDate)
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return grid;
  }, [entries, columnsToShow]);

  // Calculate Month Labels based on graph data
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    
    for (let i = 0; i < graphData.length; i += 7) {
      const day = graphData[i];
      if (!day) break;
      
      const currentMonth = day.dateObj.getMonth();
      // When a new month starts in the grid
      if (currentMonth !== lastMonth) {
        const colIndex = i / 7;
        
        // Hide the absolute oldest month (the very first one encountered) 
        // to prevent overlapping the left edge, but guarantee the latest month shows.
        if (lastMonth !== -1 && colIndex > 0) {
          labels.push({
            text: day.dateObj.toLocaleString('en-US', { month: 'short' }),
            colIndex: colIndex
          });
        }
        lastMonth = currentMonth;
      }
    }
    return labels;
  }, [graphData]);

  // Calculate current streak
  const streak = useMemo(() => {
    if (entries.length === 0) return 0;

    let count = 0;
    const today = new Date();
    const entryDates = new Set(entries.map(e => e.dateStr));
    let checkDate = new Date(today);
    
    if (!entryDates.has(formatDateString(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1);
      if (!entryDates.has(formatDateString(checkDate))) return 0;
    }

    while (entryDates.has(formatDateString(checkDate))) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return count;
  }, [entries]);

  const recentEntries = entries.slice(0, 10);

  return (
    <div className="min-h-screen bg-[#FFFDFE] text-slate-800 font-sans selection:bg-pink-200" onClick={() => showMenu && setShowMenu(false)}>
      
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl shadow-pink-100/50 flex flex-col relative overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute top-40 right-0 w-72 h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 translate-x-1/3 pointer-events-none"></div>
        
        {/* New Red and Pink Blobs */}
        <div className="absolute bottom-32 left-0 w-64 h-64 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 -translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/4 translate-y-1/4 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <header className="px-6 pt-12 pb-6 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="bg-pink-500 p-2 rounded-xl text-white shadow-sm shadow-pink-200">
              <BookHeart size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Belle<span className="text-pink-500 font-light">Note</span>
            </h1>
          </div>
          
          {/* Dropdown Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-slate-400 hover:text-pink-500 transition-colors p-1"
            >
              <MoreHorizontal size={24} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-pink-100 rounded-xl shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                <button 
                  onClick={handleResetLogs}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Reset All Logs
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-24 z-10 space-y-8 no-scrollbar">
          
          <section className="space-y-1">
            <h2 className="text-sm font-medium text-pink-500 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={14} />
              Daily Log
            </h2>
            <div className="flex justify-between items-end">
              <p className="text-3xl font-semibold text-slate-900 tracking-tight">
                How are you<br />feeling today?
              </p>
              <div className="text-right">
                <div className="text-2xl font-bold text-pink-500">{streak}</div>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Day Streak</div>
              </div>
            </div>
          </section>

          {/* GitHub-style Streak Graph */}
          <section 
            ref={sectionRef} 
            className="bg-white border border-pink-50 rounded-2xl p-5 shadow-sm shadow-pink-100/30 w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                <CalendarDays size={16} className="text-pink-400" />
                Your Journey
              </h3>
              <span className="text-xs text-slate-400 font-medium">{entries.length} Total Logs</span>
            </div>
            
            <div className="flex gap-2">
              <div className="flex flex-col justify-between text-[10px] text-slate-400 font-medium pt-[20px] pb-1 w-[20px] h-[142px]">
                <span className="leading-[14px]"></span>
                <span className="leading-[14px]">Mon</span>
                <span className="leading-[14px]"></span>
                <span className="leading-[14px]">Wed</span>
                <span className="leading-[14px]"></span>
                <span className="leading-[14px]">Fri</span>
                <span className="leading-[14px]"></span>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="relative h-[20px] w-full text-[10px] text-slate-400 font-medium">
                  {monthLabels.map((label, i) => (
                    <span 
                      key={i} 
                      className="absolute bottom-1"
                      style={{ left: `${label.colIndex * 18}px` }}
                    >
                      {label.text}
                    </span>
                  ))}
                </div>

                <div 
                  className="grid gap-[4px] justify-end" 
                  style={{ 
                    gridTemplateRows: 'repeat(7, 14px)', 
                    gridAutoFlow: 'column',
                    width: '100%' 
                  }}
                >
                  {graphData.map((day, i) => (
                    <div
                      key={i}
                      title={day.isFuture ? '' : `${getDisplayDate(day.dateStr)}`}
                      className={`
                        w-[14px] h-[14px] rounded-[3px] transition-all duration-300
                        ${day.isFuture 
                          ? 'bg-transparent' 
                          : day.hasEntry 
                            ? 'bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.4)]' 
                            : 'bg-slate-50 border border-slate-100'
                        }
                      `}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Input Section */}
          <section className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-white rounded-3xl border border-pink-100/50 shadow-sm transform -rotate-1 scale-[1.02] -z-10"></div>
            <div className="bg-white rounded-3xl border border-pink-100/50 shadow-sm p-4 focus-within:ring-4 ring-pink-50 transition-all duration-300">
              
              <div className="flex items-center gap-1 pb-3 mb-2 border-b border-pink-50 text-slate-400">
                <button 
                  onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }}
                  className={`p-1.5 rounded-md transition-colors ${activeFormats.bold ? 'bg-pink-50 text-pink-500' : 'hover:bg-pink-50 hover:text-pink-500'}`}
                  title="Bold"
                ><Bold size={16} /></button>
                <button 
                  onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }}
                  className={`p-1.5 rounded-md transition-colors ${activeFormats.italic ? 'bg-pink-50 text-pink-500' : 'hover:bg-pink-50 hover:text-pink-500'}`}
                  title="Italic"
                ><Italic size={16} /></button>
                <button 
                  onMouseDown={(e) => { e.preventDefault(); executeCommand('strikeThrough'); }}
                  className={`p-1.5 rounded-md transition-colors ${activeFormats.strikeThrough ? 'bg-pink-50 text-pink-500' : 'hover:bg-pink-50 hover:text-pink-500'}`}
                  title="Strikethrough"
                ><Strikethrough size={16} /></button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button 
                  onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }}
                  className={`p-1.5 rounded-md transition-colors ${activeFormats.insertUnorderedList ? 'bg-pink-50 text-pink-500' : 'hover:bg-pink-50 hover:text-pink-500'}`}
                  title="Bullet List"
                ><List size={16} /></button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                
                <div className={`flex items-center gap-1 px-1.5 py-1 rounded-md transition-colors group relative ${activeFormats.fontName !== 'Arial' ? 'bg-pink-50 text-pink-500' : 'hover:bg-pink-50'}`}>
                  <Type size={16} className={activeFormats.fontName !== 'Arial' ? "text-pink-500" : "group-hover:text-pink-500"} />
                  <select 
                    value={activeFormats.fontName}
                    onChange={(e) => executeCommand('fontName', e.target.value)}
                    className={`text-xs font-medium bg-transparent outline-none cursor-pointer appearance-none pl-1 ${activeFormats.fontName !== 'Arial' ? 'text-pink-500' : 'text-slate-500 group-hover:text-pink-500'}`}
                  >
                    <option value="Arial">Sans</option>
                    <option value="Georgia">Serif</option>
                    <option value="Courier New">Mono</option>
                    <option value="Comic Sans MS">Playful</option>
                  </select>
                </div>
              </div>

              <div
                ref={editorRef}
                contentEditable
                onInput={(e) => setCurrentNote(e.currentTarget.innerHTML)}
                onKeyUp={checkActiveFormats}
                onMouseUp={checkActiveFormats}
                data-placeholder="Write your thoughts here..."
                className="custom-editor w-full min-h-[8rem] max-h-[16rem] overflow-y-auto bg-transparent border-none outline-none text-slate-700 leading-relaxed px-1"
              />

              <div className="flex justify-between items-center mt-3 px-1">
                <span className="text-xs text-slate-300 font-medium">
                  {formatDateString(new Date())}
                </span>
                <button 
                  onClick={handleSaveNote}
                  disabled={!currentNote.replace(/<[^>]*>?/gm, '').trim()}
                  className={`
                    p-3 rounded-full flex items-center justify-center transition-all duration-300
                    ${currentNote.replace(/<[^>]*>?/gm, '').trim() 
                      ? 'bg-pink-500 text-white shadow-md shadow-pink-200 hover:bg-pink-600 hover:scale-105 active:scale-95' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }
                  `}
                >
                  <Send size={18} className={currentNote.replace(/<[^>]*>?/gm, '').trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                </button>
              </div>
            </div>
          </section>

          {/* Recent Entries */}
          <section className="space-y-4 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent Notes</h3>
            {recentEntries.length === 0 ? (
              <p className="text-slate-400 text-sm italic text-center py-8">No entries yet. Start writing your story!</p>
            ) : (
              <div className="space-y-4">
                {recentEntries.map((entry) => (
                  <div key={entry.id} className="group relative pl-4 border-l-2 border-pink-100 hover:border-pink-300 transition-colors">
                    <div className="absolute w-2 h-2 bg-pink-100 group-hover:bg-pink-400 rounded-full -left-[5px] top-1.5 transition-colors duration-300 border-2 border-white"></div>
                    <span className="text-xs font-semibold text-pink-400 mb-1 block">
                      {getDisplayDate(entry.dateStr)}
                    </span>
                    <div 
                      className="text-sm text-slate-600 leading-relaxed editor-content"
                      dangerouslySetInnerHTML={{ __html: entry.text }}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <style dangerouslySetInnerHTML={{__html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          
          .custom-editor:empty:before {
            content: attr(data-placeholder);
            color: #cbd5e1;
            font-weight: 300;
            pointer-events: none;
            display: block;
          }
          
          .editor-content ul, .custom-editor ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin-top: 0.25rem;
            margin-bottom: 0.25rem;
          }
          .editor-content li, .custom-editor li { margin-bottom: 0.125rem; }
          .editor-content b, .editor-content strong, 
          .custom-editor b, .custom-editor strong { font-weight: 600; color: #0f172a; }
          .editor-content i, .editor-content em,
          .custom-editor i, .custom-editor em { font-style: italic; }
          .editor-content strike, .editor-content s,
          .custom-editor strike, .custom-editor s { text-decoration: line-through; color: #94a3b8; }
        `}} />
      </div>
    </div>
  );
}