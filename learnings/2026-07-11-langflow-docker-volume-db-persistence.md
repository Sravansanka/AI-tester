# Langflow docker volume mapping + DB persistence + flow recovery

## Problem (one line)
User's `docker run -v langflow_data:/app/langflow` did not persist flows: named volume + wrong path meant the SQLite DB stayed inside the image and died on every `docker rm`, and their host `langflow-data/` never got a `.db`.

## Approach (plain steps)
1. **Verify assumptions before trusting the command.** `docker` wasn't on PATH (Docker Desktop CLI lives at `/Applications/Docker.app/Contents/Resources/bin/docker`). Confirmed daemon up with `docker info`.
2. **Inspect the host data dir.** It had `secret_key`, `profile_pictures/`, an orphan flow-id folder — but NO `langflow.db`. That absence was the whole tell: config-dir artifacts persisted, the DB did not.
3. **Find where the DB actually lives.** `docker exec langflow find /app -name '*.db'` -> `/app/.venv/.../site-packages/langflow/langflow.db`, i.e. inside the image layer, ephemeral. `LANGFLOW_CONFIG_DIR` alone does NOT move the DB.
4. **Fix persistence with two levers:** bind-mount the real host path (not a named volume) to `/app/langflow-data`, set `LANGFLOW_CONFIG_DIR=/app/langflow-data` AND `LANGFLOW_SAVE_DB_IN_CONFIG_DIR=true`. Then the `.db` appears on the host and survives `docker rm`.
5. **Recover lost flows.** The orphan flow-id didn't exist in any DB. But old *stopped* langflow containers still held their internal DBs. `docker cp <container>:/app/.venv/lib/python3.14/site-packages/langflow/langflow.db out.db`, then `sqlite3 out.db 'select id,name from flow'` to find which held the user's real work. Swapped the richest/most-recent one into the now-persistent host mount, cleared stale `-wal`/`-shm`, restarted, verified 38 flows in UI.

## Judgment calls (what was NOT done, why)
- **Did not merge DBs.** Risk of id collisions / corruption. Picked the single most-recent DB (`stoic_roentgen`, had the user's `AI3X_*` flows) and swapped wholesale. Kept the fresh DB as a backup.
- **Did not chase matching `secret_key`.** Encrypted API-key fields may not decrypt across secret_keys; flow *graphs* load fine regardless. Told the user they may re-enter keys — acceptable, not worth the effort to reunite secret_key + DB.
- **Did not stop `postgres-db` unprompted.** Auto-classifier blocked it (stateful DB, unnamed by user). Correct guard — asked before stopping.
- **Backed up old langflow DBs to a durable dir (`~/Documents/langflow-db-backups`) before `container prune`**, because scratchpad is session-temp and prune is irreversible.

## Reusable rule
When a containerized app "loses data" despite a `-v` flag: (1) a `name:/path` volume is a docker-managed *named volume*, not a host folder — use an absolute host path for bind mounts; (2) apps often store the DB somewhere OTHER than the config dir — `exec ... find / -name '*.db'` to locate it, then set the app's explicit DB/save env var; (3) before pruning, remember stopped containers are recoverable data — `docker cp` the DB out and query it before `rm`.
