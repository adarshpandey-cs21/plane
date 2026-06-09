/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { AlertCircle, Download, Play } from "lucide-react";
import { CloseIcon } from "@plane/propel/icons";
// ui
import { Tooltip } from "@plane/propel/tooltip";
import {
  convertBytesToSize,
  getFileExtension,
  getFileName,
  getFileURL,
  renderFormattedDate,
  truncateText,
} from "@plane/utils";
// icons
import { getFileIcon } from "@/components/icons";
// components
import { IssueAttachmentDeleteModal } from "@/components/issues/attachment/delete-attachment-modal";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useMember } from "@/hooks/store/use-member";
import { usePlatformOS } from "@/hooks/use-platform-os";
// types
import type { TAttachmentHelpers } from "../issue-detail-widgets/attachments/helper";
// local
import { isImageFile, isVideoFile, isPreviewableFile } from "./attachment-preview";

type TAttachmentOperationsRemoveModal = Exclude<TAttachmentHelpers, "create">;

type TIssueAttachmentsDetail = {
  attachmentId: string;
  attachmentHelpers: TAttachmentOperationsRemoveModal;
  disabled?: boolean;
  onPreview?: (attachmentId: string) => void;
};

export const IssueAttachmentsDetail = observer(function IssueAttachmentsDetail(props: TIssueAttachmentsDetail) {
  // props
  const { attachmentId, attachmentHelpers, disabled, onPreview } = props;
  // store hooks
  const { getUserDetails } = useMember();
  const {
    attachment: { getAttachmentById },
  } = useIssueDetail();
  // state
  const [isDeleteIssueAttachmentModalOpen, setIsDeleteIssueAttachmentModalOpen] = useState(false);
  // derived values
  const attachment = attachmentId ? getAttachmentById(attachmentId) : undefined;
  const fileName = getFileName(attachment?.attributes.name ?? "");
  const fileExtension = getFileExtension(attachment?.asset_url ?? "");
  const fileIcon = getFileIcon(fileExtension, 28);
  const fileURL = getFileURL(attachment?.asset_url ?? "");
  const canPreview = isPreviewableFile(fileExtension);
  const isImage = isImageFile(fileExtension);
  const isVideo = isVideoFile(fileExtension);
  const downloadURL = fileURL ? `${fileURL}${fileURL.includes("?") ? "&" : "?"}download=true` : undefined;
  // hooks
  const { isMobile } = usePlatformOS();

  if (!attachment) return <></>;

  const handleClick = () => {
    if (canPreview && onPreview) {
      onPreview(attachmentId);
    } else {
      window.open(fileURL, "_blank");
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadURL) window.open(downloadURL, "_blank");
  };

  // Render file icon or thumbnail
  const renderFileIndicator = () => {
    if (isImage && fileURL) {
      return <img src={fileURL} alt={fileName} className="h-7 w-7 flex-shrink-0 rounded object-cover" />;
    }
    if (isVideo) {
      return (
        <div className="relative flex h-7 w-7 items-center justify-center">
          {fileIcon}
          <Play className="absolute h-3 w-3 fill-current text-secondary" />
        </div>
      );
    }
    return <div className="h-7 w-7">{fileIcon}</div>;
  };

  return (
    <>
      {isDeleteIssueAttachmentModalOpen && (
        <IssueAttachmentDeleteModal
          isOpen={isDeleteIssueAttachmentModalOpen}
          onClose={() => setIsDeleteIssueAttachmentModalOpen(false)}
          attachmentOperations={attachmentHelpers.operations}
          attachmentId={attachmentId}
        />
      )}
      <button
        type="button"
        className="group hover:border-primary/20 flex h-[60px] w-full cursor-pointer items-center justify-between gap-1 rounded-md border-[2px] border-subtle bg-surface-1 px-4 py-2 text-left text-13"
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          {renderFileIndicator()}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Tooltip tooltipContent={fileName} isMobile={isMobile}>
                <span className="text-13">{truncateText(`${fileName}`, 10)}</span>
              </Tooltip>
              <Tooltip
                isMobile={isMobile}
                tooltipContent={`${
                  getUserDetails(attachment.updated_by)?.display_name ?? ""
                } uploaded on ${renderFormattedDate(attachment.updated_at)}`}
              >
                <span>
                  <AlertCircle className="h-3 w-3" />
                </span>
              </Tooltip>
            </div>

            <div className="flex items-center gap-3 text-11 text-secondary">
              <span>{fileExtension.toUpperCase()}</span>
              <span>{convertBytesToSize(attachment.attributes.size)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hidden items-center justify-center text-secondary group-hover:flex hover:text-primary"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteIssueAttachmentModalOpen(true);
              }}
            >
              <CloseIcon className="h-4 w-4 text-secondary hover:text-primary" />
            </button>
          )}
        </div>
      </button>
    </>
  );
});
