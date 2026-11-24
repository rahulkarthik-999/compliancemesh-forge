import api, { route } from '@forge/api';
import {
  TeamworkGraphEdge,
  TeamworkGraphNode,
  TeamworkGraphSummary,
} from '../types/compliance';

const TWG_USER_WORK_QUERY = `
  query ComplianceMeshUserGraph($first: Int) {
    atlassianUserAssignedJiraWorkItems(first: $first) {
      edges {
        node {
          id
          key
          summary
          status
        }
      }
    }
  }
`;

interface TwgEdgeNode {
  node?: {
    id?: string;
    key?: string;
    summary?: string;
    status?: string;
  };
}

interface ConfluencePageSummary {
  id: string;
  title: string;
  status?: string;
  version?: {
    createdAt?: string;
  };
  _links?: {
    webui?: string;
  };
}

function isOlderThanDays(isoDate: string | undefined, days: number): boolean {
  if (!isoDate) return false;
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) return false;
  const ageMs = Date.now() - parsed;
  return ageMs > days * 24 * 60 * 60 * 1000;
}

/**
 * Queries Atlassian Teamwork Graph (/gateway/api/graphql/twg) via Forge's
 * native requestTeamworkGraph() API and enriches with Confluence SOP policy
 * freshness signals so auditors and engineers can see cross-product blast radius.
 */
export async function queryComplianceTeamworkGraph(options: {
  focusIssueKey?: string;
  projectKey?: string;
  maxItems?: number;
}): Promise<TeamworkGraphSummary> {
  const nodes: TeamworkGraphNode[] = [];
  const edges: TeamworkGraphEdge[] = [];
  const seenNodes = new Set<string>();

  const pushNode = (node: TeamworkGraphNode) => {
    if (!seenNodes.has(node.id)) {
      seenNodes.add(node.id);
      nodes.push(node);
    }
  };

  let source: TeamworkGraphSummary['source'] = 'REST_FALLBACK';
  let assignedWorkItemsCount = 0;
  let note = '';

  // 1. Live Teamwork Graph GraphQL traversal via @forge/api
  try {
    const asUserClient = api.asUser() as unknown as {
      requestTeamworkGraph?: (query: string, variables?: Record<string, unknown>) => Promise<{
        ok?: boolean;
        json: () => Promise<{
          data?: {
            atlassianUserAssignedJiraWorkItems?: {
              edges?: TwgEdgeNode[];
            };
          };
          errors?: Array<{ message: string }>;
        }>;
      }>;
    };

    if (typeof asUserClient.requestTeamworkGraph === 'function') {
      const response = await asUserClient.requestTeamworkGraph(TWG_USER_WORK_QUERY, {
        first: options.maxItems ?? 12,
      });
      const json = await response.json();
      const twgEdges = json?.data?.atlassianUserAssignedJiraWorkItems?.edges ?? [];

      if (!json?.errors || twgEdges.length > 0) {
        source = 'TEAMWORK_GRAPH_LIVE';
        assignedWorkItemsCount = twgEdges.length;

        pushNode({
          id: 'twg:current-user',
          type: 'USER',
          label: 'Active Control Owner (TWG)',
          subtitle: 'Verified via Teamwork Graph',
        });

        for (const edge of twgEdges) {
          const item = edge.node;
          if (!item?.key) continue;
          const issueNodeId = `issue:${item.key}`;
          pushNode({
            id: issueNodeId,
            type: 'ISSUE',
            label: item.key,
            subtitle: `${item.summary ?? 'Jira Issue'} [${item.status ?? 'Open'}]`,
          });
          edges.push({
            from: 'twg:current-user',
            to: issueNodeId,
            relation: 'ASSIGNED_WORK_ITEM',
          });
        }
      } else {
        note = `TWG returned schema/scope notice: ${json.errors[0]?.message ?? 'check TWG scopes'}`;
      }
    }
  } catch (err) {
    note = `TWG fallback active (${err instanceof Error ? err.message : 'unavailable in sandbox'})`;
  }

  // 2. Discover connected Confluence Compliance SOP / Policy pages & check staleness (>90 days)
  let connectedPagesCount = 0;
  let stalePoliciesCount = 0;

  try {
    const confRes = await api
      .asUser()
      .requestConfluence(route`/wiki/api/v2/pages?limit=15&sort=-modified-date`);
    if (confRes.ok) {
      const confData = (await confRes.json()) as { results?: ConfluencePageSummary[] };
      const pages = confData.results ?? [];

      const policyPages = pages.filter((p) =>
        /(soc\s*2|hipaa|iso|pci|policy|sop|compliance|security|runbook|audit|privacy|incident)/i.test(
          p.title ?? ''
        )
      );
      const selectedPages = policyPages.length > 0 ? policyPages.slice(0, 8) : pages.slice(0, 5);
      connectedPagesCount = selectedPages.length;

      for (const page of selectedPages) {
        const stale = isOlderThanDays(page.version?.createdAt, 90);
        if (stale) stalePoliciesCount += 1;

        const pageNodeId = `page:${page.id}`;
        pushNode({
          id: pageNodeId,
          type: 'PAGE',
          label: page.title || `Confluence Page ${page.id}`,
          subtitle: stale ? 'Stale SOP (>90d)' : 'Active Confluence Policy',
          url: page._links?.webui ? `/wiki${page._links.webui}` : undefined,
          stale,
        });

        if (options.focusIssueKey) {
          const focusNodeId = `issue:${options.focusIssueKey}`;
          pushNode({
            id: focusNodeId,
            type: 'ISSUE',
            label: options.focusIssueKey,
            subtitle: 'Focused Regulated Work Item',
          });
          edges.push({
            from: focusNodeId,
            to: pageNodeId,
            relation: stale ? 'STALE_SOP_DEPENDENCY' : 'GOVERNED_BY_SOP',
          });
        } else if (seenNodes.has('twg:current-user')) {
          edges.push({
            from: 'twg:current-user',
            to: pageNodeId,
            relation: 'GOVERNANCE_POLICY',
          });
        }
      }
    }
  } catch {
    // Confluence may not be installed on Jira-only test sites; degrade gracefully.
  }

  return {
    source,
    nodes,
    edges,
    assignedWorkItemsCount,
    connectedPagesCount,
    stalePoliciesCount,
    queriedAt: new Date().toISOString(),
    note: note || undefined,
  };
}
