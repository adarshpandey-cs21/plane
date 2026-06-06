/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { GitBranch } from "lucide-react";
// ui
import { CheckIcon, CopyIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
// utils
import { copyTextToClipboard, generateGitBranchName } from "@plane/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useProject } from "@/hooks/store/use-project";

type Props = {
  issueId: string;
};

export const IssueDevelopmentSection = observer(function IssueDevelopmentSection(props: Props) {
  const { issueId } = props;
  // state
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // store hooks
  const { getProjectById } = useProject();
  const {
    issue: { getIssueById },
  } = useIssueDetail();

  const issue = getIssueById(issueId);
  const projectDetails = issue ? getProjectById(issue.project_id) : null;

  const branchName = generateGitBranchName({
    projectIdentifier: projectDetails?.identifier,
    sequenceId: issue?.sequence_id,
    title: issue?.name,
  });

  const gitCommand = `git checkout -b ${branchName}`;

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const handleCopy = useCallback(async () => {
    try {
      await copyTextToClipboard(gitCommand);
      setIsCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsCopied(false);
        timerRef.current = null;
      }, 2000);
    } catch {
      // silently fail
    }
  }, [gitCommand]);

  if (!issue) return null;

  return (
    <div className="mt-5 border-t border-subtle-1 pt-4">
      <h5 className="mb-3 flex items-center gap-1.5 text-body-xs-medium">
        <GitBranch className="size-3.5 text-tertiary" />
        Development
      </h5>
      <Tooltip tooltipContent={isCopied ? "Copied!" : "Click to copy"}>
        <button
          type="button"
          className="group hover:border-subtle-2 w-full cursor-pointer rounded-md border border-subtle-1 bg-surface-2 px-3 py-2.5 text-left transition-colors"
          onClick={handleCopy}
        >
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs min-w-0 flex-1 truncate text-secondary">{gitCommand}</code>
            <span className="shrink-0 transition-colors">
              {isCopied ? (
                <CheckIcon className="size-3.5 text-success-primary" />
              ) : (
                <CopyIcon className="size-3.5 text-tertiary group-hover:text-secondary" />
              )}
            </span>
          </div>
        </button>
      </Tooltip>
    </div>
  );
});
