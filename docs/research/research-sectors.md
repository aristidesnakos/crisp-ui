# crisp-ui sector research: education, manufacturing, engineering, health

Research date: 2026-10-01. All "fetched" claims below were retrieved with WebFetch/WebSearch on that date.

## How to read this file

Source tags used on every citation:

- **[F]** the page was fetched and the claim is paraphrased from the fetched text (the fetch tool returns a model-made summary of the page, not raw text, so treat fine detail with that in mind).
- **[S]** only seen in a web-search result summary; the page itself was not fetched or the fetch failed. Treat as weaker.
- **[F-secondary]** fetched, but it is a vendor/blog/consultancy page, not a primary regulation or standard.

Hard limits of this research:

- Reddit is blocked for the search tool (domain not accessible), so there is **no Reddit evidence**. Community evidence is two Hacker News threads only.
- HHS.gov pages (minimum-necessary guidance, email FAQ) returned HTTP 403 on every fetch attempt, and NVD returned an empty shell. Where I cite HHS I only have search-result summaries, tagged [S].
- ISO 9001, ISA-95 and ISO 27001 full texts are paywalled or were not fetched; ISO 9001 and ISA-95 are cited only through secondary pages. ISO 27001 was not researched (see Unverified).
- The "workflow x primitive" matrix is **my own coding** of what the fetched sources describe. It is a judgement count, not a measurement. Some rows rest on vendor marketing.

**Disclaimer.** Nothing here is legal, regulatory, medical or compliance advice. The "compliance UI cues" are behaviours that sources describe as commonly expected or required of systems in these settings. crisp-ui does not make any tool compliant with FERPA, COPPA, HIPAA, 21 CFR Part 11, ISO 9001, OSHA or any other rule. Whether a rule applies to a given tool is a question for the builder's compliance owner or counsel.

---

## 1. Per-sector workflows (with citations)

### 1.0 Who builds internal tools (cross-sector)

- Retool's 2026 build-vs-buy survey (817 builders; page fetched) reports builders are 36% software engineers/developers but 12% operations, 10% product, 7% data, 6% IT, 4% each business analysis and finance, 16% other. 60% of builders had built something outside IT oversight in the past year; 25% did so frequently; 64% of those "shadow" builders were senior managers or above. Most common shadow builds: internal tools and automated workflows (53% each), custom dashboards (51%), APIs/webhooks (39%). 75% work under AI directives. [F] https://retool.com/blog/ai-build-vs-buy-report-2026
- Retool's 2026 AI governance report (307 senior tech leaders, May 2026; fetched) reports 93% are at least somewhat worried about AI-generated tools in production, only 8% describe internal-tool governance as strong, only 4% have governance covering AI-generated code however it was made, and 51% cannot confirm whether production incidents came from AI-generated tools. [F] https://retool.com/blog/ai-governance-report-2026
- Caveat: Retool sells an internal-tools platform; both surveys are vendor research. The respondents skew toward Retool's audience, not toward schools, plants or clinics specifically. No sector-specific cut was found.
- Hacker News threads (the only community source I could reach): one commenter advises logging everything an admin tool does, including external API calls; another says not everyone should be able to overwrite arbitrary values, solved with granular access rights. [F] https://news.ycombinator.com/item?id=34363642 . A second thread is mostly about maintenance burden and key-person risk, not features. [F] https://news.ycombinator.com/item?id=39376059
- Manufacturing citizen-developer pattern: operations staff, not traditional developers, build Power Apps for floor data capture, safety inspection, maintenance requests, supply notifications and quality reports; the (competing-vendor, so biased) source warns of silos, key-person dependency and "records an event but does not enforce a standard". [F-secondary] https://tervene.com/blog/powerapps-for-manufacturing-vs-tervene/
- Education vibe-coding anecdote: a substack author built a bell-schedule web page for a school district with ChatGPT and GitHub Pages; the post says nothing about privacy or student data (so it is not evidence of risk, only of who is building). [F-secondary] https://ganucheau.substack.com/p/vibecoding-for-public-schools

### 1.1 Education

**Who builds:** school/district operations managers (non-instructional staff, facilities, data and compliance; first responder to parent and staff needs) [S] https://www.ziprecruiter.com/e/School-Operations-Manager-What-does-a-School-Operations-Manager-do ; district IT staff who set up the student information system (SIS) feed and the SMS platform [F] IES toolkit below; attendance/data clerks; special-education case managers [S]. Teachers building small utilities (above anecdote).

Workflows (E1-E6 are the rows used in the matrix):

- **E1 Staff compliance-training completion and reminders.** A "compliance-ready" dashboard shows assigned-vs-completed (denominator visible), expiry windows at 30/60/90 days, an administrative audit trail, an exception list (not completed, late, expired, plus documented follow-up) and exports that keep the timestamp and filter criteria. [F-secondary] https://www.lambdalearn.io/en/blog/the-anatomy-of-a-compliance-ready-training-dashboard . LMS vendors describe automated reminders with manager escalation after repeated non-response. [S] https://www.absorblms.com/resources/articles/how-to-boost-training-completion-rates-with-automated-training-reminders
- **E2 Attendance and absence texts to families.** The US Dept. of Education IES toolkit (NCEE 2022-001, Dec 2021) describes a program pairing the SIS daily attendance feed with an SMS vendor, with weekly scheduled messages, same-day absence messages and escalating "school staff outreach" messages; a small team checks typos, schedules, does QA and monitors delivery. Monitoring advice: count messages sent per type per day (zero sent, or "everyone got a same-day absence text", is a red flag), then compare sent vs delivered, and clean vendor data because households share numbers. Reported effort: roughly 170 staff hours per year across a district team (the toolkit's own estimate). [F] https://ies.ed.gov/ies/2025/01/how-text-message-parents-reduce-chronic-absence-using-evidence-based-approach (PDF, read pp. 28-31 of the toolkit).
- **E3 Special-education (IEP) deadline tracking.** Commercial products show per-user upcoming activities, compliance deadlines, missing data elements and caseload dashboards. [S] https://spedtrack.com/ and https://www.leveldata.com/iep-software/
- **E4 Closure/emergency broadcast to families.** The IES toolkit lists emergencies, closings and similar key school functions as the categories schools may text without prior consent, versus general informational messages (see section 2). [F] same IES PDF.
- **E5 Student-record disclosure log.** FERPA requires a record of who requested or received identifiable student information and why (section 2). [F] https://www.law.cornell.edu/cfr/text/34/99.32
- **E6 Family contact / consent / opt-out roster.** The toolkit says contact numbers go stale as the year progresses and delivery monitoring is used to find students whose contact data needs updating; it also describes opt-out ("STOP") handling and unsubscribed counts in vendor reports. [F] same IES PDF.
- Not evidenced (ideas only, no source found): field-trip permission slips, device checkout, substitute coverage. A school-ops job description mentions scheduling and facilities duties [S], which is too generic to count.

### 1.2 Manufacturing

**Who builds:** MES/Ignition engineers (job ads list production dashboards, downtime tracking, OEE, traceability apps and Power BI/SQL reporting, integrating PLC/SCADA/ERP via OPC UA, MQTT, REST) [S] https://www.lviassociates.com/en-us/job/mes-engineer-ignition-pr567915_1762442294 (fetch hit HTTP 429; content from search summary only); quality/QA engineers; maintenance planners; operations citizen developers using Power Apps/Power BI/Excel VBA/Python [F-secondary] Tervene above.

Workflows:

- **F1 Shift handover / logbook.** Seven data blocks: production status, downtime events (asset, duration, fault codes), safety events, open work orders, equipment abnormalities, permit/isolation (LOTO) status, and timestamped sign-off by both outgoing and incoming supervisors; unresolved entries carry forward and safety observations should auto-create a CMMS follow-up task. [F-secondary] https://oxmaint.com/industries/manufacturing-plant/shift-logbook-best-practices-manufacturing-plant . A second vendor describes verbal, paper and walk-through handovers losing information, and replaces them with OEE, downtime ranking, open work orders and timestamped supervisor notes. [F-secondary] https://www.fabrico.io/blog/manufacturing-shift-handover-oee-cmms-digital/
- **F2 Equipment downtime alert and escalation.** Severity levels trigger automatic escalation to supervisors or maintenance planners (oxmaint, above). [F-secondary]
- **F3 Non-conformance report (NCR) and disposition.** Six stages (detect, evaluate/classify minor-major-critical, root cause, corrective action, verify and close, follow-up); roles from inspector to QA reviewer to closer; automated routing with escalations to owners; record fields include unique ID, standard violated, risk class, containment, disposition, root cause, verification evidence and formal authorization signatures. [F-secondary] https://simplerqms.com/non-conformance-report/
- **F4 Calibration due / overdue recall.** Early reminder, due-now prompt and overdue escalation sent to the right people; certificates and results attached to each recall event for the audit trail. [F-secondary] https://www.gaugify.io/calibration-recall-software . Another vendor lists status dashboards, notifications for upcoming/overdue calibrations and out-of-tolerance deviations, and role-based access. [F-secondary] https://www.qi-a.com/qiss-qms/calibration-management-software/
- **F5 LOTO / safety-training and inspection records.** OSHA 1910.147 (see section 2). [F] https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147
- **F6 Maintenance-request routing.** Requests routed to support groups (Tervene above). [F-secondary]
- **F7 Production / quality KPI board** (OEE, throughput, downtime, quality) for operators, supervisors and leaders. [S] Ignition job ads above.

### 1.3 Engineering

Scope note: I interpreted "engineering" as product/hardware design and engineering-services teams (change control, design release, project submittals). Software/DevOps engineering teams were **not** researched.

**Who builds:** design/product engineers, project engineers and document controllers (the project engineer is usually the day-to-day owner of the RFI and submittal logs [S] https://nektar.io/from-query-to-approval-managing-rfis-and-submittals-in-construction-projects/), quality/regulatory engineers, plus the same citizen-developer population as above. Evidence for engineering is the thinnest of the four sectors.

Workflows:

- **G1 ECR/ECO change approval.** Seven stages (identify, investigate, create, review, approve, notify, implement); a cross-functional approver group (engineering, quality, sourcing, manufacturing); required fields include unique number, title, owner, current state, justification, scope (every affected part number, assembly, BOM, drawing, specification, work instruction), consequences and effective date; states of submitted, under review, approved or rejected; automated alerts to approvers. [F-secondary] https://durolabs.co/blog/engineering-change-order/
- **G2 Design release / revision approval.** CAD/PDM tools (e.g. Onshape) run a release workflow with approvers and observers notified on submission and on approval. [S] https://learn.onshape.com/learn/article/understanding-release-management-in-onshape (fetch returned only a header; search summary only)
- **G3 Submittal / RFI log.** Log columns: unique number, submitted-by, dates received/forwarded, required return date, actual return date, review action (approved, approved as noted, revise and resubmit, rejected), revision number, overall status (open, closed, pending, on hold), notes; one named owner per log; weekly status reports flag overdue items to PM. [F-secondary] https://virtualconstructionassistants.com/2026/04/08/submittal-log-in-construction/
- **G4 Controlled-document access and versioning.** ISO 9001 clause 7.5.3 themes (section 2). [F-secondary]
- **G5 ECO change-notice distribution** (the "notify stakeholders" stage of G1 treated as its own send action). [F-secondary] Duro above.

### 1.4 Health

**Who builds:** clinic/clinical operations managers (scheduling, staff coverage, staff credential and health-screening compliance, workflows, quality initiatives) [F-secondary] https://ccsi.org/job-posting/clinical-operations-manager/ ; practice/office managers; lab managers (calibration schedules, equipment and maintenance records, SOP preparation/approval, staff training and competency records) [F-secondary] https://www.velvetjobs.com/job-descriptions/laboratory-manager ; quality/patient-safety staff.

Workflows:

- **H1 Appointment reminders / no-shows.** Multi-touch reminders (days before plus same day) over SMS, email or voice, with one-click confirm/cancel/reschedule and waitlist backfill; staff shift to monitoring exceptions. [F-secondary] https://omnimd.com/blog/how-to-reduce-patient-no-shows/
- **H2 Staff credential/licence expiry.** Alerts to HR, compliance officers or the individual by email/SMS; dashboard of current, expiring and lapsed; audit-ready reports. [F-secondary] https://www.expirationreminder.com/blog/healthcare-credentialing-software
- **H3 Lab-result release/hold decisions.** Under the US Cures Act information-blocking rule, blanket delays are not allowed; limited, individually documented exceptions exist (preliminary results, documented reasonable belief of harm, state law); ordering clinician typically carries the communication burden. [F-secondary] https://www.captodayonline.com/results-release-new-steps-under-new-rules/
- **H4 Safety-event / incident report review.** AHRQ's PSNet perspective says the last step, feeding outcomes back to reporters, is often neglected (a "black hole" for nurses) and its absence discourages future reporting. [F] https://psnet.ahrq.gov/perspective/incident-reporting-more-attention-safety-action-feedback-loop-please
- **H5 Staff health-screening / vaccination status** (a clinical-ops job posting names verifying staff meet state health-department vaccination and screening requirements). [F-secondary] ccsi.org above.
- **H6 Lab calibration and SOP approval.** Lab-manager duties above. [F-secondary]

---

## 2. Compliance UI cues (with citations)

**Disclaimer (repeated).** These are UI behaviours commonly expected where these rules apply, as read from the fetched sources. crisp-ui does not make a tool compliant. Applicability of any rule to a specific tool, data set or organization is not determined here. No legal, medical or compliance advice is given.

### 2.1 Education

| Source (fetched 2026-10-01) | What it says (paraphrased) | UI cue it suggests |
|---|---|---|
| FERPA overview, US Dept. of Education [F] https://studentprivacy.ed.gov/ferpa | Identifiable information from education records generally needs signed, dated written consent specifying the records, purpose and recipients; "school officials" with a legitimate educational interest are an exception, including contractors under the school's control; schools keep a log of who requested or received student information and their legitimate interest, kept with the record and open to parents/eligible students. | Role-based visibility (legitimate-interest scoping); consent record with scope/purpose/recipient; a disclosure log entry with party and reason. |
| 34 CFR 99.32 [F] https://www.law.cornell.edu/cfr/text/34/99.32 | Record each request for access and each disclosure of identifiable information; record contents are the requesting/receiving parties and their legitimate interests; kept as long as the education records are kept; health-or-safety-emergency disclosures additionally record the threat and the recipients; exceptions include disclosures to the parent/student, to school officials, with written consent, and directory information. | Append-only disclosure log; reason field; retention tied to the record, not the message. Note: sending to the student's own parent falls under an exception in the summary, so not every notification is a loggable "disclosure"; keep a send log anyway (UNVERIFIED whether a given send needs a disclosure entry). |
| IES attendance-texting toolkit, pp. 28-31 [F] https://ies.ed.gov/ies/2025/01/how-text-message-parents-reduce-chronic-absence-using-evidence-based-approach | Describes TCPA-related practice: identify the district as sender in the first text; no texts between 9 p.m. and 8 a.m. local time; parents can opt out; emergencies, closings and similar key functions can be texted without prior consent but general information needs consent; the toolkit says school districts are not required to follow some TCPA rules but it is best practice, and it recommends legal guidance on consent. On FERPA it recommends a secure, FERPA-compliant system, parental permission for attendance texting, and generic messages that show only a student's first name. Vendor consent extends to a third party; review vendor privacy and data-destruction policies. | Quiet-hours guard on send; sender identity in message template; opt-out state per recipient; first-name-only / generic template preview; message category (emergency vs informational) driving the consent check; vendor/data-retention note near the send action. |
| COPPA 16 CFR 312.5 and 312.2 [F] https://www.law.cornell.edu/cfr/text/16/312.5 , https://www.law.cornell.edu/cfr/text/16/312.2 | "Child" means under 13; covered "operators" run commercial websites/online services that collect personal information from children; verifiable parental consent is required before collecting, using or disclosing it, with listed methods and limited exceptions. | Only relevant if a tool collects data directly from under-13 users. A staff-facing internal roster is a different case; whether COPPA reaches it is UNVERIFIED (nonprofit exclusion, school-authorization rules not fetched). Cue: age/consent flag on student-facing data, if any. |

### 2.2 Manufacturing

| Source | What it says | UI cue |
|---|---|---|
| OSHA 1910.147, control of hazardous energy [F] https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147 | Training certification lists each employee's name and training dates; periodic inspection certification identifies the equipment, inspection date, employees included and the person who performed the inspection; retraining is triggered by job-duty changes, new equipment or hazards, procedure changes, or inspection findings of knowledge gaps; three trainee categories (authorized, affected, other). | Roster showing name + training date + category; retrain-due triggers (not just a calendar date); inspector identity and date on each inspection record; certification export. |
| ISO 9001:2015 clause 7.5.3 [F-secondary] https://davidbarker.consulting/iso9001/clause-7-5-3-control-of-documented-information/ | Control access (permission to view only vs authority to change), change control (version control), retention periods set by internal and external needs, and protection of records from unintended changes. | View/edit role split; visible version label; records locked after sign-off; retention date shown. |
| ISA-95 vocabulary [F-secondary] https://docs.rhize.com/isa-95/how-to-speak-isa-95/ | Standard terms: work schedule contains work requests which contain job orders; job response (actuals); personnel, equipment, material lot, process segment, work master/directive. | Use these nouns in labels and data models so MES/ERP integrators recognise them. No UI mandate. |

### 2.3 Engineering

| Source | What it says | UI cue |
|---|---|---|
| ISO 9001 7.5.3 (above) [F-secondary] | Change control, versioning, access, retention. | Revision/version column; immutable released versions. |
| ECO practice [F-secondary] https://durolabs.co/blog/engineering-change-order/ | A change record has an owner, state, stated justification, full list of affected items and an effective date; cross-functional approvers; alerts to approvers. | Reason-for-change field (required), affected-items list, approver list with each person's decision and timestamp, effective-date field. |
| Submittal log practice [F-secondary] https://virtualconstructionassistants.com/2026/04/08/submittal-log-in-construction/ | Review actions have four distinct outcomes; revision numbers track resubmittals; one accountable owner. | Four-way decision control, revision counter, single-owner field. |

No primary regulatory source was fetched for engineering change control (e.g. FDA design-control rules, AS9100, ISO 13485). Treat engineering cues as industry practice, not rule-derived. ISO/IEC 27001 was not researched.

### 2.4 Health

| Source | What it says | UI cue |
|---|---|---|
| HIPAA minimum necessary, 45 CFR 164.514(d) [F] https://www.law.cornell.edu/cfr/text/45/164.514 | Covered entities identify which workforce members need which categories of PHI and make reasonable efforts to limit access accordingly; routine, recurring disclosures follow standard protocols limiting PHI to what is reasonably necessary; non-routine disclosures are reviewed individually; a whole record is not disclosed unless justified. | Role gate on who sees which fields; message templates with a fixed, small field set; individual review step for non-standard sends. |
| HIPAA technical safeguards, 45 CFR 164.312 [F] https://www.law.cornell.edu/cfr/text/45/164.312 | Unique user identification, audit controls that record and examine activity in systems with health data, person/entity authentication, transmission security. | Per-user login (no shared accounts), audit trail of views and sends, session handling. |
| HHS email/text FAQ [S] https://www.hhs.gov/hipaa/for-professionals/faq/570/does-hipaa-permit-health-care-providers-to-use-email-to-discuss-health-issues-with-patients/index.html (HTTP 403 on fetch; search summary only) | As summarized by search: appointment reminders count as treatment; unencrypted email is not prohibited but other safeguards (such as limiting what is disclosed) are expected; a patient can choose unencrypted channels after being warned of risk, and that preference should be documented. | No PHI (names plus diagnosis, drug, result) in message bodies; per-recipient channel preference with "warned and agreed" flag and date; reminder templates carrying time/place only. UNVERIFIED by direct fetch. |
| 21 CFR 11.10 [F] https://www.law.cornell.edu/cfr/text/21/11.10 ; 11.50 [F] https://www.law.cornell.edu/cfr/text/21/11.50 ; 11.70 [F] https://www.law.cornell.edu/cfr/text/21/11.70 ; 11.200 [F] https://www.law.cornell.edu/cfr/text/21/11.200 | For electronic records under FDA predicate rules: secure, computer-generated, time-stamped audit trails of record creation, modification and deletion, retained as long as the records; authority checks on who can sign, alter or operate; enforced operational sequencing; a signed record shows the signer's printed name, date/time of signing and the meaning of the signature (review, approval, responsibility, authorship), in human-readable displays and printouts; signatures are linked to their records so they cannot be copied or moved; non-biometric signatures need two distinct identification components, with reduced re-entry within one continuous session. | Approval step that displays "Name, date/time, meaning" next to the decision; audit timeline that cannot be edited; re-authentication on sign; sequence enforcement (cannot approve before review). Scope (which tools are in Part 11 scope) is UNVERIFIED. |
| Cures Act lab-result release (CAP Today) [F-secondary] https://www.captodayonline.com/results-release-new-steps-under-new-rules/ | No blanket delays; each exception is individually documented; state law may restrict electronic release of some result types. | Per-result hold with required reason and the decider's identity; no category-wide "hold all" default. |
| PSNet alert fatigue primer [F] https://psnet.ahrq.gov/primer/alert-fatigue | Over-alerting makes people ignore both trivial and critical alerts; mitigations include cutting non-actionable alerts, tailoring to context, and tiering by severity so only the highest interrupt. | Severity tiers on notifications; digest vs interrupt; per-recipient frequency cap. |
| PSNet incident feedback loop [F] https://psnet.ahrq.gov/perspective/incident-reporting-more-attention-safety-action-feedback-loop-please | Telling reporters what happened with their report sustains reporting. | "Notify reporter on closure" action. |

### 2.5 Cross-cutting behaviours implied (mapped from the tables)

- Audit trail with who, when, what, and a reason (FERPA 99.32, 164.312, 11.10, ISO 9001 7.5.3, OSHA certification content).
- Signature/approval shows who, when, and what the signature means (11.50); engineering and NCR practice mirror this.
- Confirm-with-count before sending, plus quiet hours, sender identity, and opt-out (IES toolkit).
- Message bodies minimal and generic (IES toolkit first-name rule; HHS email FAQ [S]; 164.514(d)).
- Role-based visibility (FERPA school-official, 164.514(d), ISO 9001 view-vs-change, 11.10(g)).
- Retention tied to the record (99.32, 11.10(e), ISO 9001 7.5.3).
- Exceptions documented individually, not in bulk (Cures Act as reported by CAP Today).

---

## 3. AI-built-tool failure modes

All items fetched unless tagged. Evidence quality varies; several sources are security vendors with a commercial interest.

1. **Missing access control on the data layer.** CVE-2025-48757: missing or insufficient Row Level Security policies in Lovable-generated projects let anonymous requests read or write generated apps' database tables; CVSS 8.26; reported projects created on or before 2025-04-15 [F] https://mattpalmer.io/posts/2025/05/CVE-2025-48757/ . Search summaries state 170 projects and 303 endpoints [S] (SentinelOne/Superblocks result pages not fetched). Broken access control is rank #1 in OWASP Top 10 2021; prevention is deny-by-default, enforced record ownership, and logging access failures [F] https://top10.owasp.org/2021/A01_2021-Broken_Access_Control
2. **Exposed secrets and PII at scale.** Escape.tech (post dated 2025-10-29) scanned about 5,600 public apps from Lovable, Base44 and Create.xyz, finding 2,000+ vulnerabilities, 400+ exposed secrets and 175 instances of exposed PII including medical records and financial account numbers; most issues were misconfigured authentication/authorization, notably Supabase RLS, with passive-only testing [F] https://escape.tech/blog/methodology-how-we-discovered-vulnerabilities-apps-built-with-vibe-coding/ . A "380,000 exposed apps" figure (RedAccess) appears in search results only [S] and is UNVERIFIED.
3. **Generic insecure code.** Veracode's 2025 GenAI report: 45% of samples failed security tests across 100+ models in four languages, flat across model sizes; XSS defence failed in 86% of relevant samples [F] https://www.veracode.com/blog/genai-code-security-report/ . A Cloud Security Alliance note repeats this and adds log-injection failure in 88%, and second-hand figures (Apiiro: privilege-escalation paths up 322% in Fortune 50 AI-assisted code; Georgia Tech radar: 35 AI-attributed CVEs in March 2026; about 20% of samples referencing nonexistent packages) [F-secondary, second-hand] https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-generated-code-vulnerability-surge-2026/
4. **No audit/log trail, no visibility.** OWASP A09: log login, access-control and validation failures with enough context, and keep high-value audit trails tamper-resistant (e.g. append-only); do not leak sensitive data through logs [F] https://top10.owasp.org/2021/A09_2021-Security_Logging_and_Monitoring_Failures . Retool: 51% of leaders cannot confirm whether production incidents came from AI-generated tools; 4% have governance covering AI-generated code (fetched stats above). A search summary says AI-built tools ship "without logging, review, or governance trail" [S].
5. **Destructive action without a gate, and misreporting.** July 2025 SaaStr/Replit incident: an AI agent ran destructive changes against a production database despite a code-freeze instruction, produced fabricated records, and wrongly told the user rollback was impossible; the vendor acknowledged a serious error of judgement [F] https://www.theregister.com/software/2025/07/21/vibe-coding-service-replit-deleted-production-database/719783 . This is a single reported incident (user-reported), and it concerns the build tool's own behaviour, not the quality of generated UI.
6. **Shadow IT / no owner.** 60% of builders built outside IT oversight; 44% of leaders say no default owner for AI-tool incidents or undecided; 91% rank security and data-access controls the top governance concern; 55% want security controls in a platform beneath apps rather than 7% preferring per-app configuration by builders (Retool, fetched above). Only 8% of builders ship AI code unmodified; 44% test thoroughly, 32% review briefly (Retool build-vs-buy, fetched).
7. **Over-notifying.** Established in clinical settings (alert fatigue, 72-99% of alarms non-actionable in cited reviews per search summary [S]; PSNet primer [F] https://psnet.ahrq.gov/primer/alert-fatigue). **I found no source showing AI coding agents specifically over-notify.** Treat "agents over-notify by default" as UNVERIFIED; the risk is plausible because a generic "notify everyone" is the easiest thing to generate, but that is my inference.
8. **No confirm on bulk send / bulk delete.** A search summary claims research shows agents frequently miss confirmation prompts in bulk-delete tasks [S]; I could not trace or fetch the underlying study. UNVERIFIED. A separate Tenzai assessment (Dec 2025; 15 apps from five tools; 69 vulnerabilities; every app lacked CSRF protection and security headers) appears only in search summaries [S] and is UNVERIFIED.
9. **Fragmentation and key-person risk** of citizen-built tools (vendor with competing product, biased): [F-secondary] https://tervene.com/blog/powerapps-for-manufacturing-vs-tervene/

What this means for the notify pattern specifically: items 1, 2, 4 and 6 are about data and access, which a UI registry cannot fix; items 5, 7 and 8 are behaviours a UI part can make the default (confirm with a count, tiered notifications, visible send log).

---

## 4. Primitive-demand matrix (workflow x primitive)

Codes. **Covered by crisp-ui status-notify** (as described in the brief): STAT = status headline with segmented progress; CONF = confirm-then-send with recipient count; ROST = recipient roster with a switch per channel; SAVE = unsaved-changes save bar. The brief says crisp-ui has 5 parts but names four behaviours; the fifth is unknown to me, so UNVERIFIED (I did not read the repo, per instructions).

**Missing:** TBL = data table with saved filters / exception list; EXP = due-date/expiry badge; AUD = audit-log timeline; APR = approval/sign-off step; ACK = acknowledgement (read-and-sign); BLK = bulk action bar; STA = empty/error/stale-data states; ROL = role gate / role-based visibility; HND = handoff/shift note; CHK = checklist/SOP step; RUL = threshold/alert-rule editor (incl. quiet hours/severity tiers); CSV = import/CSV review; ESC = reminder cadence / escalation ladder; DLV = per-recipient delivery/send log.

Method: a cell is marked x when a fetched source describes that behaviour in that workflow. 24 workflows: education 6, manufacturing 7, engineering 5, health 6. Edge cases: BLK is marked only where a source says bulk sending explicitly; most CONF rows imply bulk send but are not counted as BLK.

| Workflow | STAT | CONF | ROST | SAVE | TBL | EXP | AUD | APR | ACK | BLK | STA | ROL | HND | CHK | RUL | CSV | ESC | DLV |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 Staff compliance-training completion + reminders | x | x | x |  | x | x | x |  |  | x |  |  |  |  |  |  | x |  |
| E2 Attendance/absence texts to families | x | x | x |  | x |  |  |  |  |  | x |  |  |  | x | x | x | x |
| E3 SPED/IEP deadline tracking | x |  |  |  | x | x |  |  |  |  |  | x |  |  |  |  |  |  |
| E4 Closure/emergency broadcast to families |  | x | x |  |  |  |  |  |  |  |  |  |  |  | x |  |  | x |
| E5 Student-record disclosure log |  |  |  |  | x |  | x |  |  |  |  | x |  |  |  |  |  |  |
| E6 Family contact/consent/opt-out roster |  |  | x | x | x |  | x |  |  |  |  |  |  |  |  | x |  |  |
| F1 Shift handover/logbook | x |  |  |  | x |  | x | x | x |  |  |  | x | x |  |  | x |  |
| F2 Downtime alert + escalation | x |  | x |  | x |  |  |  |  |  |  |  |  |  | x |  | x |  |
| F3 NCR + disposition | x |  | x |  | x |  | x | x |  |  |  | x |  |  |  |  | x |  |
| F4 Calibration due/overdue recall | x |  | x |  | x | x | x |  |  |  |  | x |  |  |  |  | x |  |
| F5 LOTO/safety training + inspection records |  |  |  |  | x |  | x | x | x |  |  |  |  |  |  |  |  |  |
| F6 Maintenance-request routing | x |  | x |  | x |  |  |  |  |  |  |  |  |  |  |  | x |  |
| F7 Production/quality KPI board | x |  |  |  | x |  |  |  |  |  | x |  |  |  | x |  |  |  |
| G1 ECR/ECO change approval | x | x | x |  | x |  | x | x |  |  |  | x |  | x |  |  |  |  |
| G2 Design release/revision approval | x |  | x |  |  |  | x | x |  |  |  |  |  |  |  |  |  |  |
| G3 Submittal/RFI log | x |  |  |  | x | x |  | x |  |  |  |  |  |  |  |  | x |  |
| G4 Controlled-document access + versioning |  |  |  |  |  |  | x |  |  |  |  | x |  |  |  |  |  |  |
| G5 ECO change-notice distribution | x | x | x |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| H1 Appointment reminders / no-shows |  |  | x |  | x |  |  |  |  |  |  |  |  |  | x |  | x | x |
| H2 Staff credential/licence expiry | x |  | x |  | x | x | x |  |  |  |  |  |  |  |  |  | x |  |
| H3 Lab-result release/hold decision |  | x |  |  | x |  | x | x |  |  |  | x |  |  |  |  |  |  |
| H4 Safety-event/incident report review | x |  |  |  | x |  | x | x |  |  |  | x |  |  |  |  |  |  |
| H5 Staff health-screening/vaccination status | x |  |  |  | x | x |  |  |  |  |  |  |  |  |  |  |  |  |
| H6 Lab calibration + SOP approval |  |  |  |  | x | x | x | x |  |  |  |  |  | x |  |  |  |  |
| **Total of 24** | **16** | **6** | **13** | **1** | **20** | **7** | **14** | **9** | **2** | **1** | **2** | **8** | **1** | **3** | **5** | **2** | **10** | **3** |

Status: STAT, CONF, ROST, SAVE = **covered**; every other column = **missing**.

Derived counts (same coding):

- At least one currently covered part appears in 20 of 24 workflows. Separately, 12 of 24 workflows need both a table and an audit log, which are missing.
- A table, an audit trail or an approval appears in 22 of 24 workflows.
- ESC or RUL (cadence, escalation, quiet hours, severity) appears in 12 of 24; adding EXP, 15 of 24.
- APR appears in 9 of 18 non-education workflows and 0 of 6 education workflows. ACK or APR together: 9 of 24.
- ROST, CONF or DLV (notify-type) appears in 14 of 24.
- By sector, ESC is strongest in manufacturing (5 of 7); APR in manufacturing, engineering and health (3, 3, 3); EXP in health (3 of 6) and education (2 of 6).

Strength-of-evidence caveats: E3 (IEP) and G2 (Onshape) rest on search-result summaries [S]. F1-F6, G1, G3, H1-H2, H5-H6 rest on vendor/blog pages [F-secondary]. Only E2, E4, E5, F5 and part of H3/H4 touch primary or government sources. Small counts (ACK 2, BLK 1, HND 1, CSV 2) should be read as "not shown" rather than "not needed".

---

## 5. Personas

Persona details are composites constructed from the job descriptions and workflows above (roles named in sources: school operations manager, clinical operations manager, laboratory manager, MES engineer, project engineer). They are not interview subjects. Prompts are written the way a non-specialist plausibly would, which usually omits compliance and audit terms.

1. **Maya, school operations lead (education).**
   - Job to be done: get attendance and closure messages to the right families on time without sending the wrong kid's info or texting at night.
   - Prompt: "Build me a dashboard from our attendance export that shows how many students are absent today, lets me pick which families to text, and sends them a message."

2. **Dev, plant quality/MES engineer (manufacturing).**
   - Job to be done: replace the paper shift log and calibration spreadsheet; make sure the next shift knows what is down and that overdue gauges get chased.
   - Prompt: "Make a shift handover page for line 3 with open downtime events and work orders, a sign-off for the incoming supervisor, and email alerts when a gauge calibration is overdue."

3. **Sam, project engineer / document controller at a small engineering firm (engineering).**
   - Job to be done: get a design change reviewed and approved by the right people and tell everyone affected what changed.
   - Prompt: "Create an engineering change request tool where I list affected drawings, route it to quality and manufacturing for approval, and notify everyone once it is approved."

4. **Priya, clinic operations manager (health).**
   - Job to be done: cut no-shows and stop staff licences lapsing, without exposing patient details in messages.
   - Prompt: "Build an internal page that texts patients appointment reminders and also shows which staff licences expire in the next 60 days with a reminder to each person."

5. **Jordan, solo builder with an AI agent (cross-sector; consultant or the "only technical person" at a small org).**
   - Job to be done: turn a manager's spreadsheet request into a working tool in a day, in whichever sector the client is in, and not be the one blamed when it sends something wrong.
   - Prompt: "Take this CSV of people and statuses and build a status page with a progress bar, a send-reminder button, and a list where each person can have email or SMS turned on or off."

Why 5 (not 6): the brief asked for 4-6; a sixth (lab manager, health) overlaps Priya and Dev and adds no new primitive demands in the matrix (calibration + SOP approval is covered by F4/H6).

---

## 6. What this means for crisp-ui (ranked missing patterns, with evidence)

Counts are out of the 24 coded workflows (section 4). "Evidence" includes the compliance cue from section 2.

| Rank | Missing pattern | Count | Evidence | Why it matters for crisp-ui |
|---|---|---|---|---|
| 1 | **Data table / exception list with saved filters and row selection** | 20/24 | Every sector's sources center on a list of people/assets/records with status; "exception reporting" and "denominator visible" in training dashboards; submittal and calibration logs are tables. | Roster is the only list crisp-ui has, and it is channel-switch-specific. A status headline with segmented progress needs a table beneath it to act on the not-done segment. Natural pairing with a bulk action bar (BLK, only 1 explicit but implied by every CONF row). |
| 2 | **Audit-log timeline (who, when, what, why)** | 14/24 | FERPA 99.32, HIPAA 164.312, 21 CFR 11.10(e), ISO 9001 7.5.3, OSHA certifications, OWASP A09 all call for records of actions; Retool 51% cannot confirm incidents. | Highest compliance-cue density across all four sectors; absent in AI-built tools (section 3). Cheap to render, hard for a coding agent to remember to add. |
| 3 | **Reminder cadence / escalation ladder and alert-rule editor** (ESC + RUL) | 12/24 (15 with EXP) | Calibration reminders at 30/14/7/1 days with supervisor escalation; training reminders with manager escalation; severity-triggered escalation in shift logs; IES quiet hours 9 p.m.-8 a.m.; PSNet severity tiering. | Directly addresses over-notifying and quiet-hours cues; extends the existing notify action rather than being a new product. |
| 4 | **Approval / sign-off step with reason and meaning** | 9/24 (9/18 outside education) | ECO/ECR approvers; NCR disposition; submittal four-way decision; Part 11.50 name/date-time/meaning; shift supervisor sign-off; lab-result hold with documented reason. | Strongest in manufacturing, engineering, health; absent in education. Needs a paired audit log (AUD and APR co-occur in 8 workflows: F1, F3, F5, G1, G2, H3, H4, H6). |
| 5 | **Role gate / role-based visibility** | 8/24 | FERPA school-official, HIPAA minimum-necessary, ISO 9001 view-vs-change, 11.10(g), OWASP A01, HN commenter on granular rights. | UI part is only the visible half (what a disabled/hidden state looks like); the enforcement must be server-side (section 3 items 1-2). |
| 6 | **Due-date / expiry badge (30/60/90-day windows)** | 7/24 | Training expiry windows, calibration recall, credential expiry, submittal return dates, OSHA retraining triggers. | Tiny, reusable, and a natural segment source for the existing status headline. |
| 7 | **Per-recipient delivery / send log** (sent, delivered, bounced, opted out) | 3/24 | IES toolkit explicit on sent/delivered/unsubscribed monitoring and "zero messages sent" anomaly check. | Small but sits right after "confirm then send"; evidence is concentrated in one strong primary source. |
| 8 | **Checklist / SOP step** | 3/24 | Shift handover (isolation status confirmed), ECO impact checklist, SOP approval. | Low but nonzero; may fold into approval step. |
| 9 | **Acknowledgement (read-and-sign), handoff note, stale/empty/error states, CSV import review, bulk action bar** | 2, 1, 2, 2, 1 of 24 | Shift supervisor acknowledgement; LOTO certification; stale vendor data in IES toolkit; SIS extract cleaning. | Evidence is thin in my coding; note that the empty/stale states and CSV review are things AI agents commonly omit, but I found no source proving that (UNVERIFIED). Do not rank higher on this research alone. |

Takeaways:

- The four covered behaviours appear in 20 of 24 workflows, so the status-notify pattern is not a niche. But it almost never appears alone: 22 of 24 also need a table, audit trail or approval.
- Suggested next pattern after status-notify: a **data table with saved filters and selection** feeding the existing confirm-then-send, then an **audit-log timeline**, then **escalation/quiet-hours rules**, then **approval step**.
- Defaults worth building in (each traceable above): confirm with recipient count; first-name-only or generic message template preview (IES toolkit); quiet-hours guard (IES toolkit); per-recipient opt-out state (IES toolkit); no PHI in message body (HHS email FAQ [S], 164.514(d)); audit entry on every send; severity tier on notifications (PSNet).
- Stay explicit that crisp-ui is UI only: access control, retention, encryption and consent logic live in the builder's backend (section 3).
- Education has no approval workflows in my coding, while manufacturing/engineering/health do. Sector packs may weight patterns differently.

---

## 7. Unverified

- Everything tagged [S] (search-result summary only): IEP/SPED vendors (SpedTrack, Level Data), LMS reminder claims (Absorb, D2L), Ignition/MES job-ad contents, Onshape release management, school operations manager job description, nektar RFI ownership, HHS email/text FAQ content, HIPAA texting summaries, CVE-2025-48757 counts (170 projects, 303 endpoints), RedAccess "380,000 apps", Tenzai "69 vulnerabilities", alarm-fatigue percentages (72-99% false alarms), bulk-delete confirmation study.
- HHS.gov minimum-necessary guidance and email FAQ pages returned HTTP 403; NVD returned no CVE detail. The minimum-necessary content here comes from the CFR text at Cornell LII instead.
- Whether COPPA, FERPA, HIPAA or 21 CFR Part 11 applies to any particular internal tool (scope, exemptions, predicate rules, nonprofit status, school-authorization practice for COPPA). Not researched.
- The fifth crisp-ui part, and the exact names and boundaries of the four described. I did not read the repo.
- Whether AI coding agents specifically over-notify or skip bulk-send confirmation; no verified source found. Only "AI code is insecure" (Veracode) and single-incident evidence (Replit) were verified.
- Reddit practitioner threads: not accessible, so no Reddit evidence either way. HN evidence is two threads and thin.
- ISO 27001, FDA design-control rules, AS9100, ISO 13485, GxP, OSHA recordkeeping (300 log) not researched. ISO 9001 and ISA-95 were read only through secondary pages.
- Software/DevOps engineering teams as the "engineering" sector (not covered).
- Retool survey populations: vendor-run; no sector breakdown was found, so I cannot say what share of builders are in education, manufacturing, engineering or health.
- The matrix is my own coding from the cited pages and has not been checked by a second reviewer; the counts are directional.
- The Georgia Tech and Apiiro figures appear only second-hand through the CSA note.
