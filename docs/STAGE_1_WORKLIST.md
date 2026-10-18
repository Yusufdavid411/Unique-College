# Stage 1 Worklist

## Completed or underway

- Public website content and responsive leadership presentation.
- Leadership removed from the home page to keep the landing page focused.
- Applicant Portal foundation: registration, draft application form, uploads,
  payment evidence, applicant tracking, and administration review.
- Admissions state history and student portal credential hand-off.
- Public content administration for news and gallery.

## Required before Stage 1 is considered stable

1. Restore the live PostgreSQL connection and run the Prisma migration against the
   correct environment.
2. Implement normalized role/permission assignments and audit logging.
3. Introduce portable object-storage adapters and migrate uploaded content away from
   host-local disk in production.
4. Configure Neon runtime/migration URLs, secrets, CORS origins, and subdomains.
5. Add an approved payment gateway after the school supplies its provider account,
   fee amounts, payment policy, and receipt wording. Current evidence upload is
   manual verification, not card/bank checkout.
6. Add PDF receipt, application-form, and admission-letter generation with access
   checks and a printable applicant/admin view.
7. Add automated API tests for auth, applicant access isolation, admissions review,
   and file authorization.
8. Add database dump/restore and storage-manifest backup procedures.
9. Implement Google Drive archive OAuth, integrity checks, archive index, and
   restoration controls; do not delete primary copies automatically.

## Decisions needed from the school

- Neon project owner and production database connection details.
- Chosen payment provider and merchant account.
- Official programme list, application/acceptance fee rules, and receipt format.
- Official email provider and whether student mailboxes should be provisioned.
- Google Workspace account and archive retention policy.
