import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Badge,
  Box,
  Button,
  Checkbox,
  DynamicTable,
  Heading,
  Inline,
  Label,
  Lozenge,
  ProgressBar,
  SectionMessage,
  Select,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  Textfield,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import {
  ComplianceControl,
  ControlStatus,
  EvidenceRecord,
  IssueComplianceAssessment,
} from '../types/compliance';

interface IssuePanelResponse {
  assessment: IssueComplianceAssessment;
  pinnedControls: string[];
  availableControls: ComplianceControl[];
}

function decisionAppearance(
  decision: IssueComplianceAssessment['releaseDecision']
): 'success' | 'moved' | 'removed' {
  if (decision === 'READY_TO_SHIP') return 'success';
  if (decision === 'NEEDS_EVIDENCE') return 'moved';
  return 'removed';
}

function decisionLabel(decision: IssueComplianceAssessment['releaseDecision']): string {
  if (decision === 'READY_TO_SHIP') return 'READY TO SHIP';
  if (decision === 'NEEDS_EVIDENCE') return 'NEEDS EVIDENCE';
  return 'BLOCKED BY COMPLIANCE';
}

function controlStatusAppearance(
  status: ControlStatus
): 'success' | 'moved' | 'removed' | 'inprogress' {
  if (status === 'PASSING') return 'success';
  if (status === 'AT_RISK') return 'moved';
  if (status === 'WAIVED') return 'inprogress';
  return 'removed';
}

const EVIDENCE_TYPE_OPTIONS = [
  { label: 'Security Sign-Off', value: 'SECURITY_SIGNOFF' },
  { label: 'Peer Code Review', value: 'PEER_REVIEW' },
  { label: 'Automated Test / QA Run', value: 'TEST_EXECUTION' },
  { label: 'Rollback / Backout Plan', value: 'ROLLBACK_PLAN' },
  { label: 'Confluence SOP Verification', value: 'CONFLUENCE_SOP' },
  { label: 'Access / RBAC Audit', value: 'ACCESS_AUDIT' },
  { label: 'Formal Exception Waiver', value: 'EXCEPTION_WAIVER' },
];

const IssuePanelApp = () => {
  const [data, setData] = useState<IssuePanelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // Evidence form state
  const [evidenceType, setEvidenceType] = useState<string>('SECURITY_SIGNOFF');
  const [selectedControlId, setSelectedControlId] = useState<string>('');
  const [evidenceSummary, setEvidenceSummary] = useState<string>('');
  const [artifactUrl, setArtifactUrl] = useState<string>('');
  const [postComment, setPostComment] = useState<boolean>(true);

  const loadCompliance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await invoke('getIssueCompliance')) as IssuePanelResponse;
      setData(res);
      if (res.assessment.impactedControls.length > 0 && !selectedControlId) {
        setSelectedControlId(res.assessment.impactedControls[0].controlId);
      } else if (res.availableControls.length > 0 && !selectedControlId) {
        setSelectedControlId(res.availableControls[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to evaluate issue compliance.');
    } finally {
      setLoading(false);
    }
  }, [selectedControlId]);

  useEffect(() => {
    void loadCompliance();
  }, [loadCompliance]);

  const handleTogglePin = async (controlId: string) => {
    setSubmitting(true);
    setBanner(null);
    try {
      const res = (await invoke('toggleControlPin', { controlId })) as {
        assessment: IssueComplianceAssessment;
        pinnedControls: string[];
      };
      setData((prev) =>
        prev ? { ...prev, assessment: res.assessment, pinnedControls: res.pinnedControls } : prev
      );
      setBanner('Updated pinned compliance controls and re-evaluated issue readiness.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pinned control.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordEvidence = async () => {
    if (!evidenceSummary.trim()) {
      setError('Enter a concise evidence summary before logging proof.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setBanner(null);

    try {
      const targetControls = selectedControlId
        ? [selectedControlId]
        : data?.assessment.impactedControls.map((c) => c.controlId) ?? ['soc2-cc8-1'];

      const res = (await invoke('recordEvidence', {
        controlIds: targetControls,
        evidenceType,
        summary: evidenceSummary.trim(),
        artifactUrl: artifactUrl.trim() || undefined,
        postComment,
      })) as {
        record: EvidenceRecord;
        commentPosted: boolean;
        assessment: IssueComplianceAssessment;
      };

      setData((prev) => (prev ? { ...prev, assessment: res.assessment } : prev));
      setEvidenceSummary('');
      setArtifactUrl('');
      setBanner(
        `Logged tamper-evident proof ${res.record.id} (SHA-256: ${res.record.proofHash.slice(0, 14)}...)${
          res.commentPosted ? ' and stamped Jira comment.' : '.'
        }`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log compliance evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Inline space="space.150" alignBlock="center">
        <Spinner size="medium" />
        <Text>ComplianceMesh is scanning controls, PII/ePHI risks, and Teamwork Graph...</Text>
      </Inline>
    );
  }

  if (error && !data) {
    return (
      <SectionMessage appearance="error" title="ComplianceMesh Scan Failed">
        <Text>{error}</Text>
      </SectionMessage>
    );
  }

  if (!data) return null;

  const { assessment, pinnedControls, availableControls } = data;
  const controlOptions = availableControls.map((c) => ({
    label: `${c.framework} ${c.code} — ${c.title}`,
    value: c.id,
  }));

  const controlsHead = {
    cells: [
      { key: 'control', content: 'Control' },
      { key: 'status', content: 'Status' },
      { key: 'signals', content: 'Matched Signals' },
      { key: 'gaps', content: 'Missing Checks' },
    ],
  };

  const controlsRows = assessment.impactedControls.map((c) => ({
    key: c.controlId,
    cells: [
      { key: 'control', content: `${c.framework} ${c.code} (${c.title})` },
      {
        key: 'status',
        content: <Lozenge appearance={controlStatusAppearance(c.status)}>{c.status}</Lozenge>,
      },
      { key: 'signals', content: c.matchedSignals.slice(0, 4).join(', ') || 'Pinned' },
      {
        key: 'gaps',
        content: c.missingChecks.length > 0 ? c.missingChecks.join(' • ') : 'All checks satisfied',
      },
    ],
  }));

  const ledgerHead = {
    cells: [
      { key: 'id', content: 'ID' },
      { key: 'type', content: 'Type' },
      { key: 'summary', content: 'Summary' },
      { key: 'hash', content: 'SHA-256 Proof' },
    ],
  };

  const ledgerRows = assessment.evidenceRecords.map((ev) => ({
    key: ev.id,
    cells: [
      { key: 'id', content: ev.id },
      { key: 'type', content: ev.evidenceType },
      { key: 'summary', content: `${ev.summary} (${ev.recordedBy})` },
      { key: 'hash', content: `${ev.proofHash.slice(0, 14)}...` },
    ],
  }));

  return (
    <Stack space="space.200">
      <Inline spread="space-between" alignBlock="center">
        <Inline space="space.100" alignBlock="center">
          <Lozenge appearance={decisionAppearance(assessment.releaseDecision)} isBold>
            {decisionLabel(assessment.releaseDecision)}
          </Lozenge>
          <Text>Readiness: {assessment.readinessScore}%</Text>
          <Text>Risk:</Text>
          <Badge appearance={assessment.riskScore >= 50 ? 'removed' : 'primary'}>
            {assessment.riskScore}
          </Badge>
        </Inline>
        <Button appearance="subtle" onClick={() => void loadCompliance()} isDisabled={submitting}>
          Re-scan Issue
        </Button>
      </Inline>

      <ProgressBar
        value={assessment.readinessScore / 100}
        appearance={assessment.readinessScore >= 80 ? 'success' : 'default'}
        ariaLabel={`Issue compliance readiness ${assessment.readinessScore}%`}
      />

      {banner && (
        <SectionMessage appearance="success" title="Compliance Ledger Updated">
          <Text>{banner}</Text>
        </SectionMessage>
      )}

      {error && (
        <SectionMessage appearance="error" title="Action Error">
          <Text>{error}</Text>
        </SectionMessage>
      )}

      {assessment.sensitiveDataFindings.length > 0 && (
        <SectionMessage
          appearance="error"
          title={`Sensitive Data / ePHI Guard Alert (${assessment.sensitiveDataFindings.length} finding${
            assessment.sensitiveDataFindings.length > 1 ? 's' : ''
          })`}
        >
          <Stack space="space.100">
            {assessment.sensitiveDataFindings.map((f, idx) => (
              <Text key={`${f.category}-${idx}`}>
                [{f.severity}] {f.category} in {f.location} ({f.maskedSample}) — {f.remediation}
              </Text>
            ))}
          </Stack>
        </SectionMessage>
      )}

      <Tabs id="compliancemesh-issue-tabs">
        <TabList>
          <Tab>Controls ({assessment.impactedControls.length})</Tab>
          <Tab>Log Evidence ({assessment.evidenceRecords.length})</Tab>
          <Tab>Teamwork Graph</Tab>
          <Tab>Pin Controls</Tab>
        </TabList>

        <TabPanel>
          <Box paddingBlockStart="space.150">
            <Stack space="space.150">
              {assessment.impactedControls.length === 0 ? (
                <SectionMessage appearance="information" title="No Regulated Controls Triggered">
                  <Text>
                    ComplianceMesh did not detect SOC 2, HIPAA, ISO 27001, or PCI-DSS triggers in
                    this issue. Use the "Pin Controls" tab if this change touches regulated systems.
                  </Text>
                </SectionMessage>
              ) : (
                <DynamicTable head={controlsHead} rows={controlsRows} />
              )}

              {assessment.recommendedActions.length > 0 && (
                <SectionMessage appearance="discovery" title="Recommended Next Steps">
                  <Stack space="space.050">
                    {assessment.recommendedActions.map((act, idx) => (
                      <Text key={idx}>• {act}</Text>
                    ))}
                  </Stack>
                </SectionMessage>
              )}
            </Stack>
          </Box>
        </TabPanel>

        <TabPanel>
          <Box paddingBlockStart="space.150">
            <Stack space="space.150">
              <Heading as="h4">Append Tamper-Evident Audit Evidence (SHA-256)</Heading>

              <Stack space="space.050">
                <Label labelFor="cm-control-select">Target Compliance Control</Label>
                <Select
                  inputId="cm-control-select"
                  options={controlOptions}
                  value={controlOptions.find((o) => o.value === selectedControlId)}
                  onChange={(opt) => {
                    if (opt && typeof opt === 'object' && 'value' in opt) {
                      setSelectedControlId(String(opt.value));
                    }
                  }}
                />
              </Stack>

              <Stack space="space.050">
                <Label labelFor="cm-type-select">Evidence Type</Label>
                <Select
                  inputId="cm-type-select"
                  options={EVIDENCE_TYPE_OPTIONS}
                  value={EVIDENCE_TYPE_OPTIONS.find((o) => o.value === evidenceType)}
                  onChange={(opt) => {
                    if (opt && typeof opt === 'object' && 'value' in opt) {
                      setEvidenceType(String(opt.value));
                    }
                  }}
                />
              </Stack>

              <Stack space="space.050">
                <Label labelFor="cm-summary-input">Evidence Summary</Label>
                <Textfield
                  id="cm-summary-input"
                  value={evidenceSummary}
                  onChange={(e) => setEvidenceSummary(e.target.value)}
                  placeholder="e.g., PR #412 peer reviewed by SecOps; TLS 1.3 & rollback verified in staging"
                />
              </Stack>

              <Stack space="space.050">
                <Label labelFor="cm-url-input">Artifact URL (Optional PR / CI / Confluence SOP)</Label>
                <Textfield
                  id="cm-url-input"
                  value={artifactUrl}
                  onChange={(e) => setArtifactUrl(e.target.value)}
                  placeholder="https://..."
                />
              </Stack>

              <Checkbox
                label="Post verified SHA-256 audit stamp comment on this Jira issue"
                isChecked={postComment}
                onChange={() => setPostComment((v) => !v)}
              />

              <Inline>
                <Button
                  appearance="primary"
                  onClick={() => void handleRecordEvidence()}
                  isDisabled={submitting}
                >
                  {submitting ? 'Logging Proof...' : 'Log Verified Evidence'}
                </Button>
              </Inline>

              {assessment.evidenceRecords.length > 0 && (
                <Stack space="space.100">
                  <Heading as="h4">Verified Proofs for {assessment.issueKey}</Heading>
                  <DynamicTable head={ledgerHead} rows={ledgerRows} />
                </Stack>
              )}
            </Stack>
          </Box>
        </TabPanel>

        <TabPanel>
          <Box paddingBlockStart="space.150">
            <Stack space="space.150">
              <Inline space="space.100" alignBlock="center">
                <Lozenge
                  appearance={
                    assessment.graphContext?.source === 'TEAMWORK_GRAPH_LIVE'
                      ? 'success'
                      : 'inprogress'
                  }
                >
                  {assessment.graphContext?.source ?? 'REST_FALLBACK'}
                </Lozenge>
                <Text>
                  Assigned Work Items: {assessment.graphContext?.assignedWorkItemsCount ?? 0} |
                  Confluence Policies: {assessment.graphContext?.connectedPagesCount ?? 0} | Stale
                  SOPs: {assessment.graphContext?.stalePoliciesCount ?? 0}
                </Text>
              </Inline>

              {assessment.graphContext?.note && (
                <Text>{assessment.graphContext.note}</Text>
              )}

              {(assessment.graphContext?.nodes.length ?? 0) === 0 ? (
                <Text>
                  No connected Teamwork Graph edges returned yet. Link a Confluence security SOP or
                  assign regulated tickets to build cross-product context.
                </Text>
              ) : (
                <Stack space="space.075">
                  {assessment.graphContext?.nodes.slice(0, 8).map((node) => (
                    <Inline key={node.id} space="space.100" alignBlock="center">
                      <Lozenge appearance={node.stale ? 'removed' : 'default'}>{node.type}</Lozenge>
                      <Text>
                        {node.label} {node.subtitle ? `— ${node.subtitle}` : ''}
                      </Text>
                    </Inline>
                  ))}
                </Stack>
              )}
            </Stack>
          </Box>
        </TabPanel>

        <TabPanel>
          <Box paddingBlockStart="space.150">
            <Stack space="space.100">
              <Text>Manually pin or unpin regulatory controls required for this Jira issue:</Text>
              {availableControls.map((ctrl) => {
                const isPinned = pinnedControls.includes(ctrl.id);
                return (
                  <Inline key={ctrl.id} spread="space-between" alignBlock="center">
                    <Text>
                      {ctrl.framework} {ctrl.code} — {ctrl.title}
                    </Text>
                    <Button
                      appearance={isPinned ? 'warning' : 'default'}
                      onClick={() => void handleTogglePin(ctrl.id)}
                      isDisabled={submitting}
                    >
                      {isPinned ? 'Unpin' : 'Pin Control'}
                    </Button>
                  </Inline>
                );
              })}
            </Stack>
          </Box>
        </TabPanel>
      </Tabs>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <IssuePanelApp />
  </React.StrictMode>
);
