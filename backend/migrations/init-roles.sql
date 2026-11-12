-- 由 docker-entrypoint 首次启动时执行。应用用非属主账号连接，RLS 才会生效。
CREATE ROLE yunling_app LOGIN PASSWORD 'yunling_app';
