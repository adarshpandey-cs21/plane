/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback } from "react";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { TIssue } from "@plane/types";
// hooks
import { useInstance } from "@/hooks/store/use-instance";

// i18n keys for displaying field names in the error message
const FIELD_LABEL_KEYS: Record<string, string> = {
  target_date: "due_date",
  start_date: "start_date",
  priority: "priority",
  assignee_ids: "assignees",
  label_ids: "labels",
};

/**
 * Returns an error message if any field configured via ISSUE_REQUIRED_FIELDS is missing, else null.
 */
export const useIssueRequiredFields = () => {
  const { t } = useTranslation();
  const { config } = useInstance();

  const getRequiredFieldsError = useCallback(
    (data: Partial<TIssue>) => {
      const missing = (config?.issue_required_fields ?? []).filter((field) => {
        const value = data[field as keyof TIssue];
        return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
      });
      if (missing.length === 0) return null;
      return `${t("required")}: ${missing.map((field) => (FIELD_LABEL_KEYS[field] ? t(FIELD_LABEL_KEYS[field]) : field)).join(", ")}`;
    },
    [config?.issue_required_fields, t]
  );

  return { getRequiredFieldsError };
};
