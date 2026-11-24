import {
  buildProjectReadinessReport,
  evaluateIssueCompliance,
} from '../core/complianceEngine';
import { EvidenceRecord } from '../types/compliance';
import {
  fetchJiraIssue,
  fetchProjectIssues,
  getCurrentUserDisplayName,
  postComplianceCommentOnIssue,
  publishAuditPacketToConfluence,
} from './atlassianService';
import {
  appendEvidenceRecord,
  getPinnedControls,
  getProjectEvidenceLedger,
  saveIssueAssessment,
  saveProjectReadinessReport,
} from './storageService';
import { queryComplianceTeamworkGraph } from './teamworkGraphService';

/**
 * Shared Forge Actions powering BOTH:
 *  - rovo:agent ("ComplianceMesh AuditGuard")
 *  - rovo:mcp  ("ComplianceMesh MCP Server" for IDE & external AI agents)
 */

export async function auditJiraIssueAction(payload: { issueKey?: string }) {
  const issueKey = payload?.issueKey?.trim().toUpperCase();
  if (!issueKey) {
    return { error: 'Please provide a valid Jira issueKey (e.g. FIN-42).' };
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
  return assessment;
}

export async function getAuditReadinessAction(payload: { projectKey?: string }) {
  const projectKey = payload?.projectKey?.trim().toUpperCase();
  if (!projectKey) {
    return { error: 'Please provide a valid Jira projectKey (e.g. FIN).' };
  }

  const [issues, ledger, graphSummary] = await Promise.all([
    fetchProjectIssues(projectKey, 25),
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
  return report;
}

export async function traverseComplianceGraphAction(payload: {
  issueKey?: string;
  projectKey?: string;
}) {
  return queryComplianceTeamworkGraph({
    focusIssueKey: payload?.issueKey?.trim().toUpperCase(),
    projectKey: payload?.projectKey?.trim().toUpperCase(),
    maxItems: 15,
  });
}

export async function recordAuditEvidenceAction(payload: {
  issueKey?: string;
  controlIds?: string;
  evidenceType?: string;
  summary?: string;
  artifactUrl?: string;
  postJiraComment?: boolean;
}) {
  const issueKey = payload?.issueKey?.trim().toUpperCase();
  if (!issueKey) {
    return { error: 'issueKey is required (e.g. FIN-42).' };
  }
  const summary = payload?.summary?.trim();
  if (!summary) {
    return { error: 'summary describing the compliance evidence is required.' };
  }

  const issue = await fetchJiraIssue(issueKey, 'asUser');
  const recordedBy = await getCurrentUserDisplayName();

  const controlIds = (payload.controlIds ?? 'soc2-cc8-1')
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const validTypes: EvidenceRecord['evidenceType'][] = [
    'PEER_REVIEW',
    'SECURITY_SIGNOFF',
    'TEST_EXECUTION',
    'ROLLBACK_PLAN',
    'CONFLUENCE_SOP',
    'ACCESS_AUDIT',
    'EXCEPTION_WAIVER',
  ];
  const requestedType = (payload.evidenceType ?? 'SECURITY_SIGNOFF').toUpperCase() as EvidenceRecord['evidenceType'];
  const evidenceType = validTypes.includes(requestedType) ? requestedType : 'SECURITY_SIGNOFF';

  const result = await appendEvidenceRecord({
    issueKey: issue.key,
    projectKey: issue.projectKey,
    controlIds: controlIds.length > 0 ? controlIds : ['soc2-cc8-1'],
    evidenceType,
    summary,
    artifactUrl: payload.artifactUrl,
    recordedBy,
  });

  let commentPosted = false;
  if (payload.postJiraComment !== false) {
    commentPosted = await postComplianceCommentOnIssue(issue.key, result.record);
  }

  return {
    status: 'RECORDED',
    commentPosted,
    ...result,
  };
}

export async function publishAuditPacketAction(payload: {
  projectKey?: string;
  spaceKey?: string;
}) {
  const projectKey = payload?.projectKey?.trim().toUpperCase();
  if (!projectKey) {
    return { error: 'projectKey is required to generate an audit packet (e.g. FIN).' };
  }

  const report = await getAuditReadinessAction({ projectKey });
  if ('error' in report) {
    return report;
  }

  const ledger = await getProjectEvidenceLedger(projectKey);
  const page = await publishAuditPacketToConfluence(report, ledger, payload.spaceKey);

  return {
    status: 'PUBLISHED',
    projectKey,
    overallReadinessScore: report.overallReadinessScore,
    ledgerIntegrityValid: report.ledgerIntegrityValid,
    confluencePage: page,
  };
}
