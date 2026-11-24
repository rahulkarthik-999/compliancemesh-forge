# Codegeist 2026 Submission Playbook — ComplianceMesh

- **Hackathon:** Atlassian Codegeist 2026 (*"Build with context. Ship with confidence"*)
- **Deadline:** December 22, 2026, 12:00 PM PST (December 23, 2026, 1:30 AM IST)
- **Primary Track:** **Apps for Specialized Industries** (1st: $15,000 · 2nd: $8,000 · 3rd: $5,000)
- **Stackable Bonus Awards Targeted ($1,500 each):**
  1. Best Rovo Agent (`rovo:agent` — **ComplianceMesh AuditGuard**)
  2. Best Atlassian MCP App (`rovo:mcp` — **ComplianceMesh MCP Server**)
  3. Best Teamwork Graph Integration (`api.asUser().requestTeamworkGraph`)
  4. Best Marketplace Published App

---

## 1. Live Setup Checklist (15 Minutes)

1. **Create Free Atlassian Cloud Developer Site:**
   - Go to https://go.atlassian.com/cloud-dev and spin up a free site with **Jira + Confluence** enabled.
   - Create a Jira project called **FinHealth Core** (key: `FIN`).
   - Create 2 sample Confluence pages in your space:
     - `SOC 2 & HIPAA Change Management SOP`
     - `PCI-DSS Payment Tokenization Runbook`
   - Create 3 realistic demo Jira tickets in `FIN`:
     - `FIN-1`: **Production Stripe payout webhook + OAuth RBAC migration** (Description mentions deploying to production + a synthetic test patient `MRN-882910` to trigger the live ePHI/PII Guard!)
     - `FIN-2`: **Patient EHR CSV export audit logging** (HIPAA `§164.312(a)(1)` + `§164.312(b)`)
     - `FIN-3`: **TLS 1.3 API Gateway cipher upgrade** (with PR #412 comment + rollback plan + linked Confluence SOP → flips to `READY TO SHIP`!)

2. **Deploy ComplianceMesh to Your Site:**
   ```bash
   cd compliancemesh-forge
   forge login
   forge register
   forge lint
   forge deploy -e development
   forge install -e development --product jira
   forge install -e development --product confluence
   ```

3. **Connect Atlassian MCP (for Demo + Bonus Award):**
   - Your deployed app exposes `compliancemesh-mcp-server` (`rovo:mcp`) with all 5 compliance tools.
   - Connect via Rovo Studio / Atlassian Remote MCP Server so judges see an AI IDE or Rovo Studio agent invoking `audit-jira-issue` and `record-audit-evidence` live.

---

## 2. 4-Minute Demo Video Script (Hits All 5 Judging Pillars = 100%)

- **0:00 – 0:35 | The Hook (Potential Impact — 20%)**
  - Show the pain: FinTech & HealthTech teams ship in Jira and write SOPs in Confluence, yet lose weeks before every SOC 2 / HIPAA / PCI-DSS audit.
  - Introduce **ComplianceMesh**: continuous audit readiness built 100% natively on Atlassian Forge.

- **0:35 – 1:40 | Live Jira Issue Panel + PII/ePHI Guard (Design & Tech — 40%)**
  - Open `FIN-1`. Show **ComplianceMesh Guard** (`jira:issuePanel`) immediately flagging:
    - `BLOCKED BY COMPLIANCE` (Risk 90+)
    - Live **ePHI/PII Guard Alert** masking `MRN-882910`
    - Automatic mapping to `SOC 2 CC6.1`, `SOC 2 CC8.1`, `HIPAA §164.312(a)(1)`, and `PCI-6.3`
  - Switch to the **Teamwork Graph** tab showing live `requestTeamworkGraph` nodes & linked Confluence SOPs.

- **1:40 – 2:40 | Autonomous Rovo Agent + Atlassian MCP (Innovation + Bonus Tracks)**
  - Open **Rovo Chat** → select **ComplianceMesh AuditGuard** (`rovo:agent`).
  - Ask: *"Audit FIN-1 and check Teamwork Graph for stale security SOPs."*
  - Show Rovo invoking `audit-jira-issue` & `traverse-compliance-graph` live.
  - Show **ComplianceMesh MCP Server** (`rovo:mcp`) executing `record-audit-evidence` to log a verified `SECURITY_SIGNOFF` with a **SHA-256 tamper-evident hash** and automatically stamping a formatted green ADF audit comment onto `FIN-1`.

- **2:40 – 3:45 | Executive Audit Center + Confluence Live Evidence (Completeness)**
  - Open **ComplianceMesh Audit Center** (`jira:projectPage`).
  - Show Overall Readiness %, Release Blockers table, SHA-256 Ledger integrity badge (`VERIFIED`).
  - Click **Export Audit Packet to Confluence** → open the newly generated Confluence page showing the full regulatory control matrix & SHA-256 hashes.
  - Embed the **ComplianceMesh Live Audit Matrix** (`confluence:macro`) on a policy page so auditors always see live Jira proof.

- **3:45 – 4:15 | Architecture & Wrap-up (Presentation — 20%)**
  - Flash the 1-slide architecture (100% Forge serverless, zero external data egress — critical for FinTech/HealthTech compliance!).
  - End on tagline: *"ComplianceMesh — Build with context. Ship with confidence."*

---

## 3. Atlassian Marketplace Bonus Track ($1,500 + Recurring SaaS Revenue)

To qualify for **Best Marketplace Published App** AND turn ComplianceMesh into recurring revenue:
1. Deploy to production environment: `forge deploy -e production`
2. Enable app sharing in Atlassian Developer Console (`https://developer.atlassian.com/console/myapps`).
3. Create a free Vendor Profile on Atlassian Marketplace (`https://marketplace.atlassian.com`) and submit ComplianceMesh as a **Runs on Atlassian** (100% Forge-hosted, zero external egress!) paid or freemium app.
