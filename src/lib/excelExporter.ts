import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import {
  AnalysisResult,
  AnalysisType,
  ANALYSIS_CONFIGS,
  CategorizedTicket
} from './types';
import { getTopProductTypes, getTopProductTypeForCategory, getTopProductTypesWithCategoryBreakdown } from './analyzer';

/**
 * Create a visual bar chart using block characters
 */
function createVisualBar(percentage: number, maxLength: number = 30): string {
  const barLength = Math.round((percentage / 100) * maxLength);
  return '█'.repeat(barLength);
}

/**
 * Style definitions
 */
const STYLES = {
  sectionHeader: {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 },
    alignment: { horizontal: 'left' as const },
  },
  columnHeader: {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 },
    alignment: { horizontal: 'center' as const },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const },
    },
  },
  greenText: {
    font: { color: { argb: 'FF00B050' }, bold: true },
  },
  redText: {
    font: { color: { argb: 'FFFF0000' }, bold: true },
  },
  dataCell: {
    border: {
      top: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
      left: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
    },
  },
};

/**
 * Apply change color (green for negative/improvement, red for positive/worse)
 */
function applyChangeColor(cell: ExcelJS.Cell, value: number, invertColors: boolean = false) {
  if (value < 0) {
    cell.font = invertColors ? STYLES.redText.font : STYLES.greenText.font;
  } else if (value > 0) {
    cell.font = invertColors ? STYLES.greenText.font : STYLES.redText.font;
  }
}

/**
 * Generate the dashboard sheet with full styling
 */
async function createDashboardSheet(
  workbook: ExcelJS.Workbook,
  result: AnalysisResult,
  analysisType: AnalysisType,
  allTickets: CategorizedTicket[],
  includeComparison: boolean = false
): Promise<void> {
  const config = ANALYSIS_CONFIGS[analysisType];
  const ws = workbook.addWorksheet('Dashboard');
  const comparison = result.comparison;
  const hasComparison = includeComparison && comparison;
  
  let currentRow = 1;
  
  // Set column widths
  ws.columns = [
    { width: 40 }, // A - Metric/Category
    { width: 14 }, // B - Past
    { width: 14 }, // C - Current
    { width: 12 }, // D - Change
    { width: 12 }, // E - % Change
    { width: 10 }, // F - Trend
    { width: 12 }, // G - Dev/Factory
    { width: 12 }, // H - Issue Type
    { width: 30 }, // I - Top Product Type
    { width: 60 }, // J - Category Breakdown
  ];
  
  // KEY METRICS SECTION
  if (hasComparison) {
    // Section header
    const sectionRow = ws.getRow(currentRow);
    ws.mergeCells(currentRow, 1, currentRow, 6);
    const sectionCell = ws.getCell(currentRow, 1);
    sectionCell.value = 'KEY METRICS - COMPARISON';
    sectionCell.fill = STYLES.sectionHeader.fill;
    sectionCell.font = STYLES.sectionHeader.font;
    currentRow++;
    
    // Column headers
    const headers = ['Metric', 'Past', 'Current', 'Change', '% Change', 'Trend'];
    const headerRow = ws.getRow(currentRow);
    headers.forEach((header, idx) => {
      const cell = ws.getCell(currentRow, idx + 1);
      cell.value = header;
      cell.fill = STYLES.columnHeader.fill;
      cell.font = STYLES.columnHeader.font;
      cell.alignment = STYLES.columnHeader.alignment;
      cell.border = STYLES.columnHeader.border;
    });
    currentRow++;
    
    // Metrics data
    const metricsData = [
      {
        metric: 'Total Products Reviewed',
        past: comparison.lastWeekProductsReviewed,
        current: result.totalProductsReviewed,
      },
      {
        metric: 'Approved Experiences (No Issues)',
        past: comparison.lastWeekApprovedExperiences,
        current: result.approvedExperiences,
        invertColors: true, // More approved is good
      },
      {
        metric: 'Products with Tickets',
        past: comparison.lastWeekProductsReviewed - comparison.lastWeekApprovedExperiences,
        current: result.productsWithTickets,
      },
      {
        metric: 'Total Tickets',
        past: comparison.lastWeekTotalTickets,
        current: result.totalTickets,
      },
      {
        metric: 'Tickets per Experience',
        past: parseFloat((comparison.lastWeekTotalTickets / Math.max(comparison.lastWeekProductsReviewed - comparison.lastWeekApprovedExperiences, 1)).toFixed(2)),
        current: result.ticketsPerExperience,
        isDecimal: true,
      },
      {
        metric: 'Unique Categories',
        past: comparison.categoryComparisons.filter(c => c.lastWeek > 0).length,
        current: result.categoryResults.filter(c => c.count > 0 && c.category !== 'Uncategorized').length,
      },
      {
        metric: 'Uncategorized',
        past: comparison.categoryComparisons.find(c => c.category === 'Uncategorized')?.lastWeek || 0,
        current: result.uncategorizedCount,
      },
    ];
    
    for (const data of metricsData) {
      const change = data.current - data.past;
      const changePercent = data.past > 0 
        ? ((change / data.past) * 100).toFixed(1) 
        : (data.current > 0 ? '100.0' : '0.0');
      const trend = change < 0 ? '↓' : change > 0 ? '↑' : '→';
      
      ws.getCell(currentRow, 1).value = data.metric;
      ws.getCell(currentRow, 2).value = data.past;
      ws.getCell(currentRow, 3).value = data.current;
      
      const changeCell = ws.getCell(currentRow, 4);
      changeCell.value = change;
      applyChangeColor(changeCell, change, data.invertColors);
      
      const percentCell = ws.getCell(currentRow, 5);
      percentCell.value = `${parseFloat(changePercent) > 0 ? '+' : ''}${changePercent}%`;
      applyChangeColor(percentCell, change, data.invertColors);
      
      ws.getCell(currentRow, 6).value = trend;
      
      currentRow++;
    }
    
    currentRow++; // Empty row
  } else {
    // Simple metrics without comparison
    const sectionCell = ws.getCell(currentRow, 1);
    sectionCell.value = 'KEY METRICS';
    sectionCell.fill = STYLES.sectionHeader.fill;
    sectionCell.font = STYLES.sectionHeader.font;
    ws.mergeCells(currentRow, 1, currentRow, 2);
    currentRow++;
    
    const simpleMetrics = [
      ['Total Products Reviewed', result.totalProductsReviewed],
      ['Approved Experiences (No Issues)', `${result.approvedExperiences} (${result.totalProductsReviewed > 0 ? ((result.approvedExperiences / result.totalProductsReviewed) * 100).toFixed(1) : 0}%)`],
      ['Products with Tickets', result.productsWithTickets],
      ['Tickets per Experience', result.ticketsPerExperience],
      ['Total Tickets', result.totalTickets],
      ['Categorized Tickets', result.categorizedCount],
      ['Unique Categories', result.categoryResults.filter(c => c.count > 0 && c.category !== 'Uncategorized').length],
      ['Uncategorized', `${result.uncategorizedCount} (${result.totalTickets > 0 ? ((result.uncategorizedCount / result.totalTickets) * 100).toFixed(1) : 0}%)`],
    ];
    
    for (const [metric, value] of simpleMetrics) {
      ws.getCell(currentRow, 1).value = metric;
      ws.getCell(currentRow, 2).value = value;
      currentRow++;
    }
    currentRow++;
  }
  
  // TOP 5 PRODUCT TYPES
  if (allTickets.some(t => t.ProductType)) {
    const topProducts = getTopProductTypes(allTickets, 5);
    if (topProducts.length > 0) {
      // Section header
      ws.mergeCells(currentRow, 1, currentRow, 5);
      const sectionCell = ws.getCell(currentRow, 1);
      sectionCell.value = 'TOP 5 PRODUCT TYPES';
      sectionCell.fill = STYLES.sectionHeader.fill;
      sectionCell.font = STYLES.sectionHeader.font;
      currentRow++;
      
      // Column headers
      const headers = ['Product Type', 'Ticket Count', '% of Total', 'Visual', 'Most Common Issue'];
      headers.forEach((header, idx) => {
        const cell = ws.getCell(currentRow, idx + 1);
        cell.value = header;
        cell.fill = STYLES.columnHeader.fill;
        cell.font = STYLES.columnHeader.font;
        cell.alignment = STYLES.columnHeader.alignment;
        cell.border = STYLES.columnHeader.border;
      });
      currentRow++;
      
      for (const product of topProducts) {
        ws.getCell(currentRow, 1).value = product.productType;
        ws.getCell(currentRow, 2).value = product.count;
        ws.getCell(currentRow, 3).value = `${product.percentage.toFixed(1)}%`;
        ws.getCell(currentRow, 4).value = createVisualBar(product.percentage, 20);
        ws.getCell(currentRow, 5).value = product.mostCommonIssue;
        currentRow++;
      }
      currentRow++;
    }
  }
  
  // CATEGORY BREAKDOWN
  const categoryColCount = hasComparison 
    ? (config.includeDevFactory && config.includeIssueType ? 9 : 7)
    : (config.includeDevFactory && config.includeIssueType ? 7 : 5);
  
  ws.mergeCells(currentRow, 1, currentRow, categoryColCount);
  const catSectionCell = ws.getCell(currentRow, 1);
  catSectionCell.value = hasComparison ? 'CATEGORY BREAKDOWN - COMPARISON' : 'CATEGORY BREAKDOWN';
  catSectionCell.fill = STYLES.sectionHeader.fill;
  catSectionCell.font = STYLES.sectionHeader.font;
  currentRow++;
  
  // Category headers
  let catHeaders: string[];
  if (hasComparison) {
    catHeaders = config.includeDevFactory && config.includeIssueType
      ? ['Category', 'Past', 'Current', 'Change', '% Change', 'Trend', 'Dev/Factory', 'Issue Type', 'Top Product Type']
      : ['Category', 'Past', 'Current', 'Change', '% Change', 'Trend', 'Top Product Type'];
  } else {
    catHeaders = config.includeDevFactory && config.includeIssueType
      ? ['Category', 'Count', 'Percentage', 'Visual', 'Dev/Factory', 'Issue Type', 'Top Product Type']
      : ['Category', 'Count', 'Percentage', 'Visual', 'Top Product Type'];
  }
  
  catHeaders.forEach((header, idx) => {
    const cell = ws.getCell(currentRow, idx + 1);
    cell.value = header;
    cell.fill = STYLES.columnHeader.fill;
    cell.font = STYLES.columnHeader.font;
    cell.alignment = STYLES.columnHeader.alignment;
    cell.border = STYLES.columnHeader.border;
  });
  currentRow++;
  
  // Category data
  for (const cat of result.categoryResults) {
    const topProduct = getTopProductTypeForCategory(cat.tickets);
    
    if (hasComparison) {
      const catComp = comparison!.categoryComparisons.find(c => c.category === cat.category);
      const lastWeek = catComp?.lastWeek || 0;
      const change = catComp?.change || cat.count;
      const changePercent = catComp?.changePercent || (cat.count > 0 ? 100 : 0);
      const trend = change < 0 ? '↓' : change > 0 ? '↑' : '→';
      
      ws.getCell(currentRow, 1).value = cat.category;
      ws.getCell(currentRow, 2).value = lastWeek;
      ws.getCell(currentRow, 3).value = cat.count;
      
      const changeCell = ws.getCell(currentRow, 4);
      changeCell.value = change > 0 ? `+${change}` : change;
      applyChangeColor(changeCell, change);
      
      const percentCell = ws.getCell(currentRow, 5);
      percentCell.value = `${changePercent > 0 ? '+' : ''}${changePercent}%`;
      applyChangeColor(percentCell, change);
      
      ws.getCell(currentRow, 6).value = trend;
      
      if (config.includeDevFactory && config.includeIssueType) {
        ws.getCell(currentRow, 7).value = cat.metadata.devFactory || '';
        ws.getCell(currentRow, 8).value = cat.metadata.issueType || '';
        ws.getCell(currentRow, 9).value = topProduct;
      } else {
        ws.getCell(currentRow, 7).value = topProduct;
      }
    } else {
      ws.getCell(currentRow, 1).value = cat.category;
      ws.getCell(currentRow, 2).value = cat.count;
      ws.getCell(currentRow, 3).value = `${cat.percentage.toFixed(1)}%`;
      ws.getCell(currentRow, 4).value = createVisualBar(cat.percentage);
      
      if (config.includeDevFactory && config.includeIssueType) {
        ws.getCell(currentRow, 5).value = cat.metadata.devFactory || '';
        ws.getCell(currentRow, 6).value = cat.metadata.issueType || '';
        ws.getCell(currentRow, 7).value = topProduct;
      } else {
        ws.getCell(currentRow, 5).value = topProduct;
      }
    }
    currentRow++;
  }
  currentRow++;
  
  // DEV VS FACTORY BREAKDOWN
  if (config.includeDevFactory) {
    const devColCount = hasComparison ? 6 : 4;
    ws.mergeCells(currentRow, 1, currentRow, devColCount);
    const devSectionCell = ws.getCell(currentRow, 1);
    devSectionCell.value = 'DEV VS FACTORY BREAKDOWN';
    devSectionCell.fill = STYLES.sectionHeader.fill;
    devSectionCell.font = STYLES.sectionHeader.font;
    currentRow++;
    
    const devHeaders = hasComparison 
      ? ['Type', 'Past', 'Current', 'Change', 'Percentage', 'Visual']
      : ['Type', 'Count', 'Percentage', 'Visual'];
    
    devHeaders.forEach((header, idx) => {
      const cell = ws.getCell(currentRow, idx + 1);
      cell.value = header;
      cell.fill = STYLES.columnHeader.fill;
      cell.font = STYLES.columnHeader.font;
      cell.alignment = STYLES.columnHeader.alignment;
      cell.border = STYLES.columnHeader.border;
    });
    currentRow++;
    
    const devFactoryTotal = result.devCount + result.factoryCount;
    const devPercentage = devFactoryTotal > 0 ? (result.devCount / devFactoryTotal) * 100 : 0;
    const factoryPercentage = devFactoryTotal > 0 ? (result.factoryCount / devFactoryTotal) * 100 : 0;
    
    if (hasComparison) {
      const devChange = result.devCount - comparison!.devCountLastWeek;
      const factoryChange = result.factoryCount - comparison!.factoryCountLastWeek;
      
      // DEV row
      ws.getCell(currentRow, 1).value = 'DEV';
      ws.getCell(currentRow, 2).value = comparison!.devCountLastWeek;
      ws.getCell(currentRow, 3).value = result.devCount;
      const devChangeCell = ws.getCell(currentRow, 4);
      devChangeCell.value = devChange > 0 ? `+${devChange}` : devChange;
      applyChangeColor(devChangeCell, devChange);
      ws.getCell(currentRow, 5).value = `${devPercentage.toFixed(1)}%`;
      ws.getCell(currentRow, 6).value = createVisualBar(devPercentage, 30);
      currentRow++;
      
      // FACTORY row
      ws.getCell(currentRow, 1).value = 'FACTORY';
      ws.getCell(currentRow, 2).value = comparison!.factoryCountLastWeek;
      ws.getCell(currentRow, 3).value = result.factoryCount;
      const factoryChangeCell = ws.getCell(currentRow, 4);
      factoryChangeCell.value = factoryChange > 0 ? `+${factoryChange}` : factoryChange;
      applyChangeColor(factoryChangeCell, factoryChange);
      ws.getCell(currentRow, 5).value = `${factoryPercentage.toFixed(1)}%`;
      ws.getCell(currentRow, 6).value = createVisualBar(factoryPercentage, 30);
      currentRow++;
    } else {
      ws.getCell(currentRow, 1).value = 'DEV';
      ws.getCell(currentRow, 2).value = result.devCount;
      ws.getCell(currentRow, 3).value = `${devPercentage.toFixed(1)}%`;
      ws.getCell(currentRow, 4).value = createVisualBar(devPercentage, 30);
      currentRow++;
      
      ws.getCell(currentRow, 1).value = 'FACTORY';
      ws.getCell(currentRow, 2).value = result.factoryCount;
      ws.getCell(currentRow, 3).value = `${factoryPercentage.toFixed(1)}%`;
      ws.getCell(currentRow, 4).value = createVisualBar(factoryPercentage, 30);
      currentRow++;
    }
    currentRow++;
  }
  
  // ISSUE TYPE BREAKDOWN
  if (config.includeIssueType && Object.keys(result.issueTypeBreakdown).length > 0) {
    const issueColCount = hasComparison ? 6 : 4;
    ws.mergeCells(currentRow, 1, currentRow, issueColCount);
    const issueSectionCell = ws.getCell(currentRow, 1);
    issueSectionCell.value = 'ISSUE TYPE BREAKDOWN';
    issueSectionCell.fill = STYLES.sectionHeader.fill;
    issueSectionCell.font = STYLES.sectionHeader.font;
    currentRow++;
    
    const issueHeaders = hasComparison 
      ? ['Issue Type', 'Past', 'Current', 'Change', 'Percentage', 'Visual']
      : ['Issue Type', 'Count', 'Percentage', 'Visual'];
    
    issueHeaders.forEach((header, idx) => {
      const cell = ws.getCell(currentRow, idx + 1);
      cell.value = header;
      cell.fill = STYLES.columnHeader.fill;
      cell.font = STYLES.columnHeader.font;
      cell.alignment = STYLES.columnHeader.alignment;
      cell.border = STYLES.columnHeader.border;
    });
    currentRow++;
    
    const issueTypes = Object.entries(result.issueTypeBreakdown).sort((a, b) => b[1] - a[1]);
    
    for (const [issueType, count] of issueTypes) {
      const percentage = result.totalTickets > 0 ? (count / result.totalTickets) * 100 : 0;
      
      if (hasComparison) {
        const lastWeekCount = comparison!.issueTypeBreakdownLastWeek[issueType] || 0;
        const change = count - lastWeekCount;
        
        ws.getCell(currentRow, 1).value = issueType;
        ws.getCell(currentRow, 2).value = lastWeekCount;
        ws.getCell(currentRow, 3).value = count;
        const changeCell = ws.getCell(currentRow, 4);
        changeCell.value = change > 0 ? `+${change}` : change;
        applyChangeColor(changeCell, change);
        ws.getCell(currentRow, 5).value = `${percentage.toFixed(1)}%`;
        ws.getCell(currentRow, 6).value = createVisualBar(percentage, 30);
      } else {
        ws.getCell(currentRow, 1).value = issueType;
        ws.getCell(currentRow, 2).value = count;
        ws.getCell(currentRow, 3).value = `${percentage.toFixed(1)}%`;
        ws.getCell(currentRow, 4).value = createVisualBar(percentage, 30);
      }
      currentRow++;
    }
    currentRow++;
  }
  
  // TOP 10 PRODUCT TYPES BY CATEGORY
  // Always show this section - it will show product types from tickets that have ProductType
  const topProductTypes = getTopProductTypesWithCategoryBreakdown(allTickets, 10);
  if (topProductTypes.length > 0) {
    currentRow++; // Add spacing
    
    ws.mergeCells(currentRow, 1, currentRow, 5);
    const prodSectionCell = ws.getCell(currentRow, 1);
    prodSectionCell.value = 'TOP 10 PRODUCT TYPES BY CATEGORY';
    prodSectionCell.fill = STYLES.sectionHeader.fill;
    prodSectionCell.font = STYLES.sectionHeader.font;
    currentRow++;
    
    const prodHeaders = ['Product Type', 'Total Tickets', '% of Total', 'Visual', 'Category Breakdown'];
    prodHeaders.forEach((header, idx) => {
      const cell = ws.getCell(currentRow, idx + 1);
      cell.value = header;
      cell.fill = STYLES.columnHeader.fill;
      cell.font = STYLES.columnHeader.font;
      cell.alignment = STYLES.columnHeader.alignment;
      cell.border = STYLES.columnHeader.border;
    });
    currentRow++;
    
    for (const product of topProductTypes) {
      // Show all categories for this product type (not just top 5)
      const categoryStr = product.categoryBreakdown
        .map(c => `${c.category} (${c.count})`)
        .join(', ');
      
      ws.getCell(currentRow, 1).value = product.productType;
      ws.getCell(currentRow, 2).value = product.totalCount;
      ws.getCell(currentRow, 3).value = `${product.percentage.toFixed(1)}%`;
      ws.getCell(currentRow, 4).value = createVisualBar(product.percentage, 20);
      ws.getCell(currentRow, 5).value = categoryStr;
      currentRow++;
    }
  }
}

/**
 * Create a category sheet with all tickets for that category
 */
function createCategorySheet(
  workbook: ExcelJS.Workbook,
  category: string,
  tickets: CategorizedTicket[]
): void {
  // Make sheet name safe for Excel
  let sheetName = category.replace(/[\/\\?*\[\]:]/g, ' ');
  if (sheetName.length > 31) {
    sheetName = sheetName.substring(0, 31);
  }
  
  const ws = workbook.addWorksheet(sheetName);
  
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
  
  // Set column widths
  ws.columns = [
    { width: 15 }, // Ticket ID
    { width: 30 }, // Experience Name
    { width: 15 }, // Experience ID
    { width: 40 }, // Ticket Name
    { width: 12 }, // Ticket Status
    { width: 20 }, // Ticket Assignee
    { width: 20 }, // Reviewer
    { width: 20 }, // Product Type
    { width: 20 }, // Template Name
    { width: 50 }, // Ticket Description
    { width: 40 }, // Backstage Experience Page
    { width: 50 }, // Public Preview Link
  ];
  
  // Header row
  const headerRow = ws.getRow(1);
  headers.forEach((header, idx) => {
    const cell = ws.getCell(1, idx + 1);
    cell.value = header;
    cell.fill = STYLES.columnHeader.fill;
    cell.font = STYLES.columnHeader.font;
    cell.alignment = STYLES.columnHeader.alignment;
    cell.border = STYLES.columnHeader.border;
  });
  
  // Data rows
  let currentRow = 2;
  for (const ticket of tickets) {
    ws.getCell(currentRow, 1).value = ticket['Ticket ID'] || '';
    ws.getCell(currentRow, 2).value = ticket['Experience name'] || '';
    ws.getCell(currentRow, 3).value = ticket['Experience ID'] || '';
    ws.getCell(currentRow, 4).value = ticket['Ticket name'] || '';
    ws.getCell(currentRow, 5).value = ticket['Ticket status'] || '';
    ws.getCell(currentRow, 6).value = ticket['Assignee'] || '';
    ws.getCell(currentRow, 7).value = ticket.Reviewer || '';
    ws.getCell(currentRow, 8).value = ticket.ProductType || '';
    ws.getCell(currentRow, 9).value = ticket.TemplateName || '';
    ws.getCell(currentRow, 10).value = ticket['Ticket description'] || '';
    ws.getCell(currentRow, 11).value = ticket['Backstage Experience page'] || '';
    ws.getCell(currentRow, 12).value = ticket.PublicPreviewLink || '';
    currentRow++;
  }
}

/**
 * Export analysis results to Excel workbook
 */
export async function exportToExcel(
  result: AnalysisResult,
  analysisType: AnalysisType,
  allTickets: CategorizedTicket[],
  includeComparison: boolean = false
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QC Ticket Analyzer';
  workbook.created = new Date();
  
  // Create dashboard sheet
  await createDashboardSheet(workbook, result, analysisType, allTickets, includeComparison);
  
  // Create category sheets (only for categories with tickets)
  for (const categoryResult of result.categoryResults) {
    if (categoryResult.count > 0 && categoryResult.category !== 'Uncategorized') {
      createCategorySheet(workbook, categoryResult.category, categoryResult.tickets);
    }
  }
  
  // Add Uncategorized sheet if there are uncategorized tickets
  const uncategorized = result.categoryResults.find(c => c.category === 'Uncategorized');
  if (uncategorized && uncategorized.count > 0) {
    createCategorySheet(workbook, 'Uncategorized', uncategorized.tickets);
  }
  
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generate filename for the export
 */
export function generateFilename(analysisType: AnalysisType, includeComparison: boolean = false): string {
  const config = ANALYSIS_CONFIGS[analysisType];
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const typeName = config.name.replace(/\s+/g, '_');
  const suffix = includeComparison ? '_Comparison' : '';
  return `QC_Ticket_Analysis_${typeName}${suffix}_${dateStr}.xlsx`;
}
