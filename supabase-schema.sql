-- ============================================================
-- 嘉豪值测试 · Supabase 建表 + 行级安全(RLS) 配置
-- 用法：登录 Supabase → 左侧 SQL Editor → 粘贴本文件全部内容 → Run
-- ============================================================

-- 1. 建表
CREATE TABLE IF NOT EXISTS jiahao_records (
  id              bigserial PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  nickname        text,              -- 昵称（可不填）
  contact         text,              -- 联系方式（可不填：抖音号/邮箱/QQ/微信）
  contact_type    text,              -- 联系方式类型
  province        text,              -- 省份（可不填，默认"嘉豪省"）
  haoyi           int NOT NULL DEFAULT 0,    -- 豪意值
  tier            text,              -- 稀有度 n/r/sr/ssr/ur
  code            text,              -- 豪型代码 如 ZESZ
  label_id        text,              -- 本命嘉豪 id
  duration_ms     bigint DEFAULT 0,  -- 总答题耗时(毫秒)
  question_timings jsonb,            -- 各题耗时 {q1:1234, q2:567...}
  user_agent      text               -- 浏览器标识(粗略统计)
);

-- 索引：排行榜按豪意值降序查、省份榜按省份聚合查
CREATE INDEX IF NOT EXISTS idx_jiahao_haoyi    ON jiahao_records (haoyi DESC);
CREATE INDEX IF NOT EXISTS idx_jiahao_province ON jiahao_records (province);

-- 2. 开启行级安全(RLS) —— 关键！前端只有 anon key，靠 RLS 控制权限
ALTER TABLE jiahao_records ENABLE ROW LEVEL SECURITY;

-- 3. 策略：允许匿名用户 INSERT（做题后上传记录）
--    限制：haoyi 必须 0~100，防止刷榜乱填
DROP POLICY IF EXISTS "anon_insert_jiahao" ON jiahao_records;
CREATE POLICY "anon_insert_jiahao"
  ON jiahao_records FOR INSERT TO anon
  WITH CHECK (haoyi >= 0 AND haoyi <= 100);

-- 4. 策略：允许匿名用户 SELECT（读排行榜/省份榜）
--    只能读，不能改不能删（隐私：contact 字段对外可见，由用户自愿填写）
DROP POLICY IF EXISTS "anon_select_jiahao" ON jiahao_records;
CREATE POLICY "anon_select_jiahao"
  ON jiahao_records FOR SELECT TO anon
  USING (true);

-- 5. 注释（方便日后维护）
COMMENT ON TABLE jiahao_records IS '嘉豪值测试做题记录';
COMMENT ON COLUMN jiahao_records.contact IS '用户自愿填写的联系方式，对外可见（用于排行榜点击查看）';

-- 完成后会显示 "Success. No rows returned"
