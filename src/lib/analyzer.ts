import {
  Ticket,
  CategorizedTicket,
  ExperienceMapping,
  AnalysisResult,
  CategoryResult,
  CategoryComparison,
  AnalysisType,
  ANALYSIS_CONFIGS,
  CATEGORY_METADATA,
  ALL_CATEGORIES
} from './types';
import { processTickets, getCategoryMetadata } from './categorizer';

export interface LastWeekData {
  totalTickets: number;
  totalProductsReviewed: number;
  approvedExperiences: number;
  categoryCounts: Record<string, number>;
  devCount: number;
  factoryCount: number;
  issueTypeBreakdown: Record<string, number>;
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
  const issueTypeBreakdown: Record<string, number> = {};
  
  for (const ticket of categorizedTickets) {
    const categories = ticket.categories || [ticket.category];
    
    for (const category of categories) {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      
      const metadata = getCategoryMetadata(category);
      if (metadata.devFactory === 'DEV') {
        devCount++;
      } else if (metadata.devFactory === 'FACTORY') {
        factoryCount++;
      }
      
      if (metadata.issueType) {
        issueTypeBreakdown[metadata.issueType] = 
          (issueTypeBreakdown[metadata.issueType] || 0) + 1;
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
    issueTypeBreakdown
  };
}

/**
 * Run the full analysis on tickets with optional comparison to last week
 */
export function runAnalysis(
  tickets: Ticket[],
  mappings: ExperienceMapping[] | undefined,
  analysisType: AnalysisType,
  lastWeekData?: LastWeekData
): AnalysisResult {
  const config = ANALYSIS_CONFIGS[analysisType];
  
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
  for (const cat of config.categories) {
    categoryMap.set(cat, []);
  }
  categoryMap.set('Uncategorized', []);
  
  // Assign tickets to categories
  for (const ticket of categorizedTickets) {
    const categories = ticket.categories || [ticket.category];
    
    for (const category of categories) {
      // Check if this category is in our selected categories
      if (config.categories.includes(category) || category === 'Uncategorized') {
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
  const categoryResults: CategoryResult[] = [];
  let categorizedCount = 0;
  let uncategorizedCount = 0;
  let devCount = 0;
  let factoryCount = 0;
  const issueTypeBreakdown: Record<string, number> = {};
  
  // Get categories to include based on analysis type
  const categoriesToInclude = analysisType === 'overall' 
    ? [...ALL_CATEGORIES] 
    : [...config.categories, 'Uncategorized'];
  
  for (const category of categoriesToInclude) {
    const tickets = categoryMap.get(category) || [];
    const count = tickets.length;
    const percentage = totalTickets > 0 ? (count / totalTickets) * 100 : 0;
    const metadata = getCategoryMetadata(category);
    
    categoryResults.push({
      category,
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
      if (metadata.issueType) {
        issueTypeBreakdown[metadata.issueType] = 
          (issueTypeBreakdown[metadata.issueType] || 0) + count;
      }
    }
  }
  
  // Sort by count descending
  categoryResults.sort((a, b) => b.count - a.count);
  
  const successRate = totalTickets > 0 
    ? ((totalTickets - uncategorizedCount) / totalTickets) * 100 
    : 100;
  
  // Build comparison data if last week's data is provided
  let comparison: AnalysisResult['comparison'] = undefined;
  
  if (lastWeekData && lastWeekData.totalTickets > 0) {
    // Build category comparisons
    const categoryComparisons: CategoryComparison[] = [];
    for (const result of categoryResults) {
      const lastWeekCount = lastWeekData.categoryCounts[result.category] || 0;
      const change = result.count - lastWeekCount;
      const changePercent = lastWeekCount > 0 
        ? ((change / lastWeekCount) * 100) 
        : (result.count > 0 ? 100 : 0);
      
      categoryComparisons.push({
        category: result.category,
        thisWeek: result.count,
        lastWeek: lastWeekCount,
        change,
        changePercent: Math.round(changePercent * 10) / 10,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'same'
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
      categoryComparisons,
      devCountLastWeek: lastWeekData.devCount,
      factoryCountLastWeek: lastWeekData.factoryCount,
      issueTypeBreakdownLastWeek: lastWeekData.issueTypeBreakdown
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
    categoryResults,
    devCount,
    factoryCount,
    issueTypeBreakdown,
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
  
  for (const ticket of categorizedTickets) {
    const rawProductType = ticket.ProductType || 'Unknown';
    const productType = consolidateProductTypes(rawProductType);
    
    const existing = productTypeCounts.get(productType) || { count: 0, issues: new Map() };
    existing.count++;
    
    const category = ticket.category;
    existing.issues.set(category, (existing.issues.get(category) || 0) + 1);
    
    productTypeCounts.set(productType, existing);
  }
  
  const totalTickets = categorizedTickets.length;
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
      percentage: totalTickets > 0 ? (data.count / totalTickets) * 100 : 0,
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
  if (tickets.length === 0) return '-';
  
  const productTypeCounts = new Map<string, number>();
  
  for (const ticket of tickets) {
    const rawProductType = ticket.ProductType || 'Unknown';
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
  
  for (const ticket of categorizedTickets) {
    const rawProductType = ticket.ProductType || 'Unknown';
    const productType = consolidateProductTypes(rawProductType);
    const categories = ticket.categories || [ticket.category];
    
    if (!productTypeData.has(productType)) {
      productTypeData.set(productType, new Map());
    }
    
    const categoryMap = productTypeData.get(productType)!;
    for (const category of categories) {
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    }
  }
  
  const totalTickets = categorizedTickets.length;
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
      percentage: totalTickets > 0 ? (totalCount / totalTickets) * 100 : 0,
      categoryBreakdown
    });
  }
  
  // Sort by total count descending and take top N
  results.sort((a, b) => b.totalCount - a.totalCount);
  return results.slice(0, limit);
}
