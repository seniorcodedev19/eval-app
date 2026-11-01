-- Signing secret + app-level token for Socket Mode (local DMs / @eval without a public URL).

alter table slack_app_config
  add column if not exists signing_secret_enc text,
  add column if not exists app_token_enc text;
