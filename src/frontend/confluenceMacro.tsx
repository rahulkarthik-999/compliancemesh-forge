import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Badge,
  Box,
  Button,
  DynamicTable,
  Heading,
  Inline,
  Lozenge,
  ProgressBar,
  SectionMessage,
  Select,
  Spinner,
  Stack,
  Text,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import { ControlStatus, EvidenceRecord, ProjectReadinessReport } from '../types/compliance';

interface MacroDataResponse {
  trackedProjects: string[];
  activeProjectKey?: string;
  report: ProjectReadinessReport | null;
  ledger: EvidenceRecord[];
}

function statusAppearance(status: ControlStatus): 'success' | 'moved' | 'removed' | 'inprogress' {
  if (status === 'PASSING') return 'success';
  if (status === 'AT_RISK') return 'moved';
  if (status === 'WAIVED') return 'inprogress';
  return 'removed';
}

const ConfluenceAuditMacro = () => {
  const [data, setData] = useState<MacroDataResponse | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMacro = useCallback(async (projectKey?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = (await invoke('getConfluenceMacroData', {
        projectKey,
      })) as MacroDataResponse;
      setData(res);
      setSelectedProject(res.activeProjectKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load ComplianceMesh macro.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMacro();
  }, [loadMacro]);

  if (loading) {
    return (
      <Inline space="space.100" alignBlock="center">
        <Spinner size="medium" />
        <Text>Loading live ComplianceMesh audit matrix...</Text>
      </Inline>
    );
  }

  if (error) {
    return (
      <SectionMessage appearance="error" title="ComplianceMesh Macro Error">
        <Text>{error}</Text>
      </SectionMessage>
    );
  }

  if (!data || !data.report) {
    return (
      <SectionMessage appearance="information" title="ComplianceMesh Live Audit Matrix">
        <Text>
          No Jira project audit snapshots found yet. Open the ComplianceMesh Audit Center in any
          Jira project and run a scan to populate live evidence here.
        </Text>
      </SectionMessage>
    );
  }

  const { report, trackedProjects } = data;
  const projectOptions = trackedProjects.map((key) => ({
    label: `Jira Project ${key}`,
    value: key,
  }));

  const head = {
    cells: [
      { key: 'control', content: 'Control' },
      { key: 'title', content: 'Requirement' },
      { key: 'status', content: 'Live Status' },
      { key: 'evidence', content: 'Proofs' },
      { key: 'hash', content: 'Latest SHA-256 Proof' },
    ],
  };

  const rows = report.controls.map((row) => ({
    key: row.control.id,
    cells: [
      { key: 'control', content: `${row.control.framework} ${row.control.code}` },
      { key: 'title', content: row.control.title },
      {
        key: 'status',
        content: <Lozenge appearance={statusAppearance(row.status)}>{row.status}</Lozenge>,
      },
      { key: 'evidence', content: <Badge appearance="primary">{row.evidenceCount}</Badge> },
      { key: 'hash', content: row.latestProofHash ? `${row.latestProofHash}...` : 'Pending' },
    ],
  }));

  return (
    <Box padding="space.200">
      <Stack space="space.150">
        <Inline spread="space-between" alignBlock="center">
          <Heading as="h3">
            ComplianceMesh Live Audit Evidence — {report.projectKey}
          </Heading>
          <Inline space="space.100" alignBlock="center">
            {projectOptions.length > 1 && (
              <Select
                options={projectOptions}
                value={projectOptions.find((o) => o.value === selectedProject)}
                onChange={(opt) => {
                  if (opt && typeof opt === 'object' && 'value' in opt) {
                    const nextKey = String(opt.value);
                    setSelectedProject(nextKey);
                    void loadMacro(nextKey);
                  }
                }}
              />
            )}
            <Button appearance="subtle" onClick={() => void loadMacro(selectedProject)}>
              Refresh
            </Button>
          </Inline>
        </Inline>

        <Inline space="space.150" alignBlock="center">
          <Lozenge appearance={report.overallReadinessScore >= 80 ? 'success' : 'moved'} isBold>
            Readiness {report.overallReadinessScore}%
          </Lozenge>
          <Lozenge appearance={report.ledgerIntegrityValid ? 'success' : 'removed'}>
            {report.ledgerIntegrityValid
              ? `SHA-256 Chain Verified (${report.ledgerCount})`
              : 'Chain Alert'}
          </Lozenge>
          <Text>
            Passing: {report.passingControls}/{report.totalControls} • Release Blockers:{' '}
            {report.blockedIssuesCount} • Graph: {report.graphSummary.source}
          </Text>
        </Inline>

        <ProgressBar
          value={report.overallReadinessScore / 100}
          appearance={report.overallReadinessScore >= 80 ? 'success' : 'default'}
          ariaLabel={`Audit readiness ${report.overallReadinessScore}%`}
        />

        <DynamicTable head={head} rows={rows} rowsPerPage={10} />
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <ConfluenceAuditMacro />
  </React.StrictMode>
);
