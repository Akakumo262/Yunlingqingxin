-- Up Migration
-- 发现页：按学生阶段推荐、权威来源标识和原文跳转所需的内容元数据。
ALTER TABLE IF EXISTS cnt.content_item
  ADD COLUMN IF NOT EXISTS discover_kind text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS audience_stages text[] NOT NULL DEFAULT ARRAY['all'],
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS source_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS deadline text,
  ADD COLUMN IF NOT EXISTS location text;
