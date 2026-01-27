// This file dynamically adds descriptions to ISSUE_METADATA
import { ISSUE_METADATA, IssueMetadata } from './types';
import { ISSUE_COMMENTS } from './issueComments';

// Function to get issue metadata with description
export function getIssueMetadataWithDescription(): Record<string, IssueMetadata> {
  const metadata: Record<string, IssueMetadata> = {};
  
  for (const [issueName, issueMetadata] of Object.entries(ISSUE_METADATA)) {
    metadata[issueName] = {
      ...issueMetadata,
      description: ISSUE_COMMENTS[issueName]
    };
  }
  
  return metadata;
}

// Pre-computed for performance
export const ISSUE_METADATA_WITH_DESC: Record<string, IssueMetadata> = getIssueMetadataWithDescription();

// Function to get a single issue metadata with description
export function getIssueWithDescription(issueName: string): IssueMetadata {
  return ISSUE_METADATA_WITH_DESC[issueName] || { devFactory: '', category: '', description: undefined };
}
