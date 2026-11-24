import { describe, expect, it } from 'vitest';
import {
  buildProjectReadinessReport,
  createEvidenceRecord,
  detectSensitiveData,
  evaluateIssueCompliance,
  verifyEvidenceLedgerChain,
} from './complianceEngine';
import { IssueInput, TeamworkGraphSummary } from '../types/compliance';

const sampleGraph: TeamworkGraphSummary = {
  source: 'TEAMWORK_GRAPH_LIVE',
  nodes: [],
  edges: [],
  assignedWorkItemsCount: 4,
  connectedPagesCount: 1,
  stalePoliciesCount: 0,
  queriedAt: '2026-11-22T00:00:00.000Z',
};

describe('ComplianceMesh Core Engine', () => {
  it('detects and masks critical ePHI, SSN, and API secrets without leaking raw values', () => {
    const syntheticSecret = ['sk', 'live', 'AbCdEfGhIjKlMnOpQrSt1234'].join('_');
    const issue: IssueInput = {
      key: 'MED-101',
      projectKey: 'MED',
      summary: 'Patient EHR export fails for MRN-882910',
      description: `Debug log shows SSN 123-45-6789 and token ${syntheticSecret}`,
      status: 'In Progress',
      labels: ['hipaa'],
      comments: [],
      linkedConfluenceUrls: [],
    };

    const findings = detectSensitiveData(issue);
    const categories = findings.map((f) => f.category);

    expect(categories).toContain('MRN_PHI');
    expect(categories).toContain('SSN');
    expect(categories).toContain('API_SECRET');
    for (const f of findings) {
      expect(f.maskedSample).not.toContain('123-45-6789');
      expect(f.maskedSample).not.toContain(syntheticSecret);
    }
  });

  it('blocks high-risk payment & auth release tickets missing peer review, tests, and SOP links', () => {
    const issue: IssueInput = {
      key: 'FIN-42',
      projectKey: 'FIN',
      summary: 'Production Stripe payout webhook + OAuth RBAC migration',
      description: 'Deploying new Stripe payout settlement endpoint to production tonight.',
      status: 'In Review',
      labels: ['payments', 'prod'],
      comments: [],
      linkedConfluenceUrls: [],
    };

    const assessment = evaluateIssueCompliance(issue, []);
    expect(assessment.releaseDecision).toBe('BLOCKED_BY_COMPLIANCE');
    expect(assessment.riskScore).toBeGreaterThanOrEqual(65);
    const codes = assessment.impactedControls.map((c) => c.code);
    expect(codes).toContain('CC6.1');
    expect(codes).toContain('CC8.1');
    expect(codes).toContain('PCI-6.3');
  });

  it('marks a regulated issue READY_TO_SHIP once peer review, tests, rollback, SOP, and evidence hash are logged', () => {
    const issue: IssueInput = {
      key: 'FIN-43',
      projectKey: 'FIN',
      summary: 'Production OAuth RBAC update with rollback',
      description: 'Includes feature flag rollback plan and unit test coverage.',
      status: 'In Review',
      labels: ['security'],
      comments: [
        {
          author: 'SecOps Lead',
          body: 'PR #118 peer review approved (LGTM). Integration test suite CI green.',
          created: '2026-11-22T01:00:00.000Z',
        },
      ],
      linkedConfluenceUrls: ['https://demo.atlassian.net/wiki/spaces/SEC/pages/101'],
    };

    const ev1 = createEvidenceRecord(
      {
        issueKey: 'FIN-43',
        projectKey: 'FIN',
        controlIds: ['soc2-cc6-1', 'soc2-cc8-1'],
        evidenceType: 'SECURITY_SIGNOFF',
        summary: 'Verified least-privilege OAuth scopes and rollback plan.',
        recordedBy: 'Security Officer',
      },
      []
    );

    const assessment = evaluateIssueCompliance(issue, [ev1], { graphContext: sampleGraph });
    expect(assessment.releaseDecision).toBe('READY_TO_SHIP');
    expect(assessment.readinessScore).toBe(100);
    expect(assessment.impactedControls.every((c) => c.status === 'PASSING')).toBe(true);
  });

  it('maintains a cryptographically verifiable SHA-256 evidence ledger and detects tampering', () => {
    const r1 = createEvidenceRecord(
      {
        issueKey: 'FIN-1',
        projectKey: 'FIN',
        controlIds: ['soc2-cc6-1'],
        evidenceType: 'PEER_REVIEW',
        summary: 'PR #12 reviewed',
        recordedBy: 'Alice',
      },
      []
    );
    const r2 = createEvidenceRecord(
      {
        issueKey: 'FIN-2',
        projectKey: 'FIN',
        controlIds: ['pci-6-3'],
        evidenceType: 'SECURITY_SIGNOFF',
        summary: 'Card tokenization verified',
        recordedBy: 'Bob',
      },
      [r1]
    );

    expect(verifyEvidenceLedgerChain([r1, r2]).valid).toBe(true);

    // Tamper with r1 summary and confirm chain verification immediately catches it
    const tampered = [{ ...r1, summary: 'Tampered summary' }, r2];
    const check = verifyEvidenceLedgerChain(tampered);
    expect(check.valid).toBe(false);
    expect(check.brokenAtSequence).toBe(1);
  });

  it('aggregates project readiness score and surfaces compliance release blockers', () => {
    const blockedIssue: IssueInput = {
      key: 'FIN-99',
      projectKey: 'FIN',
      summary: 'Unreviewed patient ePHI webhook to third-party LLM',
      description: 'Sending MRN-441209 directly to external webhook.',
      status: 'In Progress',
      labels: [],
      comments: [],
      linkedConfluenceUrls: [],
    };
    const assessment = evaluateIssueCompliance(blockedIssue, []);
    const report = buildProjectReadinessReport('FIN', [assessment], [], sampleGraph);

    expect(report.blockedIssuesCount).toBe(1);
    expect(report.sensitiveDataAlertsCount).toBeGreaterThanOrEqual(1);
    expect(report.ledgerIntegrityValid).toBe(true);
    expect(report.releaseBlockers[0].issueKey).toBe('FIN-99');
  });
});
