import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import {
  AnalysisResult,
  AnalysisType,
  ANALYSIS_CONFIGS,
  CategorizedTicket
} from './types';
import { getTopProductTypes } from './analyzer';

/**
 * Create a visual bar chart using block characters
 */
function createVisualBar(percentage: number, maxLength: number = 30): string {
  const barLength = Math.round((percentage / 100) * maxLength);
  return '█'.repeat(barLength);
}

/**
 * Generate the dashboard sheet
 */
function createDashboardSheet(
  result: AnalysisResult,
  analysisType: AnalysisType,
  allTickets: CategorizedTicket[],
  includeComparison: boolean = false
): XLSX.WorkSheet {
  const config = ANALYSIS_CONFIGS[analysisType];
  const rows: (string | number)[][] = [];
  const dateStr = format(new Date(), 'MMMM d, yyyy');
  const comparison = result.comparison;
  const hasComparison = includeComparison && comparison;
  
  // Title
  rows.push([`Ticket Analysis Dashboard - ${config.name}${hasComparison ? ' (with Week-over-Week Comparison)' : ''}`]);
  rows.push([`${dateStr}`]);
  rows.push([]);
  
  // Metrics section
  rows.push(['METRICS', '', hasComparison ? 'Last Week' : '', hasComparison ? 'Change' : '']);
  rows.push([
    'Total Products Reviewed', 
    result.totalProductsReviewed,
    hasComparison ? comparison.lastWeekProductsReviewed : '',
    hasComparison ? result.totalProductsReviewed - comparison.lastWeekProductsReviewed : ''
  ]);
  rows.push([
    'Approved Experiences (No Issues)', 
    `${result.approvedExperiences} (${result.totalProductsReviewed > 0 ? ((result.approvedExperiences / result.totalProductsReviewed) * 100).toFixed(1) : 0}%)`,
    hasComparison ? comparison.lastWeekApprovedExperiences : '',
    ''
  ]);
  rows.push(['Total Products with Tickets', result.productsWithTickets, '', '']);
  rows.push(['Tickets per Experience', result.ticketsPerExperience, '', '']);
  rows.push([
    'Total Tickets', 
    result.totalTickets,
    hasComparison ? comparison.lastWeekTotalTickets : '',
    hasComparison ? `${comparison.ticketChange} (${comparison.ticketChangePercent}%)` : ''
  ]);
  rows.push(['Categorized Tickets', result.categorizedCount, '', '']);
  rows.push(['Unique Categories', result.categoryResults.filter(c => c.count > 0 && c.category !== 'Uncategorized').length, '', '']);
  rows.push(['Uncategorized', `${result.uncategorizedCount} (${result.totalTickets > 0 ? ((result.uncategorizedCount / result.totalTickets) * 100).toFixed(1) : 0}%)`, '', '']);
  rows.push([]);
  
  // Week-over-Week Summary (if comparison enabled)
  if (hasComparison) {
    rows.push(['WEEK-OVER-WEEK SUMMARY']);
    rows.push(['Metric', 'This Week', 'Last Week', 'Change', '% Change', 'Trend']);
    rows.push([
      'Total Tickets',
      result.totalTickets,
      comparison.lastWeekTotalTickets,
      comparison.ticketChange,
      `${comparison.ticketChangePercent}%`,
      comparison.ticketChange < 0 ? '↓ IMPROVED' : comparison.ticketChange > 0 ? '↑ INCREASED' : '→ SAME'
    ]);
    rows.push([
      'DEV Issues',
      result.devCount,
      comparison.devCountLastWeek,
      result.devCount - comparison.devCountLastWeek,
      comparison.devCountLastWeek > 0 ? `${(((result.devCount - comparison.devCountLastWeek) / comparison.devCountLastWeek) * 100).toFixed(1)}%` : 'N/A',
      result.devCount < comparison.devCountLastWeek ? '↓' : result.devCount > comparison.devCountLastWeek ? '↑' : '→'
    ]);
    rows.push([
      'FACTORY Issues',
      result.factoryCount,
      comparison.factoryCountLastWeek,
      result.factoryCount - comparison.factoryCountLastWeek,
      comparison.factoryCountLastWeek > 0 ? `${(((result.factoryCount - comparison.factoryCountLastWeek) / comparison.factoryCountLastWeek) * 100).toFixed(1)}%` : 'N/A',
      result.factoryCount < comparison.factoryCountLastWeek ? '↓' : result.factoryCount > comparison.factoryCountLastWeek ? '↑' : '→'
    ]);
    rows.push([]);
  }
  
  // Top 5 Product Types (only for overall analysis with mappings)
  if (analysisType === 'overall' && allTickets.some(t => t.ProductType)) {
    const topProducts = getTopProductTypes(allTickets, 5);
    if (topProducts.length > 0) {
      rows.push(['TOP 5 PRODUCT TYPES']);
      rows.push(['Product Type', 'Ticket Count', '% of Total', 'Visual', 'Most Common Issue']);
      
      for (const product of topProducts) {
        rows.push([
          product.productType,
          product.count,
          `${product.percentage.toFixed(1)}%`,
          createVisualBar(product.percentage, 20),
          product.mostCommonIssue
        ]);
      }
      rows.push([]);
    }
  }
  
  // Category Breakdown
  rows.push(['CATEGORY BREAKDOWN']);
  
  if (hasComparison) {
    // With comparison columns
    if (config.includeDevFactory && config.includeIssueType) {
      rows.push(['Category', 'This Week', 'Last Week', 'Change', '% Change', 'Trend', 'Percentage', 'Visual', 'Dev/Factory', 'Issue Type']);
      
      for (const cat of result.categoryResults) {
        const catComp = comparison.categoryComparisons.find(c => c.category === cat.category);
        const lastWeek = catComp?.lastWeek || 0;
        const change = catComp?.change || cat.count;
        const changePercent = catComp?.changePercent || (cat.count > 0 ? 100 : 0);
        const trend = change < 0 ? '↓' : change > 0 ? '↑' : '→';
        
        rows.push([
          cat.category,
          cat.count,
          lastWeek,
          change,
          `${changePercent}%`,
          trend,
          `${cat.percentage.toFixed(1)}%`,
          createVisualBar(cat.percentage),
          cat.metadata.devFactory || '',
          cat.metadata.issueType || ''
        ]);
      }
    } else {
      rows.push(['Category', 'This Week', 'Last Week', 'Change', '% Change', 'Trend', 'Percentage', 'Visual']);
      
      for (const cat of result.categoryResults) {
        const catComp = comparison.categoryComparisons.find(c => c.category === cat.category);
        const lastWeek = catComp?.lastWeek || 0;
        const change = catComp?.change || cat.count;
        const changePercent = catComp?.changePercent || (cat.count > 0 ? 100 : 0);
        const trend = change < 0 ? '↓' : change > 0 ? '↑' : '→';
        
        rows.push([
          cat.category,
          cat.count,
          lastWeek,
          change,
          `${changePercent}%`,
          trend,
          `${cat.percentage.toFixed(1)}%`,
          createVisualBar(cat.percentage)
        ]);
      }
    }
  } else {
    // Without comparison
    if (config.includeDevFactory && config.includeIssueType) {
      rows.push(['Category', 'Count', 'Percentage', 'Visual', 'Dev/Factory', 'Issue Type']);
      
      for (const cat of result.categoryResults) {
        rows.push([
          cat.category,
          cat.count,
          `${cat.percentage.toFixed(1)}%`,
          createVisualBar(cat.percentage),
          cat.metadata.devFactory || '',
          cat.metadata.issueType || ''
        ]);
      }
    } else {
      rows.push(['Category', 'Count', 'Percentage', 'Visual']);
      
      for (const cat of result.categoryResults) {
        rows.push([
          cat.category,
          cat.count,
          `${cat.percentage.toFixed(1)}%`,
          createVisualBar(cat.percentage)
        ]);
      }
    }
  }
  
  rows.push([]);
  
  // Dev vs Factory Breakdown (only for analyses that include it)
  if (config.includeDevFactory) {
    rows.push(['DEV VS FACTORY BREAKDOWN']);
    
    if (hasComparison) {
      rows.push(['Type', 'This Week', 'Last Week', 'Change', 'Percentage', 'Visual']);
      
      const devFactoryTotal = result.devCount + result.factoryCount;
      const devPercentage = devFactoryTotal > 0 ? (result.devCount / devFactoryTotal) * 100 : 0;
      const factoryPercentage = devFactoryTotal > 0 ? (result.factoryCount / devFactoryTotal) * 100 : 0;
      
      rows.push([
        'DEV', 
        result.devCount, 
        comparison.devCountLastWeek,
        result.devCount - comparison.devCountLastWeek,
        `${devPercentage.toFixed(1)}%`, 
        createVisualBar(devPercentage, 50)
      ]);
      rows.push([
        'FACTORY', 
        result.factoryCount, 
        comparison.factoryCountLastWeek,
        result.factoryCount - comparison.factoryCountLastWeek,
        `${factoryPercentage.toFixed(1)}%`, 
        createVisualBar(factoryPercentage, 50)
      ]);
    } else {
      rows.push(['Type', 'Count', 'Percentage', 'Visual']);
      
      const devFactoryTotal = result.devCount + result.factoryCount;
      const devPercentage = devFactoryTotal > 0 ? (result.devCount / devFactoryTotal) * 100 : 0;
      const factoryPercentage = devFactoryTotal > 0 ? (result.factoryCount / devFactoryTotal) * 100 : 0;
      
      rows.push(['DEV', result.devCount, `${devPercentage.toFixed(1)}%`, createVisualBar(devPercentage, 50)]);
      rows.push(['FACTORY', result.factoryCount, `${factoryPercentage.toFixed(1)}%`, createVisualBar(factoryPercentage, 50)]);
    }
    rows.push([]);
  }
  
  // Issue Type Breakdown (only for analyses that include it)
  if (config.includeIssueType) {
    rows.push(['ISSUE TYPE BREAKDOWN']);
    
    if (hasComparison) {
      rows.push(['Issue Type', 'This Week', 'Last Week', 'Change', 'Percentage', 'Visual']);
      
      const issueTypes = Object.entries(result.issueTypeBreakdown)
        .sort((a, b) => b[1] - a[1]);
      
      for (const [issueType, count] of issueTypes) {
        const lastWeekCount = comparison.issueTypeBreakdownLastWeek[issueType] || 0;
        const percentage = result.totalTickets > 0 ? (count / result.totalTickets) * 100 : 0;
        rows.push([
          issueType,
          count,
          lastWeekCount,
          count - lastWeekCount,
          `${percentage.toFixed(1)}%`,
          createVisualBar(percentage, 50)
        ]);
      }
    } else {
      rows.push(['Issue Type', 'Count', 'Percentage', 'Visual']);
      
      const issueTypes = Object.entries(result.issueTypeBreakdown)
        .sort((a, b) => b[1] - a[1]);
      
      for (const [issueType, count] of issueTypes) {
        const percentage = result.totalTickets > 0 ? (count / result.totalTickets) * 100 : 0;
        rows.push([
          issueType,
          count,
          `${percentage.toFixed(1)}%`,
          createVisualBar(percentage, 50)
        ]);
      }
    }
  }
  
  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 45 }, // Category
    { wch: 12 }, // Count/This Week
    { wch: 12 }, // Last Week
    { wch: 12 }, // Change
    { wch: 12 }, // % Change
    { wch: 10 }, // Trend
    { wch: 12 }, // Percentage
    { wch: 35 }, // Visual
    { wch: 12 }, // Dev/Factory
    { wch: 12 }, // Issue Type
  ];
  
  return ws;
}

/**
 * Create a category sheet with all tickets for that category
 */
function createCategorySheet(
  category: string,
  tickets: CategorizedTicket[]
): XLSX.WorkSheet {
  const headers = [
    'Ticket ID',
    'Experience Name',
    'Experience ID',
    'Ticket Name',
    'Ticket Status',
    'Ticket Assignee',
    'Reviewer',
    'Product Type',
    'Template Name',
    'Ticket Description',
    'Backstage Experience Page',
    'Public Preview Link'
  ];
  
  const rows: (string | number)[][] = [headers];
  
  for (const ticket of tickets) {
    rows.push([
      ticket['Ticket ID'] || '',
      ticket['Experience name'] || '',
      ticket['Experience ID'] || '',
      ticket['Ticket name'] || '',
      ticket['Ticket status'] || '',
      ticket['Assignee'] || '',
      ticket.Reviewer || '',
      ticket.ProductType || '',
      ticket.TemplateName || '',
      ticket['Ticket description'] || '',
      ticket['Backstage Experience page'] || '',
      ticket.PublicPreviewLink || ''
    ]);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Ticket ID
    { wch: 30 }, // Experience Name
    { wch: 15 }, // Experience ID
    { wch: 40 }, // Ticket Name
    { wch: 12 }, // Ticket Status
    { wch: 20 }, // Ticket Assignee
    { wch: 20 }, // Reviewer
    { wch: 20 }, // Product Type
    { wch: 20 }, // Template Name
    { wch: 50 }, // Ticket Description
    { wch: 40 }, // Backstage Experience Page
    { wch: 50 }, // Public Preview Link
  ];
  
  return ws;
}

/**
 * Make sheet name safe for Excel (max 31 chars, no special chars)
 */
function safeSheetName(name: string): string {
  // Remove invalid characters
  let safe = name.replace(/[\/\\?*\[\]:]/g, ' ');
  // Truncate to 31 characters
  if (safe.length > 31) {
    safe = safe.substring(0, 31);
  }
  return safe;
}

/**
 * Export analysis results to Excel workbook
 */
export function exportToExcel(
  result: AnalysisResult,
  analysisType: AnalysisType,
  allTickets: CategorizedTicket[],
  includeComparison: boolean = false
): Blob {
  const wb = XLSX.utils.book_new();
  
  // Create dashboard sheet
  const dashboardSheet = createDashboardSheet(result, analysisType, allTickets, includeComparison);
  XLSX.utils.book_append_sheet(wb, dashboardSheet, 'Dashboard');
  
  // Create category sheets (only for categories with tickets)
  for (const categoryResult of result.categoryResults) {
    if (categoryResult.count > 0 && categoryResult.category !== 'Uncategorized') {
      const sheetName = safeSheetName(categoryResult.category);
      const categorySheet = createCategorySheet(categoryResult.category, categoryResult.tickets);
      XLSX.utils.book_append_sheet(wb, categorySheet, sheetName);
    }
  }
  
  // Add Uncategorized sheet if there are uncategorized tickets
  const uncategorized = result.categoryResults.find(c => c.category === 'Uncategorized');
  if (uncategorized && uncategorized.count > 0) {
    const uncategorizedSheet = createCategorySheet('Uncategorized', uncategorized.tickets);
    XLSX.utils.book_append_sheet(wb, uncategorizedSheet, 'Uncategorized');
  }
  
  // Generate Excel file
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generate filename for the export
 */
export function generateFilename(analysisType: AnalysisType, includeComparison: boolean = false): string {
  const config = ANALYSIS_CONFIGS[analysisType];
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const typeName = config.name.replace(/\s+/g, '_');
  const suffix = includeComparison ? '_WoW' : '';
  return `QC_Ticket_Analysis_${typeName}${suffix}_${dateStr}.xlsx`;
}
