import { evaluateIssueCompliance } from './core/complianceEngine';
import { fetchJiraIssue } from './services/atlassianService';
import {
  getPinnedControls,
  getProjectEvidenceLedger,
  saveIssueAssessment,
} from './services/storageService';
import {
  auditJiraIssueAction,
  getAuditReadinessAction,
  publishAuditPacketAction,
  recordAuditEvidenceAction,
  traverseComplianceGraphAction,
} from './services/rovoActions';

export { handler } from './resolvers/index';

// Shared Rovo Agent + Atlassian MCP Action Handlers
export const auditJiraIssue = auditJiraIssueAction;
export const getAuditReadiness = getAuditReadinessAction;
export const traverseComplianceGraph = traverseComplianceGraphAction;
export const recordAuditEvidence = recordAuditEvidenceAction;
export const publishAuditPacket = publishAuditPacketAction;

// Continuous Background Compliance Guardrail Trigger (Jira Issue Created / Updated)
export async function onIssueEventTrigger(event: {
  issue?: { key?: string };
}) {
  const issueKey = event?.issue?.key;
  if (!issueKey) return;

  try {
    const issue = await fetchJiraIssue(issueKey, 'asApp');
    const [ledger, pinnedControls] = await Promise.all([
      getProjectEvidenceLedger(issue.projectKey),
      getPinnedControls(issue.key),
    ]);
    const assessment = evaluateIssueCompliance(issue, ledger, {
      pinnedControlIds: pinnedControls,
    });
    await saveIssueAssessment(assessment);

    console.log(
      `[ComplianceMesh Trigger] ${issue.key} -> ${assessment.releaseDecision} (Risk ${assessment.riskScore}/100, Controls: ${assessment.impactedControls.length}, Sensitive Findings: ${assessment.sensitiveDataFindings.length})`
    );
  } catch (err) {
    console.error(`[ComplianceMesh Trigger] Error scanning ${issueKey}:`, err);
  }
}
