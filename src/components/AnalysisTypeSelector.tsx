'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Ruler, Factory, Tag, Check, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { AnalysisType, ANALYSIS_CONFIGS, ALL_ISSUES } from '@/lib/types';

interface AnalysisTypeSelectorProps {
  selectedTypes: AnalysisType[];
  onTypesChange: (types: AnalysisType[]) => void;
  customCategories: string[];
  onCustomCategoriesChange: (categories: string[]) => void;
}

const ICONS: Record<AnalysisType, React.ReactNode> = {
  overall: <BarChart3 className="w-5 h-5" />,
  dimensions: <Ruler className="w-5 h-5" />,
  factory: <Factory className="w-5 h-5" />,
  label: <Tag className="w-5 h-5" />,
  custom: <Settings className="w-5 h-5" />
};

const COLORS: Record<AnalysisType, { bg: string; border: string; text: string; glow: string }> = {
  overall: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/50',
    text: 'text-violet-400',
    glow: 'shadow-violet-500/20'
  },
  dimensions: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/50',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/20'
  },
  factory: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20'
  },
  label: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/50',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20'
  },
  custom: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/50',
    text: 'text-pink-400',
    glow: 'shadow-pink-500/20'
  }
};

// Standard analysis types (not custom)
const STANDARD_TYPES: AnalysisType[] = ['overall', 'dimensions', 'factory', 'label'];

export default function AnalysisTypeSelector({ 
  selectedTypes, 
  onTypesChange,
  customCategories,
  onCustomCategoriesChange
}: AnalysisTypeSelectorProps) {
  const [showCustomCategories, setShowCustomCategories] = useState(false);
  const [availableIssues, setAvailableIssues] = useState<string[]>([...ALL_ISSUES]);
  
  // Fetch issues from storage on mount
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          const storedIssues = data.issues || data.categories || [];
          const issueNames = storedIssues.map((issue: any) => issue.name);
          setAvailableIssues(issueNames.filter((name: string) => name !== 'Uncategorized'));
        }
      } catch (err) {
        console.error('Failed to fetch issues:', err);
      }
    };
    fetchIssues();
  }, []);
  
  const handleToggle = (type: AnalysisType) => {
    if (selectedTypes.includes(type)) {
      // Don't allow deselecting if it's the only one selected
      if (selectedTypes.length > 1) {
        onTypesChange(selectedTypes.filter(t => t !== type));
        if (type === 'custom') {
          setShowCustomCategories(false);
        }
      }
    } else {
      onTypesChange([...selectedTypes, type]);
      if (type === 'custom') {
        setShowCustomCategories(true);
      }
    }
  };

  const handleCategoryToggle = (category: string) => {
    if (customCategories.includes(category)) {
      onCustomCategoriesChange(customCategories.filter(c => c !== category));
    } else {
      onCustomCategoriesChange([...customCategories, category]);
    }
  };

  const handleSelectAll = () => {
    onCustomCategoriesChange([...availableIssues]);
  };

  const handleClearAll = () => {
    onCustomCategoriesChange([]);
  };

  const isCustomSelected = selectedTypes.includes('custom');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Select Analysis Type(s)</h3>
        <span className="text-xs text-slate-500">
          {selectedTypes.length} selected • {selectedTypes.length > 1 ? 'Multiple files will be generated' : '1 file will be generated'}
        </span>
      </div>
      
      {/* Standard Analysis Types */}
      <div className="grid grid-cols-2 gap-3">
        {STANDARD_TYPES.map((type) => {
          const config = ANALYSIS_CONFIGS[type];
          const colors = COLORS[type];
          const isSelected = selectedTypes.includes(type);
          
          return (
            <button
              key={type}
              onClick={() => handleToggle(type)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                ${isSelected 
                  ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}` 
                  : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                }
              `}
            >
              {isSelected && (
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center`}>
                  <Check className={`w-3 h-3 ${colors.text}`} />
                </div>
              )}
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center mb-3
                ${isSelected ? colors.bg : 'bg-slate-700/50'}
              `}>
                <span className={isSelected ? colors.text : 'text-slate-400'}>
                  {ICONS[type]}
                </span>
              </div>
              <h4 className={`font-semibold mb-1 ${isSelected ? colors.text : 'text-slate-200'}`}>
                {config.name}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {config.description}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {config.issues.length} issues
              </p>
            </button>
          );
        })}
      </div>

      {/* Custom Analysis Option */}
      <div className="mt-4">
        <button
          onClick={() => handleToggle('custom')}
          className={`
            relative w-full p-4 rounded-xl border-2 text-left transition-all duration-200
            ${isCustomSelected 
              ? `${COLORS.custom.bg} ${COLORS.custom.border} shadow-lg ${COLORS.custom.glow}` 
              : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
            }
          `}
        >
          {isCustomSelected && (
            <div className={`absolute top-4 right-4 w-5 h-5 rounded-full ${COLORS.custom.bg} flex items-center justify-center`}>
              <Check className={`w-3 h-3 ${COLORS.custom.text}`} />
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
              ${isCustomSelected ? COLORS.custom.bg : 'bg-slate-700/50'}
            `}>
              <span className={isCustomSelected ? COLORS.custom.text : 'text-slate-400'}>
                {ICONS.custom}
              </span>
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold mb-1 ${isCustomSelected ? COLORS.custom.text : 'text-slate-200'}`}>
                Custom Analysis
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select specific issues to include in your analysis
              </p>
              {isCustomSelected && (
                <p className="text-xs text-pink-400 mt-1">
                  {customCategories.length} issues selected
                </p>
              )}
            </div>
          </div>
        </button>

        {/* Custom Categories Selection */}
        {isCustomSelected && (
          <div className="mt-3 p-4 rounded-xl border border-slate-700 bg-slate-800/30">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowCustomCategories(!showCustomCategories)}
                className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-slate-100"
              >
                {showCustomCategories ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {showCustomCategories ? 'Hide Issues' : 'Show Issues'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                >
                  Clear All
                </button>
              </div>
            </div>

            {showCustomCategories && (
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
                {availableIssues.map((issue) => {
                  const isSelected = customCategories.includes(issue);
                  return (
                    <button
                      key={issue}
                      onClick={() => handleCategoryToggle(issue)}
                      className={`
                        flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-all
                        ${isSelected 
                          ? 'bg-pink-500/20 border border-pink-500/50 text-pink-300' 
                          : 'bg-slate-700/30 border border-slate-600/50 text-slate-400 hover:bg-slate-700/50'
                        }
                      `}
                    >
                      <div className={`
                        w-4 h-4 rounded flex-shrink-0 flex items-center justify-center
                        ${isSelected ? 'bg-pink-500' : 'bg-slate-600'}
                      `}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="truncate">{issue}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {customCategories.length === 0 && (
              <p className="text-xs text-amber-400 mt-2">
                ⚠️ Please select at least one issue for custom analysis
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
