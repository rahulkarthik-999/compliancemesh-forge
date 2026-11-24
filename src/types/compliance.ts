export type ComplianceFramework = 'SOC2' | 'HIPAA' | 'ISO27001' | 'PCI_DSS';

export type ControlSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export type ControlStatus = 'PASSING' | 'AT_RISK' | 'MISSING_EVIDENCE' | 'WAIVED';

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  code: string;
  title: string;
  description: string;
  severity: ControlSeverity;
  ownerRole: string;
  requiredArtifacts: string[];
  keywords: string[];
  reviewCadenceDays: number;
}

export interface SensitiveDataFinding {
  category: 'SSN' | 'PAN_CARD' | 'EMAIL' | 'PHONE' | 'API_SECRET' | 'MRN_PHI' | 'CARD_NUMBER';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  maskedSample: string;
  location: 'summary' | 'description' | 'comment';
  remediation: string;
}

export interface ControlMatch {
  controlId: string;
  framework: ComplianceFramework;
  code: string;
  title: string;
  severity: ControlSeverity;
  confidence: number;
  matchedSignals: string[];
  missingChecks: string[];
  satisfiedChecks: string[];
  status: ControlStatus;
}

export interface EvidenceRecord {
  id: string;
  sequence: number;
  issueKey: string;
  projectKey: string;
  controlIds: string[];
  evidenceType:
    | 'PEER_REVIEW'
    | 'SECURITY_SIGNOFF'
    | 'TEST_EXECUTION'
    | 'ROLLBACK_PLAN'
    | 'CONFLUENCE_SOP'
    | 'ACCESS_AUDIT'
    | 'EXCEPTION_WAIVER';
  summary: string;
  artifactUrl?: string;
  recordedBy: string;
  recordedAt: string;
  previousHash: string;
  proofHash: string;
}

export interface IssueInput {
  key: string;
  id?: string;
  projectKey: string;
  summary: string;
  description: string;
  status: string;
  statusCategory?: string;
  priority?: string;
  issueType?: string;
  labels: string[];
  assigneeName?: string;
  assigneeAccountId?: string;
  reporterName?: string;
  comments: Array<{
    author: string;
    body: string;
    created: string;
  }>;
  linkedConfluenceUrls: string[];
  updatedAt?: string;
}

export interface TeamworkGraphNode {
  id: string;
  type: 'USER' | 'ISSUE' | 'PAGE' | 'TEAM' | 'CONTROL';
  label: string;
  subtitle?: string;
  url?: string;
  stale?: boolean;
}

export interface TeamworkGraphEdge {
  from: string;
  to: string;
  relation: string;
}

export interface TeamworkGraphSummary {
  source: 'TEAMWORK_GRAPH_LIVE' | 'REST_FALLBACK';
  nodes: TeamworkGraphNode[];
  edges: TeamworkGraphEdge[];
  assignedWorkItemsCount: number;
  connectedPagesCount: number;
  stalePoliciesCount: number;
  queriedAt: string;
  note?: string;
}

export interface IssueComplianceAssessment {
  issueKey: string;
  projectKey: string;
  summary: string;
  status: string;
  riskScore: number; // 0 (safe) to 100 (critical risk)
  readinessScore: number; // 0 to 100
  releaseDecision: 'READY_TO_SHIP' | 'NEEDS_EVIDENCE' | 'BLOCKED_BY_COMPLIANCE';
  impactedControls: ControlMatch[];
  sensitiveDataFindings: SensitiveDataFinding[];
  evidenceRecords: EvidenceRecord[];
  recommendedActions: string[];
  graphContext?: TeamworkGraphSummary;
  evaluatedAt: string;
}

export interface ControlReadinessRow {
  control: ComplianceControl;
  status: ControlStatus;
  linkedIssueKeys: string[];
  atRiskIssueKeys: string[];
  evidenceCount: number;
  lastVerifiedAt?: string;
  latestProofHash?: string;
}

export interface ProjectReadinessReport {
  projectKey: string;
  overallReadinessScore: number;
  totalControls: number;
  passingControls: number;
  atRiskControls: number;
  missingEvidenceControls: number;
  blockedIssuesCount: number;
  sensitiveDataAlertsCount: number;
  ledgerIntegrityValid: boolean;
  ledgerCount: number;
  controls: ControlReadinessRow[];
  releaseBlockers: Array<{
    issueKey: string;
    summary: string;
    status: string;
    riskScore: number;
    reason: string;
  }>;
  graphSummary: TeamworkGraphSummary;
  generatedAt: string;
}
