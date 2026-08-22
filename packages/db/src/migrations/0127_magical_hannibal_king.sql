WITH ranked_shared_workspaces AS (
	SELECT
		workspace.id,
		row_number() OVER (
			PARTITION BY workspace.company_id, workspace.source_issue_id, workspace.project_workspace_id
			ORDER BY
				CASE WHEN issue.execution_workspace_id = workspace.id THEN 0 ELSE 1 END,
				workspace.last_used_at DESC,
				workspace.created_at DESC,
				workspace.id DESC
		) AS duplicate_rank
	FROM execution_workspaces AS workspace
	LEFT JOIN issues AS issue
		ON issue.id = workspace.source_issue_id
		AND issue.company_id = workspace.company_id
	WHERE workspace.mode = 'shared_workspace'
		AND workspace.status IN ('active', 'idle', 'in_review')
		AND workspace.source_issue_id IS NOT NULL
		AND workspace.project_workspace_id IS NOT NULL
)
UPDATE execution_workspaces
SET
	status = 'archived',
	closed_at = now(),
	cleanup_eligible_at = now(),
	cleanup_reason = 'deduplicated_before_shared_workspace_unique_index',
	updated_at = now()
WHERE id IN (
	SELECT id
	FROM ranked_shared_workspaces
	WHERE duplicate_rank > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX "execution_workspaces_active_shared_issue_workspace_unique" ON "execution_workspaces" USING btree ("company_id","source_issue_id","project_workspace_id") WHERE "execution_workspaces"."mode" = 'shared_workspace' and "execution_workspaces"."status" in ('active', 'idle', 'in_review') and "execution_workspaces"."source_issue_id" is not null and "execution_workspaces"."project_workspace_id" is not null;
