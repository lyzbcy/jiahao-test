// test-cloud.js — 验证 Supabase 上云：insert / select / count / 省份榜
// 模拟 repository.js 调用 REST API（用原生 https，与浏览器 fetch 等价）
const https = require('https');
const URL = 'https://dkeqptnubtjbaurttaof.supabase.co';
const KEY = 'sb_publishable_lKCyP22LY-yA6OWAK73NJg_rZTiN5FQ';
const TABLE = 'jiahao_records';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const headers = { apikey: KEY, Authorization: 'Bearer ' + KEY };
    if (body) { headers['Content-Type'] = 'application/json'; headers.Prefer = 'return=representation'; headers['Content-Length'] = Buffer.byteLength(body); }
    const r = https.request({ hostname: URL.replace('https://', ''), path, method, headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.status, status: res.statusCode, headers: res.headers, body: d }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

(async () => {
  let pass = 0, fail = 0;
  const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓ ' + n + (x ? '  ' + x : '')); } else { fail++; console.log('  ✗ ' + n + (x ? '  → ' + x : '')); } };

  console.log('=== 1. 插入做题记录（模拟用户做完题上云）===');
  const rec = {
    nickname: '云测试·隔壁嘉豪', contact: 'douyin_test123', contact_type: 'douyin',
    province: '广东', haoyi: 79, tier: 'ssr', code: 'ZESJ', label_id: 'shizu',
    duration_ms: 123456, question_timings: { q1: 3200, q2: 5100 },
  };
  const ins = await req('POST', '/rest/v1/' + TABLE, JSON.stringify(rec));
  ok('插入返回 201', ins.status === 201, 'status=' + ins.status);
  const inserted = JSON.parse(ins.body)[0];
  ok('记录含 nickname', inserted.nickname === rec.nickname);
  ok('记录含 province', inserted.province === '广东');
  ok('记录含 duration_ms', inserted.duration_ms === 123456);

  console.log('\n=== 2. 读取豪意值排行榜（降序 top10）===');
  const rk = await req('GET', '/rest/v1/' + TABLE + '?select=nickname,haoyi,tier,province&order=haoyi.desc&limit=10');
  ok('查询返回 200', rk.status === 200);
  const rankRows = JSON.parse(rk.body);
  ok('榜单非空', rankRows.length > 0, '共' + rankRows.length + '条');
  ok('榜单按豪意值降序', rankRows.every((r, i) => i === 0 || r.haoyi <= rankRows[i - 1].haoyi), '首条豪意' + rankRows[0].haoyi);

  console.log('\n=== 3. 总参与人数 ===');
  const cnt = await req('GET', '/rest/v1/' + TABLE + '?select=*', null);
  cnt.headers; // 触发
  // 用 Prefer count + Range 读 Content-Range
  const cnt2 = await new Promise((resolve) => {
    const r = https.request({ hostname: URL.replace('https://', ''), path: '/rest/v1/' + TABLE + '?select=*', method: 'GET',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'count=exact', Range: '0-0' } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(res.headers));
    }); r.end();
  });
  const range = cnt2['content-range'] || '';
  const total = range.match(/\/(\d+)/);
  ok('读取总人数', !!total, 'Content-Range=' + range + ' 总数=' + (total ? total[1] : '?'));

  console.log('\n=== 4. 省份榜（前端聚合）===');
  const prov = await req('GET', '/rest/v1/' + TABLE + '?select=province,haoyi&province=not.is.null');
  ok('省份查询 200', prov.status === 200);
  const provRows = JSON.parse(prov.body);
  const byProv = {};
  provRows.forEach(r => { if (!r.province) return; if (!byProv[r.province]) byProv[r.province] = { sum: 0, n: 0 }; byProv[r.province].sum += r.haoyi; byProv[r.province].n += 1; });
  const provList = Object.entries(byProv).map(([p, v]) => ({ province: p, avg: Math.round(v.sum / v.n), count: v.n })).sort((a, b) => b.avg - a.avg);
  ok('省份聚合有结果', provList.length > 0, provList.map(p => p.province + '(' + p.avg + ',' + p.count + '人)').join('  '));

  console.log('\n=== 5. RLS 防护验证（应被拒绝）===');
  // 尝试插入非法豪意值（>100），应被 RLS 拒绝（401）
  const bad = await req('POST', '/rest/v1/' + TABLE, JSON.stringify({ nickname: '刷榜狗', haoyi: 999 }));
  ok('RLS 拒绝 haoyi>100', bad.status !== 201, 'status=' + bad.status + '（预期非201）');
  // 尝试 UPDATE：RLS 下 PostgREST 仍返回 200，但实际改 0 行（用 return=representation 看返回数组为空）
  const upd = await new Promise((resolve) => {
    const body = JSON.stringify({ nickname: '黑客改的' });
    const r = https.request({ hostname: URL.replace('https://', ''), path: '/rest/v1/' + TABLE + '?id=eq.1', method: 'PATCH',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation', 'Content-Length': Buffer.byteLength(body) } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); });
    r.write(body); r.end();
  });
  const updRows = JSON.parse(upd.body);
  ok('RLS 挡住修改（返回空数组）', Array.isArray(updRows) && updRows.length === 0, '实际改动 ' + updRows.length + ' 行（应为0）');

  console.log('\n=========================');
  console.log('  通过 ' + pass + ' / 失败 ' + fail);
  console.log('=========================');
  process.exit(fail > 0 ? 1 : 0);
})();
