'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  TrendingDown,
  Package,
  Ticket,
  PieChart,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { AnalysisResult, ANALYSIS_CONFIGS, AnalysisType, IssueMetadata } from '@/lib/types';
import { ISSUE_METADATA_WITH_DESC } from '@/lib/issueMetadataWithDescriptions';

interface ResultsPreviewProps {
  result: AnalysisResult;
  analysisType: AnalysisType;
  showComparison?: boolean;
}

export default function ResultsPreview({ result, analysisType, showComparison = false }: ResultsPreviewProps) {
  const config = ANALYSIS_CONFIGS[analysisType];
  const comparison = result.comparison;
  const hasComparison = showComparison && comparison;
  
  // State for runtime metadata (includes custom issues)
  const [issueMetadata, setIssueMetadata] = useState<Record<string, IssueMetadata>>(ISSUE_METADATA_WITH_DESC);
  
  // Fetch runtime metadata on mount (includes custom issues with descriptions)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const storedIssues = await response.json();
          // Create metadata from stored issues
          const runtimeMetadata: Record<string, IssueMetadata> = { ...ISSUE_METADATA_WITH_DESC };
          for (const issue of storedIssues) {
            runtimeMetadata[issue.name] = {
              devFactory: issue.devFactory,
              category: issue.category,
              description: issue.comment // Use comment as description
            };
          }
          setIssueMetadata(runtimeMetadata);
        }
      } catch (error) {
        console.warn('Failed to fetch issue metadata for tooltips:', error);
      }
    };
    fetchMetadata();
  }, []);
  
  // Get top 10 categories for display
  const topCategories = result.issueResults
    .filter(c => c.issue !== 'Uncategorized')
    .slice(0, 10);

  // Get comparison data for categories if available
  const getCategoryComparison = (category: string) => {
    if (!hasComparison) return null;
    return comparison.issueComparisons.find(c => c.issue === category);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Package className="w-5 h-5" />}
          label="Products Reviewed"
          value={result.totalProductsReviewed}
          color="violet"
          comparison={hasComparison ? {
            lastWeek: comparison.lastWeekProductsReviewed,
            change: result.totalProductsReviewed - comparison.lastWeekProductsReviewed
          } : undefined}
        />
        <MetricCard
          icon={<Ticket className="w-5 h-5" />}
          label="Total Tickets"
          value={result.totalTickets}
          color="cyan"
          comparison={hasComparison ? {
            lastWeek: comparison.lastWeekTotalTickets,
            change: comparison.ticketChange,
            changePercent: comparison.ticketChangePercent
          } : undefined}
        />
        <MetricCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Categorized"
          value={`${result.successRate}%`}
          color="emerald"
        />
        <MetricCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="Uncategorized"
          value={result.uncategorizedCount}
          color={result.uncategorizedCount > 0 ? 'amber' : 'slate'}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Approved (No Issues)</p>
          <p className="text-lg font-semibold text-slate-200">
            {result.approvedExperiences}
            <span className="text-sm text-slate-400 ml-1">
              ({result.totalProductsReviewed > 0 
                ? ((result.approvedExperiences / result.totalProductsReviewed) * 100).toFixed(1) 
                : 0}%)
            </span>
          </p>
          {hasComparison && comparison.lastWeekApprovedExperiences > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              Past: {comparison.lastWeekApprovedExperiences}
            </p>
          )}
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Products with Tickets</p>
          <p className="text-lg font-semibold text-slate-200">{result.productsWithTickets}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Tickets per Experience</p>
          <p className="text-lg font-semibold text-slate-200">{result.ticketsPerExperience}</p>
        </div>
      </div>

      {/* Week-over-Week Summary (only when comparison is enabled) */}
      {hasComparison && (
        <div className={`rounded-xl p-4 border ${
          comparison.ticketChange < 0 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : comparison.ticketChange > 0 
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-slate-800/50 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {comparison.ticketChange < 0 ? (
                <TrendingDown className="w-5 h-5 text-emerald-400" />
              ) : comparison.ticketChange > 0 ? (
                <TrendingUp className="w-5 h-5 text-red-400" />
              ) : (
                <Minus className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-200">Comparison Change</p>
                <p className="text-xs text-slate-400">
                  {comparison.lastWeekTotalTickets} tickets (past) → {result.totalTickets} (current)
                </p>
              </div>
            </div>
            <div className={`text-right ${
              comparison.ticketChange < 0 ? 'text-emerald-400' : comparison.ticketChange > 0 ? 'text-red-400' : 'text-slate-400'
            }`}>
              <p className="text-2xl font-bold">
                {comparison.ticketChange > 0 ? '+' : ''}{comparison.ticketChange}
              </p>
              <p className="text-xs">
                ({comparison.ticketChangePercent > 0 ? '+' : ''}{comparison.ticketChangePercent}%)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dev vs Factory (only for analyses that include it) */}
      {config.includeDevFactory && (result.devCount > 0 || result.factoryCount > 0) && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-slate-400" />
            Dev vs Factory
          </h4>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-cyan-400">DEV</span>
                <span className="text-slate-400">
                  {result.devCount} ({((result.devCount / (result.devCount + result.factoryCount)) * 100).toFixed(1)}%)
                  {hasComparison && (
                    <span className={`ml-2 ${
                      result.devCount - comparison.devCountLastWeek < 0 ? 'text-emerald-400' : 
                      result.devCount - comparison.devCountLastWeek > 0 ? 'text-red-400' : ''
                    }`}>
                      {result.devCount - comparison.devCountLastWeek > 0 ? '↑' : 
                       result.devCount - comparison.devCountLastWeek < 0 ? '↓' : ''}
                      {result.devCount - comparison.devCountLastWeek !== 0 && 
                        Math.abs(result.devCount - comparison.devCountLastWeek)}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
                  style={{ width: `${(result.devCount / (result.devCount + result.factoryCount)) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-400">FACTORY</span>
                <span className="text-slate-400">
                  {result.factoryCount} ({((result.factoryCount / (result.devCount + result.factoryCount)) * 100).toFixed(1)}%)
                  {hasComparison && (
                    <span className={`ml-2 ${
                      result.factoryCount - comparison.factoryCountLastWeek < 0 ? 'text-emerald-400' : 
                      result.factoryCount - comparison.factoryCountLastWeek > 0 ? 'text-red-400' : ''
                    }`}>
                      {result.factoryCount - comparison.factoryCountLastWeek > 0 ? '↑' : 
                       result.factoryCount - comparison.factoryCountLastWeek < 0 ? '↓' : ''}
                      {result.factoryCount - comparison.factoryCountLastWeek !== 0 && 
                        Math.abs(result.factoryCount - comparison.factoryCountLastWeek)}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                  style={{ width: `${(result.factoryCount / (result.devCount + result.factoryCount)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Breakdown */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          Top Issues
          {hasComparison && <span className="text-xs text-slate-500 font-normal ml-2">(with comparison change)</span>}
        </h4>
        <div className="space-y-3">
          {topCategories.map((cat, index) => {
            const catComparison = getCategoryComparison(cat.issue);
            const metadata = issueMetadata[cat.issue];
            return (
              <div key={cat.issue} className="group">
                <div className="flex justify-between items-center mb-1">
                  <span 
                    className="text-sm text-slate-300 truncate flex-1 mr-2 cursor-help" 
                    title={metadata?.description || cat.issue}
                  >
                    <span className="text-slate-500 mr-2">{index + 1}.</span>
                    {cat.issue}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasComparison && catComparison && (
                      <span className={`text-xs flex items-center gap-0.5 ${
                        catComparison.change < 0 ? 'text-emerald-400' : 
                        catComparison.change > 0 ? 'text-red-400' : 'text-slate-500'
                      }`}>
                        {catComparison.change > 0 ? <ArrowUp className="w-3 h-3" /> : 
                         catComparison.change < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                        {catComparison.change !== 0 && Math.abs(catComparison.change)}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {cat.count} ({cat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(cat.percentage * 2, 100)}%` }}
                  />
                </div>
                {hasComparison && catComparison && catComparison.lastWeek > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Past: {catComparison.lastWeek}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {result.issueResults.length > 10 && (
          <p className="text-xs text-slate-500 mt-4 text-center">
            + {result.issueResults.filter(c => c.count > 0).length - 10} more issues in the Excel export
          </p>
        )}
      </div>

      {/* Category Breakdown (only for analyses that include it) */}
      {config.includeCategory && Object.keys(result.categoryBreakdown).length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            Categories
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.categoryBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const lastWeekCount = hasComparison ? (comparison.categoryBreakdownLastWeek[type] || 0) : 0;
                const change = count - lastWeekCount;
                return (
                  <div 
                    key={type}
                    className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50"
                  >
                    <span className="text-xs font-medium text-slate-300">{type}</span>
                    <span className="text-xs text-slate-500 ml-2">{count}</span>
                    {hasComparison && change !== 0 && (
                      <span className={`text-xs ml-1 ${change < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ({change > 0 ? '+' : ''}{change})
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ 
  icon, 
  label, 
  value, 
  color,
  comparison
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  color: 'violet' | 'cyan' | 'emerald' | 'amber' | 'slate';
  comparison?: {
    lastWeek: number;
    change: number;
    changePercent?: number;
  };
}) {
  const colorClasses = {
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    slate: 'bg-slate-700/50 text-slate-400 border-slate-600/50'
  };

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {comparison && (
        <div className="mt-1 flex items-center gap-1">
          <span className="text-xs text-slate-500">vs {comparison.lastWeek}</span>
          {comparison.change !== 0 && (
            <span className={`text-xs flex items-center ${
              comparison.change < 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {comparison.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(comparison.change)}
              {comparison.changePercent !== undefined && (
                <span className="ml-0.5">({comparison.changePercent > 0 ? '+' : ''}{comparison.changePercent}%)</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
