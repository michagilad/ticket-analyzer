import { jsPDF } from 'jspdf';
import { AnalysisResult, CategorizedTicket } from './types';
import { getStuckTicketAnalysis } from './analyzer';

// Color palette matching the Excel export style
const COLORS = {
  primary: '#1F4E79',
  secondary: '#2E75B6',
  accent: '#5B9BD5',
  success: '#70AD47',
  danger: '#C00000',
  warning: '#FFC000',
  text: '#333333',
  lightText: '#666666',
  background: '#F5F5F5',
  white: '#FFFFFF',
};

// Pie chart colors
const PIE_COLORS = [
  '#1F4E79', '#2E75B6', '#5B9BD5', '#9DC3E6', '#BDD7EE',
  '#70AD47', '#A9D18E', '#C5E0B4',
  '#FFC000', '#FFD966',
  '#C00000', '#FF5050',
  '#7030A0', '#9966CC',
];

interface DashboardOptions {
  title?: string;
  showComparison?: boolean;
  dateRange?: string;
  includeStuckTickets?: boolean;
  allTickets?: CategorizedTicket[];
}

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Draw a pie chart
function drawPieChart(
  pdf: jsPDF,
  centerX: number,
  centerY: number,
  radius: number,
  data: { label: string; value: number; color: string }[],
  showLegend: boolean = true,
  legendX?: number,
  legendY?: number
) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2; // Start from top

  data.forEach((item) => {
    if (item.value === 0) return;
    
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    
    // Draw pie slice using lines (jsPDF doesn't have native arc fill)
    const rgb = hexToRgb(item.color);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    
    // Create slice path
    const segments = Math.max(20, Math.ceil(sliceAngle * 20));
    const points: [number, number][] = [[centerX, centerY]];
    
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (sliceAngle * i) / segments;
      points.push([
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle)
      ]);
    }
    
    // Draw filled polygon
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.5);
    
    // Use triangle fan approach
    for (let i = 1; i < points.length - 1; i++) {
      const triangle = [points[0], points[i], points[i + 1]];
      pdf.triangle(
        triangle[0][0], triangle[0][1],
        triangle[1][0], triangle[1][1],
        triangle[2][0], triangle[2][1],
        'F'
      );
    }
    
    startAngle = endAngle;
  });

  // Draw white border circle segments
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(1);
  startAngle = -Math.PI / 2;
  data.forEach((item) => {
    if (item.value === 0) return;
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    
    // Draw line from center to edge
    pdf.line(
      centerX, centerY,
      centerX + radius * Math.cos(endAngle),
      centerY + radius * Math.sin(endAngle)
    );
    
    startAngle = endAngle;
  });

  // Draw legend if requested
  if (showLegend && legendX !== undefined && legendY !== undefined) {
    let ly = legendY;
    data.forEach((item) => {
      if (item.value === 0) return;
      const percentage = ((item.value / total) * 100).toFixed(1);
      
      const rgb = hexToRgb(item.color);
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.rect(legendX, ly - 2.5, 4, 4, 'F');
      
      pdf.setFontSize(7);
      pdf.setTextColor(COLORS.text);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${item.label}: ${item.value} (${percentage}%)`, legendX + 6, ly + 1);
      
      ly += 6;
    });
  }
}

// Draw a horizontal bar chart
function drawHorizontalBarChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  data: { label: string; value: number; color: string }[],
  maxValue?: number
) {
  const barHeight = 8;
  const gap = 4;
  const labelWidth = 70;
  const barWidth = width - labelWidth - 30;
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  data.forEach((item, i) => {
    const yPos = y + i * (barHeight + gap);
    
    // Label
    pdf.setFontSize(8);
    pdf.setTextColor(COLORS.text);
    pdf.setFont('helvetica', 'normal');
    const displayLabel = item.label.length > 28 ? item.label.substring(0, 25) + '...' : item.label;
    pdf.text(displayLabel, x, yPos + 6);
    
    // Background bar
    pdf.setFillColor(240, 240, 240);
    pdf.rect(x + labelWidth, yPos, barWidth, barHeight, 'F');
    
    // Value bar
    const rgb = hexToRgb(item.color);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    const valueWidth = (item.value / max) * barWidth;
    pdf.rect(x + labelWidth, yPos, valueWidth, barHeight, 'F');
    
    // Value text
    pdf.setFontSize(8);
    pdf.setTextColor(COLORS.lightText);
    pdf.text(item.value.toString(), x + labelWidth + barWidth + 3, yPos + 6);
  });
  
  return data.length * (barHeight + gap);
}

// Draw a donut chart (pie with hole in center)
function drawDonutChart(
  pdf: jsPDF,
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  data: { label: string; value: number; color: string }[],
  centerText?: string,
  centerSubtext?: string
) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2;

  // Draw outer pie first
  data.forEach((item) => {
    if (item.value === 0) return;
    
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const rgb = hexToRgb(item.color);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    
    const segments = Math.max(20, Math.ceil(sliceAngle * 20));
    
    for (let i = 0; i < segments; i++) {
      const angle1 = startAngle + (sliceAngle * i) / segments;
      const angle2 = startAngle + (sliceAngle * (i + 1)) / segments;
      
      // Draw trapezoid segment
      const points = [
        [centerX + innerRadius * Math.cos(angle1), centerY + innerRadius * Math.sin(angle1)],
        [centerX + outerRadius * Math.cos(angle1), centerY + outerRadius * Math.sin(angle1)],
        [centerX + outerRadius * Math.cos(angle2), centerY + outerRadius * Math.sin(angle2)],
        [centerX + innerRadius * Math.cos(angle2), centerY + innerRadius * Math.sin(angle2)],
      ];
      
      // Draw as two triangles
      pdf.triangle(points[0][0], points[0][1], points[1][0], points[1][1], points[2][0], points[2][1], 'F');
      pdf.triangle(points[0][0], points[0][1], points[2][0], points[2][1], points[3][0], points[3][1], 'F');
    }
    
    startAngle += sliceAngle;
  });

  // Draw center circle (white)
  pdf.setFillColor(255, 255, 255);
  pdf.circle(centerX, centerY, innerRadius, 'F');

  // Center text
  if (centerText) {
    pdf.setFontSize(14);
    pdf.setTextColor(COLORS.primary);
    pdf.setFont('helvetica', 'bold');
    pdf.text(centerText, centerX, centerY - 2, { align: 'center' });
  }
  if (centerSubtext) {
    pdf.setFontSize(7);
    pdf.setTextColor(COLORS.lightText);
    pdf.setFont('helvetica', 'normal');
    pdf.text(centerSubtext, centerX, centerY + 5, { align: 'center' });
  }
}

export async function generatePDFDashboard(
  result: AnalysisResult,
  options: DashboardOptions = {}
): Promise<Blob> {
  const {
    title = 'QC Ticket Analysis Dashboard',
    showComparison = false,
    dateRange = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    includeStuckTickets = false,
    allTickets = [],
  } = options;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  // ========== PAGE 1: Overview Dashboard ==========
  
  // Header
  pdf.setFillColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  pdf.rect(0, 0, pageWidth, 22, 'F');
  
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, pageWidth / 2, 11, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(dateRange, pageWidth / 2, 18, { align: 'center' });

  // ===== KEY METRICS SECTION =====
  let yPos = 30;
  
  pdf.setFontSize(11);
  pdf.setTextColor(COLORS.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.text('KEY METRICS', margin, yPos);
  yPos += 6;

  // Metric cards - 4 cards in a row
  const cardWidth = 58;
  const cardHeight = 28;
  const cardGap = 8;
  
  const metrics = [
    { 
      label: 'Total Tickets', 
      value: result.totalTickets.toString(),
      change: showComparison && result.comparison ? result.comparison.ticketChange : undefined
    },
    { 
      label: 'Products Reviewed', 
      value: result.totalProductsReviewed.toString(),
      change: undefined
    },
    { 
      label: 'Approved (No Issues)', 
      value: `${result.approvedExperiences}`,
      subtext: `${((result.approvedExperiences / result.totalProductsReviewed) * 100 || 0).toFixed(1)}%`,
      change: undefined
    },
    { 
      label: 'Tickets per Product', 
      value: result.ticketsPerExperience.toFixed(2),
      change: undefined
    },
  ];

  metrics.forEach((metric, i) => {
    const x = margin + i * (cardWidth + cardGap);
    
    // Card background
    pdf.setFillColor(248, 249, 250);
    pdf.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, 'F');
    
    // Top accent bar
    pdf.setFillColor(hexToRgb(COLORS.secondary).r, hexToRgb(COLORS.secondary).g, hexToRgb(COLORS.secondary).b);
    pdf.rect(x, yPos, cardWidth, 3, 'F');
    
    // Label
    pdf.setFontSize(8);
    pdf.setTextColor(COLORS.lightText);
    pdf.setFont('helvetica', 'normal');
    pdf.text(metric.label, x + cardWidth / 2, yPos + 10, { align: 'center' });
    
    // Value
    pdf.setFontSize(16);
    pdf.setTextColor(COLORS.primary);
    pdf.setFont('helvetica', 'bold');
    pdf.text(metric.value, x + cardWidth / 2, yPos + 20, { align: 'center' });
    
    // Subtext or change
    if (metric.subtext) {
      pdf.setFontSize(8);
      pdf.setTextColor(COLORS.success);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metric.subtext, x + cardWidth / 2, yPos + 25, { align: 'center' });
    } else if (metric.change !== undefined && metric.change !== 0) {
      const changeColor = metric.change > 0 ? COLORS.danger : COLORS.success;
      const changeText = metric.change > 0 ? `▲ +${metric.change}` : `▼ ${metric.change}`;
      pdf.setFontSize(8);
      pdf.setTextColor(changeColor);
      pdf.text(changeText, x + cardWidth / 2, yPos + 25, { align: 'center' });
    }
  });

  yPos += cardHeight + 12;

  // ===== CHARTS ROW =====
  const chartRowY = yPos;
  const chartSectionWidth = (pageWidth - 2 * margin - 20) / 3;

  // ----- DEV vs FACTORY Donut Chart -----
  pdf.setFontSize(10);
  pdf.setTextColor(COLORS.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DEV vs FACTORY', margin, chartRowY);

  const devFactoryData = [
    { label: 'DEV', value: result.devCount, color: COLORS.secondary },
    { label: 'FACTORY', value: result.factoryCount, color: COLORS.success },
  ].filter(d => d.value > 0);

  const donutCenterX = margin + chartSectionWidth / 2;
  const donutCenterY = chartRowY + 35;
  
  drawDonutChart(
    pdf,
    donutCenterX,
    donutCenterY,
    22,
    12,
    devFactoryData,
    result.totalTickets.toString(),
    'Total'
  );

  // Legend for Dev/Factory
  let legendY = chartRowY + 60;
  devFactoryData.forEach((item) => {
    const percentage = ((item.value / result.totalTickets) * 100).toFixed(1);
    const rgb = hexToRgb(item.color);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    pdf.rect(margin, legendY, 4, 4, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(COLORS.text);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${item.label}: ${item.value} (${percentage}%)`, margin + 6, legendY + 3);
    legendY += 7;
  });

  // ----- ISSUE TYPE Pie Chart -----
  const issueTypeX = margin + chartSectionWidth + 10;
  pdf.setFontSize(10);
  pdf.setTextColor(COLORS.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ISSUE TYPE BREAKDOWN', issueTypeX, chartRowY);

  const categoryData = Object.entries(result.categoryBreakdown)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count], i) => ({
      label: type,
      value: count,
      color: PIE_COLORS[i % PIE_COLORS.length]
    }));

  const pieX = issueTypeX + chartSectionWidth / 2;
  const pieY = chartRowY + 35;
  
  drawPieChart(pdf, pieX, pieY, 22, categoryData, true, issueTypeX, chartRowY + 60);

  // ----- TOP 10 CATEGORIES Bar Chart -----
  const topCatX = margin + 2 * chartSectionWidth + 20;
  pdf.setFontSize(10);
  pdf.setTextColor(COLORS.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOP 10 CATEGORIES', topCatX, chartRowY);

  const topIssues = [...result.issueResults]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((cat, i) => ({
      label: cat.issue,
      value: cat.count,
      color: PIE_COLORS[i % PIE_COLORS.length]
    }));

  drawHorizontalBarChart(pdf, topCatX, chartRowY + 6, chartSectionWidth, topIssues);

  // ========== PAGE 2: Detailed Category Table ==========
  pdf.addPage();

  // Header
  pdf.setFillColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  pdf.rect(0, 0, pageWidth, 18, 'F');
  
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Category Breakdown Details', pageWidth / 2, 12, { align: 'center' });

  yPos = 26;

  // Table
  pdf.setFontSize(10);
  pdf.setTextColor(COLORS.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ALL CATEGORIES', margin, yPos);
  yPos += 6;

  // Table header
  const colWidths = showComparison ? [75, 22, 22, 30, 35, 22, 25] : [85, 25, 25, 35, 40];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  
  pdf.setFillColor(hexToRgb(COLORS.secondary).r, hexToRgb(COLORS.secondary).g, hexToRgb(COLORS.secondary).b);
  pdf.rect(margin, yPos, tableWidth, 7, 'F');
  
  let colX = margin + 2;
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  
  const headers = showComparison 
    ? ['Category', 'Count', '%', 'Dev/Factory', 'Issue Type', 'Past', 'Change']
    : ['Category', 'Count', '%', 'Dev/Factory', 'Issue Type'];
  
  headers.forEach((header, i) => {
    pdf.text(header, colX, yPos + 5);
    colX += colWidths[i];
  });
  
  yPos += 8;

  // Table rows
  const sortedIssues = [...result.issueResults]
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);
  
  const rowHeight = 6;
  const maxRowsPerPage = 28;
  let rowCount = 0;

  for (const cat of sortedIssues) {
    if (rowCount >= maxRowsPerPage) {
      pdf.addPage();
      
      // Header on new page
      pdf.setFillColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
      pdf.rect(0, 0, pageWidth, 18, 'F');
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Category Breakdown Details (continued)', pageWidth / 2, 12, { align: 'center' });
      
      yPos = 26;
      
      // Repeat table header
      pdf.setFillColor(hexToRgb(COLORS.secondary).r, hexToRgb(COLORS.secondary).g, hexToRgb(COLORS.secondary).b);
      pdf.rect(margin, yPos, tableWidth, 7, 'F');
      
      colX = margin + 2;
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      headers.forEach((header, i) => {
        pdf.text(header, colX, yPos + 5);
        colX += colWidths[i];
      });
      yPos += 8;
      rowCount = 0;
    }

    // Alternate row colors
    if (rowCount % 2 === 0) {
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, yPos, tableWidth, rowHeight, 'F');
    }

    colX = margin + 2;
    pdf.setFontSize(7);
    pdf.setTextColor(COLORS.text);
    pdf.setFont('helvetica', 'normal');
    
    // Category name (truncate if needed)
    const maxCatLen = showComparison ? 35 : 42;
    const displayName = cat.issue.length > maxCatLen ? cat.issue.substring(0, maxCatLen - 3) + '...' : cat.issue;
    pdf.text(displayName, colX, yPos + 4);
    colX += colWidths[0];
    
    // Count
    pdf.text(cat.count.toString(), colX, yPos + 4);
    colX += colWidths[1];
    
    // Percentage
    pdf.text(`${cat.percentage.toFixed(1)}%`, colX, yPos + 4);
    colX += colWidths[2];
    
    // Dev/Factory
    if (cat.metadata.devFactory) {
      const dfColor = cat.metadata.devFactory === 'DEV' ? COLORS.secondary : COLORS.success;
      pdf.setTextColor(dfColor);
    } else {
      pdf.setTextColor(COLORS.lightText);
    }
    pdf.text(cat.metadata.devFactory || '-', colX, yPos + 4);
    colX += colWidths[3];
    
    // Issue Type
    pdf.setTextColor(COLORS.text);
    pdf.text(cat.metadata.category || '-', colX, yPos + 4);
    
    // Comparison columns
    if (showComparison && result.comparison) {
      colX += colWidths[4];
      const comparison = result.comparison.issueComparisons.find(c => c.issue === cat.issue);
      
      // Past value
      pdf.text(comparison?.lastWeek.toString() || '0', colX, yPos + 4);
      colX += colWidths[5];
      
      // Change
      if (comparison && comparison.change !== 0) {
        const changeColor = comparison.change > 0 ? COLORS.danger : COLORS.success;
        pdf.setTextColor(changeColor);
        const changeText = comparison.change > 0 ? `+${comparison.change}` : comparison.change.toString();
        pdf.text(changeText, colX, yPos + 4);
      } else {
        pdf.setTextColor(COLORS.lightText);
        pdf.text('-', colX, yPos + 4);
      }
    }

    yPos += rowHeight;
    rowCount++;
  }

  // ========== STUCK TICKETS ANALYSIS (Optional) ==========
  if (includeStuckTickets && allTickets.length > 0) {
    const stuckAnalysis = getStuckTicketAnalysis(allTickets, 5);
    
    if (stuckAnalysis.totalStuckTickets > 0) {
      // Check if we need a new page
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        
        // Header on new page
        pdf.setFillColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
        pdf.rect(0, 0, pageWidth, 18, 'F');
        pdf.setFontSize(14);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Stuck Tickets Analysis', pageWidth / 2, 12, { align: 'center' });
        
        yPos = 26;
      } else {
        yPos += 10;
      }
      
      // Section title
      pdf.setFontSize(10);
      pdf.setTextColor(COLORS.primary);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`STUCK TICKETS ANALYSIS (${stuckAnalysis.totalStuckTickets} tickets - ${stuckAnalysis.stuckPercentage.toFixed(1)}% of total)`, margin, yPos);
      yPos += 6;
      
      // Table header for stuck tickets
      const stuckColWidths = [100, 30, 30, 50];
      const stuckTableWidth = stuckColWidths.reduce((a, b) => a + b, 0);
      
      pdf.setFillColor(hexToRgb(COLORS.secondary).r, hexToRgb(COLORS.secondary).g, hexToRgb(COLORS.secondary).b);
      pdf.rect(margin, yPos, stuckTableWidth, 7, 'F');
      
      let stuckColX = margin + 2;
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      
      const stuckHeaders = ['Issue Category', 'Count', '% of Stuck', 'Visual'];
      stuckHeaders.forEach((header, i) => {
        pdf.text(header, stuckColX, yPos + 5);
        stuckColX += stuckColWidths[i];
      });
      
      yPos += 8;
      
      // Stuck tickets data rows
      for (let i = 0; i < stuckAnalysis.topCategories.length; i++) {
        const cat = stuckAnalysis.topCategories[i];
        
        // Alternate row colors
        if (i % 2 === 0) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(margin, yPos, stuckTableWidth, rowHeight, 'F');
        }
        
        stuckColX = margin + 2;
        pdf.setFontSize(7);
        pdf.setTextColor(COLORS.text);
        pdf.setFont('helvetica', 'normal');
        
        // Category name (truncate if needed)
        const displayCat = cat.category.length > 45 ? cat.category.substring(0, 42) + '...' : cat.category;
        pdf.text(displayCat, stuckColX, yPos + 4);
        stuckColX += stuckColWidths[0];
        
        // Count
        pdf.text(cat.count.toString(), stuckColX, yPos + 4);
        stuckColX += stuckColWidths[1];
        
        // Percentage
        pdf.text(`${cat.percentage.toFixed(1)}%`, stuckColX, yPos + 4);
        stuckColX += stuckColWidths[2];
        
        // Visual bar
        const barWidth = (cat.percentage / 100) * 40;
        pdf.setFillColor(hexToRgb(COLORS.warning).r, hexToRgb(COLORS.warning).g, hexToRgb(COLORS.warning).b);
        pdf.rect(stuckColX, yPos + 1, barWidth, 4, 'F');
        
        yPos += rowHeight;
      }
    }
  }

  // Footer
  pdf.setFontSize(7);
  pdf.setTextColor(COLORS.lightText);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

  return pdf.output('blob');
}

export function downloadPDFDashboard(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
