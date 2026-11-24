import { kvs } from '@forge/kvs';
import {
  EvidenceRecord,
  IssueComplianceAssessment,
  ProjectReadinessReport,
} from '../types/compliance';
import { createEvidenceRecord, verifyEvidenceLedgerChain } from '../core/complianceEngine';

const LEDGER_KEY = (projectKey: string) => `cm:ledger:${projectKey.toUpperCase()}`;
const PINS_KEY = (issueKey: string) => `cm:pins:${issueKey.toUpperCase()}`;
const AUDIT_KEY = (issueKey: string) => `cm:audit:${issueKey.toUpperCase()}`;
const REPORT_KEY = (projectKey: string) => `cm:report:${projectKey.toUpperCase()}`;
const PROJECTS_INDEX_KEY = 'cm:projects:index';

export async function getProjectEvidenceLedger(projectKey: string): Promise<EvidenceRecord[]> {
  const existing = await kvs.get<EvidenceRecord[]>(LEDGER_KEY(projectKey));
  return Array.isArray(existing) ? existing : [];
}

export async function appendEvidenceRecord(input: {
  issueKey: string;
  projectKey: string;
  controlIds: string[];
  evidenceType: EvidenceRecord['evidenceType'];
  summary: string;
  artifactUrl?: string;
  recordedBy: string;
}): Promise<{ record: EvidenceRecord; ledgerValid: boolean; totalRecords: number }> {
  const projectKey = input.projectKey.toUpperCase();
  const existing = await getProjectEvidenceLedger(projectKey);
  const record = createEvidenceRecord(input, existing);
  const updated = [...existing, record];
  await kvs.set(LEDGER_KEY(projectKey), updated);
  await registerTrackedProject(projectKey);

  const check = verifyEvidenceLedgerChain(updated);
  return {
    record,
    ledgerValid: check.valid,
    totalRecords: updated.length,
  };
}

export async function getPinnedControls(issueKey: string): Promise<string[]> {
  const pinned = await kvs.get<string[]>(PINS_KEY(issueKey));
  return Array.isArray(pinned) ? pinned : [];
}

export async function setPinnedControls(issueKey: string, controlIds: string[]): Promise<string[]> {
  const unique = [...new Set(controlIds)];
  await kvs.set(PINS_KEY(issueKey), unique);
  return unique;
}

export async function saveIssueAssessment(assessment: IssueComplianceAssessment): Promise<void> {
  await kvs.set(AUDIT_KEY(assessment.issueKey), assessment);
  await registerTrackedProject(assessment.projectKey);
}

export async function getSavedIssueAssessment(
  issueKey: string
): Promise<IssueComplianceAssessment | undefined> {
  return kvs.get<IssueComplianceAssessment>(AUDIT_KEY(issueKey));
}

export async function saveProjectReadinessReport(report: ProjectReadinessReport): Promise<void> {
  await kvs.set(REPORT_KEY(report.projectKey), report);
  await registerTrackedProject(report.projectKey);
}

export async function getSavedProjectReadinessReport(
  projectKey: string
): Promise<ProjectReadinessReport | undefined> {
  return kvs.get<ProjectReadinessReport>(REPORT_KEY(projectKey));
}

export async function registerTrackedProject(projectKey: string): Promise<void> {
  const normalized = projectKey.toUpperCase();
  const existing = (await kvs.get<string[]>(PROJECTS_INDEX_KEY)) ?? [];
  if (!existing.includes(normalized)) {
    await kvs.set(PROJECTS_INDEX_KEY, [...existing, normalized]);
  }
}

export async function getTrackedProjects(): Promise<string[]> {
  const existing = await kvs.get<string[]>(PROJECTS_INDEX_KEY);
  return Array.isArray(existing) ? existing : [];
}
