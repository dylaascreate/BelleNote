import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BookHeart, Send, Sparkles, CalendarDays, MoreHorizontal, Bold, Italic, Strikethrough, List, Type } from 'lucide-react';

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
  // Fix timezone offset issues for local display
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  return d.toLocaleDateString('en-US', options);
};

// Generate realistic mock data for the streak
const generateMockEntries = () => {
  const entries = [];
  const today = new Date();
  
  for (let i = 0; i < 90; i++) {
    // 70% chance to have an entry on any given day in the past 90 days
    if (Math.random() > 0.3) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = formatDateString(d);
      
      entries.push({
        id: `mock-${i}`,
        dateStr: dateStr,
        text: `Journal entry for <b>${getDisplayDate(dateStr)}</b>. <br/><br/>Feeling pretty good today! Focused on self-care and productivity. ✨`,
        timestamp: d.getTime()
      });
    }
  }
  return entries.sort((a, b) => b.timestamp - a.timestamp);
};

export default function App() {
  const [entries, setEntries] = useState([]);
  const [currentNote, setCurrentNote] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    strikeThrough: false,
    insertUnorderedList: false,
    fontName: 'Arial'
  });
  const graphContainerRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    // Load mock data on initial render
    setEntries(generateMockEntries());
    setIsLoaded(true);
  }, []);

  // Scroll to the right end of the graph (most recent) on load
  useEffect(() => {
    if (isLoaded && graphContainerRef.current) {
      graphContainerRef.current.scrollLeft = graphContainerRef.current.scrollWidth;
    }
  }, [isLoaded]);

  const handleSaveNote = () => {
    // Basic validation to check if it's not just empty HTML tags
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
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
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
    const daysToShow = 14 * 7; // 14 weeks
    
    // Find the Sunday of 14 weeks ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToShow + (7 - today.getDay()) % 7 - 7);
    
    // Adjust start date to be exactly a Sunday
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1);
    }

    const grid = [];
    let currentDate = new Date(startDate);
    const endDate = new Date(today);
    // Include the rest of the current week to keep the grid square
    endDate.setDate(today.getDate() + (6 - today.getDay())); 

    // Create a Set of dates that have entries for O(1) lookup
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
  }, [entries]);

  // Calculate current streak
  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    const entryDates = new Set(entries.map(e => e.dateStr));
    
    // Start checking from today
    let checkDate = new Date(today);
    
    // If no entry today, check if there was one yesterday to keep streak alive
    if (!entryDates.has(formatDateString(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1);
      if (!entryDates.has(formatDateString(checkDate))) {
        return 0; // No entry today or yesterday, streak is 0
      }
    }

    while (entryDates.has(formatDateString(checkDate))) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    return count;
  }, [entries]);

  // Group entries by date for the history list
  const recentEntries = entries.slice(0, 10); // Show only last 10 entries for UI brevity

  return (
    <div className="min-h-screen bg-[#FFFDFE] text-slate-800 font-sans selection:bg-pink-200">
      
      {/* --- Mobile Container --- */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl shadow-pink-100/50 flex flex-col relative overflow-hidden">
        
        {/* Decorative Background Blurs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute top-40 right-0 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/3 pointer-events-none"></div>

        {/* --- Header --- */}
        <header className="px-6 pt-12 pb-6 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="bg-pink-500 p-2 rounded-xl text-white shadow-sm shadow-pink-200">
              <BookHeart size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Belle<span className="text-pink-500 font-light">Note</span>
            </h1>
          </div>
          <button className="text-slate-400 hover:text-pink-500 transition-colors">
            <MoreHorizontal size={24} />
          </button>
        </header>

        {/* --- Main Content --- */}
        <main className="flex-1 overflow-y-auto px-6 pb-24 z-10 space-y-8 no-scrollbar">
          
          {/* Streak & Greeting */}
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
          <section className="bg-white border border-pink-50 rounded-2xl p-5 shadow-sm shadow-pink-100/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                <CalendarDays size={16} className="text-pink-400" />
                Your Journey
              </h3>
              <span className="text-xs text-slate-400 font-medium">{entries.length} Total Logs</span>
            </div>
            
            {/* Scrollable Graph Container */}
            <div 
              ref={graphContainerRef}
              className="overflow-x-auto no-scrollbar pb-2 -mx-2 px-2"
            >
              <div 
                className="grid gap-[4px]" 
                style={{ 
                  gridTemplateRows: 'repeat(7, 1fr)', 
                  gridAutoFlow: 'column',
                  width: 'max-content' 
                }}
              >
                {graphData.map((day, i) => (
                  <div
                    key={i}
                    title={day.isFuture ? '' : `${getDisplayDate(day.dateStr)}`}
                    className={`
                      w-[14px] h-[14px] rounded-[4px] transition-all duration-300
                      ${day.isFuture 
                        ? 'bg-transparent' 
                        : day.hasEntry 
                          ? 'bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.4)]' 
                          : 'bg-slate-50 hover:bg-pink-50 border border-slate-100'
                      }
                    `}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Input Section */}
          <section className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-white rounded-3xl border border-pink-100/50 shadow-sm transform -rotate-1 scale-[1.02] -z-10"></div>
            <div className="bg-white rounded-3xl border border-pink-100/50 shadow-sm p-4 focus-within:ring-4 ring-pink-50 transition-all duration-300">
              
              {/* Toolbar */}
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

        {/* --- Global Styles --- */}
        <style dangerouslySetInnerHTML={{__html: `
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          
          /* Custom Editor Styles */
          .custom-editor:empty:before {
            content: attr(data-placeholder);
            color: #cbd5e1; /* text-slate-300 */
            font-weight: 300;
            pointer-events: none;
            display: block;
          }
          
          /* Rendered Content Formatting */
          .editor-content ul, .custom-editor ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin-top: 0.25rem;
            margin-bottom: 0.25rem;
          }
          .editor-content li, .custom-editor li {
            margin-bottom: 0.125rem;
          }
          .editor-content b, .editor-content strong, 
          .custom-editor b, .custom-editor strong {
            font-weight: 600;
            color: #0f172a; 
          }
          .editor-content i, .editor-content em,
          .custom-editor i, .custom-editor em {
            font-style: italic;
          }
          .editor-content strike, .editor-content s,
          .custom-editor strike, .custom-editor s {
            text-decoration: line-through;
            color: #94a3b8; 
          }
        `}} />
      </div>
    </div>
  );
}
