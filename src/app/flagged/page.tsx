'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Flag, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Edit2, Save, X, Calendar, Trash2 } from 'lucide-react';
import { FlaggedExperience, FLAGGABLE_ISSUES } from '@/lib/types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

export const dynamic = 'force-dynamic';

interface CategoryGroup {
  category: string;
  experiences: FlaggedExperience[];
}

// Component for single Eko embed
function EkoEmbed({ instanceId }: { instanceId: string }) {
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Clean up any existing script first
    if (scriptRef.current && scriptRef.current.parentNode) {
      scriptRef.current.parentNode.removeChild(scriptRef.current);
      scriptRef.current = null;
    }

    // Clear the container
    if (embedContainerRef.current) {
      embedContainerRef.current.innerHTML = '';
    }

    // Small delay to ensure cleanup is complete
    const timeoutId = setTimeout(() => {
      // Create and load the Eko embed script
      const script = document.createElement('script');
      script.src = `https://play.eko.com/embed/v1.js?id=${instanceId}`;
      script.async = true;
      scriptRef.current = script;
      
      if (embedContainerRef.current) {
        embedContainerRef.current.appendChild(script);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      // Cleanup script on unmount
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
      // Clear container
      if (embedContainerRef.current) {
        embedContainerRef.current.innerHTML = '';
      }
    };
  }, [instanceId]);

  return (
    <div 
      ref={embedContainerRef}
      className="mx-auto bg-slate-900 rounded-lg overflow-hidden border border-slate-700"
      style={{ width: '368px', height: '460px' }}
    >
      {/* The script will inject the embed here */}
    </div>
  );
}

function FlaggedPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [flaggedData, setFlaggedData] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedExperience, setEditedExperience] = useState<FlaggedExperience | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Check if admin mode is enabled
  const isAdminMode = searchParams.get('admin') !== null;
  
  // Get selected date from URL - will be determined dynamically if not specified
  const urlDate = searchParams.get('date');
  const [selectedDate, setSelectedDate] = useState<string>(urlDate || format(new Date(), 'yyyy-MM-dd'));
  
  // Get current index from URL, default to 0
  const currentIndex = parseInt(searchParams.get('index') || '0', 10);

  // Flatten all experiences into a single array
  const allExperiences = flaggedData.flatMap(group => 
    group.experiences.map(exp => ({ ...exp, category: group.category }))
  );

  const currentExperience = allExperiences[currentIndex];
  const totalCount = allExperiences.length;

  useEffect(() => {
    // Load flagged data from Redis
    const loadData = async () => {
      try {
        // Fetch available dates first
        const datesResponse = await fetch('/api/flagged/dates');
        let dates: string[] = [];
        if (datesResponse.ok) {
          const datesData = await datesResponse.json();
          dates = datesData.dates || [];
          setAvailableDates(dates);
        }
        
        // Determine which date to load
        let dateToLoad = urlDate || format(new Date(), 'yyyy-MM-dd');
        
        // If no date in URL and we have available dates, use the most recent one
        if (!urlDate && dates.length > 0) {
          dateToLoad = dates[0]; // dates are sorted newest first
          setSelectedDate(dateToLoad);
          
          // Redirect to the most recent date
          const adminParam = isAdminMode ? '&admin' : '';
          const indexParam = searchParams.get('index') ? `&index=${searchParams.get('index')}` : '';
          window.location.href = `/flagged?date=${dateToLoad}${indexParam}${adminParam}`;
          return;
        }
        
        // Fetch data for selected date
        const dataResponse = await fetch(`/api/flagged?date=${dateToLoad}`);
        if (dataResponse.ok) {
          const result = await dataResponse.json();
          if (result.exists && result.data && result.data.length > 0) {
            setFlaggedData(result.data);
            setSelectedDate(dateToLoad);
            return; // Successfully loaded from Redis
          }
        }
        
        // If the selected date has no data but we have other dates, redirect to most recent
        if (dates.length > 0 && dateToLoad !== dates[0]) {
          const mostRecentDate = dates[0];
          setSelectedDate(mostRecentDate);
          const adminParam = isAdminMode ? '&admin' : '';
          window.location.href = `/flagged?date=${mostRecentDate}${adminParam}`;
          return;
        }
        
        // If Redis failed or returned no data, try sessionStorage
        const stored = sessionStorage.getItem('flaggedExperiences');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as CategoryGroup[];
            setFlaggedData(parsed);
            console.log('Loaded flagged data from sessionStorage');
          } catch (e) {
            console.error('Failed to parse flagged data:', e);
          }
        }
      } catch (error) {
        console.error('Failed to load flagged data:', error);
        // Fallback to sessionStorage
        const stored = sessionStorage.getItem('flaggedExperiences');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as CategoryGroup[];
            setFlaggedData(parsed);
            console.log('Loaded flagged data from sessionStorage (error fallback)');
          } catch (e) {
            console.error('Failed to parse flagged data:', e);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [urlDate, isAdminMode, searchParams]);

  const goToNext = () => {
    if (currentIndex < totalCount - 1) {
      // Force full page reload with new index, preserve admin param and date
      const adminParam = isAdminMode ? '&admin' : '';
      window.location.href = `/flagged?date=${selectedDate}&index=${currentIndex + 1}${adminParam}`;
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      // Force full page reload with new index, preserve admin param and date
      const adminParam = isAdminMode ? '&admin' : '';
      window.location.href = `/flagged?date=${selectedDate}&index=${currentIndex - 1}${adminParam}`;
    }
  };

  const jumpToCategory = (categoryName: string) => {
    // Find the first experience index for this category, preserve admin param and date
    const firstIndexInCategory = allExperiences.findIndex(exp => exp.category === categoryName);
    if (firstIndexInCategory !== -1) {
      const adminParam = isAdminMode ? '&admin' : '';
      window.location.href = `/flagged?date=${selectedDate}&index=${firstIndexInCategory}${adminParam}`;
    }
  };

  const selectDate = (date: string) => {
    const adminParam = isAdminMode ? '&admin' : '';
    window.location.href = `/flagged?date=${date}${adminParam}`;
  };

  const startEditing = () => {
    setEditedExperience({ ...currentExperience });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedExperience(null);
  };

  const saveEdits = async () => {
    if (!editedExperience) return;

    // Update the flaggedData with the edited experience
    const updatedData = flaggedData.map(group => {
      if (group.category === currentExperience.category) {
        return {
          ...group,
          experiences: group.experiences.map(exp => 
            exp.instanceId === currentExperience.instanceId ? editedExperience : exp
          )
        };
      }
      return group;
    });

    setFlaggedData(updatedData);
    
    // Save to Redis
    try {
      await fetch('/api/flagged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedData, date: selectedDate })
      });
    } catch (error) {
      console.error('Error saving to Redis:', error);
    }
    
    // Also update sessionStorage as fallback
    sessionStorage.setItem('flaggedExperiences', JSON.stringify(updatedData));
    
    // Reload the page to refresh the embed with new instance ID
    const adminParam = isAdminMode ? '&admin' : '';
    window.location.href = `/flagged?date=${selectedDate}&index=${currentIndex}${adminParam}`;
  };

  const deleteExperience = async () => {
    if (!confirm(`Are you sure you want to delete this flagged experience?\n\nTicket: ${currentExperience.ticketName}\nInstance ID: ${currentExperience.instanceId}`)) {
      return;
    }

    // Remove the current experience from flaggedData
    const updatedData = flaggedData
      .map(group => {
        if (group.category === currentExperience.category) {
          return {
            ...group,
            experiences: group.experiences.filter(exp => exp.instanceId !== currentExperience.instanceId)
          };
        }
        return group;
      })
      .filter(group => group.experiences.length > 0); // Remove empty categories

    setFlaggedData(updatedData);
    
    // Save to Redis
    try {
      await fetch('/api/flagged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedData, date: selectedDate })
      });
    } catch (error) {
      console.error('Error saving to Redis:', error);
    }
    
    // Also update sessionStorage as fallback
    sessionStorage.setItem('flaggedExperiences', JSON.stringify(updatedData));
    
    // Navigate to previous experience or back to home if this was the last one
    const newTotalCount = updatedData.reduce((sum, g) => sum + g.experiences.length, 0);
    
    if (newTotalCount === 0) {
      // No more experiences, go back to analyzer
      window.location.href = '/';
    } else {
      // Navigate to previous experience, or stay at 0 if we were at 0
      const newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
      const adminParam = isAdminMode ? '&admin' : '';
      window.location.href = `/flagged?date=${selectedDate}&index=${newIndex}${adminParam}`;
    }
  };

  const clearAllForDate = async () => {
    if (!confirm(`Are you sure you want to delete ALL flagged experiences for ${format(parseISO(selectedDate), 'MMM d, yyyy')}?\n\nThis will delete ${totalCount} experiences and cannot be undone.`)) {
      return;
    }

    // Delete all data for this date
    try {
      await fetch('/api/flagged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [], date: selectedDate })
      });
    } catch (error) {
      console.error('Error clearing data from Redis:', error);
    }
    
    // Clear sessionStorage if it's the current date
    if (selectedDate === format(new Date(), 'yyyy-MM-dd')) {
      sessionStorage.removeItem('flaggedExperiences');
    }
    
    // Redirect back to analyzer
    window.location.href = '/';
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalCount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <Link 
                  href="/"
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back to Analyzer</span>
                </Link>
                <div className="h-4 w-px bg-slate-700" />
                <div className="flex items-center gap-2">
                  <Flag className="w-5 h-5 text-amber-500" />
                  <h1 className="text-xl font-semibold text-white">Flagged Experiences</h1>
                  {isAdminMode && (
                    <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                      ADMIN MODE
                    </span>
                  )}
                </div>
                {totalCount > 0 && (
                  <span className="text-sm text-slate-400">
                    ({currentIndex + 1} of {totalCount})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-200">{format(parseISO(selectedDate), 'MMM d, yyyy')}</span>
                </div>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 text-sm hover:bg-violet-500/20 transition-colors"
                >
                  {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                </button>
                {isAdminMode && totalCount > 0 && (
                  <button
                    onClick={clearAllForDate}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
                  >
                    Clear All ({totalCount})
                  </button>
                )}
              </div>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Calendar View */}
        {showCalendar && (
          <div className="mb-6 bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Select Date</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                <span className="text-sm text-slate-300 min-w-32 text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs text-slate-500 font-medium py-2">
                  {day}
                </div>
              ))}
              {eachDayOfInterval({
                start: startOfMonth(currentMonth),
                end: endOfMonth(currentMonth)
              }).map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const hasData = availableDates.includes(dateStr);
                const isSelected = dateStr === selectedDate;
                const isToday = isSameDay(day, new Date());
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => hasData ? selectDate(dateStr) : null}
                    disabled={!hasData}
                    className={`
                      p-2 rounded-lg text-sm transition-all
                      ${isSelected 
                        ? 'bg-violet-600 text-white font-semibold' 
                        : hasData
                          ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                          : 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                      }
                      ${isToday && !isSelected ? 'ring-1 ring-violet-500/50' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">
              Dates with flagged experiences are highlighted. Data older than 30 days is automatically deleted.
            </p>
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
          </div>
        ) : totalCount === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-white mb-2">No Flagged Experiences</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Run an analysis first and click "Flag Experiences to QC (BETA)" to see flagged experiences here.
              Only tickets that are not Done or Resolved from these issues will be flagged:
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {FLAGGABLE_ISSUES.map(cat => (
                <span key={cat} className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Category Navigation */}
            <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                Jump to Issue
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {flaggedData.map((group) => {
                  const firstIndexInCategory = allExperiences.findIndex(exp => exp.category === group.category);
                  const isActive = currentExperience?.category === group.category;
                  
                  return (
                    <button
                      key={group.category}
                      onClick={() => jumpToCategory(group.category)}
                      className={`
                        text-left px-4 py-3 rounded-lg transition-all
                        ${isActive
                          ? 'bg-amber-500/20 border-2 border-amber-500/50 text-amber-300'
                          : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{group.category}</span>
                        <span className={`text-xs ${isActive ? 'text-amber-400' : 'text-slate-500'}`}>
                          {group.experiences.length}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Badge */}
            <div className="flex items-center justify-center gap-2">
              <span className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium">
                {currentExperience.category}
              </span>
            </div>

            {/* Main Content - Side by Side Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Info & Details */}
              <div className="space-y-6">
            {/* Experience Info Card */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              {isEditing && editedExperience ? (
                // Edit Mode
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Instance ID</label>
                    <input
                      type="text"
                      value={editedExperience.instanceId}
                      onChange={(e) => setEditedExperience({ ...editedExperience, instanceId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Ticket Name</label>
                    <input
                      type="text"
                      value={editedExperience.ticketName}
                      onChange={(e) => setEditedExperience({ ...editedExperience, ticketName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Ticket Description</label>
                    <textarea
                      value={editedExperience.ticketDescription || ''}
                      onChange={(e) => setEditedExperience({ ...editedExperience, ticketDescription: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={saveEdits}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Experience Name</span>
                    <h3 className="text-lg font-semibold text-white mt-1">
                      {currentExperience.experienceName || 'Unknown Experience'}
                    </h3>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Ticket Name</span>
                    <p className="text-slate-300 mt-1">{currentExperience.ticketName}</p>
                  </div>
                  {currentExperience.ticketDescription && (
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wide">Ticket Description</span>
                      <p className="text-slate-300 mt-1 text-sm">{currentExperience.ticketDescription}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 pt-2">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wide">Status</span>
                      <div className="mt-1">
                        <span className={`
                          text-xs px-2 py-1 rounded-full
                          ${currentExperience.ticketStatus.toLowerCase() === 'in progress' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : currentExperience.ticketStatus.toLowerCase() === 'open'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-500/20 text-slate-400'
                          }
                        `}>
                          {currentExperience.ticketStatus}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wide">Instance ID</span>
                      <p className="text-slate-300 mt-1 font-mono text-sm">{currentExperience.instanceId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <a
                      href={`https://video.eko.com/s/assetReview/?projectId=${currentExperience.instanceId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 font-medium hover:bg-violet-500/20 transition-colors text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Asset Review
                    </a>
                    {isAdminMode && (
                      <>
                        <button
                          onClick={startEditing}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium hover:bg-amber-500/20 transition-colors text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Details
                        </button>
                        <button
                          onClick={deleteExperience}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/20 transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                  ${currentIndex === 0
                    ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                  }
                `}
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>

              <div className="text-center">
                <p className="text-sm text-slate-400">
                  Experience {currentIndex + 1} of {totalCount}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Use arrow keys to navigate
                </p>
              </div>

              <button
                onClick={goToNext}
                disabled={currentIndex === totalCount - 1}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                  ${currentIndex === totalCount - 1
                    ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                    : 'bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/25'
                  }
                `}
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
              </div>

              {/* Right Column - Video Preview */}
              <div className="lg:sticky lg:top-24 lg:self-start">
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Preview</h3>
                  <EkoEmbed instanceId={currentExperience.instanceId} />
                </div>
              </div>
            </div>
      </main>
    </div>
  );
}

export default function FlaggedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>}>
      <FlaggedPageContent />
    </Suspense>
  );
}
