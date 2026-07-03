export const secretAliasByKey = new Map([
  ["smoke_auth_token", "prod_ui_audit_admin_token"],
  ["smoke_auth_email", "prod_ui_audit_admin_email"],
  ["smoke_auth_password", "prod_ui_audit_admin_password"],
  ["liveimport_readback_api_base_url", "prod_ui_audit_api_base_url"],
  ["liveimport_readback_web_base_url", "prod_ui_audit_web_base_url"],
  ["liveimport_readback_expected_sha", "prod_ui_audit_expected_sha"],
  ["liveimport_readback_auth_token", "prod_ui_audit_auth_token"],
  ["liveimport_readback_auth_email", "prod_ui_audit_auth_email"],
  ["liveimport_readback_auth_password", "prod_ui_audit_auth_password"],
  ["liveimport_readback_ops_auth_header_name", "prod_ui_audit_ops_header_name"],
  ["liveimport_readback_ops_auth_header_value", "prod_ui_audit_ops_header_value"],
  ["liveimport_readback_ops_basic_user", "prod_ui_audit_ops_basic_user"],
  ["liveimport_readback_ops_basic_password", "prod_ui_audit_ops_basic_password"],
]);

export function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function secretForKey(secretByKey, key) {
  const normalizedKey = normalizeKey(key);
  return secretByKey.get(normalizedKey)
    ?? secretByKey.get(normalizeKey(secretAliasByKey.get(normalizedKey)));
}

export function uniqueSecretsForKeys(secretByKey, keys) {
  const seenKeys = new Set();
  return keys
    .map((key) => secretForKey(secretByKey, key))
    .filter(Boolean)
    .filter((secret) => {
      const normalizedKey = normalizeKey(secret.key);
      if (seenKeys.has(normalizedKey)) return false;
      seenKeys.add(normalizedKey);
      return true;
    });
}

export function aliasCoverageForKeys(secretByKey, keys) {
  return keys
    .map((key) => {
      const normalizedKey = normalizeKey(key);
      const aliasSourceKey = secretAliasByKey.get(normalizedKey);
      if (!aliasSourceKey || secretByKey.has(normalizedKey) || !secretByKey.has(normalizeKey(aliasSourceKey))) {
        return null;
      }
      return { key: normalizedKey, sourceKey: aliasSourceKey };
    })
    .filter(Boolean);
}

export function missingKeysAfterAliasCoverage(secretByKey, keys) {
  return keys
    .filter((key) => {
      const normalizedKey = normalizeKey(key);
      const aliasSourceKey = secretAliasByKey.get(normalizedKey);
      return !secretByKey.has(normalizedKey)
        && !secretByKey.has(normalizeKey(aliasSourceKey));
    })
    .map(normalizeKey);
}
