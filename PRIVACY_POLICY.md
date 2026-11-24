# ComplianceMesh — Privacy Policy

**Effective Date:** November 24, 2026  
**Publisher:** RK Dev Space (`ComplianceMesh` for Jira & Confluence)  
**Contact / Support:** `rkytube999@gmail.com`

## 1. Zero-Egress Architecture ("Runs on Atlassian")
ComplianceMesh is built 100% natively on **Atlassian Forge**. All backend execution, UI rendering, and compliance ledger storage run exclusively inside Atlassian's managed cloud infrastructure.

- **No External Servers:** ComplianceMesh transmits **zero** Jira, Confluence, Teamwork Graph, or user data to any external or third-party server (`egress: []`).
- **No External AI Training:** ComplianceMesh uses only Atlassian's built-in Forge runtime, Rovo Agent framework, and Atlassian MCP layer. Customer data is never sent to external third-party LLM endpoints or used to train external models.

## 2. Data Accessed & Purpose
ComplianceMesh requests only the minimum scopes required to deliver continuous compliance governance:
- **Jira (`read:jira-work`, `write:jira-work`, `read:jira-user`):** Reads issue metadata/descriptions/comments to map SOC 2, HIPAA, ISO 27001, and PCI-DSS controls, detects exposed PII/ePHI/secrets, and posts verified SHA-256 audit stamp comments when requested by a user.
- **Confluence (`read:page:confluence`, `write:page:confluence`, `read:space:confluence`):** Checks compliance SOP freshness and publishes Auditor Evidence Packets when explicitly triggered by a user.
- **Teamwork Graph (`read:graph:*`):** Queries cross-product relationships strictly under the invoking user's permissions (`api.asUser()`) to surface ownership and stale-policy dependencies.
- **Forge Storage (`storage:app`):** Persists pinned control mappings, cached readiness summaries, and the tamper-evident SHA-256 evidence ledger exclusively inside Atlassian Forge Key-Value Storage (`@forge/kvs`) isolated to your Atlassian site.

## 3. Sensitive Data Handling
When ComplianceMesh detects potential PII, ePHI, or API secrets inside Jira text, it **masks** detected values (e.g. `MRN••••910`) before rendering alerts and never stores raw detected secrets or identifiers in its evidence ledger.

## 4. Data Retention & Deletion
All stored compliance metadata resides inside your Atlassian Forge app storage (`storage:app`) and is governed by Atlassian's Cloud data residency and deletion lifecycle. Uninstalling ComplianceMesh immediately removes app access, and stored Forge data is purged in accordance with Atlassian Forge retention policies.

## 5. Contact
For privacy, security, or data deletion inquiries, contact: `rkytube999@gmail.com`.
