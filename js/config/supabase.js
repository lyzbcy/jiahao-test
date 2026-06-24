// supabase.js — Supabase 云后端配置 + 轻量 REST 客户端
// 不依赖 supabase-js 库，直接用原生 fetch 调 PostgREST API，更轻量、零外部 CDN
// RLS 已配置：匿名可 INSERT(haoyi限0~100) 和 SELECT，不可改不可删
const SupabaseConfig = (function () {

  // ====== Supabase 配置 ======
  const URL = 'https://dkeqptnubtjbaurttaof.supabase.co';
  const KEY = 'sb_publishable_lKCyP22LY-yA6OWAK73NJg_rZTiN5FQ';  // publishable(anon) key
  const TABLE = 'jiahao_records';
  // ===========================

  let _enabled = false;

  async function init() {
    _enabled = !!(URL && KEY);
    if (_enabled) console.log('[嘉豪] Supabase 云后端已启用');
    else console.log('[嘉豪] Supabase 未配置，使用 localStorage 单机模式');
    return _enabled;
  }

  function isEnabled() { return _enabled; }

  // 插入一条记录，返回插入结果（失败抛异常）
  async function insert(record) {
    const res = await fetch(URL + '/rest/v1/' + TABLE, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('Supabase 插入失败 ' + res.status + ': ' + txt);
    }
    return res.json();
  }

  // 查询记录，queryStr 是 PostgREST 的查询串（如 ?select=...&order=...&limit=...）
  async function select(queryStr) {
    const res = await fetch(URL + '/rest/v1/' + TABLE + (queryStr || ''), {
      method: 'GET',
      headers: {
        apikey: KEY,
        Authorization: 'Bearer ' + KEY,
      },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('Supabase 查询失败 ' + res.status + ': ' + txt);
    }
    return res.json();
  }

  // 获取总记录数（用 head 请求读 count）
  async function count() {
    const res = await fetch(URL + '/rest/v1/' + TABLE + '?select=*', {
      method: 'GET',
      headers: {
        apikey: KEY,
        Authorization: 'Bearer ' + KEY,
        Prefer: 'count=exact',
        Range: '0-0',  // 只取 0 条，靠 Content-Range 读总数
      },
    });
    if (!res.ok) throw new Error('Supabase 计数失败 ' + res.status);
    const range = res.headers.get('Content-Range');  // 形如 "0-0/42"
    if (range) {
      const m = range.match(/\/(\d+)/);
      if (m) return parseInt(m[1], 10);
    }
    return 0;
  }

  return { init, isEnabled, insert, select, count };
})();
window.SupabaseConfig = SupabaseConfig;
