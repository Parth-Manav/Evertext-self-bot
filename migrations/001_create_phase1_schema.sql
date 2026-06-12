BEGIN;

CREATE TABLE IF NOT EXISTS queue_runs (
  id uuid PRIMARY KEY,
  trigger_type text,
  status text,
  started_at timestamptz,
  finished_at timestamptz,
  stop_requested_at timestamptz
);

CREATE TABLE IF NOT EXISTS automation_accounts (
  id uuid PRIMARY KEY,
  legacy_id text UNIQUE,
  label text,
  target_server text,
  status text,
  last_run_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS task_jobs (
  id uuid PRIMARY KEY,
  queue_run_id uuid REFERENCES queue_runs(id),
  account_id uuid REFERENCES automation_accounts(id),
  status text,
  scheduled_for timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  result_reason text,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS task_attempts (
  id uuid PRIMARY KEY,
  job_id uuid REFERENCES task_jobs(id),
  attempt_no int,
  status text,
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  error_message text,
  defer_reason text,
  duration_ms int
);

CREATE INDEX IF NOT EXISTS idx_automation_accounts_status
  ON automation_accounts (status);

CREATE INDEX IF NOT EXISTS idx_task_jobs_status_created_at
  ON task_jobs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_jobs_created_at
  ON task_jobs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_jobs_account_created_at
  ON task_jobs (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_attempts_job_attempt_no
  ON task_attempts (job_id, attempt_no);

COMMIT;
