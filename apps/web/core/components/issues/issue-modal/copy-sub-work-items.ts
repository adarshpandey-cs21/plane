/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TIssue, TIssueSubIssues } from "@plane/types";
// services
import { IssueService } from "@/services/issue/issue.service";
import { IssueRelationService } from "@/services/issue/issue_relation.service";

const issueService = new IssueService();
const issueRelationService = new IssueRelationService();

const MAX_RECURSION_DEPTH = 10;

const FIELDS_TO_COPY: (keyof TIssue)[] = [
  "name",
  "description_html",
  "state_id",
  "priority",
  "label_ids",
  "assignee_ids",
  "estimate_point",
  "start_date",
  "target_date",
  "type_id",
];

export type TCloneOptions = {
  subWorkItems: boolean;
  links: boolean;
  relations: boolean;
};

type TCopyResult = {
  successCount: number;
  failedCount: number;
};

const aggregateResults = (results: PromiseSettledResult<TCopyResult>[]): TCopyResult => {
  const result: TCopyResult = { successCount: 0, failedCount: 0 };
  for (const r of results) {
    if (r.status === "fulfilled") {
      result.successCount += r.value.successCount;
      result.failedCount += r.value.failedCount;
    } else {
      result.failedCount++;
    }
  }
  return result;
};

/**
 * Copies links from a source issue to a newly created issue.
 */
const copyLinks = async (
  workspaceSlug: string,
  projectId: string,
  sourceIssueId: string,
  newIssueId: string
): Promise<TCopyResult> => {
  try {
    const links = await issueService.fetchIssueLinks(workspaceSlug, projectId, sourceIssueId);
    if (!links || links.length === 0) return { successCount: 0, failedCount: 0 };

    const linkResults = await Promise.allSettled(
      links.map((link) =>
        issueService.createIssueLink(workspaceSlug, projectId, newIssueId, {
          title: link.title,
          url: link.url,
        })
      )
    );

    let successCount = 0;
    let failedCount = 0;
    linkResults.forEach((r, i) => {
      if (r.status === "fulfilled") successCount++;
      else {
        console.error(`[copyLinks] Failed to copy link ${links[i].id}:`, r.reason);
        failedCount++;
      }
    });
    return { successCount, failedCount };
  } catch (error) {
    console.error(`[copyLinks] Failed to fetch links for ${sourceIssueId}:`, error);
    return { successCount: 0, failedCount: 1 };
  }
};

/**
 * Copies relations from a source issue to a newly created issue.
 */
const copyRelations = async (
  workspaceSlug: string,
  projectId: string,
  sourceIssueId: string,
  newIssueId: string
): Promise<TCopyResult> => {
  try {
    const relations = await issueRelationService.listIssueRelations(workspaceSlug, projectId, sourceIssueId);
    if (!relations) return { successCount: 0, failedCount: 0 };

    const entries = Object.entries(relations).filter(([, relatedIssues]) => relatedIssues && relatedIssues.length > 0);
    if (entries.length === 0) return { successCount: 0, failedCount: 0 };

    const relationResults = await Promise.allSettled(
      entries.map(([relationType, relatedIssues]) =>
        issueRelationService
          .createIssueRelations(workspaceSlug, projectId, newIssueId, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            relation_type: relationType as any,
            issues: relatedIssues.map((issue) => issue.id),
          })
          .then(() => relatedIssues.length)
      )
    );

    let successCount = 0;
    let failedCount = 0;
    relationResults.forEach((r, i) => {
      if (r.status === "fulfilled") successCount += r.value;
      else {
        const [relationType, relatedIssues] = entries[i];
        console.error(`[copyRelations] Failed to copy ${relationType} relations:`, r.reason);
        failedCount += relatedIssues.length;
      }
    });
    return { successCount, failedCount };
  } catch (error) {
    console.error(`[copyRelations] Failed to fetch relations for ${sourceIssueId}:`, error);
    return { successCount: 0, failedCount: 1 };
  }
};

/**
 * Clones a single sub-work-item and recursively copies its children and links.
 */
const cloneSingleSubWorkItem = async (
  workspaceSlug: string,
  subIssue: TIssue,
  newParentId: string,
  sourceProjectId: string,
  copyLinksFlag: boolean,
  depth: number
): Promise<TCopyResult> => {
  const result: TCopyResult = { successCount: 0, failedCount: 0 };

  const payload: Partial<TIssue> = {
    parent_id: newParentId,
    project_id: subIssue.project_id ?? sourceProjectId,
  };

  for (const field of FIELDS_TO_COPY) {
    const value = subIssue[field];
    if (value !== undefined && value !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload as any)[field] = value;
    }
  }

  const createdIssue = await issueService.createIssue(workspaceSlug, payload.project_id!, payload);
  result.successCount++;

  const subIssueProjectId = subIssue.project_id ?? sourceProjectId;

  // Run link copy and recursive sub-issue copy in parallel
  const followUpTasks: Promise<TCopyResult>[] = [];

  if (copyLinksFlag) {
    followUpTasks.push(copyLinks(workspaceSlug, subIssueProjectId, subIssue.id, createdIssue.id));
  }

  if (subIssue.sub_issues_count && subIssue.sub_issues_count > 0) {
    followUpTasks.push(
      copySubWorkItemsRecursive(
        workspaceSlug,
        subIssue.id,
        createdIssue.id,
        subIssueProjectId,
        copyLinksFlag,
        depth + 1
      )
    );
  }

  if (followUpTasks.length > 0) {
    const followUpResults = await Promise.allSettled(followUpTasks);
    const aggregated = aggregateResults(followUpResults);
    result.successCount += aggregated.successCount;
    result.failedCount += aggregated.failedCount;
  }

  return result;
};

/**
 * Recursively copies sub-work-items from a source issue to a new parent issue.
 * When copyLinksFlag is true, also copies links for each sub-work-item.
 */
const copySubWorkItemsRecursive = async (
  workspaceSlug: string,
  sourceIssueId: string,
  newParentId: string,
  sourceProjectId: string,
  copyLinksFlag: boolean = false,
  depth: number = 0
): Promise<TCopyResult> => {
  if (depth >= MAX_RECURSION_DEPTH) {
    console.warn(`[copySubWorkItems] Max recursion depth (${MAX_RECURSION_DEPTH}) reached, stopping.`);
    return { successCount: 0, failedCount: 0 };
  }

  let subIssuesResponse: TIssueSubIssues;
  try {
    subIssuesResponse = await issueService.subIssues(workspaceSlug, sourceProjectId, sourceIssueId);
  } catch (error) {
    console.error(`[copySubWorkItems] Failed to fetch sub-issues for ${sourceIssueId}:`, error);
    return { successCount: 0, failedCount: 1 };
  }

  const subIssues = Array.isArray(subIssuesResponse.sub_issues) ? subIssuesResponse.sub_issues : [];
  if (subIssues.length === 0) return { successCount: 0, failedCount: 0 };

  const subIssueResults = await Promise.allSettled(
    subIssues.map((subIssue) =>
      cloneSingleSubWorkItem(workspaceSlug, subIssue, newParentId, sourceProjectId, copyLinksFlag, depth)
    )
  );

  return aggregateResults(subIssueResults);
};

/**
 * Creates a "cloned from" (duplicate) relation between the new issue and the source issue.
 */
const createClonedFromRelation = async (
  workspaceSlug: string,
  projectId: string,
  sourceIssueId: string,
  newIssueId: string
): Promise<void> => {
  try {
    await issueRelationService.createIssueRelations(workspaceSlug, projectId, newIssueId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relation_type: "duplicate" as any,
      issues: [sourceIssueId],
    });
  } catch (error) {
    console.error(`[createClonedFromRelation] Failed to create cloned-from relation:`, error);
  }
};

/**
 * Main entry point: clones associated data from a source issue to a new issue
 * based on the provided options. Also creates a "cloned from" relation.
 */
export const cloneWorkItemData = async (
  workspaceSlug: string,
  sourceIssueId: string,
  newIssueId: string,
  projectId: string,
  options: TCloneOptions
): Promise<TCopyResult> => {
  const tasks: Promise<TCopyResult>[] = [];

  if (options.subWorkItems) {
    tasks.push(copySubWorkItemsRecursive(workspaceSlug, sourceIssueId, newIssueId, projectId, options.links));
  }

  if (options.links) {
    tasks.push(copyLinks(workspaceSlug, projectId, sourceIssueId, newIssueId));
  }

  if (options.relations) {
    tasks.push(copyRelations(workspaceSlug, projectId, sourceIssueId, newIssueId));
  }

  const results = await Promise.allSettled(tasks);
  const result = aggregateResults(results);

  // Always create "cloned from" relation between the clone and the source
  await createClonedFromRelation(workspaceSlug, projectId, sourceIssueId, newIssueId);

  return result;
};
