'use client';

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { 
  Download, 
  Loader2, 
  Sparkles,
  FileSpreadsheet,
  ArrowRight,
  BarChart3,
  Settings2,
  GitCompare,
  FileText,
  Flag,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import FileUpload, { FileType } from '@/components/FileUpload';
import AnalysisTypeSelector from '@/components/AnalysisTypeSelector';
import ResultsPreview from '@/components/ResultsPreview';
import CategoriesManager from '@/components/CategoriesManager';
import { 
  Ticket, 
  ExperienceMapping, 
  AnalysisType, 
  AnalysisResult,
  CategorizedTicket,
  ANALYSIS_CONFIGS
} from '@/lib/types';
import { runAnalysis, generateLastWeekData, LastWeekData } from '@/lib/analyzer';
import { processTickets, updateRuntimeCategories } from '@/lib/categorizer';
import { exportToExcel, generateFilename } from '@/lib/excelExporter';
import { generatePDFDashboard, downloadPDFDashboard } from '@/lib/pdfDashboard';
import { CategoryConfig } from '@/lib/categoryStorage';
import { findExperiencesToFlag, getTotalFlaggedCount } from '@/lib/flagger';
import { FlaggedExperience } from '@/lib/types';

type TabType = 'analyzer' | 'categories';

interface AnalysisResultWithType {
  type: AnalysisType;
  result: AnalysisResult;
  categorizedTickets: CategorizedTicket[];
  showComparison: boolean;
  includeStuckTickets: boolean;
}

interface FlaggedData {
  byCategory: { category: string; experiences: FlaggedExperience[] }[];
  totalCount: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('analyzer');
  const [ticketsFile, setTicketsFile] = useState<File | null>(null);
  const [mappingsFile, setMappingsFile] = useState<File | null>(null);
  const [pastTicketsFile, setPastTicketsFile] = useState<File | null>(null);
  const [pastMappingsFile, setPastMappingsFile] = useState<File | null>(null);
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>(['overall']);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResultWithType[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [flaggedData, setFlaggedData] = useState<FlaggedData | null>(null);
  const [storedIssues, setStoredIssues] = useState<any[] | null>(null);

  // Fetch stored issues on mount for Excel export comments
  React.useEffect(() => {
    const fetchStoredIssues = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setStoredIssues(data.issues || data.categories || []);
        }
      } catch (err) {
        console.error('Failed to fetch stored issues:', err);
      }
    };
    fetchStoredIssues();
  }, []);

  const handleFileUpload = useCallback((file: File, type: FileType) => {
    switch (type) {
      case 'tickets':
        setTicketsFile(file);
        break;
      case 'mappings':
        setMappingsFile(file);
        break;
      case 'pastTickets':
        setPastTicketsFile(file);
        break;
      case 'pastMappings':
        setPastMappingsFile(file);
        break;
    }
    // Reset results when files change
    setResults([]);
    setError(null);
  }, []);

  const handleRemoveFile = useCallback((type: FileType) => {
    switch (type) {
      case 'tickets':
        setTicketsFile(null);
        break;
      case 'mappings':
        setMappingsFile(null);
        break;
      case 'pastTickets':
        setPastTicketsFile(null);
        break;
      case 'pastMappings':
        setPastMappingsFile(null);
        break;
    }
    setResults([]);
    setError(null);
  }, []);

  const parseCSV = <T,>(file: File): Promise<T[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as T[]);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  const handleAnalyze = async () => {
    if (!ticketsFile) {
      setError('Please upload an HS Export CSV file');
      return;
    }

    if (analysisTypes.length === 0) {
      setError('Please select at least one analysis type');
      return;
    }

    // Check if custom analysis is selected but no categories chosen
    if (analysisTypes.includes('custom') && customCategories.length === 0) {
      setError('Please select at least one category for custom analysis');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Fetch latest categories from API to ensure we use custom categories
      try {
        const categoriesResponse = await fetch('/api/categories');
        if (categoriesResponse.ok) {
          const categoryConfig: any = await categoriesResponse.json();
          updateRuntimeCategories(categoryConfig.issues || categoryConfig.categories || []);
        }
      } catch (catErr) {
        console.warn('Failed to fetch categories, using defaults:', catErr);
      }

      // Parse this week's tickets CSV
      const tickets = await parseCSV<Ticket>(ticketsFile);
      
      if (tickets.length === 0) {
        throw new Error('No tickets found in the CSV file');
      }

      // Parse this week's mappings CSV if provided
      let mappings: ExperienceMapping[] | undefined;
      if (mappingsFile) {
        mappings = await parseCSV<ExperienceMapping>(mappingsFile);
      }

      // Parse past CSVs if provided
      let pastData: LastWeekData | undefined;
      if (pastTicketsFile) {
        try {
          const pastTickets = await parseCSV<Ticket>(pastTicketsFile);
          let pastMappings: ExperienceMapping[] | undefined;
          if (pastMappingsFile) {
            pastMappings = await parseCSV<ExperienceMapping>(pastMappingsFile);
          }
          pastData = generateLastWeekData(pastTickets, pastMappings);
        } catch (err) {
          console.error('Failed to parse past data:', err);
          // Continue without comparison data
        }
      }

      // Process tickets once
      const processed = processTickets(tickets, mappings);

      // Determine if comparison data is available
      const hasComparison = !!pastData && pastData.totalTickets > 0;

      // Run analysis for each selected type
      const allResults: AnalysisResultWithType[] = [];
      for (const type of analysisTypes) {
        // For custom analysis, pass the selected categories
        const analysisResult = runAnalysis(
          tickets, 
          mappings, 
          type, 
          pastData,
          type === 'custom' ? customCategories : undefined
        );
        allResults.push({
          type,
          result: analysisResult,
          categorizedTickets: processed,
          showComparison: hasComparison,
          includeStuckTickets: false
        });
      }
      
      setResults(allResults);
      setActiveResultIndex(0);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleComparison = (index: number) => {
    setResults(prev => prev.map((r, i) => 
      i === index ? { ...r, showComparison: !r.showComparison } : r
    ));
  };

  const toggleStuckTickets = (index: number) => {
    setResults(prev => prev.map((r, i) => 
      i === index ? { ...r, includeStuckTickets: !r.includeStuckTickets } : r
    ));
  };

  const handleDownload = async (resultWithType: AnalysisResultWithType) => {
    const blob = await exportToExcel(
      resultWithType.result, 
      resultWithType.type, 
      resultWithType.categorizedTickets, 
      resultWithType.showComparison,
      resultWithType.includeStuckTickets,
      storedIssues || undefined
    );
    const filename = generateFilename(resultWithType.type, resultWithType.showComparison);
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    // Download each file with a small delay to avoid browser blocking
    for (let i = 0; i < results.length; i++) {
      await handleDownload(results[i]);
      if (i < results.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const handleDownloadPDF = async (resultWithType: AnalysisResultWithType) => {
    const blob = await generatePDFDashboard(resultWithType.result, {
      title: `${ANALYSIS_CONFIGS[resultWithType.type].name} Dashboard`,
      showComparison: resultWithType.showComparison,
      includeStuckTickets: resultWithType.includeStuckTickets,
      allTickets: resultWithType.categorizedTickets,
    });
    const filename = `${ANALYSIS_CONFIGS[resultWithType.type].name.replace(/\s+/g, '_')}_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
    downloadPDFDashboard(blob, filename);
  };

  const hasPastData = pastTicketsFile !== null;
  const activeResult = results[activeResultIndex];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
      
      {/* Grid pattern overlay */}
      <div 
        className="fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-violet-300 font-medium">QC Ticket Analysis Tool</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-300 bg-clip-text text-transparent">
            Ticket Analyzer
          </h1>
          <Link
            href="/flagged"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all text-sm font-medium group"
          >
            <Flag className="w-4 h-4" />
            View Flagged Experiences
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </header>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/50 p-1">
            <button
              onClick={() => setActiveTab('analyzer')}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
                ${activeTab === 'analyzer'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }
              `}
            >
              <BarChart3 className="w-4 h-4" />
              Analyzer
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
                ${activeTab === 'categories'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }
              `}
            >
              <Settings2 className="w-4 h-4" />
              Manage Issues
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'analyzer' ? (
          <div className="space-y-8">
            {/* Description */}
            <p className="text-slate-400 max-w-2xl mx-auto text-center">
              Upload your QC ticket CSV files to automatically categorize and analyze tickets. 
              Export professional Excel reports with detailed breakdowns.
            </p>

            {/* Upload Section */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">Upload Files</h2>
                  <p className="text-sm text-slate-500">Upload your CSV files to begin analysis</p>
                </div>
              </div>
              <FileUpload
                onFileUpload={handleFileUpload}
                ticketsFile={ticketsFile}
                mappingsFile={mappingsFile}
                pastTicketsFile={pastTicketsFile}
                pastMappingsFile={pastMappingsFile}
                onRemoveFile={handleRemoveFile}
              />
            </section>

            {/* Analysis Type Section */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
              <AnalysisTypeSelector
                selectedTypes={analysisTypes}
                onTypesChange={setAnalysisTypes}
                customCategories={customCategories}
                onCustomCategoriesChange={setCustomCategories}
              />
            </section>

            {/* Analyze Button */}
            <div className="flex justify-center">
              <button
                onClick={handleAnalyze}
                disabled={!ticketsFile || isAnalyzing}
                className={`
                  group flex items-center gap-3 px-8 py-4 rounded-xl font-semibold
                  transition-all duration-200
                  ${ticketsFile && !isAnalyzing
                    ? 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }
                `}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Run Analysis
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Results Section */}
            {results.length > 0 && (
              <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-200">Analysis Results</h2>
                      <p className="text-sm text-slate-500">
                        {results[0].result.totalTickets} tickets analyzed • {results.length} report{results.length > 1 ? 's' : ''} generated
                        {hasPastData && ' • Comparison available'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/flagged"
                      onClick={async () => {
                        // Compute flagged experiences when clicking the button
                        const tickets = results[activeResultIndex].categorizedTickets;
                        console.log('Total tickets:', tickets.length);
                        
                        // Debug: Check a sample ticket for description
                        if (tickets.length > 0) {
                          console.log('Sample ticket keys:', Object.keys(tickets[0]));
                          console.log('Sample ticket description:', tickets[0]['Ticket description']);
                        }
                        
                        // Debug: Check for flaggable issues in tickets
                        const flaggableTickets = tickets.filter(t => {
                          const issues = t.issues || [t.issue];
                          return issues.some(issue => ['Bad label - set up', 'Blurry/out of focus video', 'Damage/dirty plate', 'Damaged product', 'Date code/LOT number shown', 'Off centered / Off axis', 'Reflections on product'].includes(issue));
                        });
                        console.log('Tickets with flaggable issues:', flaggableTickets.length);
                        
                        // Debug: Check statuses
                        const notDoneResolved = flaggableTickets.filter(t => {
                          const status = t['Ticket status']?.toLowerCase() || '';
                          return status !== 'done' && status !== 'resolved';
                        });
                        console.log('Flaggable tickets not Done/Resolved:', notDoneResolved.length);
                        
                        // Debug: Check instance IDs
                        const withInstanceId = notDoneResolved.filter(t => t['Instance ID'] && t['Instance ID'].trim() !== '');
                        console.log('With Instance ID:', withInstanceId.length);
                        console.log('Sample tickets:', withInstanceId.slice(0, 3).map(t => ({
                          issue: t.issue,
                          status: t['Ticket status'],
                          instanceId: t['Instance ID'],
                          description: t['Ticket description']
                        })));
                        
                        const flaggedMap = findExperiencesToFlag(tickets);
                        const byIssue: { category: string; experiences: FlaggedExperience[] }[] = [];
                        flaggedMap.forEach((experiences, issue) => {
                          if (experiences.length > 0) {
                            byIssue.push({ category: issue, experiences });
                          }
                        });
                        console.log('Flagged experiences:', byIssue);
                        console.log('Total flagged:', byIssue.reduce((sum, g) => sum + g.experiences.length, 0));
                        
                        // Save to Redis (with sessionStorage fallback)
                        try {
                          const response = await fetch('/api/flagged', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ data: byIssue })
                          });
                          
                          if (response.ok) {
                            console.log('✓ Saved to Redis successfully');
                            
                            // Send Slack notification
                            try {
                              const slackResponse = await fetch('/api/slack/notify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  data: byIssue,
                                  date: new Date().toISOString().split('T')[0]
                                })
                              });
                              
                              if (slackResponse.ok) {
                                const slackResult = await slackResponse.json();
                                console.log('✓ Slack notification sent:', slackResult.totalCount, 'experiences');
                              } else {
                                console.log('ℹ Slack notification skipped (webhook not configured)');
                              }
                            } catch (slackError) {
                              console.warn('Could not send Slack notification:', slackError);
                            }
                          } else {
                            const errorData = await response.json();
                            console.warn('Redis not available, using sessionStorage fallback:', errorData.error);
                            // Fallback to sessionStorage
                            sessionStorage.setItem('flaggedExperiences', JSON.stringify(byIssue));
                            console.log('✓ Saved to sessionStorage');
                          }
                        } catch (error) {
                          console.warn('Redis not available, using sessionStorage fallback');
                          // Fallback to sessionStorage
                          sessionStorage.setItem('flaggedExperiences', JSON.stringify(byIssue));
                          console.log('✓ Saved to sessionStorage');
                        }
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium hover:bg-amber-500/20 transition-colors"
                    >
                      <Flag className="w-4 h-4" />
                      Flag Experiences to QC (BETA)
                    </Link>
                    <button
                      onClick={() => handleDownloadPDF(results[activeResultIndex] || results[0])}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 font-medium hover:bg-violet-500/20 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Dashboard PDF (BETA)
                    </button>
                    {results.length > 1 ? (
                      <button
                        onClick={handleDownloadAll}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download All ({results.length} files)
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownload(results[0])}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download XLSX
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Toggle between results and download buttons */}
                {results.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-slate-700/50">
                    {results.map((r, index) => (
                      <button
                        key={r.type}
                        onClick={() => setActiveResultIndex(index)}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                          ${activeResultIndex === index
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                            : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                          }
                        `}
                      >
                        {ANALYSIS_CONFIGS[r.type].name}
                      </button>
                    ))}
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDownload(results[activeResultIndex])}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm hover:bg-slate-700/50 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download This
                    </button>
                  </div>
                )}

                {/* Comparison Toggle */}
                {activeResult?.result.comparison && (
                  <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center gap-2">
                      <GitCompare className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-blue-300">Week-over-Week Comparison</span>
                      <span className="text-xs text-blue-400/70">
                        (Past: {activeResult.result.comparison.lastWeekTotalTickets} tickets)
                      </span>
                    </div>
                    <button
                      onClick={() => toggleComparison(activeResultIndex)}
                      className={`
                        px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                        ${activeResult.showComparison
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }
                      `}
                    >
                      {activeResult.showComparison ? 'Comparison ON' : 'Comparison OFF'}
                    </button>
                  </div>
                )}

                {/* Stuck Tickets Toggle */}
                {activeResult && (
                  <div className="flex items-center justify-between mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-sm text-amber-300">Include Stuck Tickets Analysis</span>
                      <span className="text-xs text-amber-400/70">
                        (Top 5 issue categories for stuck tickets)
                      </span>
                    </div>
                    <button
                      onClick={() => toggleStuckTickets(activeResultIndex)}
                      className={`
                        px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                        ${activeResult.includeStuckTickets
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }
                      `}
                    >
                      {activeResult.includeStuckTickets ? 'Stuck Analysis ON' : 'Stuck Analysis OFF'}
                    </button>
                  </div>
                )}
                
                <ResultsPreview 
                  result={activeResult.result} 
                  analysisType={activeResult.type}
                  showComparison={activeResult.showComparison}
                />
              </section>
            )}
          </div>
        ) : (
          <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
            <CategoriesManager 
              onCategoriesChange={(categories) => {
                // Update stored issues when categories change
                setStoredIssues(categories);
              }}
            />
          </section>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-slate-600">
          <p>QC Ticket Analyzer • Built for Vercel deployment</p>
        </footer>
        </div>
      </main>
  );
}
