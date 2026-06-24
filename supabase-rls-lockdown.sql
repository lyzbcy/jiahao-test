-- ============================================================
-- 嘉豪值测试 · RLS 加固补丁（显式拒绝 UPDATE/DELETE）
-- 用法：Supabase → SQL Editor → 粘贴 → Run
-- 目的：确保前端 publishable key 绝对无法修改/删除任何记录
-- ============================================================

-- 显式拒绝匿名用户 UPDATE（即使 RLS 默认已挡，这条让它返回 403 而非 200，避免误导）
DROP POLICY IF EXISTS "anon_no_update_jiahao" ON jiahao_records;
-- 注意：FOR UPDATE 用 USING(false) 表示一行都不匹配 → 实际无法更新
CREATE POLICY "anon_no_update_jiahao"
  ON jiahao_records FOR UPDATE TO anon
  USING (false);

-- 显式拒绝匿名用户 DELETE
DROP POLICY IF EXISTS "anon_no_delete_jiahao" ON jiahao_records;
CREATE POLICY "anon_no_delete_jiahao"
  ON jiahao_records FOR DELETE TO anon
  USING (false);

-- 验证：执行后，前端用 PATCH/DELETE 都会得到 0 行影响（彻底锁死）
