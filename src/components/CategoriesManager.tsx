'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  Search,
  ChevronDown,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  Edit3
} from 'lucide-react';
import { 
  StoredCategory, 
  CategoryConfig, 
  DEFAULT_CATEGORIES,
  ISSUE_TYPES,
  DEV_FACTORY_OPTIONS,
  IssueType,
  DevFactoryType
} from '@/lib/categoryStorage';
import { ISSUE_COMMENTS } from '@/lib/issueComments';

interface CategoriesManagerProps {
  onCategoriesChange?: (categories: StoredCategory[]) => void;
}

export default function CategoriesManager({ onCategoriesChange }: CategoriesManagerProps) {
  const [categories, setCategories] = useState<StoredCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDevFactory, setFilterDevFactory] = useState<DevFactoryType | 'ALL'>('ALL');
  const [filterIssueType, setFilterIssueType] = useState<IssueType | 'ALL'>('ALL');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data: any = await response.json();
      setCategories(data.issues || data.categories || []);
      setLastUpdated(data.lastUpdated);
      onCategoriesChange?.(data.issues || data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      // Fall back to defaults
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  const saveCategories = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories })
      });
      if (!response.ok) throw new Error('Failed to save categories');
      const data: any = await response.json();
      setLastUpdated(data.lastUpdated);
      setSuccess('Categories saved successfully!');
      onCategoriesChange?.(categories);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save categories');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all categories to defaults? This will remove any custom categories.')) {
      return;
    }
    setCategories(DEFAULT_CATEGORIES);
    setSaving(true);
    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: DEFAULT_CATEGORIES })
      });
      setSuccess('Categories reset to defaults!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to reset categories');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      setError('A category with this name already exists');
      return;
    }
    
    const newCategory: StoredCategory = {
      name: newCategoryName.trim(),
      devFactory: '',
      category: '',
      isCustom: true
    };
    
    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    setShowAddForm(false);
    setError(null);
  };

  const deleteCategory = (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    setCategories(categories.filter(c => c.name !== name));
  };

  const updateCategory = (name: string, field: 'devFactory' | 'category' | 'comment', value: string) => {
    setCategories(categories.map(c => 
      c.name === name ? { ...c, [field]: value } : c
    ));
  };

  // Filter categories
  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDevFactory = filterDevFactory === 'ALL' || cat.devFactory === filterDevFactory;
    const matchesIssueType = filterIssueType === 'ALL' || cat.category === filterIssueType;
    return matchesSearch && matchesDevFactory && matchesIssueType;
  });

  // Group by Dev/Factory for display
  const devCategories = filteredCategories.filter(c => c.devFactory === 'DEV');
  const factoryCategories = filteredCategories.filter(c => c.devFactory === 'FACTORY');
  const unassignedCategories = filteredCategories.filter(c => c.devFactory === '');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-200">Category Management</h2>
          <p className="text-sm text-slate-500">
            {categories.length} categories • Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button
            onClick={saveCategories}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={filterDevFactory}
          onChange={(e) => setFilterDevFactory(e.target.value as DevFactoryType | 'ALL')}
          className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
        >
          <option value="ALL">All Types</option>
          <option value="DEV">DEV Only</option>
          <option value="FACTORY">FACTORY Only</option>
          <option value="">Unassigned</option>
        </select>
        <select
          value={filterIssueType}
          onChange={(e) => setFilterIssueType(e.target.value as IssueType | 'ALL')}
          className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
        >
          <option value="ALL">All Categories</option>
          {ISSUE_TYPES.filter(t => t !== '').map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
          <option value="">Unassigned</option>
        </select>
      </div>

      {/* Add New Issue */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        {showAddForm ? (
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter new issue name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              autoFocus
            />
            <button
              onClick={addCategory}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewCategoryName(''); }}
              className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Issue
          </button>
        )}
      </div>

      {/* Categories Tables */}
      <div className="space-y-6">
        {/* DEV Issues */}
        {devCategories.length > 0 && (
          <CategoryTable
            title="DEV Issues"
            titleColor="text-cyan-400"
            bgColor="bg-cyan-500/5"
            borderColor="border-cyan-500/20"
            categories={devCategories}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
          />
        )}

        {/* FACTORY Issues */}
        {factoryCategories.length > 0 && (
          <CategoryTable
            title="FACTORY Issues"
            titleColor="text-amber-400"
            bgColor="bg-amber-500/5"
            borderColor="border-amber-500/20"
            categories={factoryCategories}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
          />
        )}

        {/* Unassigned Issues */}
        {unassignedCategories.length > 0 && (
          <CategoryTable
            title="Unassigned Issues"
            titleColor="text-slate-400"
            bgColor="bg-slate-500/5"
            borderColor="border-slate-500/20"
            categories={unassignedCategories}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
          />
        )}

        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No issues match your filters
          </div>
        )}
      </div>
    </div>
  );
}

interface CategoryTableProps {
  title: string;
  titleColor: string;
  bgColor: string;
  borderColor: string;
  categories: StoredCategory[];
  onUpdate: (name: string, field: 'devFactory' | 'category' | 'comment', value: string) => void;
  onDelete: (name: string) => void;
}

function CategoryTable({ 
  title, 
  titleColor, 
  bgColor, 
  borderColor, 
  categories, 
  onUpdate, 
  onDelete 
}: CategoryTableProps) {
  const [expandedComment, setExpandedComment] = useState<string | null>(null);
  
  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}>
      <div className="px-4 py-3 border-b border-slate-700/50">
        <h3 className={`font-semibold ${titleColor}`}>{title} ({categories.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Issue Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase w-40">Dev/Factory</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase w-40">Category</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Comment</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <React.Fragment key={cat.name}>
                <tr className="border-b border-slate-700/30 hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <span 
                      className="text-slate-200 cursor-help" 
                      title={cat.comment || ISSUE_COMMENTS[cat.name] || cat.name}
                    >
                      {cat.name}
                    </span>
                    {cat.isCustom && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-violet-500/20 text-violet-400">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={cat.devFactory}
                      onChange={(e) => onUpdate(cat.name, 'devFactory', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                    >
                      {DEV_FACTORY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt || '(None)'}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={cat.category}
                      onChange={(e) => onUpdate(cat.name, 'category', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                    >
                      {ISSUE_TYPES.map(opt => (
                        <option key={opt} value={opt}>{opt || '(None)'}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {cat.comment ? (
                        <>
                          <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-xs text-slate-400 truncate max-w-[200px]">
                            {cat.comment}
                          </span>
                          <button
                            onClick={() => setExpandedComment(expandedComment === cat.name ? null : cat.name)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-violet-400 transition-colors"
                            title="Edit comment"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setExpandedComment(cat.name)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-violet-400 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add comment
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDelete(cat.name)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                {expandedComment === cat.name && (
                  <tr className="border-b border-slate-700/30 bg-slate-800/50">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400">
                          Excel Export Comment (appears when hovering over issue in report)
                        </label>
                        <textarea
                          value={cat.comment || ''}
                          onChange={(e) => onUpdate(cat.name, 'comment', e.target.value)}
                          placeholder="Enter a description for this issue..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 resize-none"
                          rows={3}
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={() => setExpandedComment(null)}
                            className="px-3 py-1.5 text-xs rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
