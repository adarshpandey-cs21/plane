/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { getFileExtension, getFileName, getFileURL } from "@plane/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// types
import type { TAttachmentHelpers } from "../issue-detail-widgets/attachments/helper";
// components
import { IssueAttachmentsDetail } from "./attachment-detail";
import { AttachmentPreview, isPreviewableFile } from "./attachment-preview";
import { IssueAttachmentsUploadDetails } from "./attachment-upload-details";

type TIssueAttachmentsList = {
  issueId: string;
  attachmentHelpers: TAttachmentHelpers;
  disabled?: boolean;
};

export const IssueAttachmentsList = observer(function IssueAttachmentsList(props: TIssueAttachmentsList) {
  const { issueId, attachmentHelpers, disabled } = props;
  // state
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(null);
  // store hooks
  const {
    attachment: { getAttachmentsByIssueId, getAttachmentById },
  } = useIssueDetail();
  // derived values
  const { snapshot: attachmentSnapshot } = attachmentHelpers;
  const { uploadStatus } = attachmentSnapshot;
  const issueAttachments = getAttachmentsByIssueId(issueId);

  // Compute list of previewable attachment IDs for navigation
  const previewableIds = useMemo(() => {
    if (!issueAttachments) return [];
    return issueAttachments.filter((id) => {
      const att = getAttachmentById(id);
      if (!att) return false;
      const ext = getFileExtension(att.attributes.name ?? "");
      return isPreviewableFile(ext);
    });
  }, [issueAttachments, getAttachmentById]);

  const previewIndex = previewAttachmentId ? previewableIds.indexOf(previewAttachmentId) : -1;
  const previewAttachment = previewAttachmentId ? getAttachmentById(previewAttachmentId) : undefined;
  const previewFileName = getFileName(previewAttachment?.attributes.name ?? "");
  const previewFileExtension = getFileExtension(previewAttachment?.attributes.name ?? "");
  const previewFileURL = getFileURL(previewAttachment?.asset_url ?? "");

  const handlePrev = useCallback(() => {
    if (previewIndex > 0) setPreviewAttachmentId(previewableIds[previewIndex - 1]);
  }, [previewIndex, previewableIds]);

  const handleNext = useCallback(() => {
    if (previewIndex < previewableIds.length - 1) setPreviewAttachmentId(previewableIds[previewIndex + 1]);
  }, [previewIndex, previewableIds]);

  return (
    <>
      {/* Lightbox */}
      {previewAttachmentId && previewFileURL && (
        <AttachmentPreview
          isOpen={Boolean(previewAttachmentId)}
          onClose={() => setPreviewAttachmentId(null)}
          fileURL={previewFileURL}
          fileName={previewFileName}
          fileExtension={previewFileExtension}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={previewIndex > 0}
          hasNext={previewIndex < previewableIds.length - 1}
          currentIndex={previewIndex}
          totalCount={previewableIds.length}
        />
      )}
      {uploadStatus?.map((status) => (
        <IssueAttachmentsUploadDetails key={status.id} uploadStatus={status} />
      ))}
      {issueAttachments?.map((attachmentId) => (
        <IssueAttachmentsDetail
          key={attachmentId}
          attachmentId={attachmentId}
          disabled={disabled}
          attachmentHelpers={attachmentHelpers}
          onPreview={setPreviewAttachmentId}
        />
      ))}
    </>
  );
});
