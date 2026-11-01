-- Personal agent chats + per-user Slack OAuth tokens (never a shared search bot).

create table agent_conversations (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  title text not null default 'New chat',
  source text not null default 'web' check (source in ('web', 'slack')),
  slack_channel_id text,
  slack_thread_ts text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index agent_conversations_user_idx on agent_conversations (user_id, updated_at desc);

create table agent_messages (
  id bigserial primary key,
  conversation_id int not null references agent_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null default '',
  tool_name text,
  tool_payload jsonb,
  created_at timestamptz not null default now()
);
create index agent_messages_conv_idx on agent_messages (conversation_id, id);

-- One Slack user token per Eval user. Bot/workspace install is optional and separate.
create table slack_connections (
  eval_user_id int primary key references users(id) on delete cascade,
  slack_user_id text not null,
  slack_team_id text not null,
  user_token_enc text not null,
  scopes text not null default '',
  connected_at timestamptz not null default now(),
  unique (slack_team_id, slack_user_id)
);

-- Thin workspace bot (mentions/DMs only). Search/history always use slack_connections.user_token_enc.
create table slack_app_install (
  slack_team_id text primary key,
  bot_user_id text,
  bot_token_enc text,
  installed_at timestamptz not null default now()
);
