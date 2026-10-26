/* ============================================================
   extras.js — รุ่น 3.5: แถบแจ้งรุ่นใหม่ · สำรองข้อมูล · พื้นที่ฐานข้อมูล · กล่องแจ้งเตือน
   ข้อมูล: inbox/{sid}/{id} และ tinbox/{อีเมลแอดมิน}/{id} = { t, b, u, c, at } (ตัวส่ง push-relay.gs เป็นผู้เขียน)
           backup/last = { at, bytes, file } (ตัวส่งเขียนหลังสำรองลง Google Drive ทุกคืน)
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP, C = M.C;
  const { $, esc, toast } = M; const { ic } = A;
  const T = () => !!(A.teacher && A.teacher()), signed = () => T() || !!A.sid();
  const mb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const bytes = v => { try { return new Blob([JSON.stringify(v === undefined ? null : v)]).size; } catch (e) { return 0; } };

  /* ---------- 1) แถบ “มีรุ่นใหม่” ---------- */
  let newVer = '';
  async function checkVer() {
    if (newVer || location.protocol === 'file:' || navigator.onLine === false) return;
    try { const r = await fetch('config.js?vchk=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return; const m = (await r.text()).match(/version:\s*"([^"]+)"/);
      if (m && m[1] !== C.version) { newVer = m[1]; showBar(); } } catch (e) { /* ออฟไลน์ */ }
  }
  function showBar() {
    if ($('#upd-bar')) return; const d = document.createElement('button'); d.id = 'upd-bar'; d.type = 'button';
    d.innerHTML = ic('down', 18) + '<span>มีรุ่นใหม่ ' + esc(newVer) + ' — แตะเพื่ออัปเดต</span>'; document.body.appendChild(d);
    d.addEventListener('click', async () => { d.disabled = true; d.lastChild.textContent = 'กำลังอัปเดต …';
      try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.filter(k => /^ss-/.test(k)).map(k => caches.delete(k))); }
        if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.update().catch(() => { }))); } } catch (e) { /* ignore */ }
      location.reload(); });
  }
  setTimeout(checkVer, 8000); setInterval(checkVer, 20 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVer(); });

  /* ---------- 2) กล่องแจ้งเตือน ---------- */
  const SEEN = 'ss_inbox_seen';
  const seenAt = () => { try { return +localStorage.getItem(SEEN) || 0; } catch (e) { return 0; } };
  const ibPath = () => T() ? '/tinbox/' + B.emailKey(A.ME.email) : (A.sid() ? '/inbox/' + A.sid() : null);
  const items = () => { const d = A.D.inbox || {}; return Object.keys(d).map(k => Object.assign({ id: k }, d[k])).filter(x => x && x.t && (!x.c || x.c === C.club.id)).sort((a, b) => (b.at || 0) - (a.at || 0)); };
  const unread = () => { const s = seenAt(); return items().filter(x => (x.at || 0) > s).length; };
  A.SUBS.push({ key: 'inbox', path: () => B.mode === 'demo' ? null : ibPath() });
  A.NAVS.push({ id: 'inbox', label: 'กล่องแจ้งเตือน', icon: 'bell', order: 11, badge: unread });
  A.V.inbox = function () {
    const l = items(), s = seenAt();
    let b = '<section class="card"><div class="row"><div class="grow"><div class="lb" style="margin:0">การแจ้งเตือนย้อนหลัง</div><div class="muted">เก็บ 60 รายการล่าสุด แม้เครื่องจะไม่เด้งก็ดูได้ที่นี่</div></div>' + (l.length ? '<button class="btn ghost sm" data-act="ibClear">ล้างทั้งหมด</button>' : '') + '</div></section>';
    b += '<section class="card">' + (l.map(x => '<a class="li ib' + ((x.at || 0) > s ? ' new' : '') + '" href="' + esc(/^#\//.test(x.u || '') ? x.u : '#/inbox') + '"><div class="row"><b class="grow">' + esc(x.t) + '</b><span class="muted">' + esc(M.thDate(x.at)) + ' ' + esc(new Date(x.at).toTimeString().slice(0, 5)) + '</span></div>' + (x.b ? '<div class="muted">' + esc(x.b) + '</div>' : '') + '</a>').join('') || '<div class="empty">ยังไม่มีการแจ้งเตือน' + (B.mode === 'demo' ? ' (โหมดสาธิตไม่ส่งแจ้งเตือน)' : '') + '</div>') + '</section>';
    setTimeout(() => { const top = (l[0] || {}).at || 0; if (top > s) { try { localStorage.setItem(SEEN, String(top)); } catch (e) { /* ignore */ } } }, 1500);
    return { title: 'กล่องแจ้งเตือน', body: b };
  };
  A.ACT.ibClear = async () => { const p = ibPath(); if (!p || !(await M.confirmBox('ล้างกล่องแจ้งเตือน', 'ลบรายการย้อนหลังทั้งหมดของบัญชีนี้', 'ล้าง', true))) return; A.W(B.remove(p)); };
  /* ตัดให้เหลือ 60 รายการ (ทำครั้งเดียวต่อการเปิดแอป) */
  let trimmed = false;
  setInterval(() => { if (trimmed || !signed() || B.mode === 'demo') return; const d = A.D.inbox || {}, ks = Object.keys(d); if (!ks.length) return; trimmed = true;
    if (ks.length > 60) { const upd = {}, p = ibPath(); ks.sort((a, b) => (d[b].at || 0) - (d[a].at || 0)).slice(60).forEach(k => { upd[p + '/' + k] = null; }); B.update('', upd).catch(() => { }); } }, 9000);

  /* ---------- 3) สำรองข้อมูล + พื้นที่ฐานข้อมูล (แอดมิน · หน้าจัดการ) ---------- */
  const ST = { last: undefined, usage: null, busy: '' };
  function loadLast() { if (ST.last !== undefined || B.mode === 'demo') return; ST.last = null; B.get('/backup/last').then(v => { ST.last = v || false; A.rerender(); }).catch(() => { ST.last = false; }); }
  A.MANAGE.push(() => {
    if (!T()) return ''; loadLast(); const l = ST.last, old = l && l.at && Date.now() - l.at > 3 * 86400000;
    let b = '<section class="card"><div class="lb">สำรองข้อมูล</div><div class="kv"><span>สำรองอัตโนมัติลง Google Drive ครั้งล่าสุด</span><b>' + (l && l.at ? esc(M.thDate(l.at)) + ' ' + new Date(l.at).toTimeString().slice(0, 5) + ' น. · ' + mb(l.bytes || 0) : (l === null ? 'กำลังตรวจ…' : 'ยังไม่เคยสำรอง')) + '</b></div>' +
      (l === false || old ? '<div class="note warn">' + (old ? 'ไม่มีการสำรองอัตโนมัติเกิน 3 วัน' : 'ยังไม่มีการสำรองอัตโนมัติ') + ' — ตรวจว่าได้วาง tools/push-relay.gs รุ่นล่าสุดใน Apps Script และเรียกใช้ฟังก์ชัน setup แล้ว</div>' : '') +
      '<div class="muted" style="margin:8px 0">ไฟล์สำรองอยู่ในโฟลเดอร์ “สำรองฐานข้อมูลศิษย์สำนัก” ใน Google Drive ของแอดมิน เก็บย้อนหลัง 30 วัน · ควรดาวน์โหลดเก็บเองก่อนขึ้นปีใหม่ทุกครั้ง</div>' +
      '<button class="btn" data-act="bkDown"' + (ST.busy ? ' disabled' : '') + '>' + ic('down', 18) + (ST.busy === 'bk' ? 'กำลังรวบรวมข้อมูล …' : 'ดาวน์โหลดไฟล์สำรองตอนนี้') + '</button></section>';
    b += '<section class="card"><div class="lb">พื้นที่ฐานข้อมูล (แผนฟรีจำกัด 1 GB)</div>';
    if (ST.usage) { const u = ST.usage, pct = Math.min(100, u.total / 1073741824 * 100);
      b += '<div class="kv"><span>ใช้อยู่ทั้งระบบโดยประมาณ</span><b>' + mb(u.total) + ' · ' + pct.toFixed(1) + '%</b></div><div class="lvbar"><i style="width:' + Math.max(1, pct) + '%"></i></div>' +
        u.rows.map(r => '<div class="kv"><span>' + esc(r[0]) + '</span><b>' + mb(r[1]) + '</b></div>').join('') +
        (u.old.length ? '<div class="lb" style="margin-top:12px">รูปหลักฐานการซ้อมของปีก่อน (ลบได้เพื่อคืนพื้นที่)</div>' + u.old.map(o => '<div class="kv"><span>ปี ' + esc(o.y) + ' · ' + mb(o.n) + '</span><button class="btn ghost sm danger" data-act="stDel" data-y="' + esc(o.y) + '">ลบรูปของปีนี้</button></div>').join('') : '') +
        '<div class="muted" style="margin-top:8px">คำนวณจากเครือข่าย' + esc(C.club.name) + 'และข้อมูลกลาง เมื่อ ' + new Date(u.at).toTimeString().slice(0, 5) + ' น.</div>';
    } else b += '<div class="muted" style="margin-bottom:10px">รูปศิษย์ รูปในคลังคำสอน และไฟล์ในคลังเอกสารใช้พื้นที่มากที่สุด กดคำนวณเพื่อดูว่าใช้ไปเท่าไร (ต้องดาวน์โหลดข้อมูลทั้งเครือข่าย ควรใช้ Wi-Fi)</div>';
    b += '<button class="btn ghost" data-act="stCalc"' + (ST.busy ? ' disabled' : '') + ' style="margin-top:8px">' + (ST.busy === 'st' ? 'กำลังคำนวณ …' : ST.usage ? 'คำนวณใหม่' : 'คำนวณการใช้พื้นที่') + '</button></section>';
    return b;
  });
  const busy = v => { ST.busy = v; A.rerender(); };
  Object.assign(A.ACT, {
    bkDown: async () => {
      if (!T() || ST.busy) return; if (A.STATUS.online === false) return toast('ต้องออนไลน์', 3000); busy('bk');
      try { const out = { app: 'sisamnak', version: C.version, at: new Date().toISOString(), c: {} };
        for (const cid of A.myClubs()) out.c[cid] = await B.get('/c/' + cid);
        for (const k of ['people', 'accounts', 'privateInfo', 'photos', 'teachers']) { try { out[k] = await B.get('/' + k); } catch (e) { out[k] = null; } }
        const d = new Date(), name = 'สำรองศิษย์สำนัก-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
        await M.saveBlob(new Blob([JSON.stringify(out)], { type: 'application/json' }), name); A.log('backup.download', '', name); toast('บันทึกไฟล์สำรองแล้ว เก็บไว้ในที่ปลอดภัย (มีข้อมูลส่วนตัวของศิษย์)', 6000); }
      catch (e) { console.error(e); toast('สำรองไม่สำเร็จ: ' + A.errTH(e), 6000); }
      busy('');
    },
    stCalc: async () => {
      if (!T() || ST.busy) return; if (A.STATUS.online === false) return toast('ต้องออนไลน์', 3000); busy('st');
      try { const cur = String(A.year()), club = (await B.get('/c/' + C.club.id)) || {}, rows = [], old = []; let total = 0, mph = 0, att = 0;
        Object.keys(club.members || {}).forEach(s => { mph += bytes((club.members[s] || {}).photo || ''); });
        
        const all = bytes(club); total += all; att = bytes(club.libfiles) + bytes(club.teachfiles); rows.push(['ไฟล์ในคลังเอกสารและภาพในคลังคำสอน', att], ['รูปประจำตัวในทะเบียนศิษย์', mph], ['ข้อมูลอื่นของ' + C.club.name, Math.max(0, all - att - mph)]);
        for (const k of [['people', 'ทะเบียนกลาง (รวมรูป)'], ['photos', 'รูปความละเอียดสูงสำหรับพิมพ์'], ['privateInfo', 'ข้อมูลติดต่อ']]) { let n = 0; try { n = bytes(await B.get('/' + k[0])); } catch (e) { n = 0; } total += n; rows.push([k[1], n]); }
        ST.usage = { total, rows, old: old.sort((a, b) => a.y.localeCompare(b.y)), at: Date.now() }; }
      catch (e) { console.error(e); toast('คำนวณไม่สำเร็จ: ' + A.errTH(e), 6000); }
      busy('');
    },
    stDel: async d => {
      if (!T() || !/^25[0-9]{2}$/.test(d.y) || d.y === String(A.year())) return;
      if (!(await M.confirmBox('ลบรูปหลักฐานการซ้อม ปี ' + d.y, 'ลบเฉพาะรูปถ่ายหลักฐานของปี ' + esc(d.y) + ' ผลการเช็กชื่อยังอยู่ครบ ลบแล้วกู้คืนไม่ได้ (ยกเว้นจากไฟล์สำรอง)', 'ลบรูป', true))) return;
      try { await B.direct('remove', 'y/' + d.y + '/attphoto'); A.log('storage.delPhotos', '', 'ปี ' + d.y); toast('ลบรูปของปี ' + d.y + ' แล้ว'); ST.usage = null; A.rerender(); } catch (e) { toast('ลบไม่สำเร็จ: ' + A.errTH(e), 5000); }
    }
  });
})();
