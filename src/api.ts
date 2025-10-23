// Public TypeScript declarations facade for git-contributor-stats
// This file is only used to emit .d.ts (emitDeclarationOnly=true) – runtime logic stays in JS files.

import type { AliasConfig } from './analytics/aliases.ts';

export interface ContributorStatsOptions {
  repo?: string;
  branch?: string;
  paths?: string | string[];
  since?: string;
  until?: string;
  author?: string;
  includeMerges?: boolean;
  groupBy?: 'email' | 'name';
  sortBy?: 'changes' | 'commits' | 'additions' | 'deletions';
  top?: number;
  similarity?: number;
  aliasFile?: string;
  aliasConfig?: AliasConfig;
  countLines?: boolean;
  includeTopStats?: boolean;
}

export interface ContributorBasic {
  key: string;
  name: string;
  emails: string[];
  commits: number;
  additions: number;
  deletions: number;
  changes: number;
  firstCommitDate?: string;
  lastCommitDate?: string;
}

export interface FileStats {
  changes: number;
  added: number;
  deleted: number;
}
export interface TopFileEntry {
  filename: string;
  changes: number;
  added: number;
  deleted: number;
}

export interface TopContributor {
  name?: string;
  email?: string;
  commits: number;
  added: number;
  deleted: number;
  net: number;
  changes: number;
  files: Record<string, FileStats>;
  topFiles: TopFileEntry[];
}

export interface ContributorsMapEntry {
  name?: string;
  email?: string;
  commits: number;
  added: number;
  deleted: number;
  files: Record<string, FileStats>;
}

export interface CommitFrequencyBreakdown {
  monthly: Record<string, number>;
  weekly: Record<string, number>;
}

export interface TopStatsSummary {
  byCommits: TopContributor | null;
  byAdditions: TopContributor | null;
  byDeletions: TopContributor | null;
  byNet: TopContributor | null;
  byChanges: TopContributor | null;
}

export interface BusFactorInfo {
  filesSingleOwner: Array<{ file: string; owner: string; changes: number }>;
}
