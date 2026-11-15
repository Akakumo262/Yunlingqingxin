ALTER TABLE app_runtime.events ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE app_runtime.events ADD COLUMN IF NOT EXISTS result_ciphertext TEXT;
ALTER TABLE app_runtime.events ADD COLUMN IF NOT EXISTS result_iv TEXT;
ALTER TABLE app_runtime.events ADD COLUMN IF NOT EXISTS result_tag TEXT;
