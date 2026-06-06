/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { MoreHorizontal } from "lucide-react";
// ui
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { IconButton } from "@plane/propel/icon-button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TContextMenuItem } from "@plane/ui";
import { ContextMenu, CustomMenu, EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { copyUrlToClipboard, cn } from "@plane/utils";
// hooks
import { useCycleMenuItems } from "@/components/common/quick-actions-helper";
import { useCycle } from "@/hooks/store/use-cycle";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// local imports
import { ArchiveCycleModal } from "./archived-cycles/modal";
import { CycleDeleteModal } from "./delete-modal";
import { CycleCreateUpdateModal } from "./modal";

type Props = {
  parentRef: React.RefObject<HTMLElement>;
  cycleId: string;
  projectId: string;
  workspaceSlug: string;
  customClassName?: string;
};

export const CycleQuickActions = observer(function CycleQuickActions(props: Props) {
  const { parentRef, cycleId, projectId, workspaceSlug, customClassName } = props;
  // router
  const router = useAppRouter();
  // states
  const [updateModal, setUpdateModal] = useState(false);
  const [archiveCycleModal, setArchiveCycleModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  // store hooks
  const { allowPermissions } = useUserPermissions();
  const { getCycleById, completeCycle, revertCycleCompletion, startCycle, restoreCycle } = useCycle();
  const { t } = useTranslation();
  // derived values
  const cycleDetails = getCycleById(cycleId);
  // auth
  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );
  const isAdmin = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug, projectId);

  const cycleLink = `${workspaceSlug}/projects/${projectId}/cycles/${cycleId}`;
  const handleCopyText = () =>
    copyUrlToClipboard(cycleLink).then(() =>
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.link_copied"),
        message: t("common.link_copied_to_clipboard"),
      })
    );
  const handleOpenInNewTab = () => window.open(`/${cycleLink}`, "_blank");

  const handleConfirmComplete = async () => {
    setIsCompleting(true);
    await completeCycle(workspaceSlug, projectId, cycleId)
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Cycle completed",
          message: "The cycle has been marked as completed.",
        });
        return setCompleteModal(false);
      })
      .catch(() =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Failed to complete cycle",
          message: "Something went wrong. Please try again.",
        })
      )
      .finally(() => setIsCompleting(false));
  };

  const handleRevertCompletion = async () =>
    await revertCycleCompletion(workspaceSlug, projectId, cycleId)
      .then(() =>
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Completion reverted",
          message: "The cycle has been moved back to active.",
        })
      )
      .catch(() =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Failed to revert completion",
          message: "Something went wrong. Please try again.",
        })
      );

  const handleStartCycle = async () =>
    await startCycle(workspaceSlug, projectId, cycleId)
      .then(() =>
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Cycle started",
          message: "The cycle is now active.",
        })
      )
      .catch((err) =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Failed to start cycle",
          message: err?.error ?? "Something went wrong. Please try again.",
        })
      );

  const handleRestoreCycle = async () =>
    await restoreCycle(workspaceSlug, projectId, cycleId)
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: t("project_cycles.action.restore.success.title"),
          message: t("project_cycles.action.restore.success.description"),
        });
        return router.push(`/${workspaceSlug}/projects/${projectId}/archives/cycles`);
      })
      .catch(() =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("project_cycles.action.restore.failed.title"),
          message: t("project_cycles.action.restore.failed.description"),
        })
      );

  const menuResult = useCycleMenuItems({
    cycleDetails: cycleDetails ?? undefined,
    workspaceSlug,
    projectId,
    cycleId,
    isEditingAllowed,
    isAdmin,
    handleEdit: () => setUpdateModal(true),
    handleMarkCompleted: () => setCompleteModal(true),
    handleRevertCompletion,
    handleStartCycle,
    handleArchive: () => setArchiveCycleModal(true),
    handleRestore: handleRestoreCycle,
    handleDelete: () => setDeleteModal(true),
    handleCopyLink: handleCopyText,
    handleOpenInNewTab,
  });

  const MENU_ITEMS: TContextMenuItem[] = Array.isArray(menuResult) ? menuResult : menuResult.items;
  const additionalModals = Array.isArray(menuResult) ? null : menuResult.modals;

  const CONTEXT_MENU_ITEMS = MENU_ITEMS.map(function CONTEXT_MENU_ITEMS(item) {
    return {
      ...item,
      action: () => {
        item.action();
      },
    };
  });

  return (
    <>
      {cycleDetails && (
        <div className="fixed">
          <CycleCreateUpdateModal
            data={cycleDetails}
            isOpen={updateModal}
            handleClose={() => setUpdateModal(false)}
            workspaceSlug={workspaceSlug}
            projectId={projectId}
          />
          <ArchiveCycleModal
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            cycleId={cycleId}
            isOpen={archiveCycleModal}
            handleClose={() => setArchiveCycleModal(false)}
          />
          <CycleDeleteModal
            cycle={cycleDetails}
            isOpen={deleteModal}
            handleClose={() => setDeleteModal(false)}
            workspaceSlug={workspaceSlug}
            projectId={projectId}
          />
          <ModalCore
            isOpen={completeModal}
            handleClose={() => setCompleteModal(false)}
            position={EModalPosition.CENTER}
            width={EModalWidth.LG}
          >
            <div className="px-5 py-4">
              <h3 className="text-18 font-medium 2xl:text-20">Complete cycle</h3>
              <p className="mt-3 text-13 text-secondary">
                Are you sure you want to mark <span className="font-medium text-primary">{cycleDetails.name}</span> as
                completed? This will move the cycle to the completed section.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="secondary" size="lg" onClick={() => setCompleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="lg" tabIndex={0} onClick={handleConfirmComplete} loading={isCompleting}>
                  {isCompleting ? "Completing" : "Complete"}
                </Button>
              </div>
            </div>
          </ModalCore>
          {additionalModals}
        </div>
      )}
      <ContextMenu parentRef={parentRef} items={CONTEXT_MENU_ITEMS} />
      <CustomMenu
        customButton={<IconButton variant="tertiary" size="lg" icon={MoreHorizontal} />}
        placement="bottom-end"
        closeOnSelect
        maxHeight="lg"
        buttonClassName={customClassName}
      >
        {MENU_ITEMS.map((item) => {
          if (item.shouldRender === false) return null;
          return (
            <CustomMenu.MenuItem
              key={item.key}
              onClick={() => {
                item.action();
              }}
              className={cn(
                "flex items-center gap-2",
                {
                  "text-placeholder": item.disabled,
                },
                item.className
              )}
              disabled={item.disabled}
            >
              {item.icon && <item.icon className={cn("h-3 w-3 flex-shrink-0", item.iconClassName)} />}
              <div>
                <h5>{item.title}</h5>
                {item.description && (
                  <p
                    className={cn("whitespace-pre-line text-tertiary", {
                      "text-placeholder": item.disabled,
                    })}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            </CustomMenu.MenuItem>
          );
        })}
      </CustomMenu>
    </>
  );
});
