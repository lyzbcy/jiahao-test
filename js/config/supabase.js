// supabase.js — Supabase 云后端配置（可选）
// 部署到 GitHub Pages 后，填入真实 URL + publishable key 即可启用云排行榜
// 没配置时返回 disabled，repository.js 会自动回退 localStorage 单机模式
//
// 建表 SQL（在 Supabase SQL Editor 执行）：
//   create table jiahao_records (
//     id bigserial primary key,
//     created_at timestamptz default now(),
//     nickname text,
//     haoyi int,
//     tier text,
//     code text,
//     label_id text,
//     region text,
//     age_group text
//   );
//   alter table jiahao_records enable row level security;
//   create policy "anon insert" on jiahao_records for insert to anon with check (true);
//   create policy "anon select" on jiahao_records for select to anon using (true);
const SupabaseConfig = (function () {

  // ====== 在这里填你的 Supabase 配置 ======
  const SUPABASE_URL = '';        // 例：'https://xxxx.supabase.co'
  const SUPABASE_KEY = '';        // publishable (anon) key，不是 service role！
  const TABLE = 'jiahao_records';
  // =======================================

  let _client = null;
  let _enabled = false;

  async function init() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.log('[嘉豪] Supabase 未配置，使用 localStorage 单机模式');
      _enabled = false;
      return false;
    }
    try {
      // 通过 CDN 引入 supabase-js UMD 版（在 index.html 里）
      if (window.supabase) {
        _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        _enabled = true;
        console.log('[嘉豪] Supabase 已连接');
        return true;
      }
      console.warn('[嘉豪] supabase-js 未加载');
      _enabled = false;
      return false;
    } catch (e) {
      console.warn('[嘉豪] Supabase 连接失败，回退单机:', e);
      _enabled = false;
      return false;
    }
  }

  function isEnabled() { return _enabled; }
  function getClient() { return _client; }
  function getTable() { return TABLE; }

  return { init, isEnabled, getClient, getTable };
})();
window.SupabaseConfig = SupabaseConfig;
