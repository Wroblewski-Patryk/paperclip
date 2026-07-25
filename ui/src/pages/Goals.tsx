import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { goalsApi } from "../api/goals";
import { useCompany } from "../context/CompanyContext";
import { useDialogActions } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { GoalTree } from "../components/GoalTree";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Target, Plus, CheckCircle2, GitBranch } from "lucide-react";

export function Goals() {
  const { selectedCompanyId } = useCompany();
  const { openNewGoal } = useDialogActions();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Goals" }]);
  }, [setBreadcrumbs]);

  const { data: goals, isLoading, error } = useQuery({
    queryKey: queryKeys.goals.list(selectedCompanyId!),
    queryFn: () => goalsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={Target} message="Select a company to view goals." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Goals</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Connect company outcomes to the projects and work that move them forward.</p>
        </div>
        <Button size="sm" onClick={() => openNewGoal()}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New goal
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {goals && goals.length === 0 && (
        <EmptyState
          icon={Target}
          title="Turn direction into a visible goal tree"
          message="Create the first goal, then connect child goals so everyone can see how work supports the company outcome."
          examples={["Company outcome", "Team objective", "Project target"]}
          action="Create first goal"
          onAction={() => openNewGoal()}
        />
      )}

      {goals && goals.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="paperclip-surface p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Target className="h-3.5 w-3.5 text-[var(--company-accent-strong)]" />Total goals</div><div className="mt-1 text-xl font-semibold">{goals.length}</div></div>
            <div className="paperclip-surface p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--company-accent-strong)]" />Achieved</div><div className="mt-1 text-xl font-semibold">{goals.filter((goal) => goal.status === "achieved").length}</div></div>
            <div className="paperclip-surface p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><GitBranch className="h-3.5 w-3.5 text-[var(--company-accent-strong)]" />Root outcomes</div><div className="mt-1 text-xl font-semibold">{goals.filter((goal) => !goal.parentId).length}</div></div>
          </div>
          <GoalTree goals={goals} goalLink={(goal) => `/goals/${goal.id}`} />
        </>
      )}
    </div>
  );
}
