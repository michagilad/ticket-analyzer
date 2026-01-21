// QC Ticket Types

export interface Ticket {
  'Ticket ID': string;
  'Ticket name': string;
  'Ticket description': string;
  'Experience name': string;
  'Experience ID': string;
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
  'Ticket status': string;
  'Assignee': string;
  'Associated Experience': string;
  'Backstage Experience page': string;
  category: string;
  categories?: string[]; // For multi-category tickets
  Reviewer?: string;
  ProductType?: string;
  TemplateName?: string;
  PublicPreviewLink?: string;
}

export interface CategoryMetadata {
  devFactory: 'DEV' | 'FACTORY' | '';
  issueType: 'COPY' | 'COLOR' | 'CAPTURE' | 'ARTIFACT' | 'TAGGING' | 'BBOX' | 'DIMS' | 'BLUEPRINT' | '';
}

export interface CategoryResult {
  category: string;
  tickets: CategorizedTicket[];
  count: number;
  percentage: number;
  metadata: CategoryMetadata;
}

export interface CategoryComparison {
  category: string;
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
  categoryResults: CategoryResult[];
  devCount: number;
  factoryCount: number;
  issueTypeBreakdown: Record<string, number>;
  // Comparison data (optional - only when last week's data is provided)
  comparison?: {
    lastWeekTotalTickets: number;
    lastWeekApprovedExperiences: number;
    lastWeekProductsReviewed: number;
    ticketChange: number;
    ticketChangePercent: number;
    categoryComparisons: CategoryComparison[];
    devCountLastWeek: number;
    factoryCountLastWeek: number;
    issueTypeBreakdownLastWeek: Record<string, number>;
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
  categories: string[];
  includeDevFactory: boolean;
  includeIssueType: boolean;
}

// All 39 categories
export const ALL_CATEGORIES = [
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

// Category metadata mapping
export const CATEGORY_METADATA: Record<string, CategoryMetadata> = {
  'Action video edit': { devFactory: 'FACTORY', issueType: 'TAGGING' },
  'Action video framing': { devFactory: 'FACTORY', issueType: 'TAGGING' },
  'BBOX issue': { devFactory: 'DEV', issueType: 'BBOX' },
  'Bad close up sequence': { devFactory: 'FACTORY', issueType: 'TAGGING' },
  'Bad close up sequence - bad framing': { devFactory: 'FACTORY', issueType: 'TAGGING' },
  'Bad close up sequence - repetitive edits': { devFactory: 'FACTORY', issueType: 'TAGGING' },
  'Bad copy': { devFactory: 'DEV', issueType: 'COPY' },
  'Bad label - framing': { devFactory: 'FACTORY', issueType: 'TAGGING' },
  'Bad label - set up': { devFactory: 'FACTORY', issueType: 'CAPTURE' },
  'Bad label artifact': { devFactory: 'DEV', issueType: 'ARTIFACT' },
  'Bad unbox artifact': { devFactory: 'FACTORY', issueType: 'CAPTURE' },
  'Black frames in video': { devFactory: 'FACTORY', issueType: 'CAPTURE' },
  'Blurry/out of focus video': { devFactory: 'FACTORY', issueType: 'CAPTURE' },
  'Color correction - Action shot': { devFactory: 'DEV', issueType: 'COLOR' },
  'Color correction - other': { devFactory: 'DEV', issueType: 'COLOR' },
  'Color correction - transparent product': { devFactory: 'DEV', issueType: 'COLOR' },
  'Color correction - white product': { devFactory: 'DEV', issueType: 'COLOR' },
  'Damage/dirty plate': { devFactory: 'FACTORY', issueType: 'CAPTURE' },
  'Damaged product': { devFactory: 'FACTORY', issueType: 'CAPTURE' },
  'Date code/LOT number shown': { devFactory: 'FACTORY', issueType: 'CAPTURE' },
  'Dimensions alignment': { devFactory: 'DEV', issueType: 'ARTIFACT' },
  'Dimensions - mixed values': { devFactory: 'FACTORY', issueType: 'DIMS' },
  'Dimensions using a set shot': { devFactory: 'FACTORY', issueType: 'CAPTURE' },
  'Dimensions/product name mismatch': { devFactory: 'FACTORY', issueType: 'DIMS' },
  'Feature crop': { devFactory: 'FACTORY', issueType: 'TAGGING' },
  'Feature not matching copy': { devFactory: 'DEV', issueType: 'COPY' },
  'Inconsistent color': { devFactory: 'DEV', issueType: 'COLOR' },
  'Incorrect dimension values': { devFactory: 'FACTORY', issueType: 'DIMS' },
  'Missing dimension values': { devFactory: 'FACTORY', issueType: 'DIMS' },
  'Missing navigation item': { devFactory: 'DEV', issueType: 'BLUEPRINT' },
  'Missing set in intro/360': { devFactory: 'FACTORY', issueType: 'CAPTURE' },
  'New issue': { devFactory: '', issueType: '' },
  'Off centered / Off axis': { devFactory: 'FACTORY', issueType: 'CAPTURE' },
  'PDP mismatch': { devFactory: '', issueType: '' },
  'Reflections on product': { devFactory: 'FACTORY', issueType: 'CAPTURE' },
  'Repetitive copy': { devFactory: 'DEV', issueType: 'COPY' },
  'Repetitive features': { devFactory: 'DEV', issueType: 'BLUEPRINT' },
  'UI obstruction': { devFactory: 'DEV', issueType: 'ARTIFACT' },
  'Un-seamless 360 loop': { devFactory: 'DEV', issueType: 'ARTIFACT' },
  'Visible stage / equipment': { devFactory: 'DEV', issueType: 'BBOX' },
  'Visual glitches': { devFactory: 'DEV', issueType: 'ARTIFACT' },
  'Uncategorized': { devFactory: '', issueType: '' }
};

// Analysis type configurations
export const ANALYSIS_CONFIGS: Record<AnalysisType, AnalysisConfig> = {
  overall: {
    type: 'overall',
    name: 'Overall Analysis',
    description: 'Full report with all 39 categories',
    categories: ALL_CATEGORIES.filter(c => c !== 'Uncategorized') as unknown as string[],
    includeDevFactory: true,
    includeIssueType: true
  },
  dimensions: {
    type: 'dimensions',
    name: 'Dimensions Specific Analysis',
    description: 'Only dimension VALUE issues (3 categories)',
    categories: [
      'Incorrect dimension values',
      'Dimensions - mixed values',
      'Missing dimension values'
    ],
    includeDevFactory: false,
    includeIssueType: false
  },
  factory: {
    type: 'factory',
    name: 'Factory Specific Analysis',
    description: 'Factory/production issues (17 categories)',
    categories: [
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
    includeDevFactory: true,
    includeIssueType: true
  },
  label: {
    type: 'label',
    name: 'Label Specific Analysis',
    description: 'Label issues only (2 categories)',
    categories: [
      'Bad label - framing',
      'Bad label - set up'
    ],
    includeDevFactory: false,
    includeIssueType: false
  },
  custom: {
    type: 'custom',
    name: 'Custom Analysis',
    description: 'Select specific categories to include',
    categories: [], // Will be set dynamically
    includeDevFactory: true,
    includeIssueType: true
  }
};
