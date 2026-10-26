/* ============================================================
   about.js — รุ่น 3.1: เวอร์ชัน · รายการอัปเดต · คู่มือการใช้
   • รายการอัปเดต: config.js › version / versionDate / changelog (แก้ในไฟล์ทุกครั้งที่ออกรุ่น)
   • คู่มือ: เพิ่ม/แก้ได้ 2 ทาง — (ก) ในแอป เมนู “คู่มือการใช้” (แอดมิน) เก็บที่ config/manual
                                   (ข) ในไฟล์ config.js › manual: [{ title, body, aud: 'all'|'committee'|'teacher', order }]
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP, C = M.C;
  const { $, esc, toast, modal } = M; const { ic, chip, fld, opt } = A;
  Object.assign(A.ICON, { help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1.9-1.1 1.7M12 17h.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>' });
  const KEY = 'ss_seen_ver', T = () => A.teacher();
  const seen = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const markSeen = () => { try { localStorage.setItem(KEY, C.version); } catch (e) { /* ignore */ } };
  const dateTxt = iso => iso ? A.dTH(iso, 'full') : '';
  A.NAVS.push({ id: 'manual', label: 'คู่มือการใช้', icon: 'help', order: 85 }, { id: 'about', label: 'เวอร์ชันและรายการอัปเดต', icon: 'info', order: 86 });

  /* ---------- การ์ด “มีอะไรใหม่” บนหน้าหลัก ---------- */
  A.HOME.push({ order: 4, html: () => {
    const cl = (C.changelog || [])[0]; if (!cl || seen() === C.version) return '';
    return '<section class="card hl"><div class="row"><div class="lb grow" style="margin:0 0 6px">มีอะไรใหม่ในรุ่น ' + esc(C.version) + '</div></div><ul class="cl">' + cl.items.slice(0, 3).map(i => '<li>' + esc(i) + '</li>').join('') + '</ul><div class="row wrap" style="margin-top:8px"><a class="btn sm" href="#/about">ดูรายการอัปเดตทั้งหมด</a><button class="btn ghost sm" data-act="verSeen">ปิด</button></div></section>';
  } });
  A.ACT.verSeen = () => { markSeen(); A.rerender(); };

  A.V.about = function () {
    markSeen(); const d = B.diagnostics(), logs = C.changelog || [];
    let b = '<section class="card hero"><div class="row"><img class="logo big' + (C.club.round ? ' round' : '') + '" style="margin:0;width:72px;height:72px" src="' + esc(C.club.logo) + '" alt=""><div class="grow"><div class="hero-name">ระบบบริหารจัดการเครือข่าย' + esc(C.club.name) + '</div><div class="hero-sub">รุ่น ' + esc(C.version) + (C.versionDate ? ' · ออกเมื่อ ' + esc(dateTxt(C.versionDate)) : '') + '</div></div></div></section>' +
      '<section class="card"><div class="lb">ข้อมูลระบบ</div><div class="kv"><span>รุ่นที่ใช้อยู่</span><b>' + esc(C.version) + '</b></div><div class="kv"><span>เครือข่าย</span><b>' + esc(C.club.full) + '</b></div><div class="kv"><span>โรงเรียน</span><b>' + esc(C.school) + '</b></div><div class="kv"><span>ปี</span><b>' + esc(A.year()) + '</b></div><div class="kv"><span>โหมด</span><b>' + (d.mode === 'demo' ? 'สาธิต' : 'ใช้งานจริง') + ' · ' + (d.online ? 'ออนไลน์' : 'ออฟไลน์') + '</b></div>' +
      '<div class="muted" style="margin-top:8px">ถ้าเมนูหรือหน้าจอไม่ตรงกับรุ่นล่าสุด ให้ปิดแอปแล้วเปิดใหม่หนึ่งถึงสองครั้งเพื่อให้โหลดไฟล์ใหม่</div><div class="row wrap" style="margin-top:10px"><a class="btn ghost sm" href="#/manual">เปิดคู่มือการใช้</a></div></section>' +
      '<section class="card"><div class="lb">ผู้พัฒนา</div><b>' + esc(C.credit || '') + '</b><div class="muted">สงวนลิขสิทธิ์ ระบบบริหารจัดการเครือข่าย โรงเรียนสรรพวิทยาคม</div></section><section class="card"><div class="lb">รายการอัปเดต</div>' + (logs.map((r, i) => '<div class="li"><div class="row"><b class="grow">รุ่น ' + esc(r.v) + (r.title ? ' · ' + esc(r.title) : '') + '</b>' + (i === 0 ? chip('รุ่นปัจจุบัน', 'gold') : '') + '</div>' + (r.date ? '<div class="muted">' + esc(dateTxt(r.date)) + '</div>' : '') + '<ul class="cl">' + r.items.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></div>').join('') || '<div class="muted">ยังไม่มีรายการ</div>') + '</section>';
    return { title: 'เวอร์ชันและรายการอัปเดต', body: b };
  };

  /* ---------- คู่มือการใช้ ---------- */
  const rich = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  const AUD = [['all', 'ทุกคน'], ['committee', 'คณะกรรมการเครือข่ายและแอดมิน'], ['teacher', 'แอดมินเท่านั้น']];
  const canSee = s => s.aud === 'teacher' ? T() : s.aud === 'committee' ? (T() || !!A.ME.role) : true;
  function secs() {
    const db = A.cfg().manual || {}, f = (C.manual || []).map((s, i) => Object.assign({ id: 'f' + i, file: true }, s)), d = Object.keys(db).map(id => Object.assign({ id }, db[id]));
    return f.concat(d).filter(s => s.title).sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.title).localeCompare(String(b.title)));
  }
  A.V.manual = function () {
    const l = secs().filter(canSee); let b = '';
    b += '<div class="row wrap" style="margin-bottom:14px"><button class="btn gold" data-act="manExport">' + ic('down', 18) + 'ส่งออกคู่มือ (PDF / ภาพ)</button>' + (T() ? '<button class="btn ghost" data-act="manNew">' + ic('plus', 18) + 'เพิ่มหัวข้อคู่มือ</button>' : '') + '</div>';
    b += '<section class="card"><div class="lb">คู่มือการใช้งาน (' + l.length + ' หัวข้อ)</div>' + (l.map(s => '<details class="yr"><summary>' + esc(s.title) + (s.aud && s.aud !== 'all' ? ' <span class="chip line">' + esc(AUD.find(x => x[0] === s.aud)[1]) + '</span>' : '') + '</summary><div style="white-space:pre-line;padding:4px 0 12px">' + rich(s.body || '') + '</div>' +
      (T() && !s.file ? '<div class="row wrap" style="margin-bottom:10px"><button class="btn ghost sm" data-act="manEdit" data-id="' + esc(s.id) + '">แก้ไข</button><button class="btn ghost sm danger" data-act="manDel" data-id="' + esc(s.id) + '">ลบ</button></div>' : s.file && T() ? '<div class="muted" style="margin-bottom:10px">หัวข้อนี้มากับระบบ (แก้ได้ที่ไฟล์ manual.js)</div>' : '') + '</details>').join('') || '<div class="empty">คู่มือกำลังจัดทำ' + (T() ? ' — กด “เพิ่มหัวข้อคู่มือ” เพื่อเริ่มใส่เนื้อหา' : '') + '</div>') + '</section>';
    return { title: 'คู่มือการใช้', body: b };
  };
  function manForm(id) {
    const s = id ? A.cfg().manual[id] : { aud: 'all', order: secs().length + 1 };
    const w = modal('<h3>' + (id ? 'แก้ไขหัวข้อคู่มือ' : 'เพิ่มหัวข้อคู่มือ') + '</h3><form class="form">' + fld('หัวข้อ', '<input class="in" id="m-t" value="' + esc(s.title || '') + '" required>') +
      '<div class="g3">' + fld('ใครเห็นได้', '<select class="in" id="m-a">' + opt(AUD, s.aud || 'all') + '</select>') + fld('ลำดับ (เลขน้อยขึ้นก่อน)', '<input class="in" id="m-o" inputmode="numeric" value="' + esc(s.order || '') + '">') + '</div>' +
      fld('เนื้อหา', '<textarea class="in" id="m-b" rows="10">' + esc(s.body || '') + '</textarea>', 'ขึ้นบรรทัดใหม่ได้ ลิงก์ที่ขึ้นต้นด้วย https:// จะกดได้อัตโนมัติ') + '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { sticky: true, wide: true });
    $('form', w).addEventListener('submit', e => { e.preventDefault(); const t = $('#m-t', w).value.trim(); if (!t) return;
      A.W(B.set('config/manual/' + (id || 'm' + B.uid()), { title: t, aud: $('#m-a', w).value, order: +$('#m-o', w).value || 0, body: $('#m-b', w).value.trim() || null })); w.remove(); toast('บันทึกแล้ว'); });
  }
  Object.assign(A.ACT, {
    manNew: () => { if (T()) manForm(null); }, manEdit: d => { if (T()) manForm(d.id); },
    manDel: async d => { if (!T()) return; const s = (A.cfg().manual || {})[d.id]; if (!s || !(await M.confirmBox('ลบหัวข้อคู่มือ', esc(s.title), 'ลบ', true))) return; A.W(B.remove('config/manual/' + d.id)); }
  });
})();
