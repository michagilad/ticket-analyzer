import { CategoryMetadata } from './types';

export interface StoredCategory {
  name: string;
  devFactory: 'DEV' | 'FACTORY' | '';
  issueType: 'COPY' | 'COLOR' | 'CAPTURE' | 'ARTIFACT' | 'TAGGING' | 'BBOX' | 'DIMS' | 'BLUEPRINT' | '';
  isCustom?: boolean; // true if user-added
}

export interface CategoryConfig {
  categories: StoredCategory[];
  lastUpdated: string;
}

// Default categories from the original system
export const DEFAULT_CATEGORIES: StoredCategory[] = [
  { name: 'Action video edit', devFactory: 'FACTORY', issueType: 'TAGGING' },
  { name: 'Action video framing', devFactory: 'FACTORY', issueType: 'TAGGING' },
  { name: 'BBOX issue', devFactory: 'DEV', issueType: 'BBOX' },
  { name: 'Bad close up sequence', devFactory: 'FACTORY', issueType: 'TAGGING' },
  { name: 'Bad close up sequence - bad framing', devFactory: 'FACTORY', issueType: 'TAGGING' },
  { name: 'Bad close up sequence - repetitive edits', devFactory: 'FACTORY', issueType: 'TAGGING' },
  { name: 'Bad copy', devFactory: 'DEV', issueType: 'COPY' },
  { name: 'Bad label - framing', devFactory: 'FACTORY', issueType: 'TAGGING' },
  { name: 'Bad label - set up', devFactory: 'FACTORY', issueType: 'CAPTURE' },
  { name: 'Bad label artifact', devFactory: 'DEV', issueType: 'ARTIFACT' },
  { name: 'Bad unbox artifact', devFactory: 'FACTORY', issueType: 'CAPTURE' },
  { name: 'Black frames in video', devFactory: 'FACTORY', issueType: 'CAPTURE' },
  { name: 'Blurry/out of focus video', devFactory: 'FACTORY', issueType: 'CAPTURE' },
  { name: 'Color correction - Action shot', devFactory: 'DEV', issueType: 'COLOR' },
  { name: 'Color correction - other', devFactory: 'DEV', issueType: 'COLOR' },
  { name: 'Color correction - transparent product', devFactory: 'DEV', issueType: 'COLOR' },
  { name: 'Color correction - white product', devFactory: 'DEV', issueType: 'COLOR' },
  { name: 'Damage/dirty plate', devFactory: 'FACTORY', issueType: 'CAPTURE' },
  { name: 'Damaged product', devFactory: 'FACTORY', issueType: 'CAPTURE' },
  { name: 'Date code/LOT number shown', devFactory: 'FACTORY', issueType: 'CAPTURE' },
  { name: 'Dimensions alignment', devFactory: 'DEV', issueType: 'ARTIFACT' },
  { name: 'Dimensions - mixed values', devFactory: 'FACTORY', issueType: 'DIMS' },
  { name: 'Dimensions using a set shot', devFactory: 'FACTORY', issueType: 'CAPTURE' },
  { name: 'Dimensions/product name mismatch', devFactory: 'FACTORY', issueType: 'DIMS' },
  { name: 'Feature crop', devFactory: 'FACTORY', issueType: 'TAGGING' },
  { name: 'Feature not matching copy', devFactory: 'DEV', issueType: 'COPY' },
  { name: 'Inconsistent color', devFactory: 'DEV', issueType: 'COLOR' },
  { name: 'Incorrect dimension values', devFactory: 'FACTORY', issueType: 'DIMS' },
  { name: 'Missing dimension values', devFactory: 'FACTORY', issueType: 'DIMS' },
  { name: 'Missing navigation item', devFactory: 'DEV', issueType: 'BLUEPRINT' },
  { name: 'Missing set in intro/360', devFactory: 'FACTORY', issueType: 'CAPTURE' },
  { name: 'New issue', devFactory: '', issueType: '' },
  { name: 'Off centered / Off axis', devFactory: 'FACTORY', issueType: 'CAPTURE' },
  { name: 'PDP mismatch', devFactory: '', issueType: '' },
  { name: 'Reflections on product', devFactory: 'FACTORY', issueType: 'CAPTURE' },
  { name: 'Repetitive copy', devFactory: 'DEV', issueType: 'COPY' },
  { name: 'Repetitive features', devFactory: 'DEV', issueType: 'BLUEPRINT' },
  { name: 'UI obstruction', devFactory: 'DEV', issueType: 'ARTIFACT' },
  { name: 'Un-seamless 360 loop', devFactory: 'DEV', issueType: 'ARTIFACT' },
  { name: 'Visible stage / equipment', devFactory: 'DEV', issueType: 'BBOX' },
  { name: 'Visual glitches', devFactory: 'DEV', issueType: 'ARTIFACT' },
];

export const ISSUE_TYPES = ['COPY', 'COLOR', 'CAPTURE', 'ARTIFACT', 'TAGGING', 'BBOX', 'DIMS', 'BLUEPRINT', ''] as const;
export const DEV_FACTORY_OPTIONS = ['DEV', 'FACTORY', ''] as const;

export type IssueType = typeof ISSUE_TYPES[number];
export type DevFactoryType = typeof DEV_FACTORY_OPTIONS[number];
