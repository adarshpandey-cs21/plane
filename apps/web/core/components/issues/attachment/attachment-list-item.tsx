/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { Download, Play } from "lucide-react";

import { useTranslation } from "@plane/i18n";
import { TrashIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
import type { TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// ui
import { CustomMenu } from "@plane/ui";
import { convertBytesToSize, getFileExtension, getFileName, getFileURL, renderFormattedDate } from "@plane/utils";
// components
import { ButtonAvatars } from "@/components/dropdowns/member/avatar";
import { getFileIcon } from "@/components/icons";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useMember } from "@/hooks/store/use-member";
import { usePlatformOS } from "@/hooks/use-platform-os";
// local
import { isImageFile, isVideoFile, isPreviewableFile } from "./attachment-preview";

type TIssueAttachmentsListItem = {
  attachmentId: string;
  disabled?: boolean;
  issueServiceType?: TIssueServiceType;
  onPreview?: (attachmentId: string) => void;
};

export const IssueAttachmentsListItem = observer(function IssueAttachmentsListItem(props: TIssueAttachmentsListItem) {
  const { t } = useTranslation();
  // props
  const { attachmentId, disabled, issueServiceType = EIssueServiceType.ISSUES, onPreview } = props;
  // store hooks
  const { getUserDetails } = useMember();
  const {
    attachment: { getAttachmentById },
    toggleDeleteAttachmentModal,
  } = useIssueDetail(issueServiceType);
  // derived values
  const attachment = attachmentId ? getAttachmentById(attachmentId) : undefined;
  const fileName = getFileName(attachment?.attributes.name ?? "");
  const fileExtension = getFileExtension(attachment?.attributes.name ?? "");
  const fileIcon = getFileIcon(fileExtension, 18);
  const fileURL = getFileURL(attachment?.asset_url ?? "");
  const canPreview = isPreviewableFile(fileExtension);
  const isImage = isImageFile(fileExtension);
  const isVideo = isVideoFile(fileExtension);
  const downloadURL = fileURL ? `${fileURL}${fileURL.includes("?") ? "&" : "?"}download=true` : undefined;
  // hooks
  const { isMobile } = usePlatformOS();

  if (!attachment) return <></>;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canPreview && onPreview) {
      onPreview(attachmentId);
    } else {
      window.open(fileURL, "_blank");
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
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
        <div className="relative flex items-center justify-center">
          {fileIcon}
          <Play className="absolute h-2.5 w-2.5 fill-current text-secondary" />
        </div>
      );
    }
    return <div className="flex items-center gap-3">{fileIcon}</div>;
  };

  return (
    <button type="button" onClick={handleClick}>
      <div className="group flex h-11 items-center justify-between gap-3 pr-2 pl-9 hover:bg-surface-2">
        <div className="flex items-center gap-3 truncate text-13">
          {renderFileIndicator()}
          <Tooltip tooltipContent={`${fileName}.${fileExtension}`} isMobile={isMobile}>
            <p className="truncate font-medium text-secondary">{`${fileName}.${fileExtension}`}</p>
          </Tooltip>
          <span className="flex size-1.5 rounded-full bg-layer-1" />
          <span className="flex-shrink-0 text-placeholder">{convertBytesToSize(attachment.attributes.size)}</span>
        </div>

        <div className="flex items-center gap-3">
          {attachment?.created_by && (
            <Tooltip
              isMobile={isMobile}
              tooltipContent={`${
                getUserDetails(attachment?.created_by)?.display_name ?? ""
              } uploaded on ${renderFormattedDate(attachment.updated_at)}`}
            >
              <div className="flex items-center justify-center">
                <ButtonAvatars showTooltip userIds={attachment?.created_by} />
              </div>
            </Tooltip>
          )}

          <Tooltip tooltipContent={t("common.actions.download")} isMobile={isMobile}>
            <button
              type="button"
              className="hidden items-center justify-center text-secondary group-hover:flex hover:text-primary"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </Tooltip>

          <CustomMenu ellipsis closeOnSelect placement="bottom-end" disabled={disabled}>
            <CustomMenu.MenuItem
              onClick={() => {
                toggleDeleteAttachmentModal(attachmentId);
              }}
            >
              <div className="flex items-center gap-2">
                <TrashIcon className="h-3.5 w-3.5" strokeWidth={2} />
                <span>{t("common.actions.delete")}</span>
              </div>
            </CustomMenu.MenuItem>
          </CustomMenu>
        </div>
      </div>
    </button>
  );
});
