# Atlassian Marketplace Listing Kit — ComplianceMesh

Use this copy-paste pack to publish **ComplianceMesh** on the Atlassian Marketplace (qualifies for Codegeist 2026's **Best Marketplace Published App +$1,500 bonus** AND unlocks recurring SaaS revenue!).

---

## 1. App Metadata (Copy-Paste Ready)

- **App Name:** `ComplianceMesh — Continuous Audit & Evidence Engine`
- **Forge App ID:** `ari:cloud:ecosystem::app/ed91897d-beed-4760-8bc8-a0d7504215ba`
- **Tagline (max 120 chars):**  
  `Continuous SOC 2, HIPAA, ISO 27001 & PCI-DSS governance in Jira & Confluence — powered by Rovo, MCP & Teamwork Graph.`
- **Summary (short description):**  
  `Eliminate audit scrambles for regulated FinTech & HealthTech teams. ComplianceMesh maps Jira work to SOC 2, HIPAA, ISO 27001, and PCI-DSS controls, blocks raw PII/ePHI leaks, tracks Teamwork Graph SOP freshness, and logs SHA-256 tamper-evident proof — 100% Runs on Atlassian with zero data egress.`
- **Categories:** `Admin tools`, `Compliance & Security` (or `Security`, `Workflow`, `IT & Helpdesk`)
- **Badges / Architecture Highlight:** **Runs on Atlassian** (100% Forge-hosted, zero external data egress)
- **Pricing Strategy for Fastest Codegeist Approval:**  
  Start as **Free** (fast automated/lightweight Marketplace approval before the Dec 22 deadline!) — you can convert to **Paid via Atlassian** ($3–$5/user/month or tiered enterprise pricing) right after judging if desired.

---

## 2. Three Marketplace Highlights (Feature Cards)

1. **Catch Compliance Blockers & ePHI/PII Leaks Before Production**  
   Every Jira issue is automatically evaluated against SOC 2, HIPAA, ISO 27001, and PCI-DSS controls. ComplianceMesh flags missing peer reviews, rollback plans, or linked Confluence SOPs—and alerts immediately (with masked samples) if raw SSNs, card PANs, MRNs, or API secrets appear in tickets.
2. **SHA-256 Tamper-Evident Evidence Ledger & 1-Click Confluence Audit Packets**  
   Record peer reviews, security sign-offs, QA runs, and exception waivers into a cryptographically hash-chained Forge ledger. Stamp verified proofs directly onto Jira comments, embed the live Control Matrix macro on Confluence policy pages, and export auditor-ready Confluence packets in one click.
3. **Rovo AuditGuard + Atlassian MCP + Teamwork Graph (Zero External Egress)**  
   Query cross-product ownership and stale (>90-day) security SOPs via Atlassian Teamwork Graph, automate compliance checks with the built-in **ComplianceMesh AuditGuard** Rovo Agent, and expose all 5 compliance tools to developer IDEs via **Atlassian MCP (`rovo:mcp`)**—all running 100% on Atlassian Forge.

---

## 3. Exact Step-by-Step Publishing Flow (10 Minutes)

### Step A — Production Deploy (Automated via Forge CLI)
```powershell
cd d:\PRK\Freelance_AI\compliancemesh-forge
forge deploy -e production --non-interactive
```

### Step B — Enable Distribution in Atlassian Developer Console
1. Open: `https://developer.atlassian.com/console/myapps/ed91897d-beed-4760-8bc8-a0d7504215ba/manage/distribution`
2. Switch **Sharing** to **Sharing** (or **Marketplace distribution**).
3. Fill in:
   - **Vendor name:** `RK Dev Space`
   - **Privacy Policy URL:** `https://github.com/rahulkarthik-999/compliancemesh-forge/blob/main/PRIVACY_POLICY.md`
   - **Terms of Service / EULA URL:** `https://github.com/rahulkarthik-999/compliancemesh-forge/blob/main/TERMS_OF_SERVICE.md`
   - **Support Email / URL:** `rkytube999@gmail.com` / `https://github.com/rahulkarthik-999/compliancemesh-forge/issues`
   - **Documentation URL:** `https://github.com/rahulkarthik-999/compliancemesh-forge/blob/main/README.md`
4. Save changes — this unlocks the **Shareable Installation Link** (required for Codegeist judges!) AND prepares your app for Marketplace submission.

### Step C — Submit to Atlassian Marketplace Partner Portal
1. Open `https://marketplace.atlassian.com/manage/vendors` and create your free Marketplace Partner profile (takes ~3 mins).
2. Click **Publish a new app** → select **Forge app** → pick **ComplianceMesh (`ed91897d-beed-4760-8bc8-a0d7504215ba`)**.
3. Paste the metadata, highlights, and URLs above, upload 3 crisp screenshots from your live `rahulkarthik999.atlassian.net` site:
   - Screenshot 1: **ComplianceMesh Audit Center** (Control Matrix + Readiness % + SHA-256 Verified badge)
   - Screenshot 2: **ComplianceMesh Guard** Jira Issue Panel (Blocked + masked ePHI Alert + Log Evidence)
   - Screenshot 3: **Confluence Audit Packet** + **Live Audit Matrix Macro** (or Rovo AuditGuard chat)
4. Click **Submit for approval** (Atlassian typically reviews Free `Runs on Atlassian` Forge apps in 2–5 business days — submitting now gives plenty of buffer before Dec 22!).
