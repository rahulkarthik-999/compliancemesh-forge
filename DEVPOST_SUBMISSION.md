# Codegeist 2026 — Copy-Paste Devpost Submission Draft

**Project Name:** `ComplianceMesh — Continuous Audit & Evidence Engine`  
**Tagline:** `Continuous SOC 2, HIPAA, ISO 27001 & PCI-DSS governance in Jira & Confluence — powered by Forge, Rovo, Atlassian MCP & Teamwork Graph.`  
**Primary Track:** `Apps for Specialized Industries`  
**Bonus Awards:** `Best Rovo Agent` · `Best Atlassian MCP App` · `Best Teamwork Graph Integration` · `Best Marketplace Published App`  
**Repository URL:** `https://github.com/rahulkarthik-999/compliancemesh-forge`  
**Shareable Forge Install Link:** `https://developer.atlassian.com/console/install/ed91897d-beed-4760-8bc8-a0d7504215ba?signature=AYABeFfIB%2FJrlqV3j2MVBdTvpJQAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucBaaOZ2fHjXRLToZlvpwdsIwAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDMQtjUC6Ls44TpnNqgIBEIA75k3W%2FZ1uf59w7BpUvJ1D0dUuwvjWvRFCdNhlKEUiMfsVArhE9YFSVUGMTkdszzsHkKXsUWZ8k%2FQbhvgAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgHp43fufVl%2FoSkEuvPikWe7AAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMl6pJavfuw5MQIDtDAgEQgDtA15cYpKXxY82ejM08Kt3dsOwUse8Rwb2%2F6Ll1vvl%2Fl%2BvM4kD20rTOtRY%2BtdDsI87nRXj06pzYRBAmMgAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEASdvDk2VfZ36f%2BJzx0NVdnMAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAx%2FZBbPqEBj4tw2J10CARCAO67zqfZtZ%2F5KoJDcldZoehgISh15IkTphXBDVCisNq%2FBZ989Rj42kr%2BIiEcGDISn1rjbz%2BIzrfkcY1URAgAAAAAMAAAQAAAAAAAAAAAAAAAAAHTVsJPwJ3jQXMrVd1ZEl7L%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADL%2FjhuiO%2Br6%2FsRgtHUQ9OdJbJjQeVHLPEWu7eXfA6BdPRyWfLUt7kevbTgIxJJB102CFnIJi0AuoQlqPrAdolvtC5U%3D&product=jira`  
**Demo Video URL (YouTube, <5 min):** `[PASTE AFTER RECORDING]`

---

## Built With (Tags)
`atlassian-forge` · `jira` · `confluence` · `rovo` · `rovo-agent` · `atlassian-mcp` · `teamwork-graph` · `typescript` · `react` · `forge-ui-kit` · `forge-kvs`

---

## Inspiration

Regulated **FinTech** (SOC 2, PCI-DSS) and **HealthTech** (HIPAA, ISO 27001) teams already plan work in **Jira** and document security SOPs in **Confluence**—yet right before every audit, engineering freezes for 2–4 weeks to hunt screenshots, verify peer reviews, check if security policies went stale, and clean up accidental PII/ePHI leaks in ticket descriptions.

Worse, traditional third-party compliance SaaS tools require shipping sensitive Jira and Confluence data out to external servers—creating *new* vendor risk for the exact regulated teams trying to minimize it.

We built **ComplianceMesh** to embody Codegeist 2026's theme—**"Build with context. Ship with confidence"**—by turning Jira and Confluence into a **100% Runs on Atlassian (zero-egress)** continuous audit and cryptographic evidence engine.

---

## What It Does

1. **Jira Issue Panel (`ComplianceMesh Guard`):**
   - Automatically evaluates every Jira issue against **SOC 2 Type II** (`CC6.1`, `CC6.6`, `CC7.2`, `CC8.1`), **HIPAA Security Rule** (`§164.312(a)(1)`, `§164.312(b)`, `§164.312(e)(1)`), **ISO 27001** (`A.8.25`), and **PCI-DSS v4.0** (`PCI-6.3`).
   - Instant **PII / ePHI / Secret Leak Guard** detects exposed SSNs, Luhn-validated payment cards, patient MRNs, PANs, and live API secrets—alerting with masked samples and immediate remediation guidance.
   - Displays a real-time release verdict (`READY TO SHIP`, `NEEDS EVIDENCE`, or `BLOCKED BY COMPLIANCE`) and lets reviewers append **SHA-256 hash-chained evidence proofs** directly into `@forge/kvs` while stamping a formatted ADF audit panel comment onto the Jira issue.
2. **Jira Project Page (`ComplianceMesh Audit Center`):**
   - Executive readiness dashboard across all 4 frameworks, surfacing release blockers, sensitive-data alerts, and live **SHA-256 ledger integrity verification**.
   - Includes a **1-click "Seed Demo Scenario"** button so any judge or evaluator on an empty project can spin up 3 realistic FinTech/HealthTech tickets + 1 verified proof in 3 seconds.
   - **1-click "Export Audit Packet to Confluence"** publishes a structured, auditor-ready Confluence page via Confluence REST API v2.
3. **Confluence Live Evidence Macro (`ComplianceMesh Live Audit Matrix`):**
   - Embeddable via `/ComplianceMesh` inside any Confluence security policy or auditor portal page, displaying live control statuses and SHA-256 proof hashes straight from Jira.
4. **Autonomous Rovo Agent (`ComplianceMesh AuditGuard` — `rovo:agent`):**
   - Embedded inside Jira & Confluence Rovo Chat with 5 live Forge actions (`audit-jira-issue`, `get-audit-readiness`, `traverse-compliance-graph`, `record-audit-evidence`, `publish-audit-packet`).
5. **Atlassian MCP Server (`ComplianceMesh MCP Server` — `rovo:mcp`):**
   - Exposes all 5 compliance tools over **Model Context Protocol** (`https://mcp.atlassian.com/v2/mcp`) so developers inside Cursor, Claude, or Rovo Studio can verify regulatory compliance and log SHA-256 evidence straight from their IDE before merging.
6. **Atlassian Teamwork Graph Integration (`api.asUser().requestTeamworkGraph`):**
   - Traverses real cross-product relationships (owners ↔ assigned Jira issues ↔ Confluence compliance SOPs) to catch stale (>90-day) security policies and release blast radius.
7. **Continuous Background Guardrails (`avi:jira:created:issue`, `avi:jira:updated:issue`):**
   - Automatically scans created and updated tickets for compliance drift in real time.

---

## How We Built It

- **Platform:** 100% serverless **Atlassian Forge** (`nodejs22.x`), verified eligible for Atlassian's **Runs on Atlassian** program (`egress: []` — zero external data egress).
- **UI:** Native **Forge UI Kit (`@forge/react`)** across Jira Issue Panel, Jira Project Page, and Confluence Macro.
- **Context & AI:** `rovo:agent` + `rovo:mcp` sharing 5 strongly-typed Forge `action` modules, paired with `api.asUser().requestTeamworkGraph()` and Jira v3 / Confluence v2 REST APIs.
- **Integrity:** Node `crypto` SHA-256 hash-chained ledger stored per project in `@forge/kvs` with full chain verification (`verifyEvidenceLedgerChain`).
- **Testing:** Strict TypeScript (`tsc --noEmit`), Vitest unit test suite (`src/core/complianceEngine.test.ts`), and Atlassian Forge linter (`forge lint` — 0 issues).

---

## Challenges We Ran Into

- **Balancing strict regulatory depth with zero external egress:** Regulated teams refuse to send ticket data to third-party servers. Designing the entire control mapping, Luhn/PII/ePHI leak scanner, and SHA-256 evidence chain to run natively inside Forge—while pairing with Atlassian's own Rovo Agent and MCP layer—kept `egress: []` intact and earned **Runs on Atlassian** eligibility.
- **Teamwork Graph graceful degradation across fresh sandboxes:** Fresh test sites often have sparse TWG edges. We wired real `requestTeamworkGraph` queries with granular `read:graph:*` scopes alongside transparent telemetry (`TEAMWORK_GRAPH_LIVE` vs `REST_FALLBACK`) and Confluence SOP freshness enrichment so the experience stays reliable on every site.

---

## Accomplishments That We're Proud Of

- **Zero-egress "Runs on Atlassian" production deployment (`v2.0.0`)** spanning Jira, Confluence, Rovo Agent, Atlassian MCP, and Teamwork Graph in a single cohesive Forge app.
- **Tamper-evident SHA-256 audit ledger** verifiable right inside Jira and exported cleanly into Confluence Auditor Packets.
- **3-second judge onboarding** via the built-in **Seed Demo Scenario** button.

---

## How Judges Can Test ComplianceMesh (3 Minutes)

1. Install ComplianceMesh on a Jira + Confluence site using the shareable install link (or Marketplace listing).
2. Open any Jira project → left sidebar → **Apps → ComplianceMesh Audit Center** → click **Allow access**.
3. Click **Seed Demo Scenario** to generate 3 FinTech/HealthTech issues and 1 verified SHA-256 proof.
4. Open the first created issue → **ComplianceMesh Guard** to view the masked ePHI leak alert, mapped controls, Teamwork Graph context, and log new SHA-256 evidence.
5. Click **Export Audit Packet to Confluence**, embed `/ComplianceMesh` on a Confluence page, and ask **ComplianceMesh AuditGuard** in Rovo Chat (or connect `https://mcp.atlassian.com/v2/mcp` in Cursor/Claude) to audit an issue live.

---

## Connecting Atlassian MCP Live (For Demo Video & Judges)

Connect any MCP client (Cursor, Claude Code, Claude Desktop, or Rovo Studio) to Atlassian's official Remote MCP endpoint:

- **Endpoint:** `https://mcp.atlassian.com/v2/mcp`
- **Claude Code CLI:**
  ```bash
  claude mcp add --transport http atlassian https://mcp.atlassian.com/v2/mcp
  ```
- Authenticate via OAuth 2.1 with your Atlassian account (`rahulkarthik999.atlassian.net`). Your installed **ComplianceMesh MCP Server** tools (`audit-jira-issue`, `get-audit-readiness`, `traverse-compliance-graph`, `record-audit-evidence`, `publish-audit-packet`) are automatically governed by your Atlassian user permissions!
