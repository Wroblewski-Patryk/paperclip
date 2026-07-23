import assert from 'node:assert/strict';
import test from 'node:test';

import { validateGreenfieldFixture, validatePromotionPacket } from './lib/v0-lifecycle-readiness.mjs';

const greenfield = {
  kind: 'greenfield_intake_fixture', mode: 'fixture_only', activated: false,
  ownerIntent: 'prove intake', targetUser: 'operator', primaryJob: 'finish one workflow',
  firstReleaseSlice: 'one end-to-end result', acceptanceOwner: 'Portfolio Director',
  architecture: ['frontend', 'backend', 'data', 'integration'].map((layer) => ({ layer, responsibility: layer })),
  acceptanceMap: [{ outcome: 'result visible', proof: 'focused test', owner: 'QVE' }],
  issueTopology: [{ type: 'persistent_parent' }, { type: 'first_slice' }],
  workspacePlan: { createNow: false, cleanRequired: true, oneWriter: true },
};

const promotion = {
  kind: 'innovation_to_product_packet', offering: 'Fixture', repository: 'fixture',
  currentDepartment: '11 Innovation', proposedDepartment: '02 Product', scopeVersion: 'v0-fixture',
  readinessEvidence: Object.fromEntries(['productTruth', 'tests', 'review', 'documentation', 'security', 'deployment', 'monitoring', 'recovery'].map((key) => [key, []])),
  ownerDecision: { required: true, status: 'pending' },
  commercialActivation: { authorized: false, automaticTransition: false, separateDecision: 'owner sale-readiness approval' },
};

test('greenfield fixture passes only with a non-activating governed workspace and complete first slice', () => {
  assert.equal(validateGreenfieldFixture(greenfield).status, 'PASS');
  assert.equal(validateGreenfieldFixture({ ...greenfield, activated: true }).status, 'FAIL');
});

test('promotion packet cannot imply automatic commercial activation', () => {
  assert.equal(validatePromotionPacket(promotion).status, 'PASS');
  assert.equal(validatePromotionPacket({ ...promotion, commercialActivation: { ...promotion.commercialActivation, authorized: true } }).status, 'FAIL');
});
