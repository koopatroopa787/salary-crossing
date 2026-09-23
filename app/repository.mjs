/** Every adviser lookup is scoped by organization. Keep that rule in one place. */
export function findCase(db, organizationId, caseId) {
  return db.prepare("SELECT * FROM cases WHERE id=? AND organization_id=?").get(caseId, organizationId) ?? null;
}

export function listCaseDocuments(db, organizationId, caseId) {
  return db.prepare("SELECT * FROM documents WHERE case_id=? AND organization_id=? ORDER BY created_at").all(caseId, organizationId);
}

export function findDocument(db, organizationId, documentId) {
  return db.prepare("SELECT * FROM documents WHERE id=? AND organization_id=?").get(documentId, organizationId) ?? null;
}
