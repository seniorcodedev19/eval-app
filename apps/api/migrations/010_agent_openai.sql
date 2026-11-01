-- Per-user OpenAI key for the personal agent (never returned to the browser).

create table agent_user_settings (
  eval_user_id int primary key references users(id) on delete cascade,
  openai_key_enc text,
  updated_at timestamptz not null default now()
);
