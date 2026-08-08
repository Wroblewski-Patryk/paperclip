function normalized(value) {
  return String(value ?? "").toLowerCase();
}

function projectAllowsTradingDomain(projectName) {
  const project = normalized(projectName).trim();
  return project === "" || project === "soar";
}

export function hasExchangeIntent(value, { projectName = "" } = {}) {
  if (!projectAllowsTradingDomain(projectName)) return false;
  const text = normalized(value);
  return /(?:^|[^a-z0-9])(?:binance|gateio|exchange)(?:[^a-z0-9]|$)/.test(text)
    || /(?:^|[^a-z0-9])gate\.io(?:[^a-z0-9]|$)/.test(text);
}

export function hasTradingIntent(value, { projectName = "" } = {}) {
  if (!projectAllowsTradingDomain(projectName)) return false;
  const text = normalized(value);
  return /(?:^|[^a-z0-9])(?:dca|bot|strategy|trade|trading|order|position|wallet|market)(?:[^a-z0-9]|$)/.test(text);
}
