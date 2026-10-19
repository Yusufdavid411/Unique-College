# Configurable access control foundation

Stage 1 now includes AccessRole and UserRoleAssignment tables. Role names are
configurable and each user can receive multiple roles. The existing User.role
field remains the compatibility boundary for admin, staff, applicant, and student
identities. Active legacy administrators retain the permission catalogue.

The API loads role assignments from PostgreSQL on each authenticated request, so
revoking an assignment takes effect without waiting for an existing JWT to expire.

## Administration endpoints

All endpoints require roles.manage:

- GET /api/roles lists roles and the supported permission catalogue.
- POST /api/roles creates a role using name and permissions.
- PUT /api/roles/:roleId updates a role name and permissions.
- PUT /api/roles/:roleId/users/:userId assigns a role to active staff/admin users.
- DELETE /api/roles/:roleId/users/:userId revokes an assignment.

Admissions routes use applications.read, applications.review, applications.admit,
and payments.verify. Admission and acceptance decisions require admission authority
in addition to review permission. These APIs are the foundation for future staff
screens; the current admin frontend continues to require ADMIN.

## Deployment

Run Prisma generate and prisma migrate deploy against the target PostgreSQL
database before deploying this API revision. Migration
202610190001_configurable_roles is additive and preserves existing users.
The production database connection still needs operational verification.

## Remaining Stage 1 work

- Role-management UI and permission-aware staff sign-in/navigation.
- Audit records for role and admission changes.
- Transition content/settings routes to specific permissions.
- Private file access and portable storage providers.
- Deployment, backup, and live database integration verification.

Verify the permission policy using node --test test/permissions.test.js from backend.
