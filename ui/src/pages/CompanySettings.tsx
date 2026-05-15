import { ChangeEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_COMPANY_ATTACHMENT_MAX_BYTES,
  MAX_COMPANY_ATTACHMENT_MAX_BYTES,
} from "@paperclipai/shared";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { companiesApi } from "../api/companies";
import { companyCoreApi, type CompanyCoreCommandMode } from "../api/companycore";
import { accessApi } from "../api/access";
import { assetsApi } from "../api/assets";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Settings, Check, Download, Upload, Database, Wrench } from "lucide-react";
import { CompanyPatternIcon } from "../components/CompanyPatternIcon";
import {
  Field,
  ToggleField,
  HintIcon,
} from "../components/agent-config-primitives";

type AgentSnippetInput = {
  onboardingTextUrl: string;
  connectionCandidates?: string[] | null;
  testResolutionUrl?: string | null;
};

const BYTES_PER_MIB = 1024 * 1024;
const DEFAULT_COMPANY_ATTACHMENT_MAX_MIB = DEFAULT_COMPANY_ATTACHMENT_MAX_BYTES / BYTES_PER_MIB;
const MAX_COMPANY_ATTACHMENT_MAX_MIB = MAX_COMPANY_ATTACHMENT_MAX_BYTES / BYTES_PER_MIB;
const DEFAULT_COMPANYCORE_BASE_URL = "https://companycore.luckysparrow.ch";

export function CompanySettings() {
  const {
    companies,
    selectedCompany,
    selectedCompanyId,
    setSelectedCompanyId
  } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  // General settings local state
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [attachmentMaxMiB, setAttachmentMaxMiB] = useState(String(DEFAULT_COMPANY_ATTACHMENT_MAX_MIB));
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [companyCoreBaseUrl, setCompanyCoreBaseUrl] = useState(DEFAULT_COMPANYCORE_BASE_URL);
  const [companyCoreWorkspaceId, setCompanyCoreWorkspaceId] = useState("");
  const [companyCoreWorkspaceName, setCompanyCoreWorkspaceName] = useState("");
  const [companyCoreKnowledgeEnabled, setCompanyCoreKnowledgeEnabled] = useState(false);
  const [companyCoreKnowledgeProfileId, setCompanyCoreKnowledgeProfileId] = useState("mcp_knowledge_reader");
  const [companyCoreKnowledgeCapabilities, setCompanyCoreKnowledgeCapabilities] = useState("");
  const [companyCoreKnowledgeApiKey, setCompanyCoreKnowledgeApiKey] = useState("");
  const [companyCoreToolsEnabled, setCompanyCoreToolsEnabled] = useState(false);
  const [companyCoreToolsProfileId, setCompanyCoreToolsProfileId] = useState("mcp_operator");
  const [companyCoreToolsCommandMode, setCompanyCoreToolsCommandMode] =
    useState<CompanyCoreCommandMode>("approval_required");
  const [companyCoreToolsCapabilities, setCompanyCoreToolsCapabilities] = useState("");
  const [companyCoreToolsApiKey, setCompanyCoreToolsApiKey] = useState("");

  const companyCoreSettingsQuery = useQuery({
    queryKey: queryKeys.companyCore.settings(selectedCompanyId ?? ""),
    queryFn: () => companyCoreApi.settings(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // Sync local state from selected company
  useEffect(() => {
    if (!selectedCompany) return;
    setCompanyName(selectedCompany.name);
    setDescription(selectedCompany.description ?? "");
    setBrandColor(selectedCompany.brandColor ?? "");
    setAttachmentMaxMiB(String(Math.round((selectedCompany.attachmentMaxBytes ?? DEFAULT_COMPANY_ATTACHMENT_MAX_BYTES) / BYTES_PER_MIB)));
    setLogoUrl(selectedCompany.logoUrl ?? "");
  }, [selectedCompany]);

  useEffect(() => {
    const settings = companyCoreSettingsQuery.data;
    if (!settings) return;
    setCompanyCoreBaseUrl(settings.baseUrl ?? DEFAULT_COMPANYCORE_BASE_URL);
    setCompanyCoreWorkspaceId(settings.workspace.id ?? "");
    setCompanyCoreWorkspaceName(settings.workspace.name ?? "");
    setCompanyCoreKnowledgeEnabled(settings.knowledge.enabled);
    setCompanyCoreKnowledgeProfileId(settings.knowledge.profileId ?? "mcp_knowledge_reader");
    setCompanyCoreKnowledgeCapabilities(settings.knowledge.capabilities.join("\n"));
    setCompanyCoreKnowledgeApiKey("");
    setCompanyCoreToolsEnabled(settings.tools.enabled);
    setCompanyCoreToolsProfileId(settings.tools.profileId ?? "mcp_operator");
    setCompanyCoreToolsCommandMode(settings.tools.commandMode);
    setCompanyCoreToolsCapabilities(settings.tools.capabilities.join("\n"));
    setCompanyCoreToolsApiKey("");
  }, [companyCoreSettingsQuery.data]);

  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSnippet, setInviteSnippet] = useState<string | null>(null);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [snippetCopyDelightId, setSnippetCopyDelightId] = useState(0);

  const attachmentMaxBytes = Number.parseInt(attachmentMaxMiB, 10) * BYTES_PER_MIB;
  const attachmentMaxValid =
    Number.isInteger(attachmentMaxBytes)
    && attachmentMaxBytes >= BYTES_PER_MIB
    && attachmentMaxBytes <= MAX_COMPANY_ATTACHMENT_MAX_BYTES;

  const generalDirty =
    !!selectedCompany &&
    (companyName !== selectedCompany.name ||
      description !== (selectedCompany.description ?? "") ||
      brandColor !== (selectedCompany.brandColor ?? "") ||
      attachmentMaxBytes !== (selectedCompany.attachmentMaxBytes ?? DEFAULT_COMPANY_ATTACHMENT_MAX_BYTES));

  const companyCoreSettings = companyCoreSettingsQuery.data;
  const companyCoreKnowledgeCapabilitiesList = parseCapabilityInput(companyCoreKnowledgeCapabilities);
  const companyCoreToolsCapabilitiesList = parseCapabilityInput(companyCoreToolsCapabilities);
  const companyCoreDirty = !!companyCoreSettings && (
    companyCoreBaseUrl !== (companyCoreSettings.baseUrl ?? DEFAULT_COMPANYCORE_BASE_URL) ||
    companyCoreWorkspaceId !== (companyCoreSettings.workspace.id ?? "") ||
    companyCoreWorkspaceName !== (companyCoreSettings.workspace.name ?? "") ||
    companyCoreKnowledgeEnabled !== companyCoreSettings.knowledge.enabled ||
    companyCoreKnowledgeProfileId !== (companyCoreSettings.knowledge.profileId ?? "mcp_knowledge_reader") ||
    companyCoreKnowledgeCapabilitiesList.join("\n") !== companyCoreSettings.knowledge.capabilities.join("\n") ||
    companyCoreKnowledgeApiKey.trim().length > 0 ||
    companyCoreToolsEnabled !== companyCoreSettings.tools.enabled ||
    companyCoreToolsProfileId !== (companyCoreSettings.tools.profileId ?? "mcp_operator") ||
    companyCoreToolsCommandMode !== companyCoreSettings.tools.commandMode ||
    companyCoreToolsCapabilitiesList.join("\n") !== companyCoreSettings.tools.capabilities.join("\n") ||
    companyCoreToolsApiKey.trim().length > 0
  );

  const generalMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description: string | null;
      brandColor: string | null;
      attachmentMaxBytes: number;
    }) => companiesApi.update(selectedCompanyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    }
  });

  const settingsMutation = useMutation({
    mutationFn: (requireApproval: boolean) =>
      companiesApi.update(selectedCompanyId!, {
        requireBoardApprovalForNewAgents: requireApproval
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    }
  });

  const companyCoreMutation = useMutation({
    mutationFn: () =>
      companyCoreApi.updateSettings(selectedCompanyId!, {
        baseUrl: companyCoreBaseUrl.trim() || null,
        workspaceId: companyCoreWorkspaceId.trim() || null,
        workspaceName: companyCoreWorkspaceName.trim() || null,
        knowledge: {
          enabled: companyCoreKnowledgeEnabled,
          profileId: companyCoreKnowledgeProfileId.trim() || null,
          capabilities: companyCoreKnowledgeCapabilitiesList,
          ...(companyCoreKnowledgeApiKey.trim()
            ? { apiKey: companyCoreKnowledgeApiKey.trim() }
            : {}),
        },
        tools: {
          enabled: companyCoreToolsEnabled,
          profileId: companyCoreToolsProfileId.trim() || null,
          commandMode: companyCoreToolsCommandMode,
          capabilities: companyCoreToolsCapabilitiesList,
          ...(companyCoreToolsApiKey.trim()
            ? { apiKey: companyCoreToolsApiKey.trim() }
            : {}),
        },
      }),
    onSuccess: () => {
      setCompanyCoreKnowledgeApiKey("");
      setCompanyCoreToolsApiKey("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.companyCore.settings(selectedCompanyId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.companyCore.connection(selectedCompanyId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.companyCore.overview(selectedCompanyId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.companyCore.health(selectedCompanyId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.companyCore.manifest(selectedCompanyId!) });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      accessApi.createOpenClawInvitePrompt(selectedCompanyId!),
    onSuccess: async (invite) => {
      setInviteError(null);
      const base = window.location.origin.replace(/\/+$/, "");
      const onboardingTextLink =
        invite.onboardingTextUrl ??
        invite.onboardingTextPath ??
        `/api/invites/${invite.token}/onboarding.txt`;
      const absoluteUrl = onboardingTextLink.startsWith("http")
        ? onboardingTextLink
        : `${base}${onboardingTextLink}`;
      setSnippetCopied(false);
      setSnippetCopyDelightId(0);
      let snippet: string;
      try {
        const manifest = await accessApi.getInviteOnboarding(invite.token);
        snippet = buildAgentSnippet({
          onboardingTextUrl: absoluteUrl,
          connectionCandidates:
            manifest.onboarding.connectivity?.connectionCandidates ?? null,
          testResolutionUrl:
            manifest.onboarding.connectivity?.testResolutionEndpoint?.url ??
            null
        });
      } catch {
        snippet = buildAgentSnippet({
          onboardingTextUrl: absoluteUrl,
          connectionCandidates: null,
          testResolutionUrl: null
        });
      }
      setInviteSnippet(snippet);
      try {
        await navigator.clipboard.writeText(snippet);
        setSnippetCopied(true);
        setSnippetCopyDelightId((prev) => prev + 1);
        setTimeout(() => setSnippetCopied(false), 2000);
      } catch {
        /* clipboard may not be available */
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.sidebarBadges(selectedCompanyId!)
      });
    },
    onError: (err) => {
      setInviteError(
        err instanceof Error ? err.message : "Failed to create invite"
      );
    }
  });

  const syncLogoState = (nextLogoUrl: string | null) => {
    setLogoUrl(nextLogoUrl ?? "");
    void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
  };

  const logoUploadMutation = useMutation({
    mutationFn: (file: File) =>
      assetsApi
        .uploadCompanyLogo(selectedCompanyId!, file)
        .then((asset) => companiesApi.update(selectedCompanyId!, { logoAssetId: asset.assetId })),
    onSuccess: (company) => {
      syncLogoState(company.logoUrl);
      setLogoUploadError(null);
    }
  });

  const clearLogoMutation = useMutation({
    mutationFn: () => companiesApi.update(selectedCompanyId!, { logoAssetId: null }),
    onSuccess: (company) => {
      setLogoUploadError(null);
      syncLogoState(company.logoUrl);
    }
  });

  function handleLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!file) return;
    setLogoUploadError(null);
    logoUploadMutation.mutate(file);
  }

  function handleClearLogo() {
    clearLogoMutation.mutate();
  }

  useEffect(() => {
    setInviteError(null);
    setInviteSnippet(null);
    setSnippetCopied(false);
    setSnippetCopyDelightId(0);
  }, [selectedCompanyId]);

  const archiveMutation = useMutation({
    mutationFn: ({
      companyId,
      nextCompanyId
    }: {
      companyId: string;
      nextCompanyId: string | null;
    }) => companiesApi.archive(companyId).then(() => ({ nextCompanyId })),
    onSuccess: async ({ nextCompanyId }) => {
      if (nextCompanyId) {
        setSelectedCompanyId(nextCompanyId);
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.companies.all
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.companies.stats
      });
    }
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
      { label: "Settings" }
    ]);
  }, [setBreadcrumbs, selectedCompany?.name]);

  if (!selectedCompany) {
    return (
      <div className="text-sm text-muted-foreground">
        No company selected. Select a company from the switcher above.
      </div>
    );
  }

  function handleSaveGeneral() {
    generalMutation.mutate({
      name: companyName.trim(),
      description: description.trim() || null,
      brandColor: brandColor || null,
      attachmentMaxBytes
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Company Settings</h1>
      </div>

      {/* General */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          General
        </div>
        <div className="space-y-3 rounded-md border border-border px-4 py-4">
          <Field label="Company name" hint="The display name for your company.">
            <input
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </Field>
          <Field
            label="Description"
            hint="Optional description shown in the company profile."
          >
            <input
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
              type="text"
              value={description}
              placeholder="Optional company description"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Appearance */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Appearance
        </div>
        <div className="space-y-3 rounded-md border border-border px-4 py-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <CompanyPatternIcon
                companyName={companyName || selectedCompany.name}
                logoUrl={logoUrl || null}
                brandColor={brandColor || null}
                className="rounded-[14px]"
              />
            </div>
            <div className="flex-1 space-y-3">
              <Field
                label="Logo"
                hint="Upload a PNG, JPEG, WEBP, GIF, or SVG logo image."
              >
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-xs"
                  />
                  {logoUrl && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearLogo}
                        disabled={clearLogoMutation.isPending}
                      >
                        {clearLogoMutation.isPending ? "Removing..." : "Remove logo"}
                      </Button>
                    </div>
                  )}
                  {(logoUploadMutation.isError || logoUploadError) && (
                    <span className="text-xs text-destructive">
                      {logoUploadError ??
                        (logoUploadMutation.error instanceof Error
                          ? logoUploadMutation.error.message
                          : "Logo upload failed")}
                    </span>
                  )}
                  {clearLogoMutation.isError && (
                    <span className="text-xs text-destructive">
                      {clearLogoMutation.error.message}
                    </span>
                  )}
                  {logoUploadMutation.isPending && (
                    <span className="text-xs text-muted-foreground">Uploading logo...</span>
                  )}
                </div>
              </Field>
              <Field
                label="Brand color"
                hint="Sets the hue for the company icon. Leave empty for auto-generated color."
              >
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColor || "#6366f1"}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^#[0-9a-fA-F]{0,6}$/.test(v)) {
                        setBrandColor(v);
                      }
                    }}
                    placeholder="Auto"
                    className="w-28 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none"
                  />
                  {brandColor && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setBrandColor("")}
                      className="text-xs text-muted-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </Field>
              <Field
                label="Attachment size limit"
                hint={`Accepted range: 1-${MAX_COMPANY_ATTACHMENT_MAX_MIB} MiB.`}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={MAX_COMPANY_ATTACHMENT_MAX_MIB}
                      step={1}
                      value={attachmentMaxMiB}
                      onChange={(e) => setAttachmentMaxMiB(e.target.value)}
                      className="w-28 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                    />
                    <span className="text-xs text-muted-foreground">MiB</span>
                  </div>
                  {!attachmentMaxValid && (
                    <span className="text-xs text-destructive">
                      Enter a whole number from 1 to {MAX_COMPANY_ATTACHMENT_MAX_MIB}.
                    </span>
                  )}
                </div>
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* Save button for General + Appearance */}
      {generalDirty && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSaveGeneral}
            disabled={generalMutation.isPending || !companyName.trim() || !attachmentMaxValid}
          >
            {generalMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
          {generalMutation.isSuccess && (
            <span className="text-xs text-muted-foreground">Saved</span>
          )}
          {generalMutation.isError && (
            <span className="text-xs text-destructive">
              {generalMutation.error instanceof Error
                  ? generalMutation.error.message
                  : "Failed to save"}
            </span>
          )}
        </div>
      )}

      {/* CompanyCore */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          CompanyCore
        </div>
        <div className="space-y-4 rounded-md border border-border px-4 py-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Base URL" hint="CompanyCore API origin used by Paperclip server routes.">
              <input
                className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                type="url"
                value={companyCoreBaseUrl}
                onChange={(e) => setCompanyCoreBaseUrl(e.target.value)}
              />
            </Field>
            <Field label="Workspace ID" hint="Optional CompanyCore workspace identifier.">
              <input
                className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                type="text"
                value={companyCoreWorkspaceId}
                onChange={(e) => setCompanyCoreWorkspaceId(e.target.value)}
              />
            </Field>
            <Field label="Workspace name" hint="Optional label shown to operators.">
              <input
                className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                type="text"
                value={companyCoreWorkspaceName}
                onChange={(e) => setCompanyCoreWorkspaceName(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-md border border-border/70 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium">Knowledge</div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {companyCoreSettings?.knowledge.apiKeyConfigured
                    ? `key ${companyCoreSettings.knowledge.apiKeyPreview ?? "configured"}`
                    : "no key"}
                </span>
              </div>
              <ToggleField
                label="Enable Knowledge bridge"
                hint="Uses a read-scoped CompanyCore key for connection health and knowledge overview."
                checked={companyCoreKnowledgeEnabled}
                onChange={setCompanyCoreKnowledgeEnabled}
              />
              <Field label="Profile" hint="CompanyCore API key profile used for this surface.">
                <input
                  className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                  type="text"
                  value={companyCoreKnowledgeProfileId}
                  onChange={(e) => setCompanyCoreKnowledgeProfileId(e.target.value)}
                />
              </Field>
              <Field label="API key" hint="Leave empty to keep the stored key.">
                <input
                  className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                  type="password"
                  autoComplete="off"
                  value={companyCoreKnowledgeApiKey}
                  placeholder={companyCoreSettings?.knowledge.apiKeyConfigured ? "Stored key configured" : "Paste CompanyCore key"}
                  onChange={(e) => setCompanyCoreKnowledgeApiKey(e.target.value)}
                />
              </Field>
              <Field label="Capabilities" hint="One capability per line or comma separated.">
                <textarea
                  className="min-h-24 w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                  value={companyCoreKnowledgeCapabilities}
                  onChange={(e) => setCompanyCoreKnowledgeCapabilities(e.target.value)}
                />
              </Field>
            </div>

            <div className="space-y-3 rounded-md border border-border/70 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium">Tools</div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {companyCoreSettings?.tools.apiKeyConfigured
                    ? `key ${companyCoreSettings.tools.apiKeyPreview ?? "configured"}`
                    : "no key"}
                </span>
              </div>
              <ToggleField
                label="Enable Tools bridge"
                hint="Uses a tool-scoped CompanyCore key for MCP manifest and governed actions."
                checked={companyCoreToolsEnabled}
                onChange={setCompanyCoreToolsEnabled}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Profile" hint="CompanyCore API key profile used for tools.">
                  <input
                    className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                    type="text"
                    value={companyCoreToolsProfileId}
                    onChange={(e) => setCompanyCoreToolsProfileId(e.target.value)}
                  />
                </Field>
                <Field label="Command mode" hint="How Paperclip should treat CompanyCore tool writes.">
                  <select
                    className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                    value={companyCoreToolsCommandMode}
                    onChange={(e) => setCompanyCoreToolsCommandMode(e.target.value as CompanyCoreCommandMode)}
                  >
                    <option value="read_only">Read only</option>
                    <option value="draft_only">Draft only</option>
                    <option value="approval_required">Approval required</option>
                    <option value="supervised_operator">Supervised operator</option>
                  </select>
                </Field>
              </div>
              <Field label="API key" hint="Leave empty to keep the stored key.">
                <input
                  className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                  type="password"
                  autoComplete="off"
                  value={companyCoreToolsApiKey}
                  placeholder={companyCoreSettings?.tools.apiKeyConfigured ? "Stored key configured" : "Paste CompanyCore key"}
                  onChange={(e) => setCompanyCoreToolsApiKey(e.target.value)}
                />
              </Field>
              <Field label="Capabilities" hint="One capability per line or comma separated.">
                <textarea
                  className="min-h-24 w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                  value={companyCoreToolsCapabilities}
                  onChange={(e) => setCompanyCoreToolsCapabilities(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => companyCoreMutation.mutate()}
              disabled={companyCoreMutation.isPending || !companyCoreDirty || !companyCoreBaseUrl.trim()}
            >
              {companyCoreMutation.isPending ? "Saving..." : "Save CompanyCore"}
            </Button>
            {companyCoreSettingsQuery.isLoading && (
              <span className="text-xs text-muted-foreground">Loading CompanyCore settings...</span>
            )}
            {companyCoreMutation.isSuccess && (
              <span className="text-xs text-muted-foreground">Saved</span>
            )}
            {(companyCoreSettingsQuery.isError || companyCoreMutation.isError) && (
              <span className="text-xs text-destructive">
                {companyCoreMutation.error instanceof Error
                  ? companyCoreMutation.error.message
                  : companyCoreSettingsQuery.error instanceof Error
                  ? companyCoreSettingsQuery.error.message
                  : "CompanyCore settings failed"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hiring */}
      <div className="space-y-4" data-testid="company-settings-team-section">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Hiring
        </div>
        <div className="rounded-md border border-border px-4 py-3">
          <ToggleField
            label="Require board approval for new hires"
            hint="New agent hires stay pending until approved by board."
            checked={!!selectedCompany.requireBoardApprovalForNewAgents}
            onChange={(v) => settingsMutation.mutate(v)}
            toggleTestId="company-settings-team-approval-toggle"
          />
        </div>
      </div>

      {/* Invites */}
      <div className="space-y-4" data-testid="company-settings-invites-section">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Invites
        </div>
        <div className="space-y-3 rounded-md border border-border px-4 py-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              Generate an OpenClaw agent invite snippet.
            </span>
            <HintIcon text="Creates a short-lived OpenClaw agent invite and renders a copy-ready prompt." />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              data-testid="company-settings-invites-generate-button"
              size="sm"
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending
                ? "Generating..."
                : "Generate OpenClaw Invite Prompt"}
            </Button>
          </div>
          {inviteError && (
            <p className="text-sm text-destructive">{inviteError}</p>
          )}
          {inviteSnippet && (
            <div
              className="rounded-md border border-border bg-muted/30 p-2"
              data-testid="company-settings-invites-snippet"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  OpenClaw Invite Prompt
                </div>
                {snippetCopied && (
                  <span
                    key={snippetCopyDelightId}
                    className="flex items-center gap-1 text-xs text-green-600 animate-pulse"
                  >
                    <Check className="h-3 w-3" />
                    Copied
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-1.5">
                <textarea
                  data-testid="company-settings-invites-snippet-textarea"
                  className="h-[28rem] w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none"
                  value={inviteSnippet}
                  readOnly
                />
                <div className="flex justify-end">
                  <Button
                    data-testid="company-settings-invites-copy-button"
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteSnippet);
                        setSnippetCopied(true);
                        setSnippetCopyDelightId((prev) => prev + 1);
                        setTimeout(() => setSnippetCopied(false), 2000);
                      } catch {
                        /* clipboard may not be available */
                      }
                    }}
                  >
                    {snippetCopied ? "Copied snippet" : "Copy snippet"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import / Export */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Company Packages
        </div>
        <div className="rounded-md border border-border px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Import and export have moved to dedicated pages accessible from the{" "}
            <a href="/org" className="underline hover:text-foreground">Org Chart</a> header.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href="/company/export">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href="/company/import">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Import
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-destructive uppercase tracking-wide">
          Danger Zone
        </div>
        <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Archive this company to hide it from the sidebar. This persists in
            the database.
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={
                archiveMutation.isPending ||
                selectedCompany.status === "archived"
              }
              onClick={() => {
                if (!selectedCompanyId) return;
                const confirmed = window.confirm(
                  `Archive company "${selectedCompany.name}"? It will be hidden from the sidebar.`
                );
                if (!confirmed) return;
                const nextCompanyId =
                  companies.find(
                    (company) =>
                      company.id !== selectedCompanyId &&
                      company.status !== "archived"
                  )?.id ?? null;
                archiveMutation.mutate({
                  companyId: selectedCompanyId,
                  nextCompanyId
                });
              }}
            >
              {archiveMutation.isPending
                ? "Archiving..."
                : selectedCompany.status === "archived"
                ? "Already archived"
                : "Archive company"}
            </Button>
            {archiveMutation.isError && (
              <span className="text-xs text-destructive">
                {archiveMutation.error instanceof Error
                  ? archiveMutation.error.message
                  : "Failed to archive company"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildAgentSnippet(input: AgentSnippetInput) {
  const candidateUrls = buildCandidateOnboardingUrls(input);
  const resolutionTestUrl = buildResolutionTestUrl(input);

  const candidateList =
    candidateUrls.length > 0
      ? candidateUrls.map((u) => `- ${u}`).join("\n")
      : "- (No candidate URLs available yet.)";

  const connectivityBlock =
    candidateUrls.length === 0
      ? `No candidate URLs are available. Ask your user to configure a reachable hostname in Paperclip, then retry.
Suggested steps:
- choose a hostname that resolves to the Paperclip host from your runtime
- run: pnpm paperclipai allowed-hostname <host>
- restart Paperclip
- verify with: curl -fsS http://<host>:3100/api/health
- regenerate this invite snippet`
      : `If none are reachable, ask your user to add a reachable hostname in Paperclip, restart, and retry.
Suggested command:
- pnpm paperclipai allowed-hostname <host>
Then verify with: curl -fsS <base-url>/api/health`;

  const resolutionLine = resolutionTestUrl
    ? `\nYou MUST test Paperclip-to-gateway reachability, call: ${resolutionTestUrl}?url=<urlencoded-gateway-url> (using the hostname that worked above). Do not assume your 172.x is necessarily reachable from Paperclip. Test it. `
    : "";

  return `You're invited to join a Paperclip organization.

The URLs you should try are:
${candidateList}

Connectivity guidance:
If you are running on a different machine than Paperclip, Paperclip must be reachable at one of the hostnames used above.
Verify the hostname works from your runtime with: GET <base-url>/api/health

${connectivityBlock}

For your "agentName", just use your own agent name (OpenClaw or whatever your name is) and send it directly.
You also need to send a gateway URL that Paperclip can access. Check your config and include that URL.${resolutionLine}

---

This onboarding flow is for OpenClaw Gateway.
When you submit the join request, use:
- \`adapterType: "openclaw_gateway"\`
- \`agentDefaultsPayload.url\` as your \`ws://\` or \`wss://\` gateway URL
- \`agentDefaultsPayload.headers["x-openclaw-token"]\` with your gateway token
- (legacy accepted) \`agentDefaultsPayload.headers["x-openclaw-auth"]\`
- Keep device auth enabled (recommended). If \`devicePrivateKeyPem\` is omitted, Paperclip will generate and persist one during join so pairing approvals remain stable.
- Only use \`disableDeviceAuth=true\` for special environments where pairing cannot be completed.

Do NOT use \`/v1/responses\` or \`/hooks/*\` in this join flow.

Before you do anything, please respond to your user that you understand the instructions and you're going to work on them. Then do the step above in another session called "paperclip-onboarding" and then tell your user when you're done. Update your user in intermediate steps along the way so they know what's going on.

Then after you've connected to Paperclip (exchanged keys etc.) you MUST review and follow the onboarding instructions in onboarding.txt they give you.

`;
}

function parseCapabilityInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function buildCandidateOnboardingUrls(input: AgentSnippetInput): string[] {
  const candidates = (input.connectionCandidates ?? [])
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  const urls = new Set<string>();
  let onboardingUrl: URL | null = null;

  try {
    onboardingUrl = new URL(input.onboardingTextUrl);
    urls.add(onboardingUrl.toString());
  } catch {
    const trimmed = input.onboardingTextUrl.trim();
    if (trimmed) {
      urls.add(trimmed);
    }
  }

  if (!onboardingUrl) {
    for (const candidate of candidates) {
      urls.add(candidate);
    }
    return Array.from(urls);
  }

  const onboardingPath = `${onboardingUrl.pathname}${onboardingUrl.search}`;
  for (const candidate of candidates) {
    try {
      const base = new URL(candidate);
      urls.add(`${base.origin}${onboardingPath}`);
    } catch {
      urls.add(candidate);
    }
  }

  return Array.from(urls);
}

function buildResolutionTestUrl(input: AgentSnippetInput): string | null {
  const explicit = input.testResolutionUrl?.trim();
  if (explicit) return explicit;

  try {
    const onboardingUrl = new URL(input.onboardingTextUrl);
    const testPath = onboardingUrl.pathname.replace(
      /\/onboarding\.txt$/,
      "/test-resolution"
    );
    return `${onboardingUrl.origin}${testPath}`;
  } catch {
    return null;
  }
}
