import { IssueMetadata } from './types';
import { ISSUE_COMMENTS } from './issueComments';

export interface StoredIssue {
  name: string;
  devFactory: 'DEV' | 'FACTORY' | '';
  category: 'COPY' | 'COLOR' | 'CAPTURE' | 'ARTIFACT' | 'TAGGING' | 'BBOX' | 'DIMS' | 'BLUEPRINT' | '';
  isCustom?: boolean; // true if user-added
  comment?: string; // Excel export comment description
}

export interface IssueConfig {
  issues: StoredIssue[];
  lastUpdated: string;
}

// Default issues from the original system (with comments from QC doc)
export const DEFAULT_ISSUES: StoredIssue[] = [
  { name: 'Action video edit', devFactory: 'FACTORY', category: 'TAGGING', comment: ISSUE_COMMENTS['Action video edit'] },
  { name: 'Action video framing', devFactory: 'FACTORY', category: 'TAGGING', comment: ISSUE_COMMENTS['Action video framing'] },
  { name: 'BBOX issue', devFactory: 'DEV', category: 'BBOX', comment: ISSUE_COMMENTS['BBOX issue'] },
  { name: 'Bad close up sequence', devFactory: 'FACTORY', category: 'TAGGING', comment: ISSUE_COMMENTS['Bad close up sequence'] },
  { name: 'Bad close up sequence - bad framing', devFactory: 'FACTORY', category: 'TAGGING', comment: ISSUE_COMMENTS['Bad close up sequence - bad framing'] },
  { name: 'Bad close up sequence - repetitive edits', devFactory: 'FACTORY', category: 'TAGGING', comment: ISSUE_COMMENTS['Bad close up sequence - repetitive edits'] },
  { name: 'Bad copy', devFactory: 'DEV', category: 'COPY', comment: ISSUE_COMMENTS['Bad copy'] },
  { name: 'Bad label - framing', devFactory: 'FACTORY', category: 'TAGGING', comment: ISSUE_COMMENTS['Bad label - framing'] },
  { name: 'Bad label - set up', devFactory: 'FACTORY', category: 'CAPTURE', comment: ISSUE_COMMENTS['Bad label - set up'] },
  { name: 'Bad label artifact', devFactory: 'DEV', category: 'ARTIFACT', comment: ISSUE_COMMENTS['Bad label artifact'] },
  { name: 'Bad unbox artifact', devFactory: 'FACTORY', category: 'CAPTURE', comment: ISSUE_COMMENTS['Bad unbox artifact'] },
  { name: 'Black frames in video', devFactory: 'FACTORY', category: 'CAPTURE', comment: ISSUE_COMMENTS['Black frames in video'] },
  { name: 'Blurry/out of focus video', devFactory: 'FACTORY', category: 'CAPTURE', comment: ISSUE_COMMENTS['Blurry/out of focus video'] },
  { name: 'Color correction - Action shot', devFactory: 'DEV', category: 'COLOR', comment: ISSUE_COMMENTS['Color correction - Action shot'] },
  { name: 'Color correction - other', devFactory: 'DEV', category: 'COLOR', comment: ISSUE_COMMENTS['Color correction - other'] },
  { name: 'Color correction - transparent product', devFactory: 'DEV', category: 'COLOR', comment: ISSUE_COMMENTS['Color correction - transparent product'] },
  { name: 'Color correction - white product', devFactory: 'DEV', category: 'COLOR', comment: ISSUE_COMMENTS['Color correction - white product'] },
  { name: 'Damage/dirty plate', devFactory: 'FACTORY', category: 'CAPTURE', comment: ISSUE_COMMENTS['Damage/dirty plate'] },
  { name: 'Damaged product', devFactory: 'FACTORY', category: 'CAPTURE', comment: ISSUE_COMMENTS['Damaged product'] },
  { name: 'Date code/LOT number shown', devFactory: 'FACTORY', category: 'CAPTURE', comment: ISSUE_COMMENTS['Date code/LOT number shown'] },
  { name: 'Dimensions alignment', devFactory: 'DEV', category: 'ARTIFACT', comment: ISSUE_COMMENTS['Dimensions alignment'] },
  { name: 'Dimensions - mixed values', devFactory: 'FACTORY', category: 'DIMS', comment: ISSUE_COMMENTS['Dimensions - mixed values'] },
  { name: 'Dimensions using a set shot', devFactory: 'FACTORY', category: 'CAPTURE', comment: ISSUE_COMMENTS['Dimensions using a set shot'] },
  { name: 'Dimensions/product name mismatch', devFactory: 'FACTORY', category: 'DIMS', comment: ISSUE_COMMENTS['Dimensions/product name mismatch'] },
  { name: 'Feature crop', devFactory: 'FACTORY', category: 'TAGGING', comment: ISSUE_COMMENTS['Feature crop'] },
  { name: 'Feature not matching copy', devFactory: 'DEV', category: 'COPY', comment: ISSUE_COMMENTS['Feature not matching copy'] },
  { name: 'Inconsistent color', devFactory: 'DEV', category: 'COLOR', comment: ISSUE_COMMENTS['Inconsistent color'] },
  { name: 'Incorrect dimension values', devFactory: 'FACTORY', category: 'DIMS', comment: ISSUE_COMMENTS['Incorrect dimension values'] },
  { name: 'Missing dimension values', devFactory: 'FACTORY', category: 'DIMS', comment: ISSUE_COMMENTS['Missing dimension values'] },
  { name: 'Missing navigation item', devFactory: 'DEV', category: 'BLUEPRINT', comment: ISSUE_COMMENTS['Missing navigation item'] },
  { name: 'Missing set in intro/360', devFactory: 'FACTORY', category: 'CAPTURE', comment: ISSUE_COMMENTS['Missing set in intro/360'] },
  { name: 'New issue', devFactory: '', category: '', comment: ISSUE_COMMENTS['New issue'] },
  { name: 'Off centered / Off axis', devFactory: 'FACTORY', category: 'CAPTURE', comment: ISSUE_COMMENTS['Off centered / Off axis'] },
  { name: 'PDP mismatch', devFactory: '', category: '', comment: ISSUE_COMMENTS['PDP mismatch'] },
  { name: 'Reflections on product', devFactory: 'FACTORY', category: 'CAPTURE', comment: ISSUE_COMMENTS['Reflections on product'] },
  { name: 'Repetitive copy', devFactory: 'DEV', category: 'COPY', comment: ISSUE_COMMENTS['Repetitive copy'] },
  { name: 'Repetitive features', devFactory: 'DEV', category: 'BLUEPRINT', comment: ISSUE_COMMENTS['Repetitive features'] },
  { name: 'UI obstruction', devFactory: 'DEV', category: 'ARTIFACT', comment: ISSUE_COMMENTS['UI obstruction'] },
  { name: 'Un-seamless 360 loop', devFactory: 'DEV', category: 'ARTIFACT', comment: ISSUE_COMMENTS['Un-seamless 360 loop'] },
  { name: 'Visible stage / equipment', devFactory: 'DEV', category: 'BBOX', comment: ISSUE_COMMENTS['Visible stage / equipment'] },
  { name: 'Visual glitches', devFactory: 'DEV', category: 'ARTIFACT', comment: ISSUE_COMMENTS['Visual glitches'] },
];

export const CATEGORIES = ['COPY', 'COLOR', 'CAPTURE', 'ARTIFACT', 'TAGGING', 'BBOX', 'DIMS', 'BLUEPRINT', ''] as const;
export const DEV_FACTORY_OPTIONS = ['DEV', 'FACTORY', ''] as const;

export type Category = typeof CATEGORIES[number];
export type DevFactoryType = typeof DEV_FACTORY_OPTIONS[number];

// Compatibility exports for gradual migration
export type StoredCategory = StoredIssue;
export type CategoryConfig = IssueConfig;
export const DEFAULT_CATEGORIES = DEFAULT_ISSUES;
export const ISSUE_TYPES = CATEGORIES;
export type IssueType = Category;

