import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import {
  AnalysisResult,
  AnalysisType,
  ANALYSIS_CONFIGS,
  CategorizedTicket
} from './types';
import { getTopProductTypes, getTopProductTypeForCategory, getTopProductTypesWithCategoryBreakdown, getStuckTicketAnalysis } from './analyzer';
import { ISSUE_COMMENTS } from './issueComments';

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
  includeComparison: boolean = false,
  includeStuckTickets: boolean = false,
  issueComments: Record<string, string> = {}
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
        showPercentOfTotal: false,
      },
      {
        metric: 'Approved Experiences (No Issues)',
        past: comparison.lastWeekApprovedExperiences,
        pastTotal: comparison.lastWeekProductsReviewed,
        current: result.approvedExperiences,
        currentTotal: result.totalProductsReviewed,
        invertColors: true, // More approved is good
        showPercentOfTotal: true,
      },
      {
        metric: 'Products with Tickets',
        past: comparison.lastWeekProductsReviewed - comparison.lastWeekApprovedExperiences,
        pastTotal: comparison.lastWeekProductsReviewed,
        current: result.productsWithTickets,
        currentTotal: result.totalProductsReviewed,
        showPercentOfTotal: true,
      },
      {
        metric: 'Total Tickets',
        past: comparison.lastWeekTotalTickets,
        current: result.totalTickets,
        showPercentOfTotal: false,
      },
      {
        metric: 'Tickets per Experience',
        past: parseFloat((comparison.lastWeekTotalTickets / Math.max(comparison.lastWeekProductsReviewed - comparison.lastWeekApprovedExperiences, 1)).toFixed(2)),
        current: result.ticketsPerExperience,
        isDecimal: true,
        showPercentOfTotal: false,
      },
      {
        metric: 'Unique Issues',
        past: comparison.issueComparisons.filter(c => c.lastWeek > 0).length,
        current: result.issueResults.filter(c => c.count > 0 && c.issue !== 'Uncategorized').length,
        showPercentOfTotal: false,
      },
      {
        metric: 'Uncategorized',
        past: comparison.issueComparisons.find(c => c.issue === 'Uncategorized')?.lastWeek || 0,
        current: result.uncategorizedCount,
        showPercentOfTotal: false,
      },
    ];
    
    for (const data of metricsData) {
      const change = data.current - data.past;
      
      // Calculate percentage change
      let changePercent: string;
      if (data.showPercentOfTotal && data.pastTotal && data.currentTotal) {
        // For metrics with "% of Total", show percentage POINT change
        const pastPercent = data.pastTotal > 0 ? (data.past / data.pastTotal) * 100 : 0;
        const currentPercent = data.currentTotal > 0 ? (data.current / data.currentTotal) * 100 : 0;
        const percentPointChange = currentPercent - pastPercent;
        changePercent = `${percentPointChange > 0 ? '+' : ''}${percentPointChange.toFixed(1)}`;
      } else {
        // For other metrics, show regular percentage change
        changePercent = data.past > 0 
          ? ((change / data.past) * 100).toFixed(1) 
          : (data.current > 0 ? '100.0' : '0.0');
        changePercent = `${parseFloat(changePercent) > 0 ? '+' : ''}${changePercent}`;
      }
      
      const trend = change < 0 ? '↓' : change > 0 ? '↑' : '→';
      
      ws.getCell(currentRow, 1).value = data.metric;
      
      // Format Past column with percentage if applicable
      if (data.showPercentOfTotal && data.pastTotal) {
        const pastPercent = data.pastTotal > 0 ? ((data.past / data.pastTotal) * 100).toFixed(1) : '0.0';
        ws.getCell(currentRow, 2).value = `${data.past} (${pastPercent}%)`;
      } else {
        ws.getCell(currentRow, 2).value = data.past;
      }
      
      // Format Current column with percentage if applicable
      if (data.showPercentOfTotal && data.currentTotal) {
        const currentPercent = data.currentTotal > 0 ? ((data.current / data.currentTotal) * 100).toFixed(1) : '0.0';
        ws.getCell(currentRow, 3).value = `${data.current} (${currentPercent}%)`;
      } else {
        ws.getCell(currentRow, 3).value = data.current;
      }
      
      const changeCell = ws.getCell(currentRow, 4);
      changeCell.value = change;
      applyChangeColor(changeCell, change, data.invertColors);
      
      const percentCell = ws.getCell(currentRow, 5);
      percentCell.value = `${changePercent}%`;
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
      ['Products with Tickets', `${result.productsWithTickets} (${result.totalProductsReviewed > 0 ? ((result.productsWithTickets / result.totalProductsReviewed) * 100).toFixed(1) : 0}%)`],
      ['Tickets per Experience', result.ticketsPerExperience],
      ['Total Tickets', result.totalTickets],
      ['Categorized Tickets', result.categorizedCount],
      ['Unique Issues', result.issueResults.filter(c => c.count > 0 && c.issue !== 'Uncategorized').length],
      ['Uncategorized', `${result.uncategorizedCount} (${result.totalTickets > 0 ? ((result.uncategorizedCount / result.totalTickets) * 100).toFixed(1) : 0}%)`],
    ];
    
    for (const [metric, value] of simpleMetrics) {
      ws.getCell(currentRow, 1).value = metric;
      ws.getCell(currentRow, 2).value = value;
      currentRow++;
    }
    currentRow++;
  }
  
  // TOP 5 PRODUCT TYPES (only if config allows it)
  if ((config.includeTopProducts !== false) && allTickets.some(t => t.ProductType && t.ProductType.trim() !== '')) {
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
  // Determine if we should include Top Product Type column
  const includeTopProductCol = config.includeTopProducts !== false;
  
  let categoryColCount: number;
  if (hasComparison) {
    if (config.includeDevFactory && config.includeCategory) {
      categoryColCount = includeTopProductCol ? 9 : 8;
    } else {
      categoryColCount = includeTopProductCol ? 7 : 6;
    }
  } else {
    if (config.includeDevFactory && config.includeCategory) {
      categoryColCount = includeTopProductCol ? 7 : 6;
    } else {
      categoryColCount = includeTopProductCol ? 5 : 4;
    }
  }
  
  ws.mergeCells(currentRow, 1, currentRow, categoryColCount);
  const catSectionCell = ws.getCell(currentRow, 1);
  catSectionCell.value = hasComparison ? 'ISSUE BREAKDOWN - COMPARISON' : 'ISSUE BREAKDOWN';
  catSectionCell.fill = STYLES.sectionHeader.fill;
  catSectionCell.font = STYLES.sectionHeader.font;
  currentRow++;
  
  // Category headers
  let catHeaders: string[];
  if (hasComparison) {
    if (config.includeDevFactory && config.includeCategory) {
      catHeaders = includeTopProductCol
        ? ['Issue', 'Past', 'Current', 'Change', '% Change', 'Trend', 'Dev/Factory', 'Category', 'Top Product Type']
        : ['Issue', 'Past', 'Current', 'Change', '% Change', 'Trend', 'Dev/Factory', 'Category'];
    } else {
      catHeaders = includeTopProductCol
        ? ['Issue', 'Past', 'Current', 'Change', '% Change', 'Trend', 'Top Product Type']
        : ['Issue', 'Past', 'Current', 'Change', '% Change', 'Trend'];
    }
  } else {
    if (config.includeDevFactory && config.includeCategory) {
      catHeaders = includeTopProductCol
        ? ['Issue', 'Count', 'Percentage', 'Visual', 'Dev/Factory', 'Category', 'Top Product Type']
        : ['Issue', 'Count', 'Percentage', 'Visual', 'Dev/Factory', 'Category'];
    } else {
      catHeaders = includeTopProductCol
        ? ['Issue', 'Count', 'Percentage', 'Visual', 'Top Product Type']
        : ['Issue', 'Count', 'Percentage', 'Visual'];
    }
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
  for (const cat of result.issueResults) {
    const topProduct = getTopProductTypeForCategory(cat.tickets);
    
    if (hasComparison) {
      const catComp = comparison!.issueComparisons.find(c => c.issue === cat.issue);
      const lastWeek = catComp?.lastWeek || 0;
      const change = catComp?.change || 0;
      const changePercent = catComp?.changePercent || 0;
      const trend = change < 0 ? '↓' : change > 0 ? '↑' : '→';
      
      const issueCell = ws.getCell(currentRow, 1);
      issueCell.value = cat.issue;
      
      // Add comment from issueComments if available
      if (issueComments[cat.issue]) {
        issueCell.note = issueComments[cat.issue];
      }
      
      ws.getCell(currentRow, 2).value = lastWeek;
      ws.getCell(currentRow, 3).value = cat.count;
      
      const changeCell = ws.getCell(currentRow, 4);
      changeCell.value = change > 0 ? `+${change}` : change;
      applyChangeColor(changeCell, change);
      
      const percentCell = ws.getCell(currentRow, 5);
      percentCell.value = `${changePercent > 0 ? '+' : ''}${changePercent}%`;
      applyChangeColor(percentCell, change);
      
      ws.getCell(currentRow, 6).value = trend;
      
      if (config.includeDevFactory && config.includeCategory) {
        ws.getCell(currentRow, 7).value = cat.metadata.devFactory || '';
        ws.getCell(currentRow, 8).value = cat.metadata.category || '';
        if (includeTopProductCol) {
          ws.getCell(currentRow, 9).value = topProduct;
        }
      } else if (includeTopProductCol) {
        ws.getCell(currentRow, 7).value = topProduct;
      }
    } else {
      const issueCell = ws.getCell(currentRow, 1);
      issueCell.value = cat.issue;
      
      // Add comment from issueComments if available
      if (issueComments[cat.issue]) {
        issueCell.note = issueComments[cat.issue];
      }
      
      ws.getCell(currentRow, 2).value = cat.count;
      ws.getCell(currentRow, 3).value = `${cat.percentage.toFixed(1)}%`;
      ws.getCell(currentRow, 4).value = createVisualBar(cat.percentage);
      
      if (config.includeDevFactory && config.includeCategory) {
        ws.getCell(currentRow, 5).value = cat.metadata.devFactory || '';
        ws.getCell(currentRow, 6).value = cat.metadata.category || '';
        if (includeTopProductCol) {
          ws.getCell(currentRow, 7).value = topProduct;
        }
      } else if (includeTopProductCol) {
        ws.getCell(currentRow, 5).value = topProduct;
      }
    }
    currentRow++;
  }
  currentRow++;
  
  // DEV VS FACTORY BREAKDOWN
  if (config.includeDevFactory) {
    const devColCount = hasComparison ? 7 : 4;
    ws.mergeCells(currentRow, 1, currentRow, devColCount);
    const devSectionCell = ws.getCell(currentRow, 1);
    devSectionCell.value = 'DEV VS FACTORY BREAKDOWN';
    devSectionCell.fill = STYLES.sectionHeader.fill;
    devSectionCell.font = STYLES.sectionHeader.font;
    currentRow++;
    
    const devHeaders = hasComparison 
      ? ['Type', 'Past', 'Current', 'Change', 'Percentage', '% Change', 'Visual']
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
      
      // Calculate rates (percentage of total tickets)
      const lastWeekTotal = comparison!.devCountLastWeek + comparison!.factoryCountLastWeek;
      const lastWeekDevRate = lastWeekTotal > 0 ? (comparison!.devCountLastWeek / lastWeekTotal) * 100 : 0;
      const lastWeekFactoryRate = lastWeekTotal > 0 ? (comparison!.factoryCountLastWeek / lastWeekTotal) * 100 : 0;
      
      const currentTotal = result.devCount + result.factoryCount;
      const currentDevRate = currentTotal > 0 ? (result.devCount / currentTotal) * 100 : 0;
      const currentFactoryRate = currentTotal > 0 ? (result.factoryCount / currentTotal) * 100 : 0;
      
      // Calculate percentage point changes
      const devRateChange = currentDevRate - lastWeekDevRate;
      const factoryRateChange = currentFactoryRate - lastWeekFactoryRate;
      
      // DEV row
      ws.getCell(currentRow, 1).value = 'DEV';
      ws.getCell(currentRow, 2).value = comparison!.devCountLastWeek;
      ws.getCell(currentRow, 3).value = result.devCount;
      const devChangeCell = ws.getCell(currentRow, 4);
      devChangeCell.value = devChange > 0 ? `+${devChange}` : devChange;
      applyChangeColor(devChangeCell, devChange);
      ws.getCell(currentRow, 5).value = `${currentDevRate.toFixed(1)}%`;
      const devRateChangeCell = ws.getCell(currentRow, 6);
      devRateChangeCell.value = `${devRateChange > 0 ? '+' : ''}${devRateChange.toFixed(1)}%`;
      applyChangeColor(devRateChangeCell, devRateChange);
      ws.getCell(currentRow, 7).value = createVisualBar(currentDevRate, 30);
      currentRow++;
      
      // FACTORY row
      ws.getCell(currentRow, 1).value = 'FACTORY';
      ws.getCell(currentRow, 2).value = comparison!.factoryCountLastWeek;
      ws.getCell(currentRow, 3).value = result.factoryCount;
      const factoryChangeCell = ws.getCell(currentRow, 4);
      factoryChangeCell.value = factoryChange > 0 ? `+${factoryChange}` : factoryChange;
      applyChangeColor(factoryChangeCell, factoryChange);
      ws.getCell(currentRow, 5).value = `${currentFactoryRate.toFixed(1)}%`;
      const factoryRateChangeCell = ws.getCell(currentRow, 6);
      factoryRateChangeCell.value = `${factoryRateChange > 0 ? '+' : ''}${factoryRateChange.toFixed(1)}%`;
      applyChangeColor(factoryRateChangeCell, factoryRateChange);
      ws.getCell(currentRow, 7).value = createVisualBar(currentFactoryRate, 30);
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
  
  // CATEGORY BREAKDOWN
  if (config.includeCategory && Object.keys(result.categoryBreakdown).length > 0) {
    const issueColCount = hasComparison ? 7 : 4;
    ws.mergeCells(currentRow, 1, currentRow, issueColCount);
    const issueSectionCell = ws.getCell(currentRow, 1);
    issueSectionCell.value = 'CATEGORY BREAKDOWN';
    issueSectionCell.fill = STYLES.sectionHeader.fill;
    issueSectionCell.font = STYLES.sectionHeader.font;
    currentRow++;
    
    const issueHeaders = hasComparison 
      ? ['Category', 'Past', 'Current', 'Change', 'Percentage', '% Change', 'Visual']
      : ['Category', 'Count', 'Percentage', 'Visual'];
    
    issueHeaders.forEach((header, idx) => {
      const cell = ws.getCell(currentRow, idx + 1);
      cell.value = header;
      cell.fill = STYLES.columnHeader.fill;
      cell.font = STYLES.columnHeader.font;
      cell.alignment = STYLES.columnHeader.alignment;
      cell.border = STYLES.columnHeader.border;
    });
    currentRow++;
    
    const categories = Object.entries(result.categoryBreakdown).sort((a, b) => b[1] - a[1]);

    for (const [category, count] of categories) {
      const percentage = result.totalTickets > 0 ? (count / result.totalTickets) * 100 : 0;
      
      if (hasComparison) {
        const lastWeekCount = comparison!.categoryBreakdownLastWeek[category] || 0;
        const change = count - lastWeekCount;
        
        // Calculate rates (percentage of total tickets)
        const lastWeekRate = comparison!.lastWeekTotalTickets > 0 
          ? (lastWeekCount / comparison!.lastWeekTotalTickets) * 100 
          : 0;
        const currentRate = result.totalTickets > 0 
          ? (count / result.totalTickets) * 100 
          : 0;
        
        // Calculate percentage point change
        const rateChange = currentRate - lastWeekRate;
        
        ws.getCell(currentRow, 1).value = category;
        ws.getCell(currentRow, 2).value = lastWeekCount;
        ws.getCell(currentRow, 3).value = count;
        const changeCell = ws.getCell(currentRow, 4);
        changeCell.value = change > 0 ? `+${change}` : change;
        applyChangeColor(changeCell, change);
        ws.getCell(currentRow, 5).value = `${currentRate.toFixed(1)}%`;
        const rateChangeCell = ws.getCell(currentRow, 6);
        rateChangeCell.value = `${rateChange > 0 ? '+' : ''}${rateChange.toFixed(1)}%`;
        applyChangeColor(rateChangeCell, rateChange);
        ws.getCell(currentRow, 7).value = createVisualBar(currentRate, 30);
      } else {
        ws.getCell(currentRow, 1).value = category;
        ws.getCell(currentRow, 2).value = count;
        ws.getCell(currentRow, 3).value = `${percentage.toFixed(1)}%`;
        ws.getCell(currentRow, 4).value = createVisualBar(percentage, 30);
      }
      currentRow++;
    }
    currentRow++;
  }
  
  // TOP 10 PRODUCT TYPES BY ISSUE
  // Always show this section - it will show product types from tickets that have ProductType
  const topProductTypes = getTopProductTypesWithCategoryBreakdown(allTickets, 10);
  if (topProductTypes.length > 0) {
    currentRow++; // Add spacing
    
    ws.mergeCells(currentRow, 1, currentRow, 5);
    const prodSectionCell = ws.getCell(currentRow, 1);
    prodSectionCell.value = 'TOP 10 PRODUCT TYPES BY ISSUE';
    prodSectionCell.fill = STYLES.sectionHeader.fill;
    prodSectionCell.font = STYLES.sectionHeader.font;
    currentRow++;
    
    const prodHeaders = ['Product Type', 'Total Tickets', '% of Total', 'Visual', 'Issue Breakdown'];
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
  
  // STUCK TICKETS ANALYSIS
  if (includeStuckTickets) {
    const stuckAnalysis = getStuckTicketAnalysis(allTickets, 5);
    
    if (stuckAnalysis.totalStuckTickets > 0) {
      currentRow++; // Add spacing
      
      ws.mergeCells(currentRow, 1, currentRow, 4);
      const stuckSectionCell = ws.getCell(currentRow, 1);
      stuckSectionCell.value = `STUCK TICKETS ANALYSIS (${stuckAnalysis.totalStuckTickets} tickets - ${stuckAnalysis.stuckPercentage.toFixed(1)}% of total)`;
      stuckSectionCell.fill = STYLES.sectionHeader.fill;
      stuckSectionCell.font = STYLES.sectionHeader.font;
      currentRow++;
      
      // Column headers for stuck tickets
      const stuckHeaders = ['Issue Category', 'Count', '% of Stuck', 'Visual'];
      stuckHeaders.forEach((header, idx) => {
        const cell = ws.getCell(currentRow, idx + 1);
        cell.value = header;
        cell.fill = STYLES.columnHeader.fill;
        cell.font = STYLES.columnHeader.font;
        cell.alignment = STYLES.columnHeader.alignment;
        cell.border = STYLES.columnHeader.border;
      });
      currentRow++;
      
      // Top 5 categories for stuck tickets
      for (const cat of stuckAnalysis.topCategories) {
        ws.getCell(currentRow, 1).value = cat.category;
        ws.getCell(currentRow, 2).value = cat.count;
        ws.getCell(currentRow, 3).value = `${cat.percentage.toFixed(1)}%`;
        ws.getCell(currentRow, 4).value = createVisualBar(cat.percentage, 20);
        currentRow++;
      }
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
    'Instance ID',
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
    { width: 20 }, // Instance ID
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
    ws.getCell(currentRow, 4).value = ticket['Instance ID'] || '';
    ws.getCell(currentRow, 5).value = ticket['Ticket name'] || '';
    ws.getCell(currentRow, 6).value = ticket['Ticket status'] || '';
    ws.getCell(currentRow, 7).value = ticket['Assignee'] || '';
    ws.getCell(currentRow, 8).value = ticket.Reviewer || '';
    ws.getCell(currentRow, 9).value = ticket.ProductType || '';
    ws.getCell(currentRow, 10).value = ticket.TemplateName || '';
    ws.getCell(currentRow, 11).value = ticket['Ticket description'] || '';
    ws.getCell(currentRow, 12).value = ticket['Backstage Experience page'] || '';
    ws.getCell(currentRow, 13).value = ticket.PublicPreviewLink || '';
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
  includeComparison: boolean = false,
  includeStuckTickets: boolean = false,
  storedIssues?: any[]
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QC Ticket Analyzer';
  workbook.created = new Date();
  
  // Build issue comments from stored issues or fetch them
  let issueComments: Record<string, string> = { ...ISSUE_COMMENTS };
  
  if (storedIssues) {
    // Use passed storedIssues
    console.log('[Excel Export] Using passed stored issues:', storedIssues.length);
    storedIssues.forEach((issue: any) => {
      if (issue.comment) {
        issueComments[issue.name] = issue.comment;
      }
    });
    console.log('[Excel Export] Issue comments loaded:', Object.keys(issueComments).length);
  } else {
    // Try to fetch if not provided
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        const fetchedIssues = data.issues || data.categories || [];
        fetchedIssues.forEach((issue: any) => {
          if (issue.comment) {
            issueComments[issue.name] = issue.comment;
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch issue comments, using defaults:', err);
    }
  }
  
  // Create dashboard sheet
  await createDashboardSheet(workbook, result, analysisType, allTickets, includeComparison, includeStuckTickets, issueComments);
  
  // Create category sheets (only for categories with tickets)
  for (const issueResult of result.issueResults) {
    if (issueResult.count > 0 && issueResult.issue !== 'Uncategorized') {
      createCategorySheet(workbook, issueResult.issue, issueResult.tickets);
    }
  }
  
  // Add Uncategorized sheet if there are uncategorized tickets
  const uncategorized = result.issueResults.find(c => c.issue === 'Uncategorized');
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
