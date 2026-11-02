-- Org-wide OpenAI key (admin Agent connect). Members do not store their own keys.

alter table slack_app_config
  add column if not exists openai_key_enc text;
