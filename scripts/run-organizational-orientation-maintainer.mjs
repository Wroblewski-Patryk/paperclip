const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const apply = process.argv.includes("--apply");
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
const reviewWindowDays = Number(process.env.SOFTWAREHOUSE_MEMORY_REVIEW_WINDOW_DAYS ?? 30);

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

const companies = await request("GET", "/api/companies");
const company = companies.find((candidate) => companyNames.includes(candidate.name));
if (!company) throw new Error(`Company not found: ${companyNames.join(" / ")}`);
const [records, observations] = await Promise.all([
  request("GET", `/api/companies/${company.id}/organizational-records?limit=500`),
  request("GET", `/api/companies/${company.id}/organizational-observations?kind=learning&limit=500`),
]);

const nextReviewAt = new Date(Date.now() + reviewWindowDays * 86_400_000).toISOString();
const reviewActions = records
  .filter((record) => !["superseded", "rejected", "reversed", "fulfilled", "cancelled"].includes(record.status))
  .filter((record) => !record.reviewAt)
  .map((record) => ({ id: record.id, title: record.title, reviewAt: nextReviewAt }));
const promotionCandidates = observations.filter((observation) =>
  ["proposed", "validated"].includes(observation.status)
  && observation.promotionTarget
  && Number(observation.confidence ?? 0) >= 80
  && new Set((observation.provenance ?? []).map((item) => `${item.kind}:${item.ref}`)).size >= 2
);

const promotionResults = [];
if (apply) {
  for (const action of reviewActions) {
    await request("PATCH", `/api/organizational-records/${action.id}`, { reviewAt: action.reviewAt });
  }
  for (const observation of promotionCandidates) {
    const result = await request("POST", `/api/organizational-observations/${observation.id}/evaluate-promotion`);
    promotionResults.push({ id: observation.id, title: observation.title, ...result });
  }
}

const countsBy = (items, key) => Object.fromEntries([...new Set(items.map((item) => item[key]))].sort().map((value) => [value, items.filter((item) => item[key] === value).length]));
console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  apiBase,
  apply,
  company: { id: company.id, name: company.name },
  memory: {
    total: records.length,
    byKind: countsBy(records, "kind"),
    byStatus: countsBy(records, "status"),
    missingReviewAt: reviewActions.length,
    reviewActions,
  },
  learning: {
    total: observations.length,
    byStatus: countsBy(observations, "status"),
    promotionCandidateCount: promotionCandidates.length,
    promotionCandidates: promotionCandidates.map((item) => ({ id: item.id, title: item.title, target: item.promotionTarget })),
    promotionResults,
  },
}, null, 2));
