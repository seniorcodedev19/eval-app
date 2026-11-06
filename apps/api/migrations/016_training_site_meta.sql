-- Metadata a training site's own page tells us about itself: a short summary
-- and an icon. Filled by POST /training-sites/fetch, which reads the URL's
-- HTML and pulls the title, description and icon out of its <head>. Both are
-- plain text columns and may stay empty: the fetch is best-effort, and a site
-- added by hand has neither.
alter table training_sites add column if not exists summary text not null default '';
alter table training_sites add column if not exists icon_url text not null default '';
