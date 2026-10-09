# Database migrations

Hand-applied SQL changes to the Supabase Postgres database (Payload's migration
runner was removed). Each file is the source-of-truth record of a change that was
applied directly to the project (`hywqbbjwepliduwamhip`) via the Supabase
dashboard / MCP `apply_migration`.

Files are named `YYYYMMDD_description.sql` and are idempotent where practical, so
re-running them is safe.
