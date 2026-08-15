import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const rosterPath = path.resolve(moduleDir, "..", "..", "softwarehouse", "agent-roster.json");
const key = (slug) => `paperclipai/paperclip/${slug}`;

export const PAPERCLIP_OPTIONAL_SKILL_KEYS = Object.freeze([
  key("diagnose-why-work-stopped"),
  key("paperclip-converting-plans-to-tasks"),
  key("paperclip-create-agent"),
  key("paperclip-create-plugin"),
  key("paperclip-dev"),
  key("para-memory-files"),
  key("terminal-bench-loop"),
]);

export const BROWSER_CAPABILITY_AGENT_NAMES = Object.freeze([
  "02 UID (UI Visual Designer)",
  "02 UXW (UX Web Designer)",
  "09 DRE (Deployment & Reliability Engineer)",
  "09 FEW (Frontend Web Engineer)",
  "09 QVE (QA & Verification Engineer)",
  "09 TAE (Test Automation Engineer)",
]);

export const COMPANYCORE_CAPABILITY_AGENT_NAMES = Object.freeze([
  "00 AIA (AI Assistant)",
  "04 COO (Chief Operating Officer)",
  "09 CTO (Chief Technology Officer)",
  "09 DRE (Deployment & Reliability Engineer)",
  "09 QVE (QA & Verification Engineer)",
  "11 RPM (Roost Project Manager)",
]);

export const WEB_SEARCH_AGENT_NAMES = Object.freeze([
  "00 AIA (AI Assistant)",
  "01 CSO (Chief Strategy Officer)",
  "02 CPO (Chief Product Officer)",
  "02 WPM (Web Product Manager)",
  "03 CRO (Chief Revenue Officer)",
  "05 CCO (Chief Customer Officer)",
  "05 CSM (Client Success Manager)",
  "07 CFO (Chief Financial Officer)",
  "08 CAO (Chief Assets Officer)",
  "10 CLO (Chief Legal Officer)",
  "11 CINO (Chief Innovation Officer)",
  "11 IPM (Innovation Portfolio Manager)",
]);

const groups = Object.freeze({
  managers: [
    "00 AIA (AI Assistant)", "01 CSO (Chief Strategy Officer)",
    "02 CPO (Chief Product Officer)", "02 WPM (Web Product Manager)",
    "04 COO (Chief Operating Officer)", "04 DPM (Delivery Project Manager)",
    "06 AIM (AI Agent Manager)", "09 CTO (Chief Technology Officer)",
    "09 EDL (Engineering Delivery Lead)", "09 TSA (Technical Solution Architect)",
    "11 APM (Aviary Product Manager)", "11 CINO (Chief Innovation Officer)",
    "11 FPM (Featherly Platform Manager)", "11 IPM (Innovation Portfolio Manager)",
    "11 NPM (Nest Product Manager)", "11 RPM (Roost Project Manager)",
    "11 SPM (Soar Product Manager)", "12 CEO (Chief Executive Officer)",
  ],
  engineering: [
    "09 CBE (Core Backend Engineer)", "09 CRS (Code Review Specialist)",
    "09 CTO (Chief Technology Officer)", "09 DBE (Data Persistence Engineer)",
    "09 DRE (Deployment & Reliability Engineer)", "09 EDL (Engineering Delivery Lead)",
    "09 FEW (Frontend Web Engineer)", "09 IDE (Integration Domain Engineer)",
    "09 QVE (QA & Verification Engineer)", "09 RTE (Runtime & Adapter Engineer)",
    "09 TAE (Test Automation Engineer)", "09 TSA (Technical Solution Architect)",
    "10 SPA (Security & Privacy Auditor)",
  ],
  projectManagers: [
    "11 APM (Aviary Product Manager)", "11 FPM (Featherly Platform Manager)",
    "11 NPM (Nest Product Manager)", "11 RPM (Roost Project Manager)",
    "11 SPM (Soar Product Manager)",
  ],
  design: [
    "02 CPO (Chief Product Officer)", "02 UID (UI Visual Designer)",
    "02 UXW (UX Web Designer)", "02 WPM (Web Product Manager)",
  ],
});

const unique = (values) => [...new Set(values)];

function entries(skillKey, names) {
  return names.map((name) => [name, skillKey]);
}

const ROLE_SKILL_ENTRIES = [
  ...entries(key("diagnose-why-work-stopped"), [
    "00 AIA (AI Assistant)", "04 COO (Chief Operating Officer)",
    "06 AIM (AI Agent Manager)", "09 CTO (Chief Technology Officer)",
    "09 EDL (Engineering Delivery Lead)", "09 QVE (QA & Verification Engineer)",
    "09 RTE (Runtime & Adapter Engineer)",
  ]),
  ...entries(key("paperclip-converting-plans-to-tasks"), groups.managers),
  ...entries(key("paperclip-create-agent"), ["06 AIM (AI Agent Manager)"]),
  ...entries(key("paperclip-create-plugin"), ["09 RTE (Runtime & Adapter Engineer)"]),
  ...entries(key("paperclip-dev"), groups.engineering),
  ...entries(key("para-memory-files"), ["00 AIA (AI Assistant)", "04 DSM (Documentation Steward)"]),
  ...entries(key("terminal-bench-loop"), [
    "09 QVE (QA & Verification Engineer)", "09 RTE (Runtime & Adapter Engineer)",
    "09 TAE (Test Automation Engineer)",
  ]),
  ...entries("paperclipai/bundled/paperclip-operations/task-planning", groups.managers),
  ...entries("paperclipai/bundled/paperclip-operations/issue-triage", unique([
    ...groups.projectManagers,
    "00 AIA (AI Assistant)", "04 COO (Chief Operating Officer)",
    "04 DPM (Delivery Project Manager)", "06 AIM (AI Agent Manager)",
    "09 CTO (Chief Technology Officer)", "09 EDL (Engineering Delivery Lead)",
    "11 CINO (Chief Innovation Officer)", "11 IPM (Innovation Portfolio Manager)",
  ])),
  ...entries("paperclipai/bundled/paperclip-operations/agent-development-review", [
    "00 AIA (AI Assistant)", "04 COO (Chief Operating Officer)",
    "04 DSM (Documentation Steward)", "06 AIM (AI Agent Manager)",
    "09 CTO (Chief Technology Officer)",
  ]),
  ...entries("paperclipai/bundled/docs/doc-maintenance", unique([
    ...groups.engineering, ...groups.projectManagers,
    "02 CPO (Chief Product Officer)", "02 WPM (Web Product Manager)",
    "04 DSM (Documentation Steward)",
  ])),
  ...entries("paperclipai/bundled/software-development/github-pr-workflow", groups.engineering),
  ...entries("paperclipai/bundled/quality/qa-acceptance", unique([
    ...groups.engineering, ...groups.projectManagers, ...groups.design,
  ])),
  ...entries("paperclipai/bundled/product/wireframe", groups.design),
  ...entries("paperclipai/optional/product/design-critique", groups.design),
  ...entries("paperclipai/optional/browser/agent-browser", BROWSER_CAPABILITY_AGENT_NAMES),
  ...entries("paperclipai/optional/content/release-announcement", [
    "03 CRO (Chief Revenue Officer)", "05 CCO (Chief Customer Officer)",
    "05 CSM (Client Success Manager)", "08 CAO (Chief Assets Officer)",
    "09 DRE (Deployment & Reliability Engineer)",
  ]),
];

const ROLE_SKILLS = new Map();
for (const [name, skill] of ROLE_SKILL_ENTRIES) {
  const current = ROLE_SKILLS.get(name) ?? [];
  current.push(skill);
  ROLE_SKILLS.set(name, current);
}

export function desiredSkillsForAgent(agentName) {
  return unique(ROLE_SKILLS.get(agentName) ?? []).sort();
}

export function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

export function hasMcpServer(rawConfig, serverName) {
  const prefix = `mcp_servers.${serverName}.`;
  return stringArray(asRecord(rawConfig).extraArgs).some((value) => value.includes(prefix));
}

export function cheapAdapterConfig(agent) {
  return asRecord(asRecord(asRecord(agent.runtimeConfig).modelProfiles).cheap).adapterConfig;
}

export function capabilityExpectations(agentName) {
  return {
    browser: BROWSER_CAPABILITY_AGENT_NAMES.includes(agentName),
    companycore: COMPANYCORE_CAPABILITY_AGENT_NAMES.includes(agentName),
    webSearch: WEB_SEARCH_AGENT_NAMES.includes(agentName),
  };
}

export function skillPolicyDiff(agentName, actualDesiredSkills) {
  const expected = desiredSkillsForAgent(agentName);
  const actual = unique(actualDesiredSkills).sort();
  return {
    expected,
    actual,
    missing: expected.filter((skill) => !actual.includes(skill)),
    unexpected: actual.filter((skill) => !expected.includes(skill) && skill !== key("paperclip")),
  };
}

export async function loadRosterAgentNames() {
  const roster = JSON.parse(await readFile(rosterPath, "utf8"));
  return stringArray(roster.agents?.map((agent) => agent?.name)).sort();
}

export function agentRosterDiff(actualAgents, expectedNames) {
  const actualNames = actualAgents.map((agent) => agent?.name).filter((name) => typeof name === "string");
  const duplicates = unique(actualNames.filter((name, index) => actualNames.indexOf(name) !== index)).sort();
  const actual = unique(actualNames).sort();
  const expected = unique(expectedNames).sort();
  return {
    missing: expected.filter((name) => !actual.includes(name)),
    unexpected: actual.filter((name) => !expected.includes(name)),
    duplicates,
  };
}
