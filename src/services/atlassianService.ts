import api, { route } from '@forge/api';
import {
  EvidenceRecord,
  IssueInput,
  ProjectReadinessReport,
} from '../types/compliance';

function extractPlainTextFromAdf(node: unknown): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) {
    return node.map(extractPlainTextFromAdf).join(' ');
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof obj.text === 'string') parts.push(obj.text);
    if (Array.isArray(obj.content)) {
      parts.push(obj.content.map(extractPlainTextFromAdf).join(' '));
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

interface RawJiraIssue {
  id: string;
  key: string;
  fields?: {
    project?: { key?: string };
    summary?: string;
    description?: unknown;
    status?: { name?: string; statusCategory?: { name?: string } };
    priority?: { name?: string };
    issuetype?: { name?: string };
    labels?: string[];
    assignee?: { displayName?: string; accountId?: string } | null;
    reporter?: { displayName?: string } | null;
    comment?: {
      comments?: Array<{
        author?: { displayName?: string };
        body?: unknown;
        created?: string;
      }>;
    };
    updated?: string;
  };
}

function normalizeJiraIssue(raw: RawJiraIssue, linkedConfluenceUrls: string[] = []): IssueInput {
  const fields = raw.fields ?? {};
  const comments = (fields.comment?.comments ?? []).map((c) => ({
    author: c.author?.displayName ?? 'Unknown',
    body: extractPlainTextFromAdf(c.body),
    created: c.created ?? '',
  }));

  return {
    id: raw.id,
    key: raw.key,
    projectKey: fields.project?.key ?? raw.key.split('-')[0] ?? 'PROJ',
    summary: fields.summary ?? '',
    description: extractPlainTextFromAdf(fields.description),
    status: fields.status?.name ?? 'Unknown',
    statusCategory: fields.status?.statusCategory?.name,
    priority: fields.priority?.name,
    issueType: fields.issuetype?.name,
    labels: fields.labels ?? [],
    assigneeName: fields.assignee?.displayName,
    assigneeAccountId: fields.assignee?.accountId,
    reporterName: fields.reporter?.displayName,
    comments,
    linkedConfluenceUrls,
    updatedAt: fields.updated,
  };
}

export async function fetchJiraIssue(
  issueKey: string,
  authMode: 'asUser' | 'asApp' = 'asUser'
): Promise<IssueInput> {
  const client = authMode === 'asApp' ? api.asApp() : api.asUser();
  const res = await client.requestJira(
    route`/rest/api/3/issue/${issueKey}?fields=project,summary,description,status,priority,issuetype,labels,assignee,reporter,comment,updated`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Jira issue ${issueKey} (HTTP ${res.status})`);
  }
  const raw = (await res.json()) as RawJiraIssue;

  let linkedConfluenceUrls: string[] = [];
  try {
    const linksRes = await client.requestJira(route`/rest/api/3/issue/${issueKey}/remotelink`);
    if (linksRes.ok) {
      const links = (await linksRes.json()) as Array<{
        object?: { url?: string; title?: string };
      }>;
      linkedConfluenceUrls = links
        .map((l) => l.object?.url ?? '')
        .filter((u) => /\/wiki\//i.test(u));
    }
  } catch {
    // Non-fatal if remote links are unavailable
  }

  return normalizeJiraIssue(raw, linkedConfluenceUrls);
}

export async function fetchProjectIssues(
  projectKey: string,
  maxResults = 30
): Promise<IssueInput[]> {
  const jql = `project = "${projectKey}" ORDER BY updated DESC`;
  const res = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jql,
      maxResults,
      fields: [
        'project',
        'summary',
        'description',
        'status',
        'priority',
        'issuetype',
        'labels',
        'assignee',
        'reporter',
        'comment',
        'updated',
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to search Jira issues for project ${projectKey} (HTTP ${res.status})`);
  }

  const data = (await res.json()) as { issues?: RawJiraIssue[] };
  return (data.issues ?? []).map((raw) => normalizeJiraIssue(raw));
}

export async function getCurrentUserDisplayName(): Promise<string> {
  try {
    const res = await api.asUser().requestJira(route`/rest/api/3/myself`);
    if (res.ok) {
      const me = (await res.json()) as { displayName?: string; emailAddress?: string };
      return me.displayName || me.emailAddress || 'Atlassian User';
    }
  } catch {
    // fallback
  }
  return 'Atlassian User';
}

export async function postComplianceCommentOnIssue(
  issueKey: string,
  record: EvidenceRecord
): Promise<boolean> {
  const body = {
    body: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'panel',
          attrs: { panelType: 'success' },
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `ComplianceMesh Verified Evidence (${record.id})`,
                  marks: [{ type: 'strong' }],
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `Type: ${record.evidenceType} | Controls: ${record.controlIds.join(', ')} | Recorded by: ${record.recordedBy}`,
                },
              ],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: `Summary: ${record.summary}` }],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `SHA-256 Proof Hash: ${record.proofHash}`,
                  marks: [{ type: 'code' }],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const res = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export async function createJiraIssue(input: {
  projectKey: string;
  summary: string;
  description: string;
  labels?: string[];
}): Promise<{ id: string; key: string }> {
  // Discover a valid issue type (Task / Story / first available non-subtask) for this project
  let issueTypeName = 'Task';
  try {
    const metaRes = await api
      .asUser()
      .requestJira(route`/rest/api/3/issue/createmeta/${input.projectKey}/issuetypes`);
    if (metaRes.ok) {
      const meta = (await metaRes.json()) as {
        issueTypes?: Array<{ name?: string; subtask?: boolean }>;
      };
      const nonSubtasks = (meta.issueTypes ?? []).filter((t) => !t.subtask && t.name);
      const preferred =
        nonSubtasks.find((t) => t.name === 'Task') ??
        nonSubtasks.find((t) => t.name === 'Story') ??
        nonSubtasks[0];
      if (preferred?.name) issueTypeName = preferred.name;
    }
  } catch {
    // Default to Task
  }

  const res = await api.asUser().requestJira(route`/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project: { key: input.projectKey },
        issuetype: { name: issueTypeName },
        summary: input.summary,
        labels: input.labels ?? [],
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: input.description }],
            },
          ],
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Jira issue in ${input.projectKey} (HTTP ${res.status}): ${errText}`);
  }
  return (await res.json()) as { id: string; key: string };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function publishAuditPacketToConfluence(
  report: ProjectReadinessReport,
  evidenceLedger: EvidenceRecord[],
  preferredSpaceKey?: string
): Promise<{ pageId: string; title: string; webUrl: string }> {
  // 1. Find target Confluence space
  const spacesRes = await api.asUser().requestConfluence(route`/wiki/api/v2/spaces?limit=25`);
  if (!spacesRes.ok) {
    throw new Error(`Unable to read Confluence spaces (HTTP ${spacesRes.status}). Ensure Confluence is enabled on this site.`);
  }
  const spacesData = (await spacesRes.json()) as {
    results?: Array<{ id: string; key: string; name: string }>;
  };
  const spaces = spacesData.results ?? [];
  if (spaces.length === 0) {
    throw new Error('No Confluence spaces found on this site.');
  }

  const chosenSpace =
    (preferredSpaceKey
      ? spaces.find((s) => s.key.toUpperCase() === preferredSpaceKey.toUpperCase())
      : undefined) ??
    spaces.find((s) => /(sec|comp|audit|gov|ops)/i.test(s.key + s.name)) ??
    spaces[0];

  const dateStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const title = `ComplianceMesh Audit Packet — ${report.projectKey} (${dateStamp} UTC)`;

  const controlRowsHtml = report.controls
    .map(
      (row) =>
        `<tr>` +
        `<td><strong>${escapeHtml(row.control.framework)} ${escapeHtml(row.control.code)}</strong></td>` +
        `<td>${escapeHtml(row.control.title)}</td>` +
        `<td>${escapeHtml(row.status)}</td>` +
        `<td>${escapeHtml(row.linkedIssueKeys.join(', ') || 'None')}</td>` +
        `<td>${row.evidenceCount}</td>` +
        `<td><code>${escapeHtml(row.latestProofHash ?? 'Pending')}</code></td>` +
        `</tr>`
    )
    .join('');

  const ledgerRowsHtml = evidenceLedger
    .slice(-15)
    .reverse()
    .map(
      (rec) =>
        `<tr>` +
        `<td>${escapeHtml(rec.id)}</td>` +
        `<td>${escapeHtml(rec.issueKey)}</td>` +
        `<td>${escapeHtml(rec.evidenceType)}</td>` +
        `<td>${escapeHtml(rec.controlIds.join(', '))}</td>` +
        `<td>${escapeHtml(rec.summary)}</td>` +
        `<td>${escapeHtml(rec.recordedBy)}</td>` +
        `<td><code>${escapeHtml(rec.proofHash.slice(0, 16))}...</code></td>` +
        `</tr>`
    )
    .join('');

  const storageBody = `
    <p><strong>Generated by ComplianceMesh</strong> on ${escapeHtml(report.generatedAt)} | Project: <strong>${escapeHtml(report.projectKey)}</strong> | Teamwork Graph Mode: <strong>${escapeHtml(report.graphSummary.source)}</strong></p>
    <h2>1. Executive Audit Readiness Summary</h2>
    <ul>
      <li><strong>Overall Readiness Score:</strong> ${report.overallReadinessScore}%</li>
      <li><strong>Passing Controls:</strong> ${report.passingControls} / ${report.totalControls}</li>
      <li><strong>Active Release Blockers:</strong> ${report.blockedIssuesCount}</li>
      <li><strong>Sensitive Data / ePHI Alerts:</strong> ${report.sensitiveDataAlertsCount}</li>
      <li><strong>SHA-256 Evidence Ledger Integrity:</strong> ${report.ledgerIntegrityValid ? 'VERIFIED VALID' : 'INTEGRITY ALERT'} (${report.ledgerCount} records)</li>
    </ul>
    <h2>2. Regulatory Control Matrix (SOC 2 / HIPAA / ISO 27001 / PCI-DSS)</h2>
    <table>
      <thead>
        <tr><th>Control</th><th>Title</th><th>Status</th><th>Linked Jira Issues</th><th>Evidence Count</th><th>Latest Proof Hash</th></tr>
      </thead>
      <tbody>${controlRowsHtml}</tbody>
    </table>
    <h2>3. Tamper-Evident Evidence Ledger (Recent Entries)</h2>
    <table>
      <thead>
        <tr><th>ID</th><th>Issue</th><th>Type</th><th>Controls</th><th>Summary</th><th>Verified By</th><th>SHA-256 Proof</th></tr>
      </thead>
      <tbody>${ledgerRowsHtml || '<tr><td colspan="7">No evidence records logged yet.</td></tr>'}</tbody>
    </table>
  `.trim();

  const createRes = await api.asUser().requestConfluence(route`/wiki/api/v2/pages`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      spaceId: chosenSpace.id,
      status: 'current',
      title,
      body: {
        representation: 'storage',
        value: storageBody,
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to publish Confluence Audit Packet (HTTP ${createRes.status}): ${errText}`);
  }

  const created = (await createRes.json()) as {
    id: string;
    title: string;
    _links?: { webui?: string; base?: string };
  };

  const webUrl = created._links?.base && created._links?.webui
    ? `${created._links.base}${created._links.webui}`
    : created._links?.webui ?? `/wiki/pages/${created.id}`;

  return {
    pageId: created.id,
    title: created.title,
    webUrl,
  };
}
