-- Workspace install maps Slack users by id/email. User tokens are optional.

alter table slack_connections
  alter column user_token_enc drop not null;
