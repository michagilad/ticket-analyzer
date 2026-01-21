import { 
  Ticket, 
  CategorizedTicket, 
  ExperienceMapping,
  ALL_CATEGORIES,
  CATEGORY_METADATA,
  CategoryMetadata
} from './types';

/**
 * GOLDEN RULE: If ticket name exactly matches a category name (case-insensitive), 
 * use that category immediately.
 */
function checkExactMatch(ticketName: string): string | null {
  const normalizedName = ticketName.trim().toLowerCase();
  
  for (const category of ALL_CATEGORIES) {
    if (category.toLowerCase() === normalizedName) {
      return category;
    }
  }
  return null;
}

/**
 * Check for multi-category tickets (semicolon-separated)
 */
function parseMultipleCategories(ticketName: string): string[] {
  if (!ticketName.includes(';')) {
    return [];
  }
  
  const parts = ticketName.split(';').map(p => p.trim());
  const validCategories: string[] = [];
  
  for (const part of parts) {
    const exactMatch = checkExactMatch(part);
    if (exactMatch) {
      validCategories.push(exactMatch);
    }
  }
  
  return validCategories;
}

/**
 * Priority 1: Visual/Background Issues (CHECK BEFORE dimensions)
 */
function checkVisualBackgroundIssues(combinedText: string): string | null {
  const text = combinedText.toLowerCase();
  
  // BBOX issues
  if (text.includes('white obstruction') || text.includes('white blur') || 
      text.includes('bbox') || text.includes('bounding box')) {
    return 'BBOX issue';
  }
  
  // Visible stage/equipment
  if (text.includes('plate is visible') || text.includes('visible plate') ||
      text.includes('visible stage') || text.includes('equipment visible') ||
      text.includes('stage visible')) {
    return 'Visible stage / equipment';
  }
  
  // Visual glitches
  if (text.includes('glitchy background') || text.includes('masking issue') ||
      text.includes('visual glitch') || text.includes('glitch') ||
      text.includes('masking background') || text.includes('distortion') ||
      (text.includes('distorted') && text.includes('spin'))) {
    return 'Visual glitches';
  }
  
  // Color correction - white product
  if ((text.includes('blend') && text.includes('background')) ||
      text.includes('barely visible') || text.includes('hard to see') ||
      text.includes('white product issue') ||
      text.includes('product blends with background')) {
    return 'Color correction - white product';
  }
  
  // Color correction - other
  if (text.includes('grading') || text.includes('too dark') || 
      text.includes('too bright') || text.includes('exposure') ||
      text.includes('cc needed')) {
    return 'Color correction - other';
  }
  
  return null;
}

/**
 * Check for label-related issues
 */
function checkLabelIssues(combinedText: string, ticketName: string): string | null {
  const text = combinedText.toLowerCase();
  const name = ticketName.toLowerCase();
  
  // Bad label - framing
  if ((text.includes('label') && (text.includes('crop') || text.includes('zoom') || 
      text.includes('framing') || text.includes('not fully visible')))) {
    return 'Bad label - framing';
  }
  
  // Bad label - set up
  if ((text.includes('label') && (text.includes('angle') || text.includes('position') || 
      text.includes('orientation') || text.includes('set up') || text.includes('setup')))) {
    return 'Bad label - set up';
  }
  
  // Generic label issue -> Bad label artifact
  if (name.includes('label issue') || name.includes('label video issue')) {
    return 'Bad label artifact';
  }
  
  return null;
}

/**
 * Check for close-up sequence issues
 */
function checkCloseUpIssues(combinedText: string, ticketName: string): string | null {
  const text = combinedText.toLowerCase();
  const name = ticketName.toLowerCase();
  
  if (name.includes('cu sequence issue') || name.includes('close up sequence')) {
    if (text.includes('framing')) {
      return 'Bad close up sequence - bad framing';
    }
    if (text.includes('repetitive') || text.includes('repetition')) {
      return 'Bad close up sequence - repetitive edits';
    }
    return 'Bad close up sequence';
  }
  
  if (text.includes('close up') || text.includes('close-up') || text.includes('cu ')) {
    if (text.includes('framing')) {
      return 'Bad close up sequence - bad framing';
    }
    if (text.includes('repetitive')) {
      return 'Bad close up sequence - repetitive edits';
    }
    return 'Bad close up sequence';
  }
  
  return null;
}

/**
 * Check for dimension issues (ONLY after visual checks)
 */
function checkDimensionIssues(combinedText: string): string | null {
  const text = combinedText.toLowerCase();
  
  if (!text.includes('dimension') && !text.includes('measurement')) {
    return null;
  }
  
  if (text.includes('illogical') || text.includes('wrong') || text.includes('incorrect')) {
    return 'Incorrect dimension values';
  }
  
  if (text.includes('mixed') || text.includes('multiple format')) {
    return 'Dimensions - mixed values';
  }
  
  if (text.includes('missing') || text.includes('no dimension')) {
    return 'Missing dimension values';
  }
  
  if (text.includes('mismatch') && text.includes('product name')) {
    return 'Dimensions/product name mismatch';
  }
  
  if (text.includes('alignment') || text.includes('position')) {
    return 'Dimensions alignment';
  }
  
  if (text.includes('set shot')) {
    return 'Dimensions using a set shot';
  }
  
  // Default dimension issue
  return 'Incorrect dimension values';
}

/**
 * Check for copy/text issues
 */
function checkCopyIssues(combinedText: string, ticketName: string): string | null {
  const text = combinedText.toLowerCase();
  const name = ticketName.toLowerCase();
  
  // Repetitive copy
  if ((text.includes('repetitive') && text.includes('copy')) ||
      name.includes('repetitive copies') || name.includes('repetitive copy')) {
    return 'Repetitive copy';
  }
  
  // Bad copy patterns
  if (text.includes('lowercase') || text.includes('uppercase') || 
      text.includes('capital') || text.includes('symbols in text') ||
      text.includes('grammar error') || text.includes('illogical text') ||
      name.includes('text issue') || name.includes('bad copies') ||
      name.includes('bad copy')) {
    return 'Bad copy';
  }
  
  return null;
}

/**
 * Check for action video issues
 */
function checkActionVideoIssues(combinedText: string, ticketName: string): string | null {
  const text = combinedText.toLowerCase();
  const name = ticketName.toLowerCase();
  
  if (name.includes('action video issue') || name.includes('see in action') ||
      text.includes('editing issue') || text.includes('first shot is unnecessary') ||
      text.includes('illogical demonstration')) {
    return 'Action video edit';
  }
  
  if (text.includes('action') && text.includes('framing')) {
    return 'Action video framing';
  }
  
  if (text.includes('action video') || text.includes('action shot')) {
    if (text.includes('color') || text.includes('cc ')) {
      return 'Color correction - Action shot';
    }
    return 'Action video edit';
  }
  
  return null;
}

/**
 * Check for unbox issues
 */
function checkUnboxIssues(combinedText: string, ticketName: string): string | null {
  const name = ticketName.toLowerCase();
  const text = combinedText.toLowerCase();
  
  if (name.includes('unbox') || text.includes('unbox')) {
    return 'Bad unbox artifact';
  }
  
  return null;
}

/**
 * Check for other specific issues
 */
function checkOtherIssues(combinedText: string, ticketName: string): string | null {
  const text = combinedText.toLowerCase();
  const name = ticketName.toLowerCase();
  
  // Date code/LOT number
  if (text.includes('date code') || text.includes('lot number') || text.includes('lot code')) {
    return 'Date code/LOT number shown';
  }
  
  // Black frames
  if (text.includes('black frame')) {
    return 'Black frames in video';
  }
  
  // Blurry/out of focus
  if (text.includes('blurry') || text.includes('out of focus') || text.includes('blur')) {
    return 'Blurry/out of focus video';
  }
  
  // Damage/dirty plate
  if (text.includes('dirty plate') || text.includes('dirty background') || 
      text.includes('dirty floor')) {
    return 'Damage/dirty plate';
  }
  
  // Damaged product
  if (text.includes('damaged product') || text.includes('product is damaged') ||
      text.includes('bent') || text.includes('scratched')) {
    return 'Damaged product';
  }
  
  // Reflections
  if (text.includes('reflection') || text.includes('glare')) {
    return 'Reflections on product';
  }
  
  // Missing set in intro/360
  if (text.includes('missing set') || text.includes('multi-pack issue') ||
      name.includes('missing items')) {
    return 'Missing set in intro/360';
  }
  
  // Off centered
  if (text.includes('off center') || text.includes('off axis') || text.includes('not centered')) {
    return 'Off centered / Off axis';
  }
  
  // Feature issues
  if (text.includes('feature crop') || (text.includes('feature') && text.includes('cut off'))) {
    return 'Feature crop';
  }
  
  if (text.includes('video content does not align with feature') ||
      (text.includes('feature') && text.includes('not matching'))) {
    return 'Feature not matching copy';
  }
  
  if (name.includes('duplicate feature text')) {
    return 'Repetitive features';
  }
  
  // Color issues
  if (text.includes('inconsistent color')) {
    return 'Inconsistent color';
  }
  
  if (text.includes('transparent') && text.includes('color')) {
    return 'Color correction - transparent product';
  }
  
  // Navigation
  if (text.includes('missing navigation') || text.includes('navigation item')) {
    return 'Missing navigation item';
  }
  
  // PDP mismatch
  if (text.includes('pdp mismatch') || text.includes('pdp') && text.includes('differ')) {
    return 'PDP mismatch';
  }
  
  // UI obstruction
  if (text.includes('ui obstruction') || text.includes('ui element')) {
    return 'UI obstruction';
  }
  
  // Un-seamless 360
  if (text.includes('360 loop') || text.includes('seamless') || text.includes('360') && text.includes('jump')) {
    return 'Un-seamless 360 loop';
  }
  
  return null;
}

/**
 * Main categorization function
 */
export function categorizeTicket(ticket: Ticket): string[] {
  const ticketName = ticket['Ticket name'] || '';
  const ticketDescription = ticket['Ticket description'] || '';
  const combinedText = `${ticketName} ${ticketDescription}`;
  
  // Check for multi-category tickets first
  const multiCategories = parseMultipleCategories(ticketName);
  if (multiCategories.length > 0) {
    return multiCategories;
  }
  
  // GOLDEN RULE: Check exact match
  const exactMatch = checkExactMatch(ticketName);
  if (exactMatch) {
    return [exactMatch];
  }
  
  // Priority 1: Visual/Background Issues
  const visualIssue = checkVisualBackgroundIssues(combinedText);
  if (visualIssue) {
    return [visualIssue];
  }
  
  // Priority 2: Specific Content Issues
  
  // Label issues
  const labelIssue = checkLabelIssues(combinedText, ticketName);
  if (labelIssue) {
    return [labelIssue];
  }
  
  // Close-up issues
  const closeUpIssue = checkCloseUpIssues(combinedText, ticketName);
  if (closeUpIssue) {
    return [closeUpIssue];
  }
  
  // Copy/text issues
  const copyIssue = checkCopyIssues(combinedText, ticketName);
  if (copyIssue) {
    return [copyIssue];
  }
  
  // Action video issues
  const actionIssue = checkActionVideoIssues(combinedText, ticketName);
  if (actionIssue) {
    return [actionIssue];
  }
  
  // Unbox issues
  const unboxIssue = checkUnboxIssues(combinedText, ticketName);
  if (unboxIssue) {
    return [unboxIssue];
  }
  
  // Other specific issues
  const otherIssue = checkOtherIssues(combinedText, ticketName);
  if (otherIssue) {
    return [otherIssue];
  }
  
  // Dimension issues (ONLY after visual checks)
  const dimensionIssue = checkDimensionIssues(combinedText);
  if (dimensionIssue) {
    return [dimensionIssue];
  }
  
  // Fallback: Uncategorized
  return ['Uncategorized'];
}

/**
 * Extract Experience ID from a Backstage URL
 * URL format: https://backstage.eko.com/experiences/45493255314
 */
function extractExperienceIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  // Match /experiences/ followed by the ID number
  const match = url.match(/\/experiences\/(\d+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Process all tickets and return categorized results
 */
export function processTickets(
  tickets: Ticket[], 
  mappings?: ExperienceMapping[]
): CategorizedTicket[] {
  // Create lookup map by ExperienceId from QC App Export
  const mappingByExperienceId = new Map<string, ExperienceMapping>();
  
  if (mappings) {
    for (const mapping of mappings) {
      // Index by ExperienceId (the column name in QC App Export)
      const expId = mapping.ExperienceId || mapping['ExperienceId'];
      if (expId) {
        mappingByExperienceId.set(String(expId).trim(), mapping);
      }
    }
  }
  
  const results: CategorizedTicket[] = [];
  
  for (const ticket of tickets) {
    const categories = categorizeTicket(ticket);
    
    // Extract Experience ID from the Backstage Experience page URL in HS Export
    // URL format: https://backstage.eko.com/experiences/45493255314
    const backstageUrl = ticket['Backstage Experience page'] || '';
    const experienceId = extractExperienceIdFromUrl(backstageUrl);
    
    const publicPreviewLink = experienceId 
      ? `https://app.eko.com/public/experiences/${experienceId}`
      : '';
    
    // Find mapping by Experience ID
    let mapping: ExperienceMapping | undefined;
    if (experienceId && mappingByExperienceId.has(experienceId)) {
      mapping = mappingByExperienceId.get(experienceId);
    }
    
    // For multi-category tickets, create one entry but store all categories
    const categorizedTicket: CategorizedTicket = {
      ...ticket,
      category: categories[0],
      categories: categories.length > 1 ? categories : undefined,
      Reviewer: mapping?.Assignee,
      ProductType: mapping?.ProductType,
      TemplateName: mapping?.TemplateName,
      PublicPreviewLink: publicPreviewLink
    };
    
    results.push(categorizedTicket);
  }
  
  return results;
}

/**
 * Get category metadata
 */
export function getCategoryMetadata(category: string): CategoryMetadata {
  return CATEGORY_METADATA[category] || { devFactory: '', issueType: '' };
}

/**
 * Get all unique experiences from tickets
 */
export function getUniqueExperiences(tickets: Ticket[]): Set<string> {
  const experiences = new Set<string>();
  for (const ticket of tickets) {
    const exp = ticket['Experience ID'] || ticket['Associated Experience'] || ticket['Experience name'];
    if (exp) {
      experiences.add(String(exp));
    }
  }
  return experiences;
}

/**
 * Get experiences with tickets
 */
export function getExperiencesWithTickets(tickets: Ticket[]): Set<string> {
  return getUniqueExperiences(tickets);
}
