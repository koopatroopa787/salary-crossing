import { layout } from "./views.mjs";

const updated = "23 September 2026";
const contact = `<a href="mailto:hello@salarycrossing.com">hello@salarycrossing.com</a>`;

function legal(title, introduction, content) {
  return layout({ title, body: `<article class="report legal"><p class="eyebrow">Updated ${updated}</p><h1>${title}</h1><p class="lede">${introduction}</p>${content}</article>` });
}

export function adviserPrivacyView() {
  return legal("Adviser privacy notice", "This notice covers the private Salary Crossing Adviser workspace. The free public calculators have a separate privacy notice.", `
  <h2>Roles and responsibility</h2><p>Your adviser organisation decides why client information is entered and is normally the controller for that client data. Salary Crossing processes it to provide the workspace. Salary Crossing is controller for account, billing, service-security and support information.</p>
  <h2>Information handled</h2><p>The service stores account details, organisation settings, case values, adviser notes, comments, audit events and approved reports. When document retention is enabled, it may also store payslips, offer letters, benefits documents and relocation policies supplied by an authorised adviser.</p>
  <h2>How information is used</h2><p>Information is used to authenticate users, run deterministic calculations, extract facts when AI extraction is requested, produce reports, protect the service, support customers and administer billing. Client data is not used to train general-purpose AI models or for advertising.</p>
  <h2>Security and retention</h2><p>Files are malware-scanned before acceptance, encrypted at rest and isolated by organisation. Original document text is decrypted only while an authorised request is processed and is not retained as a second plaintext copy. Access and report-sharing events are audited. Closed-case documents default to deletion after 12 months. An authorised user can delete a case earlier; encrypted backups expire within 30 days.</p>
  <h2>Providers and international processing</h2><p>The current provider list and processing purpose are published on the <a href="/subprocessors">subprocessors page</a>. AI extraction remains off unless an organisation enables it. Only text required for the requested extraction is sent to the configured provider.</p>
  <h2>Your choices and rights</h2><p>Organisation owners can correct case data, revoke client links and delete cases. For access, correction, deletion, restriction or objection requests, contact the adviser organisation first or email ${contact}. You may also complain to the UK Information Commissioner.</p>`);
}

export function adviserTermsView() {
  return legal("Adviser pilot terms", "The workspace helps qualified advisers prepare consistent comparisons. It does not replace their professional judgement.", `
  <h2>Permitted use</h2><p>Access is limited to authorised pilot organisations. Users must protect their credentials, obtain authority to upload client information and avoid entering data unrelated to a compensation or relocation case.</p>
  <h2>Adviser approval</h2><p>AI extraction creates suggestions. Every material field must be reviewed by an adviser before calculations are approved, and every report must be approved again before a client link is created. The adviser remains responsible for the final report and advice given to the client.</p>
  <h2>Model limitations</h2><p>The current engine models ordinary employment income, standard allowances and full-year residence in the jurisdictions shown. It does not determine residence, treaty treatment, immigration status, complex equity taxation, joint filing or individual eligibility. Unsupported circumstances must be referred for professional review.</p>
  <h2>Availability and errors</h2><p>The founding pilot is provided for validation and may change. Salary Crossing will correct reported calculation errors promptly but does not warrant uninterrupted availability or that an estimate reflects every fact in a client’s circumstances.</p>
  <h2>Contact</h2><p>Questions, security reports and requests should be sent to ${contact}.</p>`);
}

export function dataProcessingView() {
  return legal("Pilot data-processing terms", "These terms describe how Salary Crossing processes client information for a pilot organisation.", `
  <h2>Instructions and duration</h2><p>Salary Crossing processes case data only to provide, secure and support the workspace according to the organisation’s use of the service. Processing lasts for the pilot and the configured retention period, unless law requires otherwise.</p>
  <h2>People and information</h2><p>Data subjects may include candidates, employees, dependants and adviser users. Data may include identity and contact details, compensation, deductions, pension and benefits, household costs, employment terms and information contained in uploaded evidence. Users must not upload special-category data unless it is essential and lawful for the case.</p>
  <h2>Confidentiality and security</h2><p>Access is organisation-scoped and role-controlled. The service uses encryption, private storage, malware scanning, audit logs, expiring sessions and approval gates. Personnel and providers with access are bound by confidentiality duties appropriate to their role.</p>
  <h2>Assistance and incidents</h2><p>Salary Crossing will provide reasonable assistance with data-subject requests, security assessments and deletion. A confirmed personal-data breach affecting an organisation’s data will be reported to its nominated contact without undue delay, with available facts and mitigation steps.</p>
  <h2>Subprocessors, deletion and audit</h2><p>Approved providers are listed on the <a href="/subprocessors">subprocessors page</a>. Material changes will be notified before use where practicable. At termination or authorised deletion, active data is removed and backup copies expire within 30 days. Reasonable evidence of these controls will be supplied on request.</p>
  <p>These pilot terms require specialist legal review before general commercial release. Contact ${contact} for an organisation-specific signed agreement.</p>`);
}

export function subprocessorsView() {
  return legal("Subprocessors", "Providers are limited to the services required to host, protect, extract and bill for the adviser workspace.", `
  <table><thead><tr><th>Provider</th><th>Purpose</th><th>Data involved</th></tr></thead><tbody>
  <tr><td>Oracle Cloud Infrastructure</td><td>Application, encrypted storage and database hosting in the London region</td><td>Account, case, document and audit data</td></tr>
  <tr><td>Cloudflare</td><td>DNS, transport security and abuse protection</td><td>IP address and request metadata</td></tr>
  <tr><td>OpenAI, when enabled by the organisation</td><td>Structured extraction from selected document text</td><td>Relevant document text sent for extraction</td></tr>
  <tr><td>Stripe, when online billing is enabled</td><td>Pilot payment processing</td><td>Organisation contact and payment metadata; card details remain with Stripe</td></tr>
  </tbody></table><p>Questions about provider configuration or data location: ${contact}.</p>`);
}
