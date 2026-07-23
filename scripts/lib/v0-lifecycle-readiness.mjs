const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

export function validateGreenfieldFixture(packet) {
  const errors = [];
  if (packet?.kind !== 'greenfield_intake_fixture') errors.push('kind must be greenfield_intake_fixture');
  if (packet?.mode !== 'fixture_only') errors.push('mode must be fixture_only');
  if (packet?.activated !== false) errors.push('fixture must not activate a portfolio lane');
  for (const key of ['ownerIntent', 'targetUser', 'primaryJob', 'firstReleaseSlice', 'acceptanceOwner']) {
    if (!nonEmpty(packet?.[key])) errors.push(`${key} is required`);
  }
  const layers = new Set((packet?.architecture ?? []).map((item) => item.layer));
  for (const required of ['frontend', 'backend', 'data', 'integration']) {
    if (!layers.has(required)) errors.push(`architecture layer ${required} is required`);
  }
  const acceptance = packet?.acceptanceMap ?? [];
  if (acceptance.length === 0) errors.push('acceptanceMap must not be empty');
  for (const row of acceptance) {
    if (!nonEmpty(row?.outcome) || !nonEmpty(row?.proof) || !nonEmpty(row?.owner)) {
      errors.push('every acceptance row needs outcome, proof, and owner');
    }
  }
  const issueNodes = packet?.issueTopology ?? [];
  if (!issueNodes.some((node) => node.type === 'persistent_parent')) errors.push('persistent parent issue is required');
  if (!issueNodes.some((node) => node.type === 'first_slice')) errors.push('first release slice issue is required');
  if (packet?.workspacePlan?.createNow !== false) errors.push('fixture workspace must not be created');
  if (packet?.workspacePlan?.cleanRequired !== true) errors.push('workspace must require a clean repository');
  if (packet?.workspacePlan?.oneWriter !== true) errors.push('workspace must enforce one writer');
  return { status: errors.length === 0 ? 'PASS' : 'FAIL', errors };
}

export function validatePromotionPacket(packet) {
  const errors = [];
  if (packet?.kind !== 'innovation_to_product_packet') errors.push('kind must be innovation_to_product_packet');
  for (const key of ['offering', 'repository', 'currentDepartment', 'proposedDepartment', 'scopeVersion']) {
    if (!nonEmpty(packet?.[key])) errors.push(`${key} is required`);
  }
  if (packet?.currentDepartment !== '11 Innovation') errors.push('currentDepartment must remain 11 Innovation before approval');
  if (packet?.proposedDepartment !== '02 Product') errors.push('proposedDepartment must be 02 Product');
  const evidence = packet?.readinessEvidence ?? {};
  for (const key of ['productTruth', 'tests', 'review', 'documentation', 'security', 'deployment', 'monitoring', 'recovery']) {
    if (!Array.isArray(evidence[key])) errors.push(`readinessEvidence.${key} must be an array`);
  }
  if (!['pending', 'move_now', 'keep_incubating', 'stop_or_park'].includes(packet?.ownerDecision?.status)) {
    errors.push('ownerDecision.status is invalid');
  }
  if (packet?.ownerDecision?.required !== true) errors.push('owner decision must be required');
  if (packet?.commercialActivation?.authorized !== false) errors.push('commercial activation must remain unauthorized');
  if (packet?.commercialActivation?.automaticTransition !== false) errors.push('automatic commercial transition must be disabled');
  if (!nonEmpty(packet?.commercialActivation?.separateDecision)) errors.push('separate commercial decision must be named');
  return { status: errors.length === 0 ? 'PASS' : 'FAIL', errors };
}
