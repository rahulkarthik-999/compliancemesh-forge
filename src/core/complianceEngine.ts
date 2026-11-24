import { createHash } from 'node:crypto';
import {
  ComplianceControl,
  ComplianceFramework,
  ControlMatch,
  ControlReadinessRow,
  ControlStatus,
  EvidenceRecord,
  IssueComplianceAssessment,
  IssueInput,
  ProjectReadinessReport,
  SensitiveDataFinding,
  TeamworkGraphSummary,
} from '../types/compliance';
import { DEFAULT_CONTROLS } from './frameworks';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function maskValue(raw: string): string {
  const cleaned = raw.trim();
  if (cleaned.length <= 6) {
    return '***REDACTED***';
  }
  return `${cleaned.slice(0, 3)}••••${cleaned.slice(-3)}`;
}

function luhnCheck(digits: string): boolean {
  const clean = digits.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;
  let sum = 0;
  let doubleDigit = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = Number(clean[i]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

const SENSITIVE_PATTERNS: Array<{
  category: SensitiveDataFinding['category'];
  severity: SensitiveDataFinding['severity'];
  regex: RegExp;
  remediation: string;
  validator?: (match: string) => boolean;
}> = [
  {
    category: 'API_SECRET',
    severity: 'CRITICAL',
    regex: /\b(?:sk_live_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z\-_]{30,}|xox[baprs]-[A-Za-z0-9-]{16,})\b/g,
    remediation: 'Revoke and rotate this credential immediately; move secrets to an encrypted vault and redact from Jira.',
  },
  {
    category: 'SSN',
    severity: 'CRITICAL',
    regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
    remediation: 'Remove raw SSN from Jira immediately to comply with SOC 2 CC6.1 and HIPAA privacy rules.',
  },
  {
    category: 'CARD_NUMBER',
    severity: 'CRITICAL',
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    validator: (m) => luhnCheck(m),
    remediation: 'Cardholder PAN detected in ticket text. Purge immediately to prevent PCI-DSS scope contamination.',
  },
  {
    category: 'MRN_PHI',
    severity: 'CRITICAL',
    regex: /\b(?:MRN|Patient\s*ID|ePHI|DOB)[:#\s-]+[A-Z0-9-]{5,14}\b/gi,
    remediation: 'Replace patient identifier with a de-identified synthetic reference to maintain HIPAA §164.312 compliance.',
  },
  {
    category: 'PAN_CARD',
    severity: 'HIGH',
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    remediation: 'Mask government tax identifier (PAN) before sharing tickets across engineering teams.',
  },
  {
    category: 'EMAIL',
    severity: 'MEDIUM',
    regex: /\b[A-Za-z0-9._%+-]+@(?!example\.com\b|test\.local\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    remediation: 'Verify whether customer email exposure is necessary under minimum-necessary data minimization.',
  },
];

export function detectSensitiveData(issue: IssueInput): SensitiveDataFinding[] {
  const findings: SensitiveDataFinding[] = [];
  const seen = new Set<string>();

  const scanText = (text: string, location: SensitiveDataFinding['location']) => {
    if (!text) return;
    for (const pattern of SENSITIVE_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const value = match[0];
        if (pattern.validator && !pattern.validator(value)) continue;
        const masked = maskValue(value);
        const dedupeKey = `${pattern.category}:${location}:${masked}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        findings.push({
          category: pattern.category,
          severity: pattern.severity,
          maskedSample: masked,
          location,
          remediation: pattern.remediation,
        });
      }
    }
  };

  scanText(issue.summary, 'summary');
  scanText(issue.description, 'description');
  for (const comment of issue.comments) {
    scanText(comment.body, 'comment');
  }

  return findings;
}

export function computeEvidenceHash(
  payload: Omit<EvidenceRecord, 'proofHash'>
): string {
  const canonical = JSON.stringify({
    id: payload.id,
    sequence: payload.sequence,
    issueKey: payload.issueKey,
    projectKey: payload.projectKey,
    controlIds: [...payload.controlIds].sort(),
    evidenceType: payload.evidenceType,
    summary: payload.summary,
    artifactUrl: payload.artifactUrl ?? '',
    recordedBy: payload.recordedBy,
    recordedAt: payload.recordedAt,
    previousHash: payload.previousHash,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function createEvidenceRecord(
  input: {
    issueKey: string;
    projectKey: string;
    controlIds: string[];
    evidenceType: EvidenceRecord['evidenceType'];
    summary: string;
    artifactUrl?: string;
    recordedBy: string;
    recordedAt?: string;
  },
  existingChain: EvidenceRecord[]
): EvidenceRecord {
  const sorted = [...existingChain].sort((a, b) => a.sequence - b.sequence);
  const previous = sorted[sorted.length - 1];
  const sequence = previous ? previous.sequence + 1 : 1;
  const previousHash = previous ? previous.proofHash : GENESIS_HASH;
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const id = `EVD-${String(sequence).padStart(4, '0')}`;

  const base: Omit<EvidenceRecord, 'proofHash'> = {
    id,
    sequence,
    issueKey: input.issueKey.toUpperCase(),
    projectKey: input.projectKey.toUpperCase(),
    controlIds: [...new Set(input.controlIds)],
    evidenceType: input.evidenceType,
    summary: input.summary.trim(),
    artifactUrl: input.artifactUrl?.trim() || undefined,
    recordedBy: input.recordedBy,
    recordedAt,
    previousHash,
  };

  return {
    ...base,
    proofHash: computeEvidenceHash(base),
  };
}

export function verifyEvidenceLedgerChain(records: EvidenceRecord[]): {
  valid: boolean;
  checkedCount: number;
  brokenAtSequence?: number;
} {
  const sorted = [...records].sort((a, b) => a.sequence - b.sequence);
  let expectedPrev = GENESIS_HASH;

  for (const record of sorted) {
    if (record.previousHash !== expectedPrev) {
      return { valid: false, checkedCount: sorted.length, brokenAtSequence: record.sequence };
    }
    const { proofHash, ...rest } = record;
    const recomputed = computeEvidenceHash(rest);
    if (recomputed !== proofHash) {
      return { valid: false, checkedCount: sorted.length, brokenAtSequence: record.sequence };
    }
    expectedPrev = proofHash;
  }

  return { valid: true, checkedCount: sorted.length };
}

function hasTextSignal(haystack: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(haystack));
}

export function evaluateIssueCompliance(
  issue: IssueInput,
  evidenceRecords: EvidenceRecord[],
  options?: {
    pinnedControlIds?: string[];
    activeFrameworks?: ComplianceFramework[];
    controls?: ComplianceControl[];
    graphContext?: TeamworkGraphSummary;
  }
): IssueComplianceAssessment {
  const activeFrameworks = options?.activeFrameworks ?? ['SOC2', 'HIPAA', 'ISO27001', 'PCI_DSS'];
  const controlsCatalog = (options?.controls ?? DEFAULT_CONTROLS).filter((c) =>
    activeFrameworks.includes(c.framework)
  );
  const pinnedSet = new Set(options?.pinnedControlIds ?? []);

  const combinedText = [
    issue.summary,
    issue.description,
    issue.labels.join(' '),
    ...issue.comments.map((c) => c.body),
  ]
    .join('\n')
    .toLowerCase();

  const issueEvidence = evidenceRecords.filter(
    (e) => e.issueKey.toUpperCase() === issue.key.toUpperCase()
  );

  const sensitiveDataFindings = detectSensitiveData(issue);

  const hasRollbackSignal =
    hasTextSignal(combinedText, [/\brollback\b/i, /\bfeature flag\b/i, /\bbackout\b/i]) ||
    issueEvidence.some((e) => e.evidenceType === 'ROLLBACK_PLAN');

  const hasPeerReviewSignal =
    hasTextSignal(combinedText, [/\bpr\s*#?\d+/i, /\bpull request\b/i, /\bpeer review\b/i, /\blgtm\b/i, /\bapproved\b/i]) ||
    issueEvidence.some((e) => e.evidenceType === 'PEER_REVIEW' || e.evidenceType === 'SECURITY_SIGNOFF');

  const hasTestSignal =
    hasTextSignal(combinedText, [/\bunit test\b/i, /\btest passed\b/i, /\bqa verified\b/i, /\bintegration test\b/i, /\bci green\b/i]) ||
    issueEvidence.some((e) => e.evidenceType === 'TEST_EXECUTION');

  const hasConfluenceSopSignal =
    issue.linkedConfluenceUrls.length > 0 ||
    (options?.graphContext?.connectedPagesCount ?? 0) > 0 ||
    hasTextSignal(combinedText, [/atlassian\.net\/wiki/i, /\bconfluence\b/i, /\bsop\b/i, /\brunbook\b/i]) ||
    issueEvidence.some((e) => e.evidenceType === 'CONFLUENCE_SOP');

  const impactedControls: ControlMatch[] = [];

  for (const control of controlsCatalog) {
    const matchedKeywords = control.keywords.filter((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(combinedText);
    });

    const isPinned = pinnedSet.has(control.id);
    const hasExplicitEvidence = issueEvidence.some((e) => e.controlIds.includes(control.id));
    const hasWaiver = issueEvidence.some(
      (e) => e.controlIds.includes(control.id) && e.evidenceType === 'EXCEPTION_WAIVER'
    );

    if (matchedKeywords.length === 0 && !isPinned && !hasExplicitEvidence) {
      continue;
    }

    const satisfiedChecks: string[] = [];
    const missingChecks: string[] = [];

    if (hasPeerReviewSignal) {
      satisfiedChecks.push('Peer / security review documented');
    } else {
      missingChecks.push('Peer review or security sign-off missing');
    }

    if (hasTestSignal) {
      satisfiedChecks.push('Verification / test evidence present');
    } else {
      missingChecks.push('Automated test or QA verification evidence missing');
    }

    if (control.severity === 'CRITICAL') {
      if (hasConfluenceSopSignal) {
        satisfiedChecks.push('Linked Confluence SOP / policy context verified');
      } else {
        missingChecks.push('Link a Confluence SOP/policy page or record SOP evidence');
      }
      if (control.id === 'soc2-cc8-1' || /\b(deploy|migration|release|prod)\b/i.test(combinedText)) {
        if (hasRollbackSignal) {
          satisfiedChecks.push('Rollback / backout strategy documented');
        } else {
          missingChecks.push('Rollback plan missing for production change');
        }
      }
    }

    if (hasExplicitEvidence) {
      satisfiedChecks.push('Tamper-evident audit evidence logged in ComplianceMesh');
    }

    let status: ControlStatus = 'PASSING';
    if (hasWaiver) {
      status = 'WAIVED';
    } else if (missingChecks.length === 0) {
      status = 'PASSING';
    } else if (hasExplicitEvidence || satisfiedChecks.length >= 2) {
      status = 'AT_RISK';
    } else {
      status = 'MISSING_EVIDENCE';
    }

    const confidence = isPinned
      ? 100
      : Math.min(98, 55 + matchedKeywords.length * 14 + (hasExplicitEvidence ? 15 : 0));

    impactedControls.push({
      controlId: control.id,
      framework: control.framework,
      code: control.code,
      title: control.title,
      severity: control.severity,
      confidence,
      matchedSignals: isPinned ? ['Manually pinned', ...matchedKeywords] : matchedKeywords,
      missingChecks,
      satisfiedChecks,
      status,
    });
  }

  // Compute risk score (0–100) and readiness score (0–100)
  let riskScore = 0;
  for (const finding of sensitiveDataFindings) {
    riskScore += finding.severity === 'CRITICAL' ? 35 : finding.severity === 'HIGH' ? 20 : 10;
  }

  for (const match of impactedControls) {
    if (match.status === 'MISSING_EVIDENCE') {
      riskScore += match.severity === 'CRITICAL' ? 28 : 16;
    } else if (match.status === 'AT_RISK') {
      riskScore += match.severity === 'CRITICAL' ? 14 : 8;
    }
  }

  if ((options?.graphContext?.stalePoliciesCount ?? 0) > 0) {
    riskScore += 10;
  }

  riskScore = Math.min(100, riskScore);
  const readinessScore = Math.max(0, 100 - riskScore);

  const hasCriticalSensitiveLeak = sensitiveDataFindings.some((f) => f.severity === 'CRITICAL');
  const hasCriticalGap = impactedControls.some(
    (c) => c.severity === 'CRITICAL' && c.status === 'MISSING_EVIDENCE'
  );

  let releaseDecision: IssueComplianceAssessment['releaseDecision'] = 'READY_TO_SHIP';
  if (hasCriticalSensitiveLeak || riskScore >= 65 || hasCriticalGap) {
    releaseDecision = 'BLOCKED_BY_COMPLIANCE';
  } else if (riskScore >= 25 || impactedControls.some((c) => c.status !== 'PASSING' && c.status !== 'WAIVED')) {
    releaseDecision = 'NEEDS_EVIDENCE';
  }

  const recommendedActions: string[] = [];
  if (hasCriticalSensitiveLeak) {
    recommendedActions.push(
      `URGENT: Redact ${sensitiveDataFindings.filter((f) => f.severity === 'CRITICAL').length} critical PII/ePHI/secret finding(s) from this ticket immediately.`
    );
  }
  for (const match of impactedControls) {
    if (match.status !== 'PASSING' && match.status !== 'WAIVED' && match.missingChecks.length > 0) {
      recommendedActions.push(`[${match.framework} ${match.code}] ${match.missingChecks[0]}.`);
    }
  }
  if (impactedControls.length === 0 && sensitiveDataFindings.length === 0) {
    recommendedActions.push(
      'No regulated control triggers detected automatically. Pin a control manually if this ticket touches production data.'
    );
  }

  return {
    issueKey: issue.key,
    projectKey: issue.projectKey,
    summary: issue.summary,
    status: issue.status,
    riskScore,
    readinessScore,
    releaseDecision,
    impactedControls,
    sensitiveDataFindings,
    evidenceRecords: issueEvidence,
    recommendedActions: recommendedActions.slice(0, 6),
    graphContext: options?.graphContext,
    evaluatedAt: new Date().toISOString(),
  };
}

export function buildProjectReadinessReport(
  projectKey: string,
  assessments: IssueComplianceAssessment[],
  allEvidence: EvidenceRecord[],
  graphSummary: TeamworkGraphSummary,
  controls: ComplianceControl[] = DEFAULT_CONTROLS
): ProjectReadinessReport {
  const projectEvidence = allEvidence.filter(
    (e) => e.projectKey.toUpperCase() === projectKey.toUpperCase()
  );
  const ledgerCheck = verifyEvidenceLedgerChain(projectEvidence);

  const controlRows: ControlReadinessRow[] = controls.map((control) => {
    const matchingAssessments = assessments.filter((a) =>
      a.impactedControls.some((ic) => ic.controlId === control.id)
    );
    const linkedIssueKeys = matchingAssessments.map((a) => a.issueKey);
    const atRiskIssueKeys = matchingAssessments
      .filter((a) =>
        a.impactedControls.some(
          (ic) => ic.controlId === control.id && (ic.status === 'MISSING_EVIDENCE' || ic.status === 'AT_RISK')
        )
      )
      .map((a) => a.issueKey);

    const controlEvidence = projectEvidence
      .filter((e) => e.controlIds.includes(control.id))
      .sort((a, b) => b.sequence - a.sequence);

    let status: ControlStatus = 'MISSING_EVIDENCE';
    if (atRiskIssueKeys.length > 0) {
      status = controlEvidence.length > 0 ? 'AT_RISK' : 'MISSING_EVIDENCE';
    } else if (controlEvidence.length > 0) {
      status = 'PASSING';
    } else if (linkedIssueKeys.length > 0) {
      status = 'PASSING';
    } else {
      status = 'MISSING_EVIDENCE';
    }

    return {
      control,
      status,
      linkedIssueKeys,
      atRiskIssueKeys,
      evidenceCount: controlEvidence.length,
      lastVerifiedAt: controlEvidence[0]?.recordedAt,
      latestProofHash: controlEvidence[0]?.proofHash?.slice(0, 12),
    };
  });

  const passingControls = controlRows.filter((r) => r.status === 'PASSING' || r.status === 'WAIVED').length;
  const atRiskControls = controlRows.filter((r) => r.status === 'AT_RISK').length;
  const missingEvidenceControls = controlRows.filter((r) => r.status === 'MISSING_EVIDENCE').length;

  const overallReadinessScore =
    controlRows.length === 0
      ? 100
      : Math.round(((passingControls + atRiskControls * 0.45) / controlRows.length) * 100);

  const releaseBlockers = assessments
    .filter((a) => a.releaseDecision === 'BLOCKED_BY_COMPLIANCE')
    .sort((a, b) => b.riskScore - a.riskScore)
    .map((a) => ({
      issueKey: a.issueKey,
      summary: a.summary,
      status: a.status,
      riskScore: a.riskScore,
      reason: a.recommendedActions[0] ?? 'Critical compliance evidence missing',
    }));

  const sensitiveDataAlertsCount = assessments.reduce(
    (sum, a) => sum + a.sensitiveDataFindings.length,
    0
  );

  return {
    projectKey: projectKey.toUpperCase(),
    overallReadinessScore,
    totalControls: controlRows.length,
    passingControls,
    atRiskControls,
    missingEvidenceControls,
    blockedIssuesCount: releaseBlockers.length,
    sensitiveDataAlertsCount,
    ledgerIntegrityValid: ledgerCheck.valid,
    ledgerCount: projectEvidence.length,
    controls: controlRows,
    releaseBlockers,
    graphSummary,
    generatedAt: new Date().toISOString(),
  };
}
