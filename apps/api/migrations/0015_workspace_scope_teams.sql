ALTER TABLE workspace_users ADD COLUMN scope_teams_json TEXT NOT NULL DEFAULT '[]';

UPDATE workspace_users
SET scope_teams_json = (
  SELECT json_array(roster_members.team)
  FROM roster_members
  WHERE roster_members.id = workspace_users.roster_member_id
)
WHERE role = 'manager'
  AND scope_teams_json = '[]'
  AND roster_member_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM roster_members
    WHERE roster_members.id = workspace_users.roster_member_id
      AND roster_members.team IS NOT NULL
      AND trim(roster_members.team) <> ''
  );

ALTER TABLE workspace_invites ADD COLUMN scope_teams_json TEXT NOT NULL DEFAULT '[]';

UPDATE workspace_invites
SET scope_teams_json = (
  SELECT json_array(roster_members.team)
  FROM roster_members
  WHERE roster_members.id = workspace_invites.roster_member_id
)
WHERE role = 'manager'
  AND scope_teams_json = '[]'
  AND roster_member_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM roster_members
    WHERE roster_members.id = workspace_invites.roster_member_id
      AND roster_members.team IS NOT NULL
      AND trim(roster_members.team) <> ''
  );
