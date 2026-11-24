# ComplianceMesh — Continuous Audit & Evidence Engine for Regulated Teams

> **Built for Atlassian Codegeist 2026** (*"Build with context. Ship with confidence"*)  
> **Primary Track:** Apps for Specialized Industries (FinTech & HealthTech Compliance)  
> **Bonus Tracks Targeted:** Best Rovo Agent (`rovo:agent`) · Best Atlassian MCP App (`rovo:mcp`) · Best Teamwork Graph Integration (`/gateway/api/graphql/twg`) · Best Marketplace Published App

---

## The Problem

Regulated **FinTech** (SOC 2, PCI-DSS) and **HealthTech** (HIPAA, ISO 27001) teams ship code in **Jira** and maintain SOPs in **Confluence**, yet burn **2–4 engineering weeks before every audit** chasing screenshots, proving peer reviews, hunting stale policies, and hoping nobody pasted raw ePHI, SSNs, or API secrets into a ticket.

## What ComplianceMesh Does

ComplianceMesh turns Jira + Confluence into a **live, tamper-evident compliance engine** built 100% natively on **Atlassian Forge**:

1. **Jira Issue Panel (`ComplianceMesh Guard`)**:
   - Real-time scanning of every Jira issue against **SOC 2 Type II**, **HIPAA Security Rule**, **ISO 27001**, and **PCI-DSS v4.0** controls.
   - Instant **PII / ePHI / Secret Leak Guard** (catches raw SSNs, Luhn-valid card PANs, Medical Record Numbers, Indian PANs, and live API secrets with masked alerts).
   - 1-click **Tamper-Evident SHA-256 Evidence Logging** (`@forge/kvs` hash-chained ledger) + optional formatted ADF audit stamp comment on the Jira ticket.
   - **Teamwork Graph Context Tab** showing linked owners, work items, and stale (>90-day) Confluence SOP warnings.
2. **Jira Project Page (`ComplianceMesh Audit Center`)**:
   - Executive audit readiness dashboard across all 4 regulatory frameworks.
   - Surfaces **Compliance Release Blockers** before non-compliant changes reach production.
   - Verifies cryptographic **SHA-256 chain integrity** across the entire evidence ledger.
   - **1-Click Export to Confluence:** publishes a complete, auditor-ready **Evidence Packet** page directly into Confluence via Confluence REST API v2.
3. **Confluence Macro (`ComplianceMesh Live Audit Matrix`)**:
   - Drop `/ComplianceMesh` onto any Confluence Security Policy or Auditor Portal page to render a live, auto-updating control status table backed by real Jira engineering evidence.
4. **Autonomous Rovo Agent (`ComplianceMesh AuditGuard` — `rovo:agent`)**:
   - Conversational compliance officer inside Jira & Confluence equipped with 5 live Forge actions (`audit-jira-issue`, `get-audit-readiness`, `traverse-compliance-graph`, `record-audit-evidence`, `publish-audit-packet`).
5. **Atlassian MCP Server (`ComplianceMesh MCP Server` — `rovo:mcp`)**:
   - Exposes the exact same 5 compliance actions over **Model Context Protocol (MCP)** so engineers in Cursor, Claude, Antigravity, or Rovo Studio can run pre-merge compliance checks and log SHA-256 evidence straight from their IDE.
6. **Continuous Guardrail Trigger (`avi:jira:created:issue`, `avi:jira:updated:issue`)**:
   - Automatically evaluates created/updated Jira issues in the background to detect compliance drift in real time.

---

## Architecture

```
Jira Issue / Project / Confluence Page  ◄──►  Native UI Kit (@forge/react)
Rovo Chat (AuditGuard)                  ◄──►  rovo:agent + 5 Forge Actions
External AI IDEs (Cursor / Claude)      ◄──►  rovo:mcp (Atlassian MCP Server)
                                                     │
                                                     ▼
                                     ComplianceMesh Forge Backend
                           ┌─────────────────────────┼─────────────────────────┐
                           ▼                         ▼                         ▼
                Atlassian Teamwork Graph     Jira v3 & Confluence v2     Forge KVS (@forge/kvs)
              (requestTeamworkGraph API)      REST APIs (Issues/SOPs)   SHA-256 Hash-Chained Ledger
```

---

## Quick Start & Live Deployment (Atlassian Cloud Developer Site)

### 1. Local Verification (Zero Credentials Needed)
```bash
npm install
npm run typecheck
npm test
```

### 2. Login, Register & Deploy to Your Free Atlassian Developer Site
1. Create a free Atlassian Cloud Developer Site (Jira + Confluence + Rovo) at `https://go.atlassian.com/cloud-dev`.
2. Generate an Atlassian API token at `https://id.atlassian.com/manage-profile/security/api-tokens`.
3. Run:
```bash
forge login
forge register        # Replaces the placeholder app.id in manifest.yml with your real Forge App ID
forge lint            # Verify 0 errors
forge deploy -e development
forge install -e development --product jira
forge install -e development --product confluence
```

### 3. Demo Walkthrough (5-Minute Codegeist Video Flow)
1. **Trigger a Real Compliance Blocker (0:00–1:15):** Open a Jira ticket like *"Production Stripe payout webhook + patient MRN-882910 debug log"* → ComplianceMesh Guard immediately marks it `BLOCKED BY COMPLIANCE`, flags the ePHI leak (masked), and maps `SOC 2 CC6.1`, `CC8.1`, `HIPAA §164.312(a)(1)`, and `PCI-6.3`.
2. **Teamwork Graph + Rovo AuditGuard (1:15–2:30):** Open Rovo Chat → ask **ComplianceMesh AuditGuard**: *"Audit FIN-1 and check Teamwork Graph for stale Confluence security SOPs."*
3. **Log Tamper-Evident SHA-256 Evidence (2:30–3:30):** Log a `SECURITY_SIGNOFF` proof (via Issue Panel, Rovo Agent, or MCP client) → ticket receives a formatted green ADF audit stamp comment with its SHA-256 hash and flips toward `READY TO SHIP`.
4. **Executive Command Center + Confluence Auditor Packet (3:30–4:45):** Open **ComplianceMesh Audit Center** in Jira → click **Export Audit Packet to Confluence** → open the freshly published Confluence page + live **ComplianceMesh Macro**.

---

## License

Apache License 2.0.
