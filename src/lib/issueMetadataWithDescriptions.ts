// This file dynamically adds descriptions to ISSUE_METADATA
import { ISSUE_METADATA, IssueMetadata } from './types';
import { ISSUE_COMMENTS } from './issueComments';

// Create a new metadata object with descriptions added
export const ISSUE_METADATA_WITH_DESC: Record<string, IssueMetadata> = {};

for (const [issueName, metadata] of Object.entries(ISSUE_METADATA)) {
  ISSUE_METADATA_WITH_DESC[issueName] = {
    ...metadata,
    description: ISSUE_COMMENTS[issueName]
  };
}

// Function to get issue metadata with description
export function getIssueWithDescription(issueName: string): IssueMetadata {
  return ISSUE_METADATA_WITH_DESC[issueName] || { devFactory: '', category: '', description: undefined };
}
