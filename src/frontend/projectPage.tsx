import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Badge,
  Box,
  Button,
  DynamicTable,
  Heading,
  Inline,
  Link,
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
} from '@forge/react';
import { invoke } from '@forge/bridge';
import {
  ComplianceFramework,
  ControlStatus,
  EvidenceRecord,
  ProjectReadinessReport,
} from '../types/compliance';

interface ProjectReadinessResponse {
  report: ProjectReadinessReport;
  ledger: EvidenceRecord[];
  ledgerCheck: { valid: boolean; checkedCount: number; brokenAtSequence?: number };
}

function statusAppearance(status: ControlStatus): 'success' | 'moved' | 'removed' | 'inprogress' {
  if (status === 'PASSING') return 'success';
  if (status === 'AT_RISK') return 'moved';
  if (status === 'WAIVED') return 'inprogress';
  return 'removed';
}

const FRAMEWORK_OPTIONS: Array<{ label: string; value: 'ALL' | ComplianceFramework }> = [
  { label: 'All Frameworks (SOC 2 + HIPAA + ISO 27001 + PCI-DSS)', value: 'ALL' },
  { label: 'SOC 2 Type II', value: 'SOC2' },
  { label: 'HIPAA Security Rule', value: 'HIPAA' },
  { label: 'ISO/IEC 27001', value: 'ISO27001' },
  { label: 'PCI-DSS v4.0 / FinTech', value: 'PCI_DSS' },
];

const ProjectCommandCenter = () => {
  const [data, setData] = useState<ProjectReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [frameworkFilter, setFrameworkFilter] = useState<'ALL' | ComplianceFramework>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const [publishedPage, setPublishedPage] = useState<{
    title: string;
    webUrl: string;
  } | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await invoke('getProjectReadiness')) as ProjectReadinessResponse;
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to scan project readiness.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handlePublishAuditPacket = async () => {
    setPublishing(true);
    setError(null);
    setPublishedPage(null);
    try {
      const res = (await invoke('publishConfluenceAuditPacket')) as {
        pageId: string;
        title: string;
        webUrl: string;
      };
      setPublishedPage({ title: res.title, webUrl: res.webUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish Confluence Audit Packet.');
    } finally {
      setPublishing(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    setError(null);
    setSeedNotice(null);
    try {
      const res = (await invoke('seedDemoScenario')) as {
        createdKeys: string[];
        seededEvidenceId: string;
      };
      setSeedNotice(
        `Seeded 3 regulated demo tickets (${res.createdKeys.join(', ')}) and verified proof ${res.seededEvidenceId}. Rescanning project...`
      );
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed demo scenario.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <Box padding="space.300">
        <Inline space="space.150" alignBlock="center">
          <Spinner size="large" />
          <Text>
            Scanning Jira issues, Atlassian Teamwork Graph, Confluence SOPs, and SHA-256 Evidence
            Ledger...
          </Text>
        </Inline>
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Box padding="space.300">
        <SectionMessage appearance="error" title="ComplianceMesh Error">
          <Text>{error}</Text>
        </SectionMessage>
      </Box>
    );
  }

  if (!data) return null;

  const { report, ledger, ledgerCheck } = data;
  const filteredControls =
    frameworkFilter === 'ALL'
      ? report.controls
      : report.controls.filter((row) => row.control.framework === frameworkFilter);

  const controlsHead = {
    cells: [
      { key: 'framework', content: 'Framework & Code' },
      { key: 'title', content: 'Control Objective' },
      { key: 'status', content: 'Status' },
      { key: 'issues', content: 'Linked Jira Issues' },
      { key: 'evidence', content: 'Evidence' },
      { key: 'hash', content: 'Latest SHA-256 Proof' },
    ],
  };

  const controlsRows = filteredControls.map((row) => ({
    key: row.control.id,
    cells: [
      { key: 'framework', content: `${row.control.framework} ${row.control.code}` },
      { key: 'title', content: `${row.control.title} (${row.control.ownerRole})` },
      {
        key: 'status',
        content: <Lozenge appearance={statusAppearance(row.status)}>{row.status}</Lozenge>,
      },
      {
        key: 'issues',
        content:
          row.linkedIssueKeys.length > 0 ? row.linkedIssueKeys.slice(0, 5).join(', ') : 'None yet',
      },
      { key: 'evidence', content: <Badge appearance="primary">{row.evidenceCount}</Badge> },
      { key: 'hash', content: row.latestProofHash ? `${row.latestProofHash}...` : 'Pending' },
    ],
  }));

  const blockersHead = {
    cells: [
      { key: 'issue', content: 'Issue' },
      { key: 'summary', content: 'Summary' },
      { key: 'status', content: 'Jira Status' },
      { key: 'risk', content: 'Risk Score' },
      { key: 'reason', content: 'Primary Compliance Blocker' },
    ],
  };

  const blockersRows = report.releaseBlockers.map((b) => ({
    key: b.issueKey,
    cells: [
      { key: 'issue', content: b.issueKey },
      { key: 'summary', content: b.summary },
      { key: 'status', content: <Lozenge>{b.status}</Lozenge> },
      { key: 'risk', content: <Badge appearance="removed">{b.riskScore}</Badge> },
      { key: 'reason', content: b.reason },
    ],
  }));

  const ledgerHead = {
    cells: [
      { key: 'id', content: 'Record ID' },
      { key: 'issue', content: 'Issue' },
      { key: 'type', content: 'Type' },
      { key: 'controls', content: 'Controls' },
      { key: 'summary', content: 'Verified Summary' },
      { key: 'by', content: 'Verified By' },
      { key: 'hash', content: 'SHA-256 Chain Proof' },
    ],
  };

  const ledgerRows = ledger.map((ev) => ({
    key: ev.id,
    cells: [
      { key: 'id', content: ev.id },
      { key: 'issue', content: ev.issueKey },
      { key: 'type', content: ev.evidenceType },
      { key: 'controls', content: ev.controlIds.join(', ') },
      { key: 'summary', content: ev.summary },
      { key: 'by', content: ev.recordedBy },
      { key: 'hash', content: `${ev.proofHash.slice(0, 16)}...` },
    ],
  }));

  return (
    <Box padding="space.300">
      <Stack space="space.250">
        <Inline spread="space-between" alignBlock="center">
          <Stack space="space.050">
            <Heading as="h2">
              ComplianceMesh Audit Center — Project {report.projectKey}
            </Heading>
            <Text>
              Continuous SOC 2, HIPAA, ISO 27001 & PCI-DSS governance powered by Atlassian Teamwork
              Graph, Rovo AuditGuard, and MCP.
            </Text>
          </Stack>

          <Inline space="space.100">
            <Button onClick={() => void handleSeedDemo()} isDisabled={publishing || seeding}>
              {seeding ? 'Seeding Demo...' : 'Seed Demo Scenario'}
            </Button>
            <Button onClick={() => void loadReport()} isDisabled={publishing || seeding}>
              Run Full Project Scan
            </Button>
            <Button
              appearance="primary"
              onClick={() => void handlePublishAuditPacket()}
              isDisabled={publishing || seeding}
            >
              {publishing ? 'Publishing to Confluence...' : 'Export Audit Packet to Confluence'}
            </Button>
          </Inline>
        </Inline>

        {seedNotice && (
          <SectionMessage appearance="information" title="Demo Scenario Seeded">
            <Text>{seedNotice}</Text>
          </SectionMessage>
        )}

        {publishedPage && (
          <SectionMessage appearance="success" title="Confluence Auditor Packet Published">
            <Stack space="space.050">
              <Text>Created live Confluence page: {publishedPage.title}</Text>
              <Link href={publishedPage.webUrl} openNewTab>
                Open Audit Packet in Confluence
              </Link>
            </Stack>
          </SectionMessage>
        )}

        {error && (
          <SectionMessage appearance="error" title="Operation Failed">
            <Text>{error}</Text>
          </SectionMessage>
        )}

        <Stack space="space.100">
          <Inline space="space.200" alignBlock="center">
            <Inline space="space.075" alignBlock="center">
              <Text>Overall Audit Readiness:</Text>
              <Lozenge
                appearance={
                  report.overallReadinessScore >= 80
                    ? 'success'
                    : report.overallReadinessScore >= 50
                      ? 'moved'
                      : 'removed'
                }
                isBold
              >
                {report.overallReadinessScore}%
              </Lozenge>
            </Inline>

            <Inline space="space.075" alignBlock="center">
              <Text>Passing Controls:</Text>
              <Badge appearance="added">{report.passingControls}</Badge>
              <Text>/ {report.totalControls}</Text>
            </Inline>

            <Inline space="space.075" alignBlock="center">
              <Text>Release Blockers:</Text>
              <Badge appearance={report.blockedIssuesCount > 0 ? 'removed' : 'added'}>
                {report.blockedIssuesCount}
              </Badge>
            </Inline>

            <Inline space="space.075" alignBlock="center">
              <Text>PII/ePHI Alerts:</Text>
              <Badge appearance={report.sensitiveDataAlertsCount > 0 ? 'removed' : 'default'}>
                {report.sensitiveDataAlertsCount}
              </Badge>
            </Inline>

            <Inline space="space.075" alignBlock="center">
              <Text>SHA-256 Ledger:</Text>
              <Lozenge appearance={ledgerCheck.valid ? 'success' : 'removed'}>
                {ledgerCheck.valid
                  ? `VERIFIED (${ledgerCheck.checkedCount})`
                  : 'CHAIN INTEGRITY ALERT'}
              </Lozenge>
            </Inline>
          </Inline>

          <ProgressBar
            value={report.overallReadinessScore / 100}
            appearance={report.overallReadinessScore >= 80 ? 'success' : 'default'}
            ariaLabel={`Project audit readiness ${report.overallReadinessScore}%`}
          />
        </Stack>

        <Tabs id="compliancemesh-command-tabs">
          <TabList>
            <Tab>Control Matrix ({report.totalControls})</Tab>
            <Tab>Release Blockers ({report.blockedIssuesCount})</Tab>
            <Tab>Teamwork Graph Radar</Tab>
            <Tab>SHA-256 Evidence Ledger ({ledgerCheck.checkedCount})</Tab>
          </TabList>

          <TabPanel>
            <Box paddingBlockStart="space.200">
              <Stack space="space.150">
                <Select
                  options={FRAMEWORK_OPTIONS}
                  value={FRAMEWORK_OPTIONS.find((o) => o.value === frameworkFilter)}
                  onChange={(opt) => {
                    if (opt && typeof opt === 'object' && 'value' in opt) {
                      setFrameworkFilter(opt.value as 'ALL' | ComplianceFramework);
                    }
                  }}
                />
                <DynamicTable head={controlsHead} rows={controlsRows} rowsPerPage={10} />
              </Stack>
            </Box>
          </TabPanel>

          <TabPanel>
            <Box paddingBlockStart="space.200">
              {report.releaseBlockers.length === 0 ? (
                <SectionMessage appearance="success" title="Zero Compliance Release Blockers">
                  <Text>
                    No Jira issues in {report.projectKey} are currently blocked by critical SOC 2,
                    HIPAA, ISO 27001, or PCI-DSS gaps.
                  </Text>
                </SectionMessage>
              ) : (
                <DynamicTable head={blockersHead} rows={blockersRows} rowsPerPage={10} />
              )}
            </Box>
          </TabPanel>

          <TabPanel>
            <Box paddingBlockStart="space.200">
              <Stack space="space.150">
                <SectionMessage
                  appearance={
                    report.graphSummary.stalePoliciesCount > 0 ? 'warning' : 'information'
                  }
                  title={`Atlassian Teamwork Graph Context (${report.graphSummary.source})`}
                >
                  <Text>
                    Connected Work Items: {report.graphSummary.assignedWorkItemsCount} • Linked
                    Confluence Policies: {report.graphSummary.connectedPagesCount} • Stale SOPs
                    (&gt;90 days): {report.graphSummary.stalePoliciesCount}
                  </Text>
                </SectionMessage>

                {report.graphSummary.nodes.length === 0 ? (
                  <Text>
                    No graph nodes returned yet. Add Jira issues and Confluence security policies
                    to visualize cross-product compliance dependencies.
                  </Text>
                ) : (
                  <Stack space="space.100">
                    {report.graphSummary.nodes.map((n) => (
                      <Inline key={n.id} space="space.100" alignBlock="center">
                        <Lozenge appearance={n.stale ? 'removed' : 'inprogress'}>{n.type}</Lozenge>
                        <Text>
                          {n.label} {n.subtitle ? `— ${n.subtitle}` : ''}
                        </Text>
                      </Inline>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Box>
          </TabPanel>

          <TabPanel>
            <Box paddingBlockStart="space.200">
              {ledger.length === 0 ? (
                <SectionMessage appearance="information" title="Evidence Ledger Ready">
                  <Text>
                    Open any Jira issue and use ComplianceMesh Guard (or ask Rovo AuditGuard /
                    ComplianceMesh MCP) to log your first SHA-256 hash-chained evidence record.
                  </Text>
                </SectionMessage>
              ) : (
                <DynamicTable head={ledgerHead} rows={ledgerRows} rowsPerPage={10} />
              )}
            </Box>
          </TabPanel>
        </Tabs>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <ProjectCommandCenter />
  </React.StrictMode>
);
