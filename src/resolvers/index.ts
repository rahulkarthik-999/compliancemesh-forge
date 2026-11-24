import Resolver from '@forge/resolver';
import { DEFAULT_CONTROLS, FRAMEWORK_LABELS } from '../core/frameworks';
import {
  buildProjectReadinessReport,
  evaluateIssueCompliance,
  verifyEvidenceLedgerChain,
} from '../core/complianceEngine';
import {
  createJiraIssue,
  fetchJiraIssue,
  fetchProjectIssues,
  getCurrentUserDisplayName,
  postComplianceCommentOnIssue,
  publishAuditPacketToConfluence,
} from '../services/atlassianService';
import {
  appendEvidenceRecord,
  getPinnedControls,
  getProjectEvidenceLedger,
  getSavedProjectReadinessReport,
  getTrackedProjects,
  saveIssueAssessment,
  saveProjectReadinessReport,
  setPinnedControls,
} from '../services/storageService';
import { queryComplianceTeamworkGraph } from '../services/teamworkGraphService';
import { EvidenceRecord } from '../types/compliance';

const resolver = new Resolver();

resolver.define('getIssueCompliance', async ({ context, payload }) => {
  const issueKey =
    (payload?.issueKey as string | undefined) ??
    (context?.extension?.issue?.key as string | undefined);

  if (!issueKey) {
    throw new Error('Missing Jira issue key in context.');
  }

  const issue = await fetchJiraIssue(issueKey, 'asUser');
  const [ledger, pinnedControls, graphContext] = await Promise.all([
    getProjectEvidenceLedger(issue.projectKey),
    getPinnedControls(issue.key),
    queryComplianceTeamworkGraph({ focusIssueKey: issue.key, projectKey: issue.projectKey }),
  ]);

  const assessment = evaluateIssueCompliance(issue, ledger, {
    pinnedControlIds: pinnedControls,
    graphContext,
  });

  await saveIssueAssessment(assessment);

  return {
    assessment,
    pinnedControls,
    availableControls: DEFAULT_CONTROLS,
    frameworkLabels: FRAMEWORK_LABELS,
  };
});

resolver.define('toggleControlPin', async ({ context, payload }) => {
  const issueKey =
    (payload?.issueKey as string | undefined) ??
    (context?.extension?.issue?.key as string | undefined);
  const controlId = payload?.controlId as string | undefined;

  if (!issueKey || !controlId) {
    throw new Error('Both issueKey and controlId are required.');
  }

  const current = await getPinnedControls(issueKey);
  const next = current.includes(controlId)
    ? current.filter((c) => c !== controlId)
    : [...current, controlId];
  await setPinnedControls(issueKey, next);

  const issue = await fetchJiraIssue(issueKey, 'asUser');
  const [ledger, graphContext] = await Promise.all([
    getProjectEvidenceLedger(issue.projectKey),
    queryComplianceTeamworkGraph({ focusIssueKey: issue.key, projectKey: issue.projectKey }),
  ]);

  const assessment = evaluateIssueCompliance(issue, ledger, {
    pinnedControlIds: next,
    graphContext,
  });
  await saveIssueAssessment(assessment);

  return { assessment, pinnedControls: next };
});

resolver.define('recordEvidence', async ({ context, payload }) => {
  const issueKey =
    (payload?.issueKey as string | undefined) ??
    (context?.extension?.issue?.key as string | undefined);

  if (!issueKey) {
    throw new Error('Missing issueKey.');
  }

  const summary = String(payload?.summary ?? '').trim();
  if (!summary) {
    throw new Error('Please provide a short summary of the compliance evidence.');
  }

  const issue = await fetchJiraIssue(issueKey, 'asUser');
  const recordedBy = await getCurrentUserDisplayName();
  const controlIds = Array.isArray(payload?.controlIds) && payload.controlIds.length > 0
    ? (payload.controlIds as string[])
    : ['soc2-cc8-1'];

  const evidenceType = (payload?.evidenceType as EvidenceRecord['evidenceType']) ?? 'SECURITY_SIGNOFF';
  const artifactUrl = payload?.artifactUrl ? String(payload.artifactUrl) : undefined;
  const postComment = payload?.postComment !== false;

  const result = await appendEvidenceRecord({
    issueKey: issue.key,
    projectKey: issue.projectKey,
    controlIds,
    evidenceType,
    summary,
    artifactUrl,
    recordedBy,
  });

  let commentPosted = false;
  if (postComment) {
    commentPosted = await postComplianceCommentOnIssue(issue.key, result.record);
  }

  const [ledger, pinnedControls, graphContext] = await Promise.all([
    getProjectEvidenceLedger(issue.projectKey),
    getPinnedControls(issue.key),
    queryComplianceTeamworkGraph({ focusIssueKey: issue.key, projectKey: issue.projectKey }),
  ]);

  const assessment = evaluateIssueCompliance(issue, ledger, {
    pinnedControlIds: pinnedControls,
    graphContext,
  });
  await saveIssueAssessment(assessment);

  return {
    record: result.record,
    commentPosted,
    ledgerValid: result.ledgerValid,
    assessment,
  };
});

resolver.define('getProjectReadiness', async ({ context, payload }) => {
  const projectKey =
    (payload?.projectKey as string | undefined) ??
    (context?.extension?.project?.key as string | undefined);

  if (!projectKey) {
    throw new Error('Missing Jira project key.');
  }

  const [issues, ledger, graphSummary] = await Promise.all([
    fetchProjectIssues(projectKey, 30),
    getProjectEvidenceLedger(projectKey),
    queryComplianceTeamworkGraph({ projectKey }),
  ]);

  const assessments = await Promise.all(
    issues.map(async (issue) => {
      const pinnedControlIds = await getPinnedControls(issue.key);
      const assessment = evaluateIssueCompliance(issue, ledger, {
        pinnedControlIds,
        graphContext: graphSummary,
      });
      await saveIssueAssessment(assessment);
      return assessment;
    })
  );

  const report = buildProjectReadinessReport(projectKey, assessments, ledger, graphSummary);
  await saveProjectReadinessReport(report);

  return {
    report,
    ledger: ledger.slice(-25).reverse(),
    ledgerCheck: verifyEvidenceLedgerChain(ledger),
    frameworkLabels: FRAMEWORK_LABELS,
  };
});

resolver.define('publishConfluenceAuditPacket', async ({ context, payload }) => {
  const projectKey =
    (payload?.projectKey as string | undefined) ??
    (context?.extension?.project?.key as string | undefined);

  if (!projectKey) {
    throw new Error('Missing projectKey.');
  }

  let report = await getSavedProjectReadinessReport(projectKey);
  const ledger = await getProjectEvidenceLedger(projectKey);

  if (!report) {
    const [issues, graphSummary] = await Promise.all([
      fetchProjectIssues(projectKey, 25),
      queryComplianceTeamworkGraph({ projectKey }),
    ]);
    const assessments = await Promise.all(
      issues.map(async (issue) =>
        evaluateIssueCompliance(issue, ledger, {
          pinnedControlIds: await getPinnedControls(issue.key),
          graphContext: graphSummary,
        })
      )
    );
    report = buildProjectReadinessReport(projectKey, assessments, ledger, graphSummary);
    await saveProjectReadinessReport(report);
  }

  return publishAuditPacketToConfluence(
    report,
    ledger,
    payload?.spaceKey ? String(payload.spaceKey) : undefined
  );
});

resolver.define('seedDemoScenario', async ({ context, payload }) => {
  const projectKey =
    (payload?.projectKey as string | undefined) ??
    (context?.extension?.project?.key as string | undefined);

  if (!projectKey) {
    throw new Error('Missing Jira projectKey.');
  }

  const createdKeys: string[] = [];
  const recordedBy = await getCurrentUserDisplayName();

  const issue1 = await createJiraIssue({
    projectKey,
    summary: 'Production Stripe payout webhook + OAuth RBAC migration',
    description:
      'Deploying live Stripe settlement webhook and updated OAuth RBAC roles to production tonight. Debug trace referenced synthetic patient MRN-882910 — needs immediate redaction and security sign-off.',
    labels: ['fintech', 'payments', 'prod'],
  });
  createdKeys.push(issue1.key);

  const issue2 = await createJiraIssue({
    projectKey,
    summary: 'Patient EHR CSV export & HIPAA access audit logging',
    description:
      'Add bulk medical record CSV export for clinical portal with HIPAA §164.312(b) audit logging and third-party BAA verification.',
    labels: ['hipaa', 'healthtech'],
  });
  createdKeys.push(issue2.key);

  const issue3 = await createJiraIssue({
    projectKey,
    summary: 'TLS 1.3 API gateway encryption upgrade with rollback plan',
    description:
      'Upgrading ingress TLS 1.3 cipher suite with feature flag rollback plan. PR #412 peer review approved (LGTM) and integration test suite CI green. Governed by Confluence SOP runbook.',
    labels: ['soc2', 'security'],
  });
  createdKeys.push(issue3.key);

  const evidence = await appendEvidenceRecord({
    issueKey: issue3.key,
    projectKey,
    controlIds: ['soc2-cc6-6', 'soc2-cc8-1'],
    evidenceType: 'SECURITY_SIGNOFF',
    summary: 'Verified TLS 1.3 cipher config, PR #412 peer review, automated CI tests, and feature-flag rollback.',
    recordedBy,
  });
  await postComplianceCommentOnIssue(issue3.key, evidence.record);

  return {
    createdKeys,
    seededEvidenceId: evidence.record.id,
  };
});

resolver.define('getConfluenceMacroData', async ({ payload }) => {
  const trackedProjects = await getTrackedProjects();
  const requestedKey = payload?.projectKey ? String(payload.projectKey).toUpperCase() : undefined;
  const activeProjectKey = requestedKey || trackedProjects[0];

  if (!activeProjectKey) {
    return {
      trackedProjects: [],
      report: null,
      ledger: [],
      frameworkLabels: FRAMEWORK_LABELS,
    };
  }

  const [report, ledger] = await Promise.all([
    getSavedProjectReadinessReport(activeProjectKey),
    getProjectEvidenceLedger(activeProjectKey),
  ]);

  return {
    trackedProjects,
    activeProjectKey,
    report: report ?? null,
    ledger: ledger.slice(-10).reverse(),
    frameworkLabels: FRAMEWORK_LABELS,
  };
});

export const handler = resolver.getDefinitions();
