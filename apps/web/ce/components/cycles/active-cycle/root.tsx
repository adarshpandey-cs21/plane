/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { Disclosure } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { ICycle } from "@plane/types";
import { Row } from "@plane/ui";
import { cn } from "@plane/utils";
// components
import { ActiveCycleStats } from "@/components/cycles/active-cycle/cycle-stats";
import { ActiveCycleProductivity } from "@/components/cycles/active-cycle/productivity";
import { ActiveCycleProgress } from "@/components/cycles/active-cycle/progress";
import useCyclesDetails from "@/components/cycles/active-cycle/use-cycles-details";
import { CycleListGroupHeader } from "@/components/cycles/list/cycle-list-group-header";
import { CyclesListItem } from "@/components/cycles/list/cycles-list-item";
// hooks
import { useCycle } from "@/hooks/store/use-cycle";
import type { ActiveCycleIssueDetails } from "@/store/issue/cycle";

interface IActiveCycleDetails {
  workspaceSlug: string;
  projectId: string;
  cycleId?: string;
  showHeader?: boolean;
}

type StatsProps = {
  cycleId: string;
  activeCycle: ICycle;
  workspaceSlug: string;
  projectId: string;
  handleFiltersUpdate: (filters: any) => void;
  cycleIssueDetails?: ActiveCycleIssueDetails | { nextPageResults: boolean };
};

const ActiveCycleStatsPanel = observer(function ActiveCycleStatsPanel({
  cycleId,
  activeCycle,
  workspaceSlug,
  projectId,
  handleFiltersUpdate,
  cycleIssueDetails,
}: StatsProps) {
  return (
    <Row className="bg-surface-1 pt-3 pb-6">
      <div className="grid grid-cols-1 gap-3 bg-surface-1 lg:grid-cols-2 xl:grid-cols-3">
        <ActiveCycleProgress
          handleFiltersUpdate={handleFiltersUpdate}
          projectId={projectId}
          workspaceSlug={workspaceSlug}
          cycle={activeCycle}
        />
        <ActiveCycleProductivity workspaceSlug={workspaceSlug} projectId={projectId} cycle={activeCycle} />
        <ActiveCycleStats
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          cycle={activeCycle}
          cycleId={cycleId}
          handleFiltersUpdate={handleFiltersUpdate}
          cycleIssueDetails={cycleIssueDetails}
        />
      </div>
    </Row>
  );
});

const SingleActiveCycle = observer(function SingleActiveCycle({
  cycleId,
  workspaceSlug,
  projectId,
  defaultExpanded,
}: {
  cycleId: string;
  workspaceSlug: string;
  projectId: string;
  defaultExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const {
    handleFiltersUpdate,
    cycle: activeCycle,
    cycleIssueDetails,
  } = useCyclesDetails({ workspaceSlug, projectId, cycleId });

  if (!activeCycle) return null;

  return (
    <div className="flex flex-col border-b border-subtle">
      <div className="flex items-center">
        <div className="min-w-0 flex-1">
          <CyclesListItem
            cycleId={cycleId}
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            className="!border-b-transparent"
          />
        </div>
        <button
          type="button"
          className="hover:bg-surface-3 mr-4 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <ChevronDown
            className={cn("h-4 w-4 text-tertiary transition-transform", {
              "rotate-180": !isExpanded,
            })}
          />
        </button>
      </div>
      {isExpanded && (
        <ActiveCycleStatsPanel
          cycleId={cycleId}
          activeCycle={activeCycle}
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          handleFiltersUpdate={handleFiltersUpdate}
          cycleIssueDetails={cycleIssueDetails}
        />
      )}
    </div>
  );
});

export const ActiveCycleRoot = observer(function ActiveCycleRoot(props: IActiveCycleDetails) {
  const { workspaceSlug, projectId, cycleId: propsCycleId, showHeader = true } = props;
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { currentProjectActiveCycleIds } = useCycle();
  // derived values
  const cycleIds = propsCycleId ? [propsCycleId] : (currentProjectActiveCycleIds ?? []);
  const hasActiveCycles = cycleIds.length > 0;

  const content = hasActiveCycles ? (
    <>
      {cycleIds.map((id, index) => (
        <SingleActiveCycle
          key={id}
          cycleId={id}
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          defaultExpanded={index === 0}
        />
      ))}
    </>
  ) : (
    <EmptyStateDetailed
      assetKey="cycle"
      title={t("project_cycles.empty_state.active.title")}
      description={t("project_cycles.empty_state.active.description")}
      rootClassName="py-10 h-auto"
    />
  );

  return (
    <>
      {showHeader ? (
        <Disclosure as="div" className="flex flex-shrink-0 flex-col" defaultOpen>
          {({ open }) => (
            <>
              <Disclosure.Button className="sticky top-0 z-[2] w-full flex-shrink-0 cursor-pointer border-b border-subtle bg-layer-1">
                <CycleListGroupHeader
                  title={t("project_cycles.active_cycle.label")}
                  type="current"
                  count={cycleIds.length}
                  showCount={cycleIds.length > 1}
                  isExpanded={open}
                />
              </Disclosure.Button>
              <Disclosure.Panel>{content}</Disclosure.Panel>
            </>
          )}
        </Disclosure>
      ) : (
        content
      )}
    </>
  );
});
