'use client';

import React from 'react';
import { BarChart3, Ruler, Factory, Tag, Check } from 'lucide-react';
import { AnalysisType, ANALYSIS_CONFIGS } from '@/lib/types';

interface AnalysisTypeSelectorProps {
  selectedTypes: AnalysisType[];
  onTypesChange: (types: AnalysisType[]) => void;
}

const ICONS: Record<AnalysisType, React.ReactNode> = {
  overall: <BarChart3 className="w-5 h-5" />,
  dimensions: <Ruler className="w-5 h-5" />,
  factory: <Factory className="w-5 h-5" />,
  label: <Tag className="w-5 h-5" />
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
  }
};

export default function AnalysisTypeSelector({ 
  selectedTypes, 
  onTypesChange 
}: AnalysisTypeSelectorProps) {
  const handleToggle = (type: AnalysisType) => {
    if (selectedTypes.includes(type)) {
      // Don't allow deselecting if it's the only one selected
      if (selectedTypes.length > 1) {
        onTypesChange(selectedTypes.filter(t => t !== type));
      }
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Select Analysis Type(s)</h3>
        <span className="text-xs text-slate-500">
          {selectedTypes.length} selected • {selectedTypes.length > 1 ? 'Multiple files will be generated' : '1 file will be generated'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(ANALYSIS_CONFIGS) as AnalysisType[]).map((type) => {
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
                {config.categories.length} categories
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
