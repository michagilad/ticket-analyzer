import { CategorizedTicket, FlaggedExperience, FLAGGABLE_ISSUES } from './types';

/**
 * Find experiences to flag for QC review
 * - Only from flaggable issues
 * - Only tickets that are NOT Done or Resolved
 * - Up to 3 unique experiences per issue
 */
export function findExperiencesToFlag(
  categorizedTickets: CategorizedTicket[],
  maxPerIssue: number = 3
): Map<string, FlaggedExperience[]> {
  const flaggedByIssue = new Map<string, FlaggedExperience[]>();
  
  // Initialize map for each flaggable issue
  for (const issue of FLAGGABLE_ISSUES) {
    flaggedByIssue.set(issue, []);
  }
  
  // Track which instance IDs we've already flagged (to avoid duplicates)
  const flaggedInstanceIds = new Set<string>();
  
  for (const ticket of categorizedTickets) {
    // Skip if no instance ID
    const instanceId = ticket['Instance ID'];
    if (!instanceId || instanceId.trim() === '') {
      continue;
    }
    
    // Skip if already flagged
    if (flaggedInstanceIds.has(instanceId)) {
      continue;
    }
    
    // Skip if ticket is Done or Resolved
    const status = ticket['Ticket status']?.toLowerCase() || '';
    if (status === 'done' || status === 'resolved') {
      continue;
    }
    
    // Check if this ticket's issue is flaggable
    const issues = ticket.issues || [ticket.issue];
    for (const issue of issues) {
      if (FLAGGABLE_ISSUES.includes(issue as typeof FLAGGABLE_ISSUES[number])) {
        const issueFlags = flaggedByIssue.get(issue) || [];
        
        // Only add if we haven't reached the limit for this issue
        if (issueFlags.length < maxPerIssue) {
          const flagged: FlaggedExperience = {
            instanceId: instanceId.trim(),
            issue,
            experienceName: ticket['Experience name'] || '',
            ticketName: ticket['Ticket name'] || '',
            ticketStatus: ticket['Ticket status'] || '',
            ticketDescription: ticket['Ticket description'] || '',
            backstageLink: ticket['Backstage Experience page'] || '',
          };
          
          issueFlags.push(flagged);
          flaggedByIssue.set(issue, issueFlags);
          flaggedInstanceIds.add(instanceId);
        }
      }
    }
  }
  
  return flaggedByIssue;
}

/**
 * Convert flagged experiences map to a flat array grouped by issue
 */
export function getFlaggedExperiencesArray(
  flaggedByIssue: Map<string, FlaggedExperience[]>
): { issue: string; experiences: FlaggedExperience[] }[] {
  const result: { issue: string; experiences: FlaggedExperience[] }[] = [];
  
  for (const issue of FLAGGABLE_ISSUES) {
    const experiences = flaggedByIssue.get(issue) || [];
    if (experiences.length > 0) {
      result.push({ issue, experiences });
    }
  }
  
  return result;
}

/**
 * Get total count of flagged experiences
 */
export function getTotalFlaggedCount(flaggedByIssue: Map<string, FlaggedExperience[]>): number {
  let total = 0;
  for (const experiences of flaggedByIssue.values()) {
    total += experiences.length;
  }
  return total;
}
