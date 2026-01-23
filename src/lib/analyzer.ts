import {
  Ticket,
  CategorizedTicket,
  ExperienceMapping,
  AnalysisResult,
  IssueResult,
  IssueComparison,
  AnalysisType,
  ANALYSIS_CONFIGS,
  ISSUE_METADATA,
  ALL_ISSUES
} from './types';
import { processTickets, getIssueMetadata } from './categorizer';

export interface LastWeekData {
  totalTickets: number;
  totalProductsReviewed: number;
  approvedExperiences: number;
  categoryCounts: Record<string, number>;
  devCount: number;
  factoryCount: number;
  categoryBreakdown: Record<string, number>;
}

/**
 * Generate LastWeekData from CSV files (tickets and mappings)
 */
export function generateLastWeekData(
  tickets: Ticket[],
  mappings: ExperienceMapping[] | undefined
): LastWeekData {
  // Process tickets to get categorization
  const categorizedTickets = processTickets(tickets, mappings);
  
  // Calculate approved experiences from mappings
  let approvedExperiences = 0;
  let totalProductsReviewed = 0;
  
  if (mappings && mappings.length > 0) {
    totalProductsReviewed = mappings.length;
    approvedExperiences = mappings.filter(m => {
      const ticketCount = Number(m.TotalTickets) || 0;
      return ticketCount === 0;
    }).length;
  }
  
  // Count categories
  const categoryCounts: Record<string, number> = {};
  let devCount = 0;
  let factoryCount = 0;
  const categoryBreakdown: Record<string, number> = {};
  
  for (const ticket of categorizedTickets) {
    const categories = ticket.issues || [ticket.issue];
    
    for (const category of categories) {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      
      const metadata = getIssueMetadata(category);
      if (metadata.devFactory === 'DEV') {
        devCount++;
      } else if (metadata.devFactory === 'FACTORY') {
        factoryCount++;
      }
      
      if (metadata.category) {
        categoryBreakdown[metadata.category] = 
          (categoryBreakdown[metadata.category] || 0) + 1;
      }
    }
  }
  
  return {
    totalTickets: categorizedTickets.length,
    totalProductsReviewed,
    approvedExperiences,
    categoryCounts,
    devCount,
    factoryCount,
    categoryBreakdown
  };
}

/**
 * Run the full analysis on tickets with optional comparison to last week
 */
export function runAnalysis(
  tickets: Ticket[],
  mappings: ExperienceMapping[] | undefined,
  analysisType: AnalysisType,
  lastWeekData?: LastWeekData,
  customCategories?: string[]
): AnalysisResult {
  const config = { ...ANALYSIS_CONFIGS[analysisType] };
  
  // For custom analysis, use the provided categories
  if (analysisType === 'custom' && customCategories && customCategories.length > 0) {
    config.issues = customCategories;
  }
  
  // Process and categorize all tickets
  const categorizedTickets = processTickets(tickets, mappings);
  
  // Get unique experiences with tickets
  const experiencesWithTickets = new Set<string>();
  for (const ticket of categorizedTickets) {
    const exp = ticket['Experience ID'] || ticket['Associated Experience'] || ticket['Experience name'];
    if (exp) {
      experiencesWithTickets.add(String(exp));
    }
  }
  
  // Calculate approved experiences from QC App Export (mappings)
  // Approved = experiences where totalTickets column equals 0
  let approvedExperiences = 0;
  let totalProducts = 0;
  
  if (mappings && mappings.length > 0) {
    totalProducts = mappings.length;
    approvedExperiences = mappings.filter(m => {
      const ticketCount = Number(m.TotalTickets) || 0;
      return ticketCount === 0;
    }).length;
  } else {
    // Fallback if no mappings provided
    totalProducts = experiencesWithTickets.size;
  }
  
  // Calculate metrics
  const totalTickets = categorizedTickets.length;
  const productsWithTickets = experiencesWithTickets.size;
  const ticketsPerExperience = productsWithTickets > 0 
    ? totalTickets / productsWithTickets 
    : 0;
  
  // Group tickets by category
  const categoryMap = new Map<string, CategorizedTicket[]>();
  
  // Initialize all categories (including those with 0 tickets)
  for (const cat of config.issues) {
    categoryMap.set(cat, []);
  }
  categoryMap.set('Uncategorized', []);
  
  // Assign tickets to categories
  for (const ticket of categorizedTickets) {
    const categories = ticket.issues || [ticket.issue];
    
    for (const category of categories) {
      // Check if this category is in our selected categories
      if (config.issues.includes(category) || category === 'Uncategorized') {
        const existing = categoryMap.get(category) || [];
        existing.push(ticket);
        categoryMap.set(category, existing);
      } else if (analysisType === 'overall') {
        // For overall analysis, include all categories
        const existing = categoryMap.get(category) || [];
        existing.push(ticket);
        categoryMap.set(category, existing);
      }
    }
  }
  
  // Build category results
  const issueResults: IssueResult[] = [];
  let categorizedCount = 0;
  let uncategorizedCount = 0;
  let devCount = 0;
  let factoryCount = 0;
  const categoryBreakdown: Record<string, number> = {};
  
  // Get categories to include based on analysis type
  const categoriesToInclude = analysisType === 'overall' 
    ? [...ALL_ISSUES] 
    : [...config.issues, 'Uncategorized'];
  
  for (const category of categoriesToInclude) {
    const tickets = categoryMap.get(category) || [];
    const count = tickets.length;
    const percentage = totalTickets > 0 ? (count / totalTickets) * 100 : 0;
    const metadata = getIssueMetadata(category);
    
    issueResults.push({
      issue: category,
      tickets,
      count,
      percentage,
      metadata
    });
    
    if (category === 'Uncategorized') {
      uncategorizedCount = count;
    } else {
      categorizedCount += count;
      
      // Count Dev vs Factory
      if (metadata.devFactory === 'DEV') {
        devCount += count;
      } else if (metadata.devFactory === 'FACTORY') {
        factoryCount += count;
      }
      
      // Count issue types
      if (metadata.category) {
        categoryBreakdown[metadata.category] = 
          (categoryBreakdown[metadata.category] || 0) + count;
      }
    }
  }
  
  // Sort by count descending
  issueResults.sort((a, b) => b.count - a.count);
  
  const successRate = totalTickets > 0 
    ? ((totalTickets - uncategorizedCount) / totalTickets) * 100 
    : 100;
  
  // Build comparison data if last week's data is provided
  let comparison: AnalysisResult['comparison'] = undefined;
  
  if (lastWeekData && lastWeekData.totalTickets > 0) {
    // Build category comparisons based on rates (percentage of total tickets)
    const issueComparisons: IssueComparison[] = [];
    for (const result of issueResults) {
      const lastWeekCount = lastWeekData.categoryCounts[result.issue] || 0;
      const change = result.count - lastWeekCount;
      
      // Calculate rates (percentage of total tickets)
      const thisWeekRate = totalTickets > 0 ? (result.count / totalTickets) * 100 : 0;
      const lastWeekRate = lastWeekData.totalTickets > 0 ? (lastWeekCount / lastWeekData.totalTickets) * 100 : 0;
      
      // Calculate percentage POINT change (not percentage change of the rate)
      // This is the difference in rates: e.g., 31.09% - 24.81% = +6.28 percentage points
      const changePercent = thisWeekRate - lastWeekRate;
      
      issueComparisons.push({
        issue: result.issue,
        thisWeek: result.count,
        lastWeek: lastWeekCount,
        change,
        changePercent: Math.round(changePercent * 10) / 10,
        trend: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'same'
      });
    }
    
    const ticketChange = totalTickets - lastWeekData.totalTickets;
    const ticketChangePercent = lastWeekData.totalTickets > 0 
      ? ((ticketChange / lastWeekData.totalTickets) * 100) 
      : (totalTickets > 0 ? 100 : 0);
    
    comparison = {
      lastWeekTotalTickets: lastWeekData.totalTickets,
      lastWeekApprovedExperiences: lastWeekData.approvedExperiences,
      lastWeekProductsReviewed: lastWeekData.totalProductsReviewed,
      ticketChange,
      ticketChangePercent: Math.round(ticketChangePercent * 10) / 10,
      issueComparisons,
      devCountLastWeek: lastWeekData.devCount,
      factoryCountLastWeek: lastWeekData.factoryCount,
      categoryBreakdownLastWeek: lastWeekData.categoryBreakdown
    };
  }

  return {
    totalTickets,
    totalProductsReviewed: totalProducts,
    approvedExperiences,
    productsWithTickets,
    ticketsPerExperience: Math.round(ticketsPerExperience * 100) / 100,
    categorizedCount,
    uncategorizedCount,
    successRate: Math.round(successRate * 100) / 100,
    issueResults,
    devCount,
    factoryCount,
    categoryBreakdown,
    comparison
  };
}

/**
 * Consolidate product types (e.g., Fishing Rods variants)
 */
export function consolidateProductTypes(productType: string): string {
  if (productType === 'Fishing Rods' || productType === 'Fishing Rod & Reel Combos') {
    return 'Fishing Rods (All)';
  }
  return productType;
}

/**
 * Get top product types from categorized tickets
 */
export function getTopProductTypes(
  categorizedTickets: CategorizedTicket[],
  limit: number = 5
): Array<{ productType: string; count: number; percentage: number; mostCommonIssue: string }> {
  const productTypeCounts = new Map<string, { count: number; issues: Map<string, number> }>();
  
  // Filter tickets that have a valid ProductType
  const ticketsWithProductType = categorizedTickets.filter(t => t.ProductType && t.ProductType.trim() !== '');
  
  for (const ticket of ticketsWithProductType) {
    const rawProductType = ticket.ProductType!;
    const productType = consolidateProductTypes(rawProductType);
    
    const existing = productTypeCounts.get(productType) || { count: 0, issues: new Map() };
    existing.count++;
    
    const category = ticket.issue;
    existing.issues.set(category, (existing.issues.get(category) || 0) + 1);
    
    productTypeCounts.set(productType, existing);
  }
  
  const totalWithProductType = ticketsWithProductType.length;
  const results: Array<{ productType: string; count: number; percentage: number; mostCommonIssue: string }> = [];
  
  for (const [productType, data] of productTypeCounts) {
    // Find most common issue
    let mostCommonIssue = '';
    let maxIssueCount = 0;
    for (const [issue, count] of data.issues) {
      if (count > maxIssueCount) {
        maxIssueCount = count;
        mostCommonIssue = `${issue} (${count})`;
      }
    }
    
    results.push({
      productType,
      count: data.count,
      percentage: totalWithProductType > 0 ? (data.count / totalWithProductType) * 100 : 0,
      mostCommonIssue
    });
  }
  
  // Sort by count descending and take top N
  results.sort((a, b) => b.count - a.count);
  return results.slice(0, limit);
}

/**
 * Get top product type for a specific category (with count)
 */
export function getTopProductTypeForCategory(tickets: CategorizedTicket[]): string {
  // Filter tickets that have a valid ProductType
  const ticketsWithProductType = tickets.filter(t => t.ProductType && t.ProductType.trim() !== '');
  if (ticketsWithProductType.length === 0) return '-';
  
  const productTypeCounts = new Map<string, number>();
  
  for (const ticket of ticketsWithProductType) {
    const rawProductType = ticket.ProductType!;
    const productType = consolidateProductTypes(rawProductType);
    productTypeCounts.set(productType, (productTypeCounts.get(productType) || 0) + 1);
  }
  
  let topProductType = '';
  let maxCount = 0;
  
  for (const [productType, count] of productTypeCounts) {
    if (count > maxCount) {
      maxCount = count;
      topProductType = productType;
    }
  }
  
  if (!topProductType) return '-';
  return `${topProductType} (${maxCount})`;
}

/**
 * Stuck ticket analysis result
 */
export interface StuckTicketAnalysis {
  totalStuckTickets: number;
  stuckPercentage: number;
  topCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Get stuck ticket analysis - tickets where "Ticket status" is "Stuck"
 * Returns top 5 issue categories specifically for stuck tickets
 */
export function getStuckTicketAnalysis(
  categorizedTickets: CategorizedTicket[],
  limit: number = 5
): StuckTicketAnalysis {
  // Filter for stuck tickets (case-insensitive check for "Stuck" status)
  const stuckTickets = categorizedTickets.filter(
    ticket => ticket['Ticket status']?.toLowerCase() === 'stuck'
  );
  
  const totalStuckTickets = stuckTickets.length;
  const stuckPercentage = categorizedTickets.length > 0 
    ? (totalStuckTickets / categorizedTickets.length) * 100 
    : 0;
  
  // Count categories for stuck tickets
  const categoryCounts = new Map<string, number>();
  
  for (const ticket of stuckTickets) {
    const categories = ticket.categories || [ticket.category];
    for (const category of categories) {
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }
  }
  
  // Build and sort category results
  const topCategories: Array<{ category: string; count: number; percentage: number }> = [];
  
  for (const [category, count] of categoryCounts) {
    topCategories.push({
      category,
      count,
      percentage: totalStuckTickets > 0 ? (count / totalStuckTickets) * 100 : 0
    });
  }
  
  // Sort by count descending and take top N
  topCategories.sort((a, b) => b.count - a.count);
  
  return {
    totalStuckTickets,
    stuckPercentage,
    topCategories: topCategories.slice(0, limit)
  };
}

/**
 * Get top product types with detailed category breakdown
 */
export interface ProductTypeCategoryBreakdown {
  productType: string;
  totalCount: number;
  percentage: number;
  categoryBreakdown: Array<{ category: string; count: number }>;
}

export function getTopProductTypesWithCategoryBreakdown(
  categorizedTickets: CategorizedTicket[],
  limit: number = 10
): ProductTypeCategoryBreakdown[] {
  const productTypeData = new Map<string, Map<string, number>>();
  
  // Filter tickets that have a valid ProductType
  const ticketsWithProductType = categorizedTickets.filter(t => t.ProductType && t.ProductType.trim() !== '');
  
  for (const ticket of ticketsWithProductType) {
    const rawProductType = ticket.ProductType!;
    const productType = consolidateProductTypes(rawProductType);
    const categories = ticket.issues || [ticket.issue];
    
    if (!productTypeData.has(productType)) {
      productTypeData.set(productType, new Map());
    }
    
    const categoryMap = productTypeData.get(productType)!;
    for (const category of categories) {
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    }
  }
  
  const totalWithProductType = ticketsWithProductType.length;
  const results: ProductTypeCategoryBreakdown[] = [];
  
  for (const [productType, categoryMap] of productTypeData) {
    let totalCount = 0;
    const categoryBreakdown: Array<{ category: string; count: number }> = [];
    
    for (const [category, count] of categoryMap) {
      totalCount += count;
      categoryBreakdown.push({ category, count });
    }
    
    // Sort categories by count descending
    categoryBreakdown.sort((a, b) => b.count - a.count);
    
    results.push({
      productType,
      totalCount,
      percentage: totalWithProductType > 0 ? (totalCount / totalWithProductType) * 100 : 0,
      categoryBreakdown
    });
  }
  
  // Sort by total count descending and take top N
  results.sort((a, b) => b.totalCount - a.totalCount);
  return results.slice(0, limit);
}
