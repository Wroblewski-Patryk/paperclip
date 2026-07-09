export const secretAliasByKey = new Map([
  ["coolify_api_token", "coolify_read_api_token"],
  ["coolify_token", "coolify_read_api_token"],
  ["coolify_team_id", "coolify_team_id_luckysparrow"],
  ["coolify_soar_team_id", "coolify_team_id_luckysparrow"],
  ["coolify_soar_project_id", "coolify_project_id_soar"],
  ["coolify_soar_project_uuid", "coolify_project_uuid_soar"],
  ["coolify_soar_production_environment", "coolify_environment_uuid_soar_production"],
  ["coolify_soar_app_id", "coolify_resource_uuid_soar_web"],
  ["coolify_soar_web_app_id", "coolify_resource_uuid_soar_web"],
  ["coolify_soar_api_app_id", "coolify_resource_uuid_soar_api"],
  ["coolify_soar_worker_backtest_app_id", "coolify_resource_uuid_soar_worker_backtest"],
  ["coolify_soar_worker_execution_app_id", "coolify_resource_uuid_soar_worker_execution"],
  ["coolify_soar_worker_market_data_app_id", "coolify_resource_uuid_soar_worker_market_data"],
  ["coolify_soar_worker_market_stream_app_id", "coolify_resource_uuid_soar_worker_market_stream"],
  ["coolify_soar_postgres_resource_id", "coolify_database_uuid_soar_postgresql"],
  ["coolify_soar_redis_resource_id", "coolify_database_uuid_soar_redis"],
  ["coolify_roost_app_id", "coolify_resource_uuid_roost_app"],
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
