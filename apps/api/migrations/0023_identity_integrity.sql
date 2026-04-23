UPDATE roster_members
SET email = lower(trim(email))
WHERE email <> lower(trim(email));

UPDATE workspace_users
SET email = lower(trim(email))
WHERE email <> lower(trim(email));

UPDATE workspace_invites
SET email = lower(trim(email))
WHERE email <> lower(trim(email));

CREATE UNIQUE INDEX IF NOT EXISTS uq_roster_members_email_ci
ON roster_members(lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_users_email_ci
ON workspace_users(lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_users_roster_member_id
ON workspace_users(roster_member_id)
WHERE roster_member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invites_pending_email_ci
ON workspace_invites(lower(email))
WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invites_pending_roster_member_id
ON workspace_invites(roster_member_id)
WHERE status = 'pending' AND roster_member_id IS NOT NULL;
