'use client';

import React from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Package,
  Ticket,
  PieChart
} from 'lucide-react';
import { AnalysisResult, ANALYSIS_CONFIGS, AnalysisType } from '@/lib/types';

interface ResultsPreviewProps {
  result: AnalysisResult;
  analysisType: AnalysisType;
}

export default function ResultsPreview({ result, analysisType }: ResultsPreviewProps) {
  const config = ANALYSIS_CONFIGS[analysisType];
  
  // Get top 10 categories for display
  const topCategories = result.categoryResults
    .filter(c => c.category !== 'Uncategorized')
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Package className="w-5 h-5" />}
          label="Products Reviewed"
          value={result.totalProductsReviewed}
          color="violet"
        />
        <MetricCard
          icon={<Ticket className="w-5 h-5" />}
          label="Total Tickets"
          value={result.totalTickets}
          color="cyan"
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

      {/* Category Breakdown */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          Top Categories
        </h4>
        <div className="space-y-3">
          {topCategories.map((cat, index) => (
            <div key={cat.category} className="group">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-slate-300 truncate flex-1 mr-2">
                  <span className="text-slate-500 mr-2">{index + 1}.</span>
                  {cat.category}
                </span>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {cat.count} ({cat.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(cat.percentage * 2, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {result.categoryResults.length > 10 && (
          <p className="text-xs text-slate-500 mt-4 text-center">
            + {result.categoryResults.filter(c => c.count > 0).length - 10} more categories in the Excel export
          </p>
        )}
      </div>

      {/* Issue Type Breakdown (only for analyses that include it) */}
      {config.includeIssueType && Object.keys(result.issueTypeBreakdown).length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            Issue Types
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.issueTypeBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div 
                  key={type}
                  className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50"
                >
                  <span className="text-xs font-medium text-slate-300">{type}</span>
                  <span className="text-xs text-slate-500 ml-2">{count}</span>
                </div>
              ))}
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
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  color: 'violet' | 'cyan' | 'emerald' | 'amber' | 'slate';
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
    </div>
  );
}
