// QC Ticket Types

export interface Ticket {
  'Ticket ID': string;
  'Ticket name': string;
  'Ticket description': string;
  'Experience name': string;
  'Experience ID': string;
  'Instance ID': string;
  'Ticket status': string;
  'Assignee': string;
  'Associated Experience': string;
  'Backstage Experience page': string;
  [key: string]: string; // Allow additional columns
}

export interface ExperienceMapping {
  ProductName: string;
  ExperienceId: string; // The Experience ID from QC App Export
  Assignee: string;
  ProductType: string;
  TemplateName: string;
  TotalTickets?: string | number; // From QC App Export - 0 means approved
  [key: string]: string | number | undefined; // Allow additional columns
}

export interface CategorizedTicket {
  'Ticket ID': string;
  'Ticket name': string;
  'Ticket description': string;
  'Experience name': string;
  'Experience ID': string;
  'Instance ID': string;
  'Ticket status': string;
  'Assignee': string;
  'Associated Experience': string;
  'Backstage Experience page': string;
  issue: string; // The specific issue (e.g., "BBOX issue", "Bad label - set up")
  issues?: string[]; // For multi-issue tickets
  Reviewer?: string;
  ProductType?: string;
  TemplateName?: string;
  PublicPreviewLink?: string;
}

// Flaggable issues for QC review
export const FLAGGABLE_ISSUES = [
  'Blurry/out of focus video',
  'Damage/dirty plate',
  'Damaged product',
  'Date code/LOT number shown',
  'Off centered / Off axis',
  'Reflections on product',
] as const;

// Flagged experience for QC review
export interface FlaggedExperience {
  instanceId: string;
  issue: string;
  experienceName: string;
  ticketName: string;
  ticketStatus: string;
  ticketDescription?: string;
  backstageLink?: string;
}

export interface IssueMetadata {
  devFactory: 'DEV' | 'FACTORY' | '';
  category: 'COPY' | 'COLOR' | 'CAPTURE' | 'ARTIFACT' | 'TAGGING' | 'BBOX' | 'DIMS' | 'BLUEPRINT' | '';
}

export interface IssueResult {
  issue: string;
  tickets: CategorizedTicket[];
  count: number;
  percentage: number;
  metadata: IssueMetadata;
}

export interface IssueComparison {
  issue: string;
  thisWeek: number;
  lastWeek: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'same';
}

export interface AnalysisResult {
  totalTickets: number;
  totalProductsReviewed: number;
  approvedExperiences: number;
  productsWithTickets: number;
  ticketsPerExperience: number;
  categorizedCount: number;
  uncategorizedCount: number;
  successRate: number;
  issueResults: IssueResult[];
  devCount: number;
  factoryCount: number;
  categoryBreakdown: Record<string, number>; // COPY, COLOR, etc.
  // Comparison data (optional - only when last week's data is provided)
  comparison?: {
    lastWeekTotalTickets: number;
    lastWeekApprovedExperiences: number;
    lastWeekProductsReviewed: number;
    ticketChange: number;
    ticketChangePercent: number;
    issueComparisons: IssueComparison[];
    devCountLastWeek: number;
    factoryCountLastWeek: number;
    categoryBreakdownLastWeek: Record<string, number>;
  };
}

export type AnalysisType = 
  | 'overall' 
  | 'dimensions' 
  | 'factory' 
  | 'label'
  | 'custom';

export interface AnalysisConfig {
  type: AnalysisType;
  name: string;
  description: string;
  issues: string[];
  includeDevFactory: boolean;
  includeCategory: boolean;
  includeTopProducts?: boolean; // Optional: defaults to true for backward compatibility
}

// All 39 issues
export const ALL_ISSUES = [
  'Action video edit',
  'Action video framing',
  'BBOX issue',
  'Bad close up sequence',
  'Bad close up sequence - bad framing',
  'Bad close up sequence - repetitive edits',
  'Bad copy',
  'Bad label - framing',
  'Bad label - set up',
  'Bad label artifact',
  'Bad unbox artifact',
  'Black frames in video',
  'Blurry/out of focus video',
  'Color correction - Action shot',
  'Color correction - other',
  'Color correction - transparent product',
  'Color correction - white product',
  'Damage/dirty plate',
  'Damaged product',
  'Date code/LOT number shown',
  'Dimensions alignment',
  'Dimensions - mixed values',
  'Dimensions using a set shot',
  'Dimensions/product name mismatch',
  'Feature crop',
  'Feature not matching copy',
  'Inconsistent color',
  'Incorrect dimension values',
  'Missing dimension values',
  'Missing navigation item',
  'Missing set in intro/360',
  'New issue',
  'Off centered / Off axis',
  'PDP mismatch',
  'Reflections on product',
  'Repetitive copy',
  'Repetitive features',
  'UI obstruction',
  'Un-seamless 360 loop',
  'Visible stage / equipment',
  'Visual glitches',
  'Uncategorized'
] as const;

// Issue metadata mapping
export const ISSUE_METADATA: Record<string, IssueMetadata> = {
  'Action video edit': { devFactory: 'FACTORY', category: 'TAGGING' },
  'Action video framing': { devFactory: 'FACTORY', category: 'TAGGING' },
  'BBOX issue': { devFactory: 'DEV', category: 'BBOX' },
  'Bad close up sequence': { devFactory: 'FACTORY', category: 'TAGGING' },
  'Bad close up sequence - bad framing': { devFactory: 'FACTORY', category: 'TAGGING' },
  'Bad close up sequence - repetitive edits': { devFactory: 'FACTORY', category: 'TAGGING' },
  'Bad copy': { devFactory: 'DEV', category: 'COPY' },
  'Bad label - framing': { devFactory: 'FACTORY', category: 'TAGGING' },
  'Bad label - set up': { devFactory: 'FACTORY', category: 'CAPTURE' },
  'Bad label artifact': { devFactory: 'DEV', category: 'ARTIFACT' },
  'Bad unbox artifact': { devFactory: 'FACTORY', category: 'CAPTURE' },
  'Black frames in video': { devFactory: 'FACTORY', category: 'CAPTURE' },
  'Blurry/out of focus video': { devFactory: 'FACTORY', category: 'CAPTURE' },
  'Color correction - Action shot': { devFactory: 'DEV', category: 'COLOR' },
  'Color correction - other': { devFactory: 'DEV', category: 'COLOR' },
  'Color correction - transparent product': { devFactory: 'DEV', category: 'COLOR' },
  'Color correction - white product': { devFactory: 'DEV', category: 'COLOR' },
  'Damage/dirty plate': { devFactory: 'FACTORY', category: 'CAPTURE' },
  'Damaged product': { devFactory: 'FACTORY', category: 'CAPTURE' },
  'Date code/LOT number shown': { devFactory: 'FACTORY', category: 'CAPTURE' },
  'Dimensions alignment': { devFactory: 'DEV', category: 'ARTIFACT' },
  'Dimensions - mixed values': { devFactory: 'FACTORY', category: 'DIMS' },
  'Dimensions using a set shot': { devFactory: 'FACTORY', category: 'CAPTURE' },
  'Dimensions/product name mismatch': { devFactory: 'FACTORY', category: 'DIMS' },
  'Feature crop': { devFactory: 'FACTORY', category: 'TAGGING' },
  'Feature not matching copy': { devFactory: 'DEV', category: 'COPY' },
  'Inconsistent color': { devFactory: 'DEV', category: 'COLOR' },
  'Incorrect dimension values': { devFactory: 'FACTORY', category: 'DIMS' },
  'Missing dimension values': { devFactory: 'FACTORY', category: 'DIMS' },
  'Missing navigation item': { devFactory: 'DEV', category: 'BLUEPRINT' },
  'Missing set in intro/360': { devFactory: 'FACTORY', category: 'CAPTURE' },
  'New issue': { devFactory: '', category: '' },
  'Off centered / Off axis': { devFactory: 'FACTORY', category: 'CAPTURE' },
  'PDP mismatch': { devFactory: '', category: '' },
  'Reflections on product': { devFactory: 'FACTORY', category: 'CAPTURE' },
  'Repetitive copy': { devFactory: 'DEV', category: 'COPY' },
  'Repetitive features': { devFactory: 'DEV', category: 'BLUEPRINT' },
  'UI obstruction': { devFactory: 'DEV', category: 'ARTIFACT' },
  'Un-seamless 360 loop': { devFactory: 'DEV', category: 'ARTIFACT' },
  'Visible stage / equipment': { devFactory: 'DEV', category: 'BBOX' },
  'Visual glitches': { devFactory: 'DEV', category: 'ARTIFACT' },
  'Uncategorized': { devFactory: '', category: '' }
};

// Analysis type configurations
export const ANALYSIS_CONFIGS: Record<AnalysisType, AnalysisConfig> = {
  overall: {
    type: 'overall',
    name: 'Overall Analysis',
    description: 'Full report with all 39 issues',
    issues: ALL_ISSUES.filter(c => c !== 'Uncategorized') as unknown as string[],
    includeDevFactory: true,
    includeCategory: true,
    includeTopProducts: true
  },
  dimensions: {
    type: 'dimensions',
    name: 'Dimensions Specific Analysis',
    description: 'Only dimension VALUE issues (3 issues)',
    issues: [
      'Incorrect dimension values',
      'Dimensions - mixed values',
      'Missing dimension values'
    ],
    includeDevFactory: false,
    includeCategory: false,
    includeTopProducts: false
  },
  factory: {
    type: 'factory',
    name: 'Factory Specific Analysis',
    description: 'Factory/production issues (17 issues)',
    issues: [
      'Action video edit',
      'Action video framing',
      'Bad close up sequence - bad framing',
      'Bad close up sequence - repetitive edits',
      'Bad label - framing',
      'Bad label - set up',
      'Bad unbox artifact',
      'Blurry/out of focus video',
      'Damage/dirty plate',
      'Damaged product',
      'Dimensions using a set shot',
      'Feature crop',
      'Incorrect dimension values',
      'Missing dimension values',
      'Missing set in intro/360',
      'Off centered / Off axis',
      'Reflections on product'
    ],
    includeDevFactory: false,
    includeCategory: false,
    includeTopProducts: false
  },
  label: {
    type: 'label',
    name: 'Label Specific Analysis',
    description: 'Label issues only (2 issues)',
    issues: [
      'Bad label - framing',
      'Bad label - set up'
    ],
    includeDevFactory: false,
    includeCategory: false,
    includeTopProducts: false
  },
  custom: {
    type: 'custom',
    name: 'Custom Analysis',
    description: 'Select specific issues to include',
    issues: [], // Will be set dynamically
    includeDevFactory: true,
    includeCategory: true,
    includeTopProducts: true
  }
};

// Compatibility exports for gradual migration
export const ALL_CATEGORIES = ALL_ISSUES;
export const CATEGORY_METADATA = ISSUE_METADATA;
export const FLAGGABLE_CATEGORIES = FLAGGABLE_ISSUES;
export type CategoryMetadata = IssueMetadata;
export type CategoryResult = IssueResult;
export type CategoryComparison = IssueComparison;

