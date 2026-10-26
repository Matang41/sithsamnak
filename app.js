/* ============================================================
   app.js — แกนแอปศิษย์สำนัก (ยกจากระบบชมรมสรรพวาทิต รุ่น 3.5)
   ล็อกอิน Google ใดก็ได้ + คำขอเข้าร่วม · ทะเบียนสมาชิก (ปีที่เริ่มเรียน) · ตำแหน่งและสิทธิ์ · แอดมิน · แผนผัง · ส่งออก
   รูปแบบ: สร้าง HTML ทั้งหน้า → innerHTML (ข้ามเมื่อไม่เปลี่ยน) · ปุ่มใช้ data-act → ตาราง ACT
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, C = M.C;
  const { $, $$, esc, toast, modal, thNum } = M;
  let USER = null, ME = null, D = {}, LOADED = {}, OFFS = [], YOFFS = [], SIG = '', STATUS = {}, lastHTML = '', lastRoute = '';
  const SUBS = [], HOME = [], NAVS = [], TODO = [];
  let MYCLUBS = [];   /* ชมรมที่ผู้ใช้คนนี้เข้าได้ */
  const SHARED = ['prefix', 'first', 'last', 'nick', 'yearIn', 'photo'];   /* ช่องที่ใช้ร่วมกันทุกชมรม (ต้นฉบับอยู่ที่ people/{sid}) */   /* โมดูลอื่นลงทะเบียนเพิ่มผ่าน window.APP */
  const UI = { q: '', type: '', era: '' };
  const RULES_V = 4;   /* ★ เพิ่มเลขนี้พร้อมกับ rulesProbe ใน database.rules.json ทุกครั้งที่แก้ Rules */

  /* ---------- ไอคอน (เส้น) ---------- */
  const ICON = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    chart: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    cog: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M15 15h3"/>',
    vote: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    band: '<circle cx="12" cy="6" r="2.5"/><circle cx="5" cy="13" r="2.5"/><circle cx="19" cy="13" r="2.5"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
    cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    left: '<path d="M14 6l-6 6 6 6"/>', right: '<path d="M10 6l6 6-6 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    me: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    up: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    star: '<path d="M12 4l2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8z"/>',
    badge: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L7.5 21l4.5-2.5 4.5 2.5-1.5-7.5"/>',
    req: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
    tree: '<circle cx="12" cy="4.5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="4" cy="19.5" r="1.6"/><circle cx="9" cy="19.5" r="1.6"/><circle cx="18" cy="19.5" r="1.6"/><path d="M12 6.5v2.5M6 10V9h12v1M6 14v2.5M4 18v-1.5h5V18M18 14v4"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    quote: '<path d="M5 11h4v7H4v-5c0-3 1.5-5 4-6M15 11h4v7h-5v-5c0-3 1.5-5 4-6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>'
  };
  const ic = (n, s) => '<svg class="ic" width="' + (s || 22) + '" height="' + (s || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>';

  /* ---------- ตัวช่วยข้อมูล ---------- */
  const members = () => D.members || {};
  const cfg = () => D.config || {};
  const year = () => cfg().year || C.club.year;
  const instList = () => (Array.isArray(cfg().instruments) && cfg().instruments.length ? cfg().instruments : (C.club.instruments || []));
  const activeSids = () => Object.keys(members()).filter(s => members()[s] && members()[s].status === 'active');
  const fullName = m => (m.prefix || '') + (m.first || '') + ' ' + (m.last || '');
  /* ไม่มีระบบรุ่น: ศิษย์ระบุเพียง “ปีที่เริ่มเรียนกับอาจารย์” (พ.ศ.) → จัดกลุ่มเป็นช่วงทุก 10 ปีเพื่อค้นหาและแสดงผล */
  const eraOf = m => { const y = +((m && m.yearIn) || 0); return y >= 2400 && y < 2700 ? Math.floor(y / 10) * 10 : 0; };
  const eraName = e => +e ? 'ช่วงปี ' + e + '–' + (+e + 9) : 'ยังไม่ระบุปี';
  const eraList = () => Array.from(new Set(Object.values(members()).filter(m => m && m.first && m.status === 'active').map(eraOf).filter(Boolean))).sort((a, b) => a - b);
  const eraOpts = () => eraList().map(e => [e, eraName(e)]);
  const cls = m => m && m.yearIn ? 'เริ่มเรียน ' + m.yearIn : 'ยังไม่ระบุปีที่เริ่มเรียน';
  const nickTxt = m => m && m.nick ? ' (' + m.nick + ')' : '';
  const masterName = m => { const t = m && m.master && members()[m.master]; return t ? fullName(t) : C.master.short; };
  const typeName = id => { const t = C.memberTypes.find(x => x.id === id); return t ? t.name : '-'; };
  const roleOf = sid => (D.roles || {})[sid] || null;
  const roleName = r => { if (!r) return ''; const x = C.roles.find(y => y.id === r.role); return x ? x.name : ''; };
  /* หน้าที่เพิ่มเติม (ซ้อนกับตำแหน่งได้): duties/{sid}/notes = ผู้เก็บรวบรวมโน้ต (คลังโน้ตเพลง) */
  const isKeeper = sid => !!(((D.duties || {})[sid] || {}).notes);
  const keepers = () => activeSids().filter(isKeeper).sort((a, b) => ((D.duties[a] || {}).order || 99) - ((D.duties[b] || {}).order || 99) || byClass(a, b));
  const insts = m => Object.keys((m && m.inst) || {});
  const byClass = (a, b) => (+members()[a].yearIn || 9999) - (+members()[b].yearIn || 9999) || String(members()[a].first || '').localeCompare(String(members()[b].first || ''), 'th') || a.localeCompare(b);
  const ROLE_ORDER = ['president', 'vice', 'treasurer', 'host', 'secretary'];
  const avatar = (m, c) => m && m.photo ? '<img class="av ' + (c || '') + '" src="' + esc(m.photo) + '" alt="">' : '<span class="av ' + (c || '') + '" aria-hidden="true">' + esc(((m && (m.first || m.name)) || '?').replace(/^(ผู้ช่วยศาสตราจารย์|รองศาสตราจารย์|ศาสตราจารย์|ดร\.|อาจารย์|ครู|พ่อครู|แม่ครู|นาย|นางสาว|นาง)\s*/, '').replace(/^(ดร\.)\s*/, '').trim().charAt(0) || '?') + '</span>';
  const sesText = () => '';
  const advisors = () => Object.keys(cfg().advisors || {}).map(id => Object.assign({ id }, cfg().advisors[id])).sort((a, b) => (a.order || 99) - (b.order || 99));
  const myName = () => ME.teacher ? ((advisors().find(a => (a.email || '').toLowerCase() === ME.email) || {}).name || (ME.sid && members()[ME.sid] ? fullName(members()[ME.sid]) : '') || USER.name || 'แอดมิน') : fullName(members()[ME.sid] || {});
  const by = () => ({ id: ME.teacher ? 'teacher' : ME.sid, name: myName() });
  const errTH = e => { const c = String((e && (e.code || e.message)) || e || ''); return /PERMISSION_DENIED|permission_denied/i.test(c) ? 'ฐานข้อมูลไม่อนุญาต (สิทธิ์ไม่พอ หรือ Rules ในฐานข้อมูลยังไม่ใช่รุ่นล่าสุด)' : /network|disconnect|offline/i.test(c) ? 'เครือข่ายขัดข้อง' : c; };
  const W = p => Promise.resolve(p).catch(e => { console.warn('write failed', e); toast('บันทึกไม่สำเร็จ: ' + errTH(e) + ' — แตะป้ายมุมขวาบนเพื่อดูรายละเอียด', 6000); });
  /* ----- ทะเบียนกลาง ↔ สำเนาในชมรม: people/{sid} เป็นต้นฉบับของชื่อ ชั้น ห้อง รูป ----- */
  const sharedOf = m => { const o = {}; SHARED.forEach(f => { if (m[f] !== undefined && m[f] !== null && m[f] !== '') o[f] = m[f]; }); return o; };
  /* เขียนช่องที่ใช้ร่วมกันลงทะเบียนกลาง (+ สำเนาในชมรมอื่นที่คนนี้อยู่ ถ้าเป็นครู) */
  function sharedWrites(sid, fields, upd) {
    Object.keys(fields).forEach(f => { upd['/people/' + sid + '/' + f] = fields[f]; });
    if (ME.teacher) Object.keys(((D.people || {})[sid] || {}).clubs || {}).filter(c => c !== C._club && MYCLUBS.includes(c)).forEach(c => Object.keys(fields).forEach(f => { upd['/c/' + c + '/members/' + sid + '/' + f] = fields[f]; }));
    return upd;
  }
  let recT = 0;
  function reconcileSoon() { if (!ME || !ME.teacher) return; clearTimeout(recT); recT = setTimeout(reconcile, 1500); }
  function reconcile() {
    if (!ME || !ME.teacher || !LOADED.people || !LOADED.members) return; const P = D.people || {}, ms = members(), upd = {};
    Object.keys(ms).forEach(sid => { const m = ms[sid]; if (!m || !m.first) return; const p = P[sid];
      if (!p) { const o = sharedOf(m); Object.keys(o).forEach(f => { upd['/people/' + sid + '/' + f] = o[f]; }); if (m.status === 'active') upd['/people/' + sid + '/clubs/' + C._club] = true; return; }
      SHARED.forEach(f => { const pv = p[f], mv = m[f]; if ((pv === undefined || pv === null || pv === '') && mv !== undefined && mv !== null && mv !== '') upd['/people/' + sid + '/' + f] = mv; else if (pv !== undefined && pv !== null && pv !== '' && JSON.stringify(pv) !== JSON.stringify(mv)) upd['members/' + sid + '/' + f] = pv; });
      const flag = !!((p.clubs || {})[C._club]); if ((m.status === 'active') !== flag) upd['/people/' + sid + '/clubs/' + C._club] = m.status === 'active' ? true : null; });
    if (Object.keys(upd).length) W(B.update('', upd));
  }
  const log = (act, sid, detail) => W(B.set('history/' + B.uid(), { at: Date.now(), by: by(), act, sid: sid || '', detail: detail || '' }));

  /* ---------- สิทธิ์ (ฝั่งหน้าจอ — ของจริงบังคับที่ database.rules.json) ---------- */
  function refreshMe() {
    if (ME.teacher) return;
    const r = roleOf(ME.sid); ME.role = r ? r.role : ''; ME.roleGrade = r ? r.grade : 0;
  }
  /* สิทธิ์ตามหน้าที่: แอดมินสูงสุด (ทำได้ทุกอย่าง) แล้วลดหลั่นตามหน้าที่ของคณะกรรมการ
     ประธานกรรมการ › รองประธานกรรมการ › เหรัญญิก / กรรมการฝ่ายปฏิคม / เลขานุการ (ตามหน้าที่) · ผู้เก็บรวบรวมโน้ต (หน้าที่เพิ่มเติม) · สมาชิก
     ★ สิทธิ์จริงบังคับที่ database.rules.json (tools/build-rules.py) — ตารางนี้ใช้แสดงผลและซ่อนปุ่ม */
  const can = {
    edit: () => ME.teacher || ['president', 'vice', 'secretary'].includes(ME.role),
    manage: () => ME.teacher,
    exp: () => ME.teacher || ['president', 'vice', 'secretary', 'host'].includes(ME.role),
    priv: sid => ME.teacher || ['president', 'vice', 'secretary'].includes(ME.role) || ME.sid === sid
  };
  /* คอลัมน์: แอดมิน ประธาน รองประธาน เหรัญญิก ปฏิคม เลขานุการ ผู้เก็บรวบรวมโน้ต สมาชิก */
  const PERMS = [
    ['อนุมัติผู้สมัคร ผูกบัญชี ตั้งตำแหน่งและแอดมิน เปิด/ปิดรับสมัคร', 'A-------'],
    ['ให้สิทธิ์ดูโน้ตรายเพลง', 'A-------'],
    ['ยืนยันทางเพลง ตรวจคำสอน บันทึกสายครูและพิธี คลังเอกสาร', 'A-------'],
    ['อนุมัติ/ยกเลิกรายการเงิน ออกเกียรติบัตร เปิดโหวต', 'A-------'],
    ['ใส่/แก้โน้ตเพลง และเห็นโน้ตทุกเพลง', 'A-----K-'],
    ['เพิ่ม/แก้เพลงและทางเพลง', 'APV--SK-'],
    ['เพิ่ม/แก้ข้อมูลสมาชิก ดูข้อมูลส่วนตัว', 'APV--S--'],
    ['สร้างกิจกรรม นัดหมาย ดูแลผู้เข้าร่วม', 'APV-HS--'],
    ['ส่งออกบอร์ด/รายชื่อ', 'APV-HS--'],
    ['ดูบัญชีรายรับ-รายจ่าย', 'APVT-S--'],
    ['บันทึกรายรับ-รายจ่าย (รอแอดมินอนุมัติ)', 'A--T----'],
    ['ประกาศถึงสมาชิก', 'APVTHS--'],
    ['ดูโน้ตเพลง', 'A*****K*'],
    ['ดูทะเบียน ทำเนียบ คลังวิชา · บันทึกเพลงที่ต่อแล้ว · ส่งคำสอน · โหวต', 'AAAAAAAA']
  ];
  function permTable() {
    const H = ['แอดมิน', 'ประธาน', 'รองประธาน', 'เหรัญญิก', 'ปฏิคม', 'เลขานุการ', 'ผู้เก็บโน้ต', 'สมาชิก'];
    return '<div class="perm-wrap"><table class="perm"><thead><tr><th>สิทธิ์</th>' + H.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
      PERMS.map(p => '<tr><td>' + esc(p[0]) + '</td>' + p[1].split('').map(c => c === '-' ? '<td class="n">–</td>' : c === '*' || c === '·' ? '<td class="y" title="เฉพาะเพลงที่แอดมินอนุญาต">รายเพลง</td>' : '<td class="y">✓</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
      '<div class="muted" style="margin-top:8px">“รายเพลง” = เห็นโน้ตเฉพาะเพลงที่แอดมินอนุญาตให้เป็นรายบุคคล · สิทธิ์ทั้งหมดบังคับที่ฐานข้อมูล ไม่ใช่แค่ซ่อนปุ่ม</div>';
  }


  /* ============ เพลงที่เรียนกับอาจารย์ (เดี่ยว / วง) + บันทึกการเรียน ============
     members/{sid}/studied = { solo: { id: { song, inst, tang } }, band: { id: { song, tang } } } · studyNote = เรียนที่ไหน เมื่อไร
     studyBy / studyAt = ใครแก้ไขล่าสุด เมื่อไร (เจ้าตัว แอดมิน หรือกรรมการฝ่ายทะเบียน กดแก้เพิ่มเติมได้ตลอด) */
  const ST_KINDS = [['solo', 'เพลงเดี่ยว', 'เช่น ลาวแพน / แขกมอญ / พญาโศก'], ['band', 'เพลงวง', 'เช่น เขมรไทรโยค เถา / โหมโรงมหาฤกษ์']];
  const stRow = (k, x) => '<div class="st-row"><input class="in" name="st-song" list="st-songs" value="' + esc((x && x.song) || '') + '" placeholder="ชื่อเพลง" aria-label="ชื่อเพลง">' +
    (k === 'solo' ? '<input class="in" name="st-inst" value="' + esc((x && x.inst) || '') + '" placeholder="เครื่อง" aria-label="เครื่องดนตรี" list="st-insts">' : '') +
    '<input class="in" name="st-tang" value="' + esc((x && x.tang) || '') + '" placeholder="ทางของครู (ถ้ามี)" aria-label="ทางของครู"><button type="button" class="icb sm danger" data-st-del aria-label="ลบแถว">' + ic('x', 16) + '</button></div>';
  function studiedEditor(st) {
    st = st || {}; const songNames = Object.values(D.songs || {}).map(g => g && g.name).filter(Boolean);
    return '<datalist id="st-songs">' + songNames.map(n => '<option value="' + esc(n) + '">').join('') + '</datalist><datalist id="st-insts">' + (C.club.instruments || []).concat(instList()).filter((x, i, a) => a.indexOf(x) === i).map(n => '<option value="' + esc(n) + '">').join('') + '</datalist>' +
      ST_KINDS.map(([k, label, ph]) => { const l = Object.values(st[k] || {}); return '<div class="studied" data-k="' + k + '"><div class="st-h"><b>' + label + '</b><small>' + ph + '</small></div><div class="st-rows">' + (l.length ? l : [null]).map(x => stRow(k, x)).join('') + '</div><button type="button" class="btn ghost sm" data-st-add="' + k + '">' + ic('plus', 16) + 'เพิ่ม' + label + '</button></div>'; }).join('');
  }
  function wireStudied(root) {
    root.addEventListener('click', e => {
      const a = e.target.closest('[data-st-add]'); if (a) { const box = a.parentElement.querySelector('.st-rows'); box.insertAdjacentHTML('beforeend', stRow(a.dataset.stAdd)); box.lastChild.querySelector('input').focus(); return; }
      const d = e.target.closest('[data-st-del]'); if (d) { const box = d.closest('.st-rows'); d.parentElement.remove(); if (!box.children.length) box.insertAdjacentHTML('beforeend', stRow(box.parentElement.dataset.k)); }
    });
  }
  function readStudied(root) {
    const out = {}; let n = 0;
    $$('.studied', root).forEach(sec => { const k = sec.dataset.k, o = {}; $$('.st-row', sec).forEach((r, i) => { const g = (r.querySelector('[name=st-song]').value || '').trim().slice(0, 120); if (!g) return; const x = { song: g }; const ins = r.querySelector('[name=st-inst]'); if (ins && ins.value.trim()) x.inst = ins.value.trim().slice(0, 60); const t = r.querySelector('[name=st-tang]').value.trim(); if (t) x.tang = t.slice(0, 120); o['s' + (i + 1)] = x; n++; }); if (Object.keys(o).length) out[k] = o; });
    return n ? out : null;
  }
  function studiedHTML(st) {
    st = st || {}; const part = ([k, label]) => { const l = Object.values(st[k] || {}); return l.length ? '<div class="st-v"><div class="st-h"><b>' + label + ' (' + l.length + ')</b></div>' + l.map(x => '<div class="st-i"><span>' + esc(x.song) + '</span>' + (x.inst ? chip(x.inst, 'plum') : '') + (x.tang ? '<small>ทาง' + esc(x.tang.replace(/^ทาง\s*/, '')) + '</small>' : '') + '</div>').join('') + '</div>' : ''; };
    return ST_KINDS.map(part).join('');
  }

  /* ============ ล็อกอิน ============ */
  function brand(big) { return '<img class="logo ' + (big ? 'big' : '') + (C.club.round ? ' round' : '') + '" src="' + C.club.logo + '" alt="ตรา' + esc(C.club.name) + '">'; }
  /* ลิงก์สมัคร ?join=1 — หน้าแรกอธิบายขั้นตอนสมัครให้เข้าใจง่าย แล้วเข้าสู่ระบบด้วย Google ต่อด้วยแบบฟอร์มขอเข้าร่วม */
  const JOIN = (() => { try { if (new URLSearchParams(location.search).get('join') === '1') sessionStorage.setItem('ss_join', '1'); return sessionStorage.getItem('ss_join') === '1'; } catch (e) { return false; } })();
  const joinURL = () => location.origin + location.pathname.replace(/index\.html$/, '') + '?join=1';
  function renderLogin(msg) {
    lastHTML = '';
    if (JOIN) {
      $('#root').innerHTML = '<div class="login"><div class="login-card">' + brand(true) + '<h1>สมัครสมาชิก</h1><div class="login-sub">' + esc(C.club.long || C.club.full) + '</div>' +
        (M.inAppBrowser() ? '<div class="note warn">กำลังเปิดในแอป LINE ซึ่งเข้าสู่ระบบด้วย Google ไม่ได้ — แตะ ⋯ มุมขวาบน แล้วเลือก “เปิดในเบราว์เซอร์” (Safari / Chrome)</div>' : '') +
        (msg ? '<div class="note bad">' + msg + '</div>' : '') +
        '<ol class="steps"><li><b>แตะปุ่มทองด้านล่าง</b> แล้วเลือกบัญชี Gmail ของท่าน</li><li><b>กรอกชื่อ</b> และ <b>ปีที่เริ่มเรียนกับอาจารย์</b></li><li><b>รอแอดมินอนุมัติ</b> แล้วเปิดลิงก์นี้อีกครั้ง ใช้งานได้ทันที</li></ol>' +
        '<button class="btn gold block lg" data-act="signin">สมัครด้วยบัญชี Google</button>' +
        '<div class="muted" style="margin-top:12px">เป็นสมาชิกอยู่แล้ว? แตะปุ่มเดียวกันนี้เพื่อเข้าใช้งาน</div>' +
        (B.mode === 'demo' ? '<div class="note">โหมดสาธิต: ข้อมูลเป็นชื่อสมมติและเก็บในเบราว์เซอร์นี้เท่านั้น</div>' : '') + '</div></div>';
      return;
    }
    $('#root').innerHTML = '<div class="login"><div class="login-card">' + brand(true) +
      '<h1>' + esc(C.club.name) + '</h1><div class="login-sub">' + esc(C.club.long || C.club.full) + '</div>' +
      (M.inAppBrowser() ? '<div class="note warn">กำลังเปิดในแอป LINE/Facebook ซึ่งล็อกอินด้วย Google ไม่ได้ — กดเมนู ⋯ แล้วเลือก “เปิดใน Safari/Chrome”</div>' : '') +
      (msg ? '<div class="note bad">' + msg + '</div>' : '') +
      '<button class="btn gold block lg" data-act="signin">เข้าสู่ระบบด้วย Google</button>' +
      '<div class="muted" style="margin-top:12px">ใช้บัญชี Google ของตนเอง · ครั้งแรกจะมีแบบฟอร์มขอเข้าร่วม เมื่อแอดมินอนุมัติแล้วจึงใช้งานได้</div>' +
      (B.mode === 'demo' ? '<div class="note">โหมดสาธิต: ข้อมูลเป็นชื่อสมมติและเก็บในเบราว์เซอร์นี้เท่านั้น</div>' : '') +
      '<div class="login-foot">รุ่น ' + esc(C.version) + '</div></div></div>';
  }
  function renderDenied(kind, sid) {
    const t = kind === 'domain' ? 'บัญชี ' + esc(USER.email) + ' ยังไม่ได้ยืนยันอีเมลกับ Google — ยืนยันอีเมลก่อนแล้วเข้าสู่ระบบใหม่'
      : 'รหัสศิษย์ ' + esc(sid) + ' ไม่ได้อยู่ในสถานะใช้งาน — ติดต่อแอดมิน';
    lastHTML = '';
    $('#root').innerHTML = '<div class="login"><div class="login-card">' + brand(true) + '<h1>เข้าใช้งานไม่ได้</h1><div class="note bad">' + t + '</div><button class="btn ghost block" data-act="signout">ออกจากระบบ / เปลี่ยนบัญชี</button></div></div>';
  }

  /* ---------- คำขอเข้าร่วม: บัญชี Google ที่ยังไม่ได้ผูกกับรหัสศิษย์ ---------- */
  const reqPath = email => '/c/' + C.clubs[0].id + '/requests/' + B.emailKey(email);
  async function renderRequest(u, editing) {
    lastHTML = ''; let r = null, pub = null;
    $('#root').innerHTML = '<div class="empty" style="padding-top:30vh">' + brand(true) + '<br>กำลังตรวจสอบ…</div>';
    try { r = await B.get(reqPath(u.email)); } catch (e) { r = null; }
    try { pub = await B.get('/c/' + C.clubs[0].id + '/public/join'); } catch (e) { pub = null; }
    const head = '<div class="login"><div class="login-card wide">' + brand(true) + '<h1 style="font-size:1.4rem">' + esc(C.club.name) + '</h1>';
    const foot = '<button class="btn ghost block" data-act="signout" style="margin-top:10px">ออกจากระบบ / เปลี่ยนบัญชี</button></div></div>';
    if (r && !editing) {
      $('#root').innerHTML = head + (r.status === 'rejected'
        ? '<div class="note bad">คำขอเข้าร่วมของบัญชี ' + esc(u.email) + ' ยังไม่ได้รับอนุมัติ' + (r.reply ? '<br>แอดมินแจ้งว่า: ' + esc(r.reply) : '') + '</div><button class="btn block" data-act="reqEdit">แก้ไขและส่งคำขออีกครั้ง</button>'
        : '<div class="note">ส่งคำขอเข้าร่วมแล้ว เมื่อ ' + esc(M.thDate(r.at)) + '<br>รอแอดมินตรวจสอบและอนุมัติ เมื่ออนุมัติแล้วเปิดแอปนี้อีกครั้งจะเข้าใช้งานได้ทันที</div>' +
          '<div class="kv"><span>ชื่อ</span><b>' + esc((r.prefix || '') + (r.first || '') + ' ' + (r.last || '') + (r.nick ? ' (' + r.nick + ')' : '')) + '</b></div><div class="kv"><span>บัญชี</span><b>' + esc(u.email) + '</b></div>' +
          '<div class="row" style="margin-top:12px"><button class="btn ghost grow" data-act="reqEdit">แก้ไขคำขอ</button><button class="btn ghost grow" data-act="reqCheck">ตรวจสถานะอีกครั้ง</button></div>') + foot;
      return;
    }
    if (!r && pub && pub.open === false) { $('#root').innerHTML = head + '<div class="note warn">ขณะนี้ปิดรับสมัครสมาชิกชั่วคราว' + (pub.msg ? '<br>' + esc(pub.msg) : '') + ' — ติดต่อแอดมินหรือคณะกรรมการ</div>' + foot; return; }
    const v = r || { prefix: 'นาย', first: (u.name || '').split(' ')[0] || '', last: (u.name || '').split(' ').slice(1).join(' '), inst: {} };
    const instL = (C.club.instruments || []);
    $('#root').innerHTML = head + '<div class="login-sub">แบบฟอร์มขอเข้าร่วมเครือข่ายศิษย์</div><div class="muted" style="margin-bottom:12px">บัญชี ' + esc(u.email) + ' ยังไม่ได้ลงทะเบียน กรอกข้อมูลเพื่อให้แอดมินตรวจสอบว่าเป็นศิษย์ในสาย</div>' +
      '<form class="form" id="rq" novalidate style="text-align:left">' +
      '<div class="g3">' + fld('คำนำหน้า', '<select class="in" id="q-prefix">' + opt(C.prefixes.map(p => [p, p]), v.prefix) + '</select>') + fld('ชื่อ', '<input class="in" id="q-first" value="' + esc(v.first || '') + '" required>') + fld('นามสกุล', '<input class="in" id="q-last" value="' + esc(v.last || '') + '" required>') + '</div>' +
      '<div class="g3">' + fld('ชื่อเล่น', '<input class="in" id="q-nick" value="' + esc(v.nick || '') + '">') + fld('เรียนกับ' + esc(C.master.short) + 'ตั้งแต่ปี (พ.ศ.)', '<input class="in" id="q-year" inputmode="numeric" maxlength="4" value="' + esc(v.yearIn || '') + '" placeholder="เช่น 2552" required>')+ '</div>' +
      '<div class="fld"><span>ความถนัด / เครื่องดนตรี</span><div class="checks">' + instL.map(i => '<label class="ck"><input type="checkbox" name="qi" value="' + esc(i) + '"' + ((v.inst || {})[i] ? ' checked' : '') + '><span>' + esc(i) + '</span></label>').join('') + '</div></div>' +
      '<div class="g3">' + fld('จังหวัดที่อยู่ปัจจุบัน', '<select class="in" id="q-prov">' + opt([['', '— เลือก —']].concat((C.provinces || []).map(p => [p, p])), v.province || '') + '</select>') + fld('อาชีพ / ที่ทำงาน', '<input class="in" id="q-work" value="' + esc(v.work || '') + '">') + fld('เบอร์โทร', '<input class="in" id="q-phone" inputmode="tel" value="' + esc(v.phone || '') + '">') + '</div>' +
      '<div class="lb" style="margin-top:12px">เพลงที่เรียนกับ' + esc(C.master.short) + ' (ใส่เท่าที่จำได้ เพิ่มแก้ภายหลังได้)</div>' + studiedEditor(v.studied) +
      fld('เรียนกับ' + esc(C.master.short) + 'ที่ไหน เมื่อไร (เช่น ที่มหาวิทยาลัย ค่ายดนตรี บ้านอาจารย์)', '<textarea class="in" id="q-note" rows="3">' + esc(v.note || '') + '</textarea>', 'บันทึกนี้จะเก็บไว้ในข้อมูลสมาชิกของท่าน แก้ไขเพิ่มเติมได้ภายหลัง') +
      '<div class="note bad" id="q-err" hidden></div><div class="row" style="margin-top:14px">' + (r ? '<button type="button" class="btn ghost grow" data-act="reqCheck">ยกเลิกการแก้ไข</button>' : '') + '<button class="btn gold grow">ส่งคำขอเข้าร่วม</button></div></form>' + foot;
    wireStudied($('#rq'));
    $('#rq').addEventListener('submit', async e => {
      e.preventDefault(); const val = id => ($(id) ? $(id).value.trim() : ''); const err = t => { const el = $('#q-err'); el.textContent = t; el.hidden = false; };
      if (!val('#q-first') || !val('#q-last')) return err('กรอกชื่อและนามสกุล');
      if (!/^25[0-9]{2}$/.test(val('#q-year'))) return err('ระบุปีที่เริ่มเรียนกับอาจารย์เป็นปี พ.ศ. 4 หลัก เช่น 2552 (จำได้ประมาณก็ได้)');
      const inst = {}; $$('input[name=qi]:checked').forEach(c => inst[c.value] = true);
      const rec = { email: u.email, uid: u.uid, prefix: val('#q-prefix'), first: val('#q-first'), last: val('#q-last'), nick: val('#q-nick'), yearIn: val('#q-year'), inst, province: val('#q-prov'), work: val('#q-work'), phone: val('#q-phone'), note: val('#q-note').slice(0, 1000), studied: readStudied($('#rq')), at: Date.now() };
      Object.keys(rec).forEach(k => { if (rec[k] === '' || rec[k] === null || (k === 'inst' && !Object.keys(inst).length)) delete rec[k]; });
      try { await B.direct('set', reqPath(u.email), rec); } catch (er) { return err('ส่งคำขอไม่สำเร็จ: ' + errTH(er)); }
      if (window.PUSH && window.PUSH.raw) window.PUSH.raw(C.clubs[0].id, 'join-' + B.emailKey(u.email), { k: 'join', ref: B.emailKey(u.email), by: B.emailKey(u.email) });
      toast('ส่งคำขอแล้ว'); renderRequest(u);
    });
  }

  async function onAuth(u) {
    OFFS.forEach(f => f()); OFFS = []; YOFFS.forEach(f => f()); YOFFS = []; SIG = ''; D = {}; LOADED = {}; USER = u; ME = null;
    if (!u) return renderLogin(B.authError ? esc(B.authErrorText(B.authError)) : '');
    if (u.verified === false) return renderDenied('domain');
    const all = C.clubs.map(c => c.id); let teacher = B.isBootTeacher(u.email), clubs = teacher ? all : [];
    if (!teacher) { let t = null; try { t = await B.get('/teachers/' + B.emailKey(u.email)); } catch (e) { t = null; }
      if (t === true) { teacher = true; clubs = all; } else if (t && typeof t === 'object') { clubs = all.filter(id => t[id]); teacher = clubs.length > 0; } }
    const sid = await B.sidOf(u.email);
    if (!teacher) {
      if (!sid) return renderRequest(u);
      const rs = await Promise.all(all.map(id => B.get('/c/' + id + '/members/' + sid).catch(() => null)));
      clubs = all.filter((id, i) => rs[i] && rs[i].status === 'active');
      if (!clubs.length) return renderDenied('nomember', sid);
    }
    MYCLUBS = clubs; let saved = null; try { saved = localStorage.getItem('ss_club'); } catch (e) { /* ignore */ }
    const want = [new URLSearchParams(location.search).get('club'), window.CLUB_DEFAULT, saved].find(x => x && clubs.includes(x)) || (clubs.length === 1 ? clubs[0] : null);
    if (!want) return renderClubPick(u, teacher, sid);
    enterClub(want, u, teacher, sid);
  }
  function applyClub(cid) {
    C._club = cid; try { localStorage.setItem('ss_club', cid); } catch (e) { /* ignore */ }
    document.documentElement.dataset.club = cid; document.title = C.club.name + ' — ' + C.club.full;
    const mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.setAttribute('content', C.club.themeColor || '#FFFFFF');
  }
  function renderClubPick(u, teacher, sid) {
    lastHTML = '';
    $('#root').innerHTML = '<div class="login"><div class="login-card"><h1 style="font-size:1.5rem">เลือกสาขา</h1><div class="login-sub">' + esc(C.school) + '</div><div class="clubpick">' +
      C.clubs.filter(c => MYCLUBS.includes(c.id)).map(c => '<button class="clubbtn" data-club="' + c.id + '"><img class="' + (c.round ? 'round' : '') + '" src="' + c.logo + '" alt=""><b>' + esc(c.name) + '</b><span>' + esc(c.full) + '</span></button>').join('') + '</div><div class="muted" style="margin-top:14px">สลับสาขาภายหลังได้จากเมนู</div></div></div>';
    $('#root').querySelectorAll('[data-club]').forEach(b => b.addEventListener('click', () => enterClub(b.dataset.club, u, teacher, sid)));
  }
  function enterClub(cid, u, teacher, sid) {
    applyClub(cid); B.setScope(cid); try { sessionStorage.removeItem('ss_join'); } catch (e) { /* ignore */ }
    ME = teacher ? { teacher: true, email: u.email, sid: sid || '' } : { teacher: false, sid, email: u.email, role: '' };
    if (teacher) OFFS.push(B.on('/people', v => { D.people = v || {}; LOADED.people = true; reconcileSoon(); }, () => { D.people = {}; }));
    B.get('rulesProbe/v' + RULES_V).then(() => { D.rulesOld = false; }).catch(() => { D.rulesOld = true; lastHTML = ''; render(); });   /* ตรวจว่า Rules ในฐานข้อมูลเป็นรุ่นเดียวกับแอป */
    const paths = ['config', 'members', 'roles', 'duties'];
    paths.forEach(k => OFFS.push(B.on(k, v => { D[k] = v || {}; LOADED[k] = true; if (k === 'members') reconcileSoon(); render(); }, e => { LOADED[k] = true; D[k] = D[k] || {}; console.warn('read ' + k, e); render(); })));
    $('#root').innerHTML = '<div class="empty" style="padding-top:30vh">' + brand(true) + '<br>กำลังโหลดข้อมูล…</div>';
  }

  /* ============ โครงหน้า ============ */
  const route = () => { const h = (location.hash || '#/home').replace(/^#\/?/, '').split('/'); return { name: h[0] || 'home', arg: h[1] ? decodeURIComponent(h[1]) : '', arg2: h[2] ? decodeURIComponent(h[2]) : '' }; };
  NAVS.push({ id: 'home', label: 'หน้าหลัก', icon: 'home', tab: 1, order: 10 }, { id: 'members', label: 'ศิษย์', icon: 'users', tab: 1, order: 40, match: ['m'] },
    { id: 'requests', label: 'คำขอเข้าร่วม', icon: 'req', order: 42, show: () => can.manage(), badge: () => reqList().length },
    { id: 'chart', label: 'แผนผัง', icon: 'chart', order: 50 }, { id: 'manage', label: 'จัดการ', icon: 'cog', order: 90, show: () => can.manage() }, { id: 'me', label: 'ฉัน', icon: 'me', order: 95 },
    { id: 'more', label: 'เพิ่มเติม', icon: 'grid', tab: 1, tabOnly: 1, order: 99 });
  function navItems() { return NAVS.filter(n => !n.show || n.show()).sort((a, b) => a.order - b.order); }
  /* สมัครรับข้อมูลรายปี/ตามบทบาทของโมดูลต่าง ๆ — สมัครใหม่เมื่อปีการศึกษาหรือตำแหน่งของผู้ใช้เปลี่ยน */
  function resub() {
    YOFFS.forEach(f => f()); YOFFS = [];
    SUBS.forEach(sb => {
      const p = sb.path(year()); D[sb.key] = {}; if (!p) return;
      YOFFS.push(B.on(p, v => { D[sb.key] = sb.norm ? sb.norm(v || {}) : (v || {}); render(); }, e => { console.warn('read ' + p, e && e.code); }));
    });
  }
  function syncBadge() {
    if (STATUS.failed) return '<button class="sync bad" data-act="syncInfo">ส่งไม่สำเร็จ ' + STATUS.failed + ' · ดูรายละเอียด</button>';
    if (STATUS.pending) return '<button class="sync pend" data-act="syncInfo">กำลังส่ง ' + STATUS.pending + '</button>';
    if (STATUS.online === false) return '<span class="sync pend">ออฟไลน์</span>';
    return '<span class="sync ok">บันทึกแล้ว</span>';
  }
  function shell(r, title, body, back) {
    const nav = navItems(); const cur = (nav.find(n => n.id === r.name || (n.match || []).includes(r.name)) || {}).id || 'more';
    const side = nav.filter(n => !n.tabOnly), tabs = nav.filter(n => n.tab);
    return '<div class="app">' +
      '<aside class="side"><div class="side-brand">' + brand() + '<div><div class="side-name">' + esc(C.club.name) + '</div><div class="side-sub">' + (ME.teacher ? 'แอดมิน' : esc(roleName(roleOf(ME.sid)) || 'ศิษย์')) + '</div></div></div>' +
      (MYCLUBS.length > 1 ? '<button class="swclub" data-act="switchClub">' + ic('swap', 18) + 'สลับสาขา</button>' : '') +
      '<div class="side-nav">' + side.map(n => '<a class="side-link' + (cur === n.id ? ' on' : '') + '" href="#/' + n.id + '">' + ic(n.icon) + n.label + (n.badge && n.badge() ? '<span class="bdg">' + n.badge() + '</span>' : '') + '</a>').join('') + '</div>' +
      '<div class="grow"></div><div class="side-foot"><div>' + esc(C.master.name) + '<br>' + esc(C.master.title || '') + ' · ปี ' + esc(year()) + '</div></div></aside>' +
      '<div class="main"><header class="topbar">' + (back ? '<a class="tb-back" href="' + back + '" aria-label="กลับ">' + ic('back') + '</a>' : (MYCLUBS.length > 1 ? '<button class="tb-logo tb-sw" data-act="switchClub" aria-label="สลับสาขา">' + brand() + '</button>' : '<span class="tb-logo">' + brand() + '</span>')) +
      '<h1>' + esc(title) + '</h1>' + syncBadge() + '</header>' +
      (B.mode === 'demo' ? '<div class="demo-bar">โหมดสาธิต · ข้อมูลสมมติ เก็บในเบราว์เซอร์นี้เท่านั้น</div>' : '') +
      (D.rulesOld && ME.teacher ? '<div class="demo-bar bad">Rules ในฐานข้อมูลยังเป็นรุ่นเก่า บางเมนูจะบันทึกไม่ได้ — คัดลอกไฟล์ database.rules.json ไปวางที่ Firebase Console › Realtime Database › Rules แล้วกด Publish</div>' : '') +
      '<main class="page">' + body + '</main></div>' +
      '<nav class="tabbar" aria-label="เมนูหลัก">' + tabs.map(n => '<a class="' + ((n.id === 'more' ? !tabs.some(t => t.id === cur) || cur === 'more' : cur === n.id) ? 'on' : '') + '" href="#/' + n.id + '">' + ic(n.icon, 24) + '<span>' + n.label + '</span></a>').join('') + '</nav></div>';
  }
  function render() {
    if (!ME) return;
    if (!['config', 'members', 'roles', 'duties'].every(k => LOADED[k])) return;
    if (!ME.teacher && (!members()[ME.sid] || members()[ME.sid].status !== 'active')) { OFFS.forEach(f => f()); OFFS = []; return renderDenied('nomember', ME.sid); }
    refreshMe();
    const r = route(); const key = r.name + '/' + r.arg;
    const sig = year() + '|' + (ME.teacher ? 'T' : ME.sid + ':' + ME.role + ':' + ME.roleGrade);
    if (sig !== SIG) { SIG = sig; resub(); }
    if (!V[r.name] || ((r.name === 'manage' || r.name === 'requests') && !can.manage())) { location.hash = '#/home'; return; }
    const out = V[r.name](r.arg, r); if (!out) return;
    const html = shell(r, out.title, out.body, out.back);
    if (html === lastHTML) return;
    const keep = document.activeElement && document.activeElement.id === 'q';
    $('#root').innerHTML = html; lastHTML = html;
    if (keep) { const q = $('#q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
    if (key !== lastRoute) { lastRoute = key; window.scrollTo(0, 0); }
  }

  /* ============ ชิ้นส่วนที่ใช้ซ้ำ ============ */
  const chip = (t, c) => t ? '<span class="chip ' + (c || '') + '">' + esc(t) + '</span>' : '';
  const instChips = m => insts(m).length ? '<div class="row wrap" style="gap:6px">' + insts(m).map(i => chip(i, 'gold')).join('') + '</div>' : '';
  function memberRow(sid) {
    const m = members()[sid], r = roleOf(sid);
    return '<div class="mrow"><a class="mrow-main" href="#/m/' + esc(sid) + '">' + avatar(m) +
      '<span class="grow"><b>' + esc(fullName(m) + nickTxt(m)) + '</b><span class="muted">' + esc(cls(m) + ' · ' + typeName(m.type) + (insts(m).length ? ' · ' + insts(m).join(', ') : '')) + '</span></span></a>' +
      '<span class="mrow-tags">' + chip(roleName(r), 'plum') + (isKeeper(sid) ? chip('ผู้เก็บรวบรวมโน้ต', 'gold') : '') + '</span>' +
      (can.edit() ? '<span class="mrow-act"><button class="icb" data-act="editMember" data-sid="' + esc(sid) + '" aria-label="แก้ไขข้อมูล ' + esc(m.first) + '">' + ic('edit', 20) + '</button>' +
        (can.manage() ? '<button class="icb danger" data-act="removeMember" data-sid="' + esc(sid) + '" aria-label="นำ ' + esc(m.first) + ' ออก">' + ic('trash', 20) + '</button>' : '') + '</span>' : '') + '</div>';
  }
  /* โมดูลอื่นเพิ่มการ์ดในหน้าประวัติศิษย์ได้: A.MHOOKS.push((sid, m) => html) */
  const MHOOKS = [];

  /* ============ หน้าหลัก ============ */
  function viewHome() {
    const act = activeSids(); const ms = members();
    const nType = t => act.filter(s => ms[s].type === t).length;
    let b = '';
    if (ME.sid && ms[ME.sid]) {
      const m = ms[ME.sid], r = roleOf(ME.sid);
      b += '<section class="card hero"><div class="row">' + avatar(m, 'xl ring') + '<div class="grow"><div class="hero-name">' + esc(fullName(m) + nickTxt(m)) + '</div><div class="hero-sub">' + esc(cls(m) + ' · ' + typeName(m.type) + ' · รหัสศิษย์ ' + ME.sid) + '</div></div></div>' +
        '<div class="row wrap" style="margin-top:12px;gap:8px">' + chip(ME.teacher ? 'แอดมิน' : (roleName(r) || 'ศิษย์'), 'gold') + chip('ต่อวิชาจาก ' + masterName(m), 'dark') + '</div></section>';
      if (!ME.teacher) b += '<section class="card"><div class="lb">ความถนัดของฉัน</div>' + (insts(m).length ? instChips(m) : '<div class="muted">ยังไม่ได้ระบุความถนัด — แก้ได้ที่เมนู ฉัน › แก้ข้อมูลของฉัน</div>') + '</section>';
    } else {
      b += '<section class="card hero"><div class="row">' + brand() + '<div class="grow"><div class="hero-name">' + esc(C.club.name) + '</div><div class="hero-sub">' + esc(C.club.full) + ' · ปี ' + esc(year()) + '</div></div></div></section>';
    }
    b += '<div class="tiles">' +
      '<a class="tile" href="#/members"><div class="lb">ศิษย์ในเครือข่าย</div><div class="num">' + act.length + '</div><div class="muted">ใหม่ ' + nType('start') + ' · ศิษย์ ' + nType('regular') + ' · อาวุโส ' + nType('special') + '</div></a>' +
      '<a class="tile" href="#/chart"><div class="lb">คณะกรรมการ</div><div class="num">' + activeSids().filter(x => roleOf(x)).length + '</div><div class="muted">ท่าน</div></a>' +
      '<a class="tile" href="#/chart"><div class="lb">ผู้เก็บรวบรวมโน้ต</div><div class="num">' + keepers().length + '</div><div class="muted">ท่าน</div></a>' +
      (ME.teacher ? '<a class="tile dark" href="#/requests"><div class="lb">คำขอรออนุมัติ</div><div class="num">' + reqList().length + '</div><div class="muted">บัญชี</div></a>' : '<a class="tile dark" href="#/chart"><div class="lb">แอดมินและครู</div><div class="num">' + advisors().length + '</div><div class="muted">ท่าน</div></a>') + '</div>';
    HOME.slice().sort((x, y) => x.order - y.order).forEach(h => { try { b += h.html() || ''; } catch (e) { console.error(e); } });
    if (can.edit()) b += '<section class="card"><div class="lb">ทางลัด</div><div class="row wrap">' +
      '<button class="btn" data-act="addMember">' + ic('plus', 18) + 'เพิ่มศิษย์</button><button class="btn ghost" data-act="importMembers">' + ic('up', 18) + 'นำเข้ารายชื่อ</button><button class="btn ghost" data-act="exportMenu">' + ic('down', 18) + 'ส่งออกบอร์ด / รายชื่อ</button><button class="btn ghost" data-act="rosterExport">' + ic('down', 18) + 'รายงานรายชื่อศิษย์ (DOC/PDF)</button></div></section>';
    /* แถบ “ต้องดำเนินการ” สีทองเด่นบนสุด — โมดูลต่าง ๆ ลงทะเบียนผ่าน APP.TODO */
    const td = []; TODO.forEach(f => { try { const r = f(); (Array.isArray(r) ? r : [r]).forEach(x => { if (x && (x.n > 0 || x.badge)) td.push(x); }); } catch (e) { console.error(e); } });
    td.sort((x, y) => (y.hot ? 1 : 0) - (x.hot ? 1 : 0));
    const alertHTML = td.length ? '<section class="card alert" aria-label="สิ่งที่ต้องดำเนินการ"><div class="lb">' + ic('bell', 18) + 'ต้องดำเนินการ ' + td.length + ' เรื่อง</div>' + td.map(x => '<a class="todo' + (x.hot ? ' hot' : '') + '" href="' + x.href + '"><b>' + esc(x.badge || x.n) + '</b><span class="grow">' + esc(x.label) + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</span>' + ic('right', 20) + '</a>').join('') + '</section>' : '';
    return { title: 'หน้าหลัก', body: alertHTML + b };
  }
  /* ============ แผนผัง ============ */
  function person(m, sub, c) { return '<div class="pp ' + (c || '') + '">' + avatar(m, 'lg') + '<b>' + esc(m.first ? fullName(m) : m.name) + '</b><span>' + esc(sub) + '</span></div>'; }
  function viewChart() {
    const act = activeSids(); const ms = members();
    const withRole = id => act.filter(s => (roleOf(s) || {}).role === id).sort(byClass);
    const link = (s, sub) => '<a class="pp-link" href="#/m/' + esc(s) + '">' + person(ms[s], sub) + '</a>';
    let b = '';
    if (can.exp()) b += '<div class="row wrap" style="margin-bottom:14px"><button class="btn" data-act="exportMenu">' + ic('down', 18) + 'ส่งออกบอร์ด / แผนผัง / รายชื่อ</button></div>';
    const one = (id, label) => { const l = withRole(id); return '<div class="tier">' + (l.map(s => link(s, label || roleName({ role: id }))).join('') || '<div class="pp vacant"><span class="av lg">–</span><b>ว่าง</b><span>' + esc(roleName({ role: id })) + '</span></div>') + '</div>'; };
    b += '<section class="card tree"><div class="lb light">ครูผู้ถ่ายทอดและที่ปรึกษา</div><div class="tier">' + (advisors().filter(a => a.kind === 'expert' || (a.name || '') === C.master.name).map(a => person(a, a.position || 'ที่ปรึกษา', 'top')).join('') || person({ name: C.master.name }, C.master.title || 'ครูผู้ถ่ายทอด', 'top')) + '</div>' +
      '<div class="stem"></div><div class="lb light">คณะกรรมการ' + esc(C.club.name) + '</div>' + one('president') + '<div class="stem"></div>' + one('vice') + '<div class="stem"></div>' +
      '<div class="tier">' + ['treasurer', 'host', 'secretary'].map(id => { const l = withRole(id); return l.map(s => link(s, roleName({ role: id }))).join('') || '<div class="pp vacant"><span class="av lg">–</span><b>ว่าง</b><span>' + esc(roleName({ role: id })) + '</span></div>'; }).join('') + '</div>' +
      '<div class="lb light" style="margin-top:18px">ผู้เก็บรวบรวมโน้ต (คลังโน้ตเพลง)</div><div class="tier">' + (keepers().map(s => link(s, 'ผู้เก็บรวบรวมโน้ต')).join('') || '<span class="muted light">ยังไม่ได้กำหนด — แอดมินกำหนดได้ที่ “กำหนดตำแหน่ง” ในหน้าศิษย์</span>') + '</div></section>';
    b += '<section class="card"><div class="lb">ศิษย์ตามช่วงปีที่เริ่มเรียน</div>' + eraList().concat([0]).map(g => {
      const ps = act.filter(s => eraOf(ms[s]) === g).sort(byClass); if (!ps.length) return '';
      return '<div class="igroup"><div class="igroup-h"><b>' + esc(eraName(g)) + '</b><span class="muted">' + ps.length + ' คน</span></div><div class="row wrap" style="gap:6px">' + ps.map(s => '<a class="pill" href="#/m/' + esc(s) + '">' + esc(ms[s].nick || ms[s].first) + (ms[s].yearIn ? '<i>' + esc(ms[s].yearIn) + '</i>' : '') + '</a>').join('') + '</div></div>';
    }).join('') + '</section>';
    const used = instList().filter(i => act.some(s => (ms[s].inst || {})[i]));
    b += '<section class="card"><div class="lb">ศิษย์ตามความถนัด</div>' + (used.length ? used.map(i => {
      const ps = act.filter(s => (ms[s].inst || {})[i]).sort(byClass);
      return '<div class="igroup"><div class="igroup-h"><b>' + esc(i) + '</b><span class="muted">' + ps.length + ' คน</span></div><div class="row wrap" style="gap:6px">' + ps.map(s => '<a class="pill" href="#/m/' + esc(s) + '">' + esc(ms[s].nick || ms[s].first) + (ms[s].yearIn ? '<i>' + esc(ms[s].yearIn) + '</i>' : '') + '</a>').join('') + '</div></div>';
    }).join('') : '<div class="muted">ยังไม่มีข้อมูลความถนัด</div>') + '</section>';
    b += '<section class="card"><details><summary class="lb" style="cursor:pointer">ลำดับสิทธิ์ตามตำแหน่ง</summary>' + permTable() + '</details></section>';
    return { title: 'แผนผังเครือข่าย', body: b };
  }

  /* ============ ทะเบียนศิษย์ ============ */
  function filtered() {
    const ms = members(); const q = UI.q.trim().toLowerCase();
    return activeSids().filter(s => {
      const m = ms[s];
      if (UI.type && m.type !== UI.type) return false;
      if (UI.era !== '' && eraOf(m) !== +UI.era) return false;
      if (q && !(fullName(m) + ' ' + (m.nick || '') + ' ' + s + ' ' + insts(m).join(' ') + ' ' + roleName(roleOf(s)) + ' ' + cls(m) + ' ' + (m.yearIn || '')).toLowerCase().includes(q)) return false;
      return true;
    }).sort(byClass);
  }
  function listHTML() { const l = filtered(); return (l.map(memberRow).join('') || '<div class="empty">ไม่พบศิษย์ตามเงื่อนไข</div>') + '<div class="muted" style="padding:10px 0 2px">แสดง ' + l.length + ' จาก ' + activeSids().length + ' คน</div>'; }
  function viewMembers() {
    const sel = (k, opts) => '<select class="in sm" data-filter="' + k + '" aria-label="' + esc(opts[0][1]) + '">' + opts.map(o => '<option value="' + o[0] + '"' + (String(UI[k]) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    let b = '';
    if (can.edit()) b += '<div class="row wrap" style="margin-bottom:14px"><button class="btn" data-act="addMember">' + ic('plus', 18) + 'เพิ่มศิษย์</button><button class="btn ghost" data-act="importMembers">' + ic('up', 18) + 'นำเข้ารายชื่อ</button>' + (can.manage() ? '<a class="btn ghost" href="#/requests">' + ic('req', 18) + 'คำขอเข้าร่วม' + (reqList().length ? ' (' + reqList().length + ')' : '') + '</a>' : '') + (can.exp() ? '<button class="btn ghost" data-act="exportMenu">' + ic('down', 18) + 'ส่งออกบอร์ด</button><button class="btn ghost" data-act="rosterExport">' + ic('down', 18) + 'ส่งออกรายชื่อ (DOC/PDF)</button>' : '') + '</div>';
    b += '<section class="card"><div class="filters"><input id="q" class="in" type="search" placeholder="ค้นหาชื่อ ชื่อเล่น รหัส ความถนัด ปีที่เริ่มเรียน" value="' + esc(UI.q) + '" aria-label="ค้นหาศิษย์">' +
      sel('type', [['', 'ทุกประเภท']].concat(C.memberTypes.map(t => [t.id, t.name]))) +
      sel('era', [['', 'ทุกช่วงปี']].concat(eraOpts(), [[0, 'ยังไม่ระบุปี']])) + '</div>' +
      '<div id="mlist">' + listHTML() + '</div></section>';
    return { title: 'ทะเบียนศิษย์', body: b };
  }
  function viewMember(sid) {
    const m = members()[sid]; if (!m) { location.hash = '#/members'; return null; }
    const r = roleOf(sid); const gone = m.status !== 'active';
    const kv = (k, v) => '<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>';
    let b = '<section class="card hero"><div class="row">' + avatar(m, 'xl ring') + '<div class="grow"><div class="hero-name">' + esc(fullName(m) + nickTxt(m)) + '</div><div class="hero-sub">' + esc(cls(m) + ' · ' + typeName(m.type) + ' · รหัสศิษย์ ' + sid) + '</div></div></div>' +
      '<div class="row wrap" style="margin-top:12px;gap:8px">' + chip(gone ? (m.status === 'alumni' ? 'ล่วงลับ' : 'ออกจากเครือข่าย') : (roleName(r) || 'ศิษย์'), 'gold') + (isKeeper(sid) ? chip('ผู้เก็บรวบรวมโน้ต', 'dark') : '') + '</div></section>';
    if ((can.edit() || ME.sid === sid) && !gone) b += '<div class="row wrap" style="margin-bottom:14px">' + (can.edit() ? '<button class="btn" data-act="editMember" data-sid="' + esc(sid) + '">' + ic('edit', 18) + 'แก้ไขข้อมูล</button>' : '<button class="btn" data-act="editSelf">' + ic('edit', 18) + 'แก้ข้อมูลของฉัน</button>') +
      (can.manage() ? '<button class="btn ghost" data-act="role" data-sid="' + esc(sid) + '">' + ic('badge', 18) + 'กำหนดตำแหน่ง</button><button class="btn ghost danger" data-act="removeMember" data-sid="' + esc(sid) + '">' + ic('trash', 18) + 'นำออก</button>' : '') + '</div>';
    const t = m.master && members()[m.master];
    const kids = Object.keys(members()).filter(s => members()[s] && members()[s].master === sid && members()[s].first).sort(byClass);
    const canStudy = can.edit() || ME.sid === sid;
    b += '<section class="card"><div class="row"><div class="lb grow" style="margin:0 0 8px">การเรียนกับ' + esc(C.master.short) + '</div>' + (canStudy && !gone ? '<button class="btn sm ghost" data-act="editStudy" data-sid="' + esc(sid) + '">' + ic('edit', 16) + 'แก้ไข / เพิ่มเติม</button>' : '') + '</div>' +
      (m.studyNote ? '<div class="tb">' + esc(m.studyNote) + '</div>' : '') + studiedHTML(m.studied) +
      (!m.studyNote && !m.studied ? '<div class="muted">ยังไม่ได้บันทึกว่าเรียนเพลงอะไร ที่ไหน' + (canStudy ? ' — แตะ “แก้ไข / เพิ่มเติม”' : '') + '</div>' : '') +
      (m.studyAt ? '<div class="muted" style="margin-top:8px">แก้ไขล่าสุดโดย ' + esc((m.studyBy || {}).name || '-') + ' · ' + esc(M.thDate(m.studyAt)) + ' ' + new Date(m.studyAt).toTimeString().slice(0, 5) + ' น.</div>' : '') + '</section>';
    b += '<section class="card"><div class="lb">ประวัติการเรียน</div>' + kv('เรียนกับอาจารย์ตั้งแต่ปี', esc(m.yearIn || 'ยังไม่ระบุ')) +
      kv('ครูผู้ถ่ายทอดโดยตรง', t ? '<a href="#/m/' + esc(m.master) + '">' + esc(fullName(t)) + '</a>' : esc(C.master.short)) +
      (kids.length ? '<div class="lb" style="margin-top:12px">ศิษย์ที่ต่อวิชาจากท่าน (' + kids.length + ')</div><div class="row wrap" style="gap:6px">' + kids.map(s => '<a class="pill" href="#/m/' + esc(s) + '">' + esc(members()[s].nick || members()[s].first) + '<i>' + esc(cls(members()[s])) + '</i></a>').join('') + '</div>' : '') + '</section>';
    b += '<section class="card"><div class="lb">ความถนัด</div>' + (insts(m).length ? instChips(m) : '<div class="muted">ยังไม่ได้ระบุ' + (can.edit() ? ' — กด “แก้ไขข้อมูล” เพื่อเลือก' : '') + '</div>') + '</section>';
    MHOOKS.forEach(f => { try { b += f(sid, m) || ''; } catch (e) { console.error(e); } });
    if (can.priv(sid)) b += '<section class="card"><div class="lb">ข้อมูลส่วนตัว (เห็นเฉพาะเจ้าตัว แอดมิน และเลขานุการ)</div><div id="priv" data-sid="' + esc(sid) + '">' + privHTML(sid) + '</div></section>';
    return { title: m.nick || m.first || 'ศิษย์', body: b, back: '#/members' };
  }
  const PRIV = {};
  function privHTML(sid) {
    const p = PRIV[sid];
    if (p === undefined) { PRIV[sid] = null; B.get('privateInfo/' + sid).then(v => { PRIV[sid] = v || {}; }).catch(() => { PRIV[sid] = { _err: 1 }; }).then(() => { lastHTML = ''; render(); }); return '<span class="muted">กำลังโหลด…</span>'; }
    if (p === null) return '<span class="muted">กำลังโหลด…</span>';
    if (p._err) return '<span class="muted">ไม่มีสิทธิ์อ่านข้อมูลนี้</span>';
    const line = (k, v) => '<div class="kv"><span>' + k + '</span><b>' + (v ? esc(v) : '<span class="muted">ยังไม่ระบุ</span>') + '</b></div>';
    return line('เบอร์โทร', p.phone) + line('LINE', p.line) + line('อีเมลติดต่อ', p.email) + line('ที่อยู่', p.address) + line('ผู้ติดต่อกรณีฉุกเฉิน', p.emergency) + (ME.teacher ? line('บัญชี Google ที่ใช้ล็อกอิน', p.loginEmail) : '');
  }

  /* ============ คำขอเข้าร่วม (แอดมิน) ============ */
  const reqList = () => { const r = D.requests || {}; return Object.keys(r).filter(k => r[k] && r[k].first && r[k].status !== 'rejected').map(k => Object.assign({ key: k }, r[k])).sort((a, b) => a.at - b.at); };
  SUBS.push({ key: 'requests', path: () => (ME && ME.teacher) ? 'requests' : '' }, { key: 'pubjoin', path: () => (ME && ME.teacher) ? 'public/join' : '' });
  TODO.push(() => ME && ME.teacher && reqList().length ? { n: reqList().length, label: 'คำขอเข้าร่วมเครือข่ายรออนุมัติ', sub: reqList()[0].first + ' ' + (reqList()[0].last || ''), href: '#/requests', hot: true } : null);
  function viewRequests() {
    const l = reqList(), rej = Object.keys(D.requests || {}).filter(k => (D.requests[k] || {}).status === 'rejected');
    const kv = (k, v) => v ? '<div class="kv"><span>' + k + '</span><b>' + esc(v) + '</b></div>' : '';
    let b = '<section class="card"><div class="muted">ผู้ที่ล็อกอินด้วยบัญชี Google แล้วยังไม่มีรหัสศิษย์ จะส่งคำขอมาที่นี่ ตรวจสอบว่าเป็นศิษย์ในสายจริง แล้วกด “อนุมัติ” ระบบออกรหัสศิษย์และผูกบัญชีให้ทันที</div></section>';
    b += l.map(r => '<section class="card"><div class="row"><span class="av lg">' + esc((r.first || '?').charAt(0)) + '</span><div class="grow"><b>' + esc((r.prefix || '') + r.first + ' ' + (r.last || '') + (r.nick ? ' (' + r.nick + ')' : '')) + '</b><div class="muted">' + esc(r.email || r.key.replace(/,/g, '.')) + ' · ส่งเมื่อ ' + esc(M.thDate(r.at)) + '</div></div></div>' +
      '<div style="margin-top:10px">' + kv('เรียนกับอาจารย์ตั้งแต่ปี', r.yearIn) + (r.studied ? studiedHTML(r.studied) : '') + kv('ความถนัด', Object.keys(r.inst || {}).join(', ')) + kv('จังหวัด', r.province) + kv('อาชีพ / ที่ทำงาน', r.work) + kv('เบอร์โทร', r.phone) + (r.note ? '<div class="note" style="white-space:pre-line">' + esc(r.note) + '</div>' : '') + '</div>' +
      '<div class="row wrap" style="margin-top:10px"><button class="btn" data-act="reqApprove" data-k="' + esc(r.key) + '">อนุมัติและออกรหัสศิษย์</button><button class="btn ghost" data-act="reqLink" data-k="' + esc(r.key) + '">ผูกกับศิษย์ที่มีชื่อแล้ว</button><button class="btn ghost danger" data-act="reqReject" data-k="' + esc(r.key) + '">ไม่อนุมัติ</button></div></section>').join('') ||
      '<section class="card"><div class="empty">ไม่มีคำขอที่รออนุมัติ</div></section>';
    if (rej.length) b += '<section class="card"><div class="lb">ไม่อนุมัติแล้ว (' + rej.length + ')</div>' + rej.map(k => '<div class="kv"><span>' + esc((D.requests[k].first || '') + ' ' + (D.requests[k].last || '')) + '</span><b class="muted">' + esc(k.replace(/,/g, '.')) + '</b><button class="btn sm ghost" data-act="reqDel" data-k="' + esc(k) + '">ลบ</button></div>').join('') + '</section>';
    return { title: 'คำขอเข้าร่วม', body: b };
  }
  /* รหัสศิษย์ถัดไป: นับต่อจากรหัสสูงสุดในทะเบียน (ตัวนับเก็บที่ config/lastSid ด้วย transaction กันชนกัน) */
  async function nextSid() {
    const mx = Math.max(+(C.auth.sidStart || 10001) - 1, ...Object.keys(members()).map(Number).filter(n => !isNaN(n)));
    try { const v = await B.tx('config/lastSid', cur => Math.max(+cur || 0, mx) + 1); return String(v); } catch (e) { return String(mx + 1); }
  }
  function approveForm(key) {
    const r = (D.requests || {})[key]; if (!r) return;
    const w = modal('<h3>อนุมัติคำขอเข้าร่วม</h3><div class="muted" style="margin-bottom:10px">' + esc((r.prefix || '') + r.first + ' ' + (r.last || '')) + ' · ' + esc(r.email || key.replace(/,/g, '.')) + '</div><form class="form">' +
      '<div class="g3">' + fld('ประเภท', '<select class="in" id="ap-type">' + opt(C.memberTypes.map(t => [t.id, t.name]), 'regular') + '</select>') + fld('ครูผู้ถ่ายทอดโดยตรง', '<select class="in" id="ap-master">' + opt(masterOpts(''), '') + '</select>') + '</div>' +
      '<div class="muted">ระบบออกรหัสศิษย์ให้อัตโนมัติ ผูกกับบัญชี Google นี้ และคัดลอกข้อมูลติดต่อเป็นข้อมูลส่วนตัว (เจ้าตัวเลือกเปิดเผยในทำเนียบได้ภายหลัง)</div>' +
      '<div class="row" style="margin-top:16px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">อนุมัติ</button></div></form>', { center: true, sticky: true, wide: true });
    $('form', w).addEventListener('submit', async e => {
      e.preventDefault(); const btn = $('button.grow:last-child', w); btn.disabled = true;
      const sid = await nextSid(), now = Date.now();
      const rec = { prefix: r.prefix || '', first: r.first, last: r.last || '', nick: r.nick || '', yearIn: r.yearIn || '', type: $('#ap-type', w).value, inst: r.inst || {}, master: $('#ap-master', w).value, studyNote: r.note || '', studied: r.studied || null, studyAt: r.note || r.studied ? (r.at || now) : null, studyBy: r.note || r.studied ? { id: 'self', name: (r.prefix || '') + r.first + ' ' + (r.last || '') + ' (ตอนสมัคร)' } : null };
      Object.keys(rec).forEach(k => { if (rec[k] === '' || rec[k] === null || (k === 'inst' && !Object.keys(rec.inst).length)) delete rec[k]; });
      const upd = { ['members/' + sid]: Object.assign({ status: 'active', createdAt: now, createdBy: by() }, rec), ['/people/' + sid + '/clubs/' + C._club]: true, ['/accounts/' + key]: sid, ['requests/' + key]: null };
      sharedWrites(sid, sharedOf(rec), upd);
      if (r.province || r.work) upd['contacts/' + sid] = Object.assign({ at: now }, r.province ? { province: r.province } : {}, r.work ? { work: r.work } : {});
      upd['/privateInfo/' + sid] = Object.assign({ loginEmail: r.email || key.replace(/,/g, '.') }, r.phone ? { phone: r.phone } : {});
      W(B.update('', upd)); log('request.approve', sid, rec.first + ' ' + rec.last); w.remove(); toast('อนุมัติแล้ว · รหัสศิษย์ ' + sid);
    });
  }
  function linkForm(key) {
    const r = (D.requests || {})[key]; if (!r) return;
    const cand = activeSids().sort((a, b) => { const sc = s => (members()[s].first === r.first ? 2 : 0) + (members()[s].last === r.last ? 1 : 0); return sc(b) - sc(a) || byClass(a, b); });
    const w = modal('<h3>ผูกบัญชีกับศิษย์ที่มีชื่อแล้ว</h3><div class="muted" style="margin-bottom:10px">ใช้เมื่อแอดมินเพิ่มชื่อศิษย์ไว้ก่อน แล้วศิษย์เพิ่งล็อกอินครั้งแรก · ' + esc(r.email || key.replace(/,/g, '.')) + '</div><form class="form">' +
      fld('เลือกศิษย์', '<select class="in" id="lk-sid">' + opt(cand.map(s => [s, fullName(members()[s]) + nickTxt(members()[s]) + ' · ' + cls(members()[s]) + ' · ' + s])) + '</select>') +
      '<div class="row" style="margin-top:16px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">ผูกบัญชี</button></div></form>', { center: true, sticky: true, wide: true });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const sid = $('#lk-sid', w).value; if (!sid) return;
      W(B.update('', { ['/accounts/' + key]: sid, ['requests/' + key]: null, ['/privateInfo/' + sid + '/loginEmail']: r.email || key.replace(/,/g, '.') })); log('request.link', sid, key); w.remove(); toast('ผูกบัญชีแล้ว');
    });
  }

  /* ============ ฉัน ============ */
  function viewMe() {
    const mine = ME.sid && members()[ME.sid];
    let b = '<section class="card"><div class="lb">บัญชีที่ใช้อยู่</div><div class="row">' + (mine ? avatar(mine, 'lg') : '<span class="av lg">ผ</span>') + '<div class="grow"><b>' + esc(myName()) + '</b><div class="muted">' + esc(USER.email) + (ME.sid ? ' · รหัสศิษย์ ' + esc(ME.sid) : '') + '</div></div></div>' +
      '<div class="row wrap" style="margin-top:14px">' + (mine ? '<a class="btn" href="#/m/' + esc(ME.sid) + '">ดูประวัติของฉัน</a><button class="btn ghost" data-act="editSelf">' + ic('edit', 18) + 'แก้ข้อมูลของฉัน</button>' : '') + '<button class="btn ghost" data-act="signout">ออกจากระบบ</button></div></section>';
    if (ME.teacher && !ME.sid) b += '<section class="card"><div class="lb">แอดมินที่เป็นศิษย์ด้วย</div><div class="muted">ถ้าท่านเป็นศิษย์ในเครือข่าย ให้เพิ่มชื่อตนเองในทะเบียน แล้วใส่อีเมลนี้ในช่อง “บัญชี Google ที่ใช้ล็อกอิน” ระบบจะแสดงข้อมูลศิษย์ของท่านในหน้านี้</div></section>';
    b += '<section class="card"><div class="lb">ติดตั้งเป็นแอปบนหน้าจอโฮม</div><div class="muted">iPhone / iPad: เปิดด้วย Safari › ปุ่มแชร์ › “เพิ่มไปยังหน้าจอโฮม”<br>Android: เปิดด้วย Chrome › เมนู ⋮ › “ติดตั้งแอป” หรือ “เพิ่มลงในหน้าจอหลัก”</div></section>';
    const d = B.diagnostics();
    b += '<section class="card"><div class="lb">สถานะระบบ</div><div class="muted">รุ่น ' + esc(C.version) + ' · ' + (d.mode === 'demo' ? 'โหมดสาธิต' : 'เชื่อมต่อ Firebase') + ' · ' + (d.online ? 'ออนไลน์' : 'ออฟไลน์') + ' · รอส่ง ' + d.pending + ' · ล้มเหลว ' + d.failed + (d.standalone ? ' · เปิดจากหน้าจอโฮม' : '') + '</div></section>';
    return { title: 'ฉัน', body: b };
  }

  /* ============ จัดการ (แอดมิน) ============ */
  function viewManage() {
    const ms = members(); const gone = Object.keys(ms).filter(s => ms[s] && ms[s].status !== 'active').sort();
    let b = '<section class="card"><div class="row" style="margin-bottom:6px"><div class="lb grow" style="margin:0">แอดมินและครูผู้ถ่ายทอด</div><button class="btn sm" data-act="addAdvisor">' + ic('plus', 16) + 'เพิ่ม</button></div>' +
      (advisors().map(a => '<div class="mrow">' + '<span class="mrow-main">' + avatar(a) + '<span class="grow"><b>' + esc(a.name) + '</b><span class="muted">' + esc((a.position || '') + (a.kind === 'teacher' ? ' · ' + (a.email || 'ยังไม่ระบุอีเมล') + ' · ล็อกอินได้ สิทธิ์แอดมิน' : ' · มีชื่อในแผนผังและเอกสาร ไม่มีบัญชีเข้าใช้')) + '</span></span></span>' +
        '<span class="mrow-tags">' + chip(a.kind === 'teacher' ? 'แอดมิน' : 'ที่ปรึกษา', a.kind === 'teacher' ? 'gold' : 'plum') + '</span><span class="mrow-act"><button class="icb" data-act="editAdvisor" data-id="' + esc(a.id) + '" aria-label="แก้ไข">' + ic('edit', 20) + '</button><button class="icb danger" data-act="removeAdvisor" data-id="' + esc(a.id) + '" aria-label="นำออก">' + ic('trash', 20) + '</button></span></div>').join('') || '<div class="muted">ยังไม่มีรายชื่อ</div>') + '</section>';
    const pj = D.pubjoin || {}, open = pj.open !== false;
    b += '<section class="card"><div class="row" style="margin-bottom:6px"><div class="lb grow" style="margin:0">ลิงก์สมัครสมาชิก</div>' + chip(open ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร', open ? 'ok' : 'bad') + '</div>' +
      '<div class="muted" style="margin-bottom:8px">ส่งลิงก์นี้ในกลุ่ม LINE ผู้สมัครเข้าสู่ระบบด้วย Gmail กรอกชื่อและปีที่เริ่มเรียน แล้วคำขอจะมาที่เมนู “คำขอเข้าร่วม”</div>' +
      '<input class="in" readonly value="' + esc(joinURL()) + '" aria-label="ลิงก์สมัคร" onclick="this.select()">' +
      '<div class="row wrap" style="margin-top:10px"><button class="btn" data-act="joinCopy">คัดลอกลิงก์</button><a class="btn ghost" target="_blank" rel="noopener" href="https://line.me/R/share?text=' + encodeURIComponent('สมัครสมาชิก' + C.club.name + ' (' + C.club.full + ')\nแตะลิงก์ แล้วเลือก “เปิดในเบราว์เซอร์” ก่อนเข้าสู่ระบบ\n' + joinURL()) + '">แชร์ไปยัง LINE</a><button class="btn ghost" data-act="joinQR">QR Code</button><button class="btn ghost' + (open ? ' danger' : '') + '" data-act="joinToggle">' + (open ? 'ปิดรับสมัครชั่วคราว' : 'เปิดรับสมัคร') + '</button></div></section>';
    const ic0 = C.initialCommittee || [], done = ic0.filter(x => activeSids().some(s => members()[s].first === x.first && members()[s].last === x.last && (!x.role || (roleOf(s) || {}).role === x.role) && (!x.notes || isKeeper(s)))).length;
    if (ic0.length && done < ic0.length) b += '<section class="card hl"><div class="lb">ตั้งค่าคณะกรรมการตามโครงสร้างปัจจุบัน (' + done + '/' + ic0.length + ')</div><div class="muted" style="margin-bottom:8px">' +
      ic0.map(x => esc(x.prefix + x.first + ' ' + x.last) + ' — ' + esc([x.role ? roleName({ role: x.role }) : '', x.notes ? 'ผู้เก็บรวบรวมโน้ต' : ''].filter(Boolean).join(' + '))).join('<br>') +
      '</div><div class="muted" style="margin-bottom:10px">ระบบเพิ่มชื่อที่ยังไม่มีในทะเบียน กำหนดตำแหน่งและหน้าที่ และผูกบัญชีแอดมินที่ระบุอีเมลไว้ (แก้รายชื่อได้ที่ config.js › initialCommittee)</div><button class="btn gold" data-act="setupCommittee">บันทึกคณะกรรมการ</button></section>';
    b += '<section class="card"><div class="lb">นำเข้าและส่งออก</div><div class="row wrap"><button class="btn ghost" data-act="importMembers">' + ic('up', 18) + 'นำเข้ารายชื่อ</button><button class="btn ghost" data-act="exportMenu">' + ic('down', 18) + 'ส่งออกบอร์ด / แผนผัง / รายชื่อ</button></div></section>';
    b += '<section class="card"><div class="lb">ตั้งค่า</div><div class="kv"><span>ปีปัจจุบัน (ใช้แยกกิจกรรมและบัญชีรายปี)</span><b>' + esc(year()) + '</b><button class="btn sm ghost" data-act="setYear">แก้ไข</button></div><div class="kv"><span>รายการความถนัด / เครื่องดนตรี</span><b>' + instList().length + ' รายการ</b><button class="btn sm ghost" data-act="setInst">แก้ไข</button></div></section>';
    b += '<section class="card"><div class="lb">ออกจากเครือข่าย / ล่วงลับ (' + gone.length + ')</div>' + (gone.map(s => '<div class="mrow"><a class="mrow-main" href="#/m/' + esc(s) + '">' + avatar(ms[s]) + '<span class="grow"><b>' + esc(fullName(ms[s])) + '</b><span class="muted">' + esc(s + ' · ' + ((C.removeReasons.find(x => x.id === ms[s].removedReason) || {}).name || 'นำออก') + ' · ' + M.thDate(ms[s].removedAt)) + '</span></span></a>' +
      '<span class="mrow-act"><button class="btn sm ghost" data-act="restore" data-sid="' + esc(s) + '">กู้คืน</button>' + (ms[s].removedReason === 'mistake' ? '<button class="btn sm ghost danger" data-act="purge" data-sid="' + esc(s) + '">ลบถาวร</button>' : '') + '</span></div>').join('') || '<div class="muted">ไม่มี</div>') + '</section>';
    b += '<section class="card"><div class="lb">ลำดับสิทธิ์ตามตำแหน่ง</div>' + permTable() + '</section>';
    MANAGE.forEach(f => { try { b += f() || ''; } catch (e) { console.error(e); } });
    if (B.mode === 'demo') b += '<section class="card"><div class="lb">โหมดสาธิต</div><div class="muted" style="margin-bottom:10px">ล้างแล้วเริ่มข้อมูลสมมติชุดใหม่ ไม่กระทบข้อมูลจริง</div><button class="btn ghost danger" data-act="resetDemo">ล้างข้อมูลสาธิต</button></section>';
    return { title: 'จัดการเครือข่าย', body: b };
  }

  /* ============ ฟอร์ม ============ */
  const fld = (label, inner, hint) => '<label class="fld"><span>' + label + '</span>' + inner + (hint ? '<small>' + hint + '</small>' : '') + '</label>';
  const opt = (list, cur) => list.map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('');
  const masterOpts = self => [['', C.master.short + ' (ต่อวิชาจากอาจารย์โดยตรง)']].concat(activeSids().filter(s => s !== self && members()[s].type !== 'start').sort(byClass).map(s => [s, fullName(members()[s]) + nickTxt(members()[s]) + ' · ' + cls(members()[s])]));
  /* contacts/{sid} = ข้อมูลที่เจ้าตัวยอมให้เพื่อนศิษย์เห็นในทำเนียบ · privateInfo/{sid} = ข้อมูลเต็ม (เจ้าตัว แอดมิน เลขานุการ) */
  function memberForm(sid, selfOnly) {
    const isNew = !sid; const m = isNew ? { prefix: 'นาย', type: 'regular', inst: {} } : members()[sid]; const F = { photo: undefined, print: undefined };
    let h = '<h3>' + (isNew ? 'เพิ่มศิษย์' : selfOnly ? 'แก้ข้อมูลของฉัน' : 'แก้ไขข้อมูลศิษย์') + '</h3><form class="form" novalidate>';
    h += '<div class="row" style="margin-bottom:6px"><span id="f-av">' + avatar(m, 'xl') + '</span><div class="grow">' + fld('รูป', '<input class="in" type="file" accept="image/*" id="f-photo">', 'ระบบย่อและครอปเป็นสี่เหลี่ยมจัตุรัสให้อัตโนมัติ') + '</div></div>';
    if (!selfOnly) {
      h += (isNew ? '<div class="muted" style="margin-bottom:6px">รหัสศิษย์: ระบบออกให้อัตโนมัติเมื่อบันทึก</div>' : '<div class="kv"><span>รหัสศิษย์</span><b>' + esc(sid) + '</b></div>') +
        '<div class="g3">' + fld('คำนำหน้า', '<select class="in" id="f-prefix">' + opt(Array.from(new Set(C.prefixes.concat(m.prefix ? [m.prefix] : []))).map(p => [p, p]), m.prefix) + '</select>') + fld('ชื่อ', '<input class="in" id="f-first" value="' + esc(m.first || '') + '" required>') + fld('นามสกุล', '<input class="in" id="f-last" value="' + esc(m.last || '') + '" required>') + '</div>' +
        '<div class="g3">' + fld('ชื่อเล่น', '<input class="in" id="f-nick" value="' + esc(m.nick || '') + '">') + fld('เรียนกับอาจารย์ตั้งแต่ปี (พ.ศ.)', '<input class="in" id="f-year" inputmode="numeric" value="' + esc(m.yearIn || '') + '">') + '</div>' +
        '<div class="g3">' + fld('ประเภท', '<select class="in" id="f-type">' + opt(C.memberTypes.map(t => [t.id, t.name]), m.type) + '</select>') + fld('ครูผู้ถ่ายทอดโดยตรง', '<select class="in" id="f-master">' + opt(masterOpts(sid), m.master || '') + '</select>') + '</div>' +
        '<div class="fld"><span>ความถนัด / เครื่องดนตรี</span><div class="checks">' + instList().map(i => '<label class="ck"><input type="checkbox" name="inst" value="' + esc(i) + '"' + ((m.inst || {})[i] ? ' checked' : '') + '><span>' + esc(i) + '</span></label>').join('') + '</div></div>';
      if (can.manage()) h += fld('บัญชี Google ที่ใช้ล็อกอิน', '<input class="in" id="f-login" type="email" autocomplete="off" placeholder="name@gmail.com">', 'ใส่เมื่อเพิ่มชื่อไว้ก่อนแล้วศิษย์จะล็อกอินภายหลัง — ศิษย์ที่ส่งคำขอเข้าร่วมเองระบบผูกให้แล้ว');
    } else h += fld('ชื่อเล่น', '<input class="in" id="f-nick" value="' + esc(m.nick || '') + '">');
    h += '<div class="lb" style="margin-top:14px">ข้อมูลติดต่อ</div><div class="g3">' + fld('เบอร์โทร', '<input class="in" id="f-phone" inputmode="tel">') + fld('LINE ID', '<input class="in" id="f-line">') + fld('อีเมลติดต่อ', '<input class="in" id="f-email" type="email">') + '</div>' +
      '<div class="g3">' + fld('จังหวัดที่อยู่ปัจจุบัน', '<select class="in" id="f-prov">' + opt([['', '— ไม่ระบุ —']].concat((C.provinces || []).map(p => [p, p]))) + '</select>') + fld('อาชีพ / ที่ทำงาน', '<input class="in" id="f-work">') + '</div>' +
      '<label class="ck wide"><input type="checkbox" id="f-share"><span>เปิดเผยเบอร์โทร LINE และอีเมลในทำเนียบติดต่อให้เพื่อนศิษย์เห็น (จังหวัดและที่ทำงานแสดงเสมอ)</span></label>' +
      '<div class="lb" style="margin-top:14px">ข้อมูลส่วนตัว (เห็นเฉพาะเจ้าตัว แอดมิน และเลขานุการ)</div><div class="g3">' + fld('ที่อยู่', '<input class="in" id="f-addr">') + fld('ผู้ติดต่อกรณีฉุกเฉิน', '<input class="in" id="f-emer">') + '</div>';
    h += '<div class="note bad" id="f-err" hidden></div><div class="row" style="margin-top:16px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button type="submit" class="btn grow">บันทึก</button></div></form>';
    const w = modal(h, { sticky: true, wide: true });
    if (!isNew) {
      Promise.all([B.get('privateInfo/' + sid).catch(() => null), B.get('contacts/' + sid).catch(() => null)]).then(([p, c]) => {
        p = p || {}; c = c || {}; const s = (id, v) => { const e = $(id, w); if (e && !e.value) e.value = v || ''; };
        s('#f-phone', p.phone || c.phone); s('#f-line', p.line || c.line); s('#f-email', p.email || c.email); s('#f-prov', c.province); s('#f-work', c.work); s('#f-addr', p.address); s('#f-emer', p.emergency); s('#f-login', p.loginEmail);
        $('#f-share', w).checked = !!(c.phone || c.line || c.email);
      });
    }
    $('#f-photo', w).addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try { F.photo = await M.fileToSquare(f, 160, 0.8); F.print = await M.fileToSquare(f, 640, 0.82); $('#f-av', w).innerHTML = '<img class="av xl" src="' + F.photo + '" alt="">'; } catch (er) { toast(er.message); }
    });
    $('form', w).addEventListener('submit', async e => {
      e.preventDefault(); const v = id => { const el = $(id, w); return el ? el.value.trim() : ''; };
      const err = t => { const el = $('#f-err', w); el.textContent = t; el.hidden = false; };
      const now = Date.now(), share = $('#f-share', w).checked;
      const contact = { phone: v('#f-phone'), line: v('#f-line'), email: v('#f-email') };
      const priv = Object.assign({}, contact, { address: v('#f-addr'), emergency: v('#f-emer') });
      const pub = Object.assign({ province: v('#f-prov'), work: v('#f-work') }, share ? contact : {});
      const clean = o => { Object.keys(o).forEach(k => { if (o[k] === '') delete o[k]; }); return o; };
      const writeContacts = id => { clean(pub); W(Object.keys(pub).length ? B.set('contacts/' + id, Object.assign(pub, { at: now })) : B.remove('contacts/' + id)); W(B.update('privateInfo/' + id, priv)); delete PRIV[id]; };
      if (selfOnly) {
        const id = ME.sid, upd = { ['members/' + id + '/nick']: v('#f-nick') || null, ['members/' + id + '/updatedAt']: now, ['members/' + id + '/updatedBy']: by(), ['/people/' + id + '/nick']: v('#f-nick') || null };
        if (F.photo) { upd['members/' + id + '/photo'] = F.photo; upd['/people/' + id + '/photo'] = F.photo; W(B.set('photos/' + id, F.print)); }
        W(B.update('', upd)); writeContacts(id); w.remove(); toast('บันทึกแล้ว'); return;
      }
      if (!v('#f-first') || !v('#f-last')) return err('กรอกชื่อและนามสกุล');
      if (v('#f-year') && !/^25[0-9]{2}$/.test(v('#f-year'))) return err('ปีที่เริ่มเรียนต้องเป็นปี พ.ศ. 4 หลัก');
      const login = can.manage() ? v('#f-login').toLowerCase() : '';
      if (login && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(login)) return err('อีเมลล็อกอินไม่ถูกต้อง');
      const inst = {}; $$('input[name=inst]:checked', w).forEach(c => inst[c.value] = true);
      const rec = { prefix: v('#f-prefix'), first: v('#f-first'), last: v('#f-last'), nick: v('#f-nick'), yearIn: v('#f-year'), type: v('#f-type'), master: v('#f-master'), inst };
      if (F.photo) rec.photo = F.photo;
      const btn = $('button[type=submit]', w); btn.disabled = true;
      const id = isNew ? await nextSid() : sid;
      if (isNew) {
        Object.keys(rec).forEach(k => { if (rec[k] === '' || (k === 'inst' && !Object.keys(inst).length)) delete rec[k]; });
        const upd = { ['members/' + id]: Object.assign({ status: 'active', createdAt: now, createdBy: by() }, rec), ['/people/' + id + '/clubs/' + C._club]: true }; sharedWrites(id, sharedOf(rec), upd);
        W(B.update('', upd)); log('member.add', id, fullName(rec));
      } else {
        const diff = {}; Object.keys(rec).forEach(k => { const old = m[k] === undefined ? (k === 'inst' ? {} : '') : m[k]; if (JSON.stringify(rec[k]) !== JSON.stringify(old)) diff[k] = (k === 'inst' && !Object.keys(inst).length) || rec[k] === '' ? null : rec[k]; });
        if (Object.keys(diff).length) { diff.updatedAt = now; diff.updatedBy = by(); const upd = {}, sh = {}; Object.keys(diff).forEach(k => { upd['members/' + id + '/' + k] = diff[k]; if (SHARED.includes(k)) sh[k] = diff[k]; }); sharedWrites(id, sh, upd); W(B.update('', upd)); log('member.edit', id, Object.keys(diff).filter(k => !/^updated/.test(k)).join(',')); }
      }
      if (F.print) W(B.set('photos/' + id, F.print));
      if (login) { priv.loginEmail = login; W(B.set('/accounts/' + B.emailKey(login), id)); }
      writeContacts(id);
      w.remove(); toast(isNew ? 'เพิ่มศิษย์แล้ว · รหัส ' + id : 'บันทึกแล้ว');
    });
  }
  function roleForm(sid) {
    const m = members()[sid], r = roleOf(sid) || {}, du = (D.duties || {})[sid] || {};
    const w = modal('<h3>กำหนดตำแหน่งและหน้าที่</h3><div class="muted" style="margin-bottom:10px">' + esc(fullName(m)) + ' · ' + esc(cls(m)) + '</div><form class="form">' +
      fld('ตำแหน่งในคณะกรรมการ', '<select class="in" id="r-role">' + opt([['', 'สมาชิก (ไม่มีตำแหน่ง)']].concat(C.roles.map(x => [x.id, x.name])), r.role || '') + '</select>') +
      '<label class="ck wide"><input type="checkbox" id="r-notes"' + (du.notes ? ' checked' : '') + '><span>ผู้เก็บรวบรวมโน้ต (คลังโน้ตเพลง) — ใส่/แก้โน้ตและเห็นโน้ตทุกเพลง (การให้สิทธิ์ดูโน้ตยังเป็นของแอดมิน)</span></label>' +
      '<div class="muted">หน้าที่ผู้เก็บรวบรวมโน้ตซ้อนกับตำแหน่งได้ · สิทธิ์ตามตำแหน่งดูตารางที่หน้าจัดการ · มีผลทันทีเมื่อบันทึก</div><div class="row" style="margin-top:16px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button type="submit" class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true });
    $('form', w).addEventListener('submit', async e => {
      e.preventDefault(); const role = $('#r-role', w).value, notes = $('#r-notes', w).checked; const upd = {};
      if (!role) upd['roles/' + sid] = null;
      else if (role !== r.role) {
        const clash = Object.keys(D.roles || {}).filter(s => s !== sid && members()[s] && members()[s].status === 'active' && D.roles[s] && D.roles[s].role === role);
        if (clash.length && !(await M.confirmBox('มีผู้ดำรงตำแหน่งนี้อยู่แล้ว', esc(clash.map(s => fullName(members()[s])).join(', ')) + ' จะกลับเป็นสมาชิกทั่วไป ต้องการเปลี่ยนหรือไม่', 'เปลี่ยนตำแหน่ง'))) return;
        clash.forEach(s => upd['roles/' + s] = null); upd['roles/' + sid] = { role };
      }
      if (notes !== !!du.notes) upd['duties/' + sid + '/notes'] = notes || null;
      if (Object.keys(upd).length) { W(B.update('', upd)); log('role.set', sid, (role ? roleName({ role }) : 'สมาชิก') + (notes ? ' + ผู้เก็บรวบรวมโน้ต' : '')); }
      w.remove(); toast('บันทึกแล้ว');
    });
  }
  function removeForm(sid) {
    const m = members()[sid];
    const w = modal('<h3>นำศิษย์ออกจากรายชื่อปัจจุบัน</h3><div class="muted" style="margin-bottom:10px">' + esc(fullName(m)) + ' · ' + esc(cls(m)) + '</div><form class="form"><div class="fld"><span>เหตุผล</span>' +
      C.removeReasons.map((r, i) => '<label class="ck wide"><input type="radio" name="why" value="' + r.id + '"' + (i ? '' : ' checked') + '><span>' + esc(r.name) + '</span></label>').join('') + '</div>' +
      '<div class="muted">ชื่อจะหายจากรายชื่อปัจจุบันและบัญชีนี้เข้าแอปไม่ได้ แต่ประวัติ ทางเพลง และสายการสืบทอดยังอยู่ครบ กู้คืนได้ที่ จัดการ</div><div class="row" style="margin-top:16px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button type="submit" class="btn danger grow">ยืนยัน</button></div></form>', { center: true, sticky: true });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const why = $('input[name=why]:checked', w).value;
      const upd = {}; upd['members/' + sid + '/status'] = why === 'graduate' ? 'alumni' : 'removed'; upd['members/' + sid + '/removedReason'] = why; upd['members/' + sid + '/removedAt'] = Date.now(); upd['members/' + sid + '/removedBy'] = by();
      upd['roles/' + sid] = null; upd['/people/' + sid + '/clubs/' + C._club] = null;
      W(B.update('', upd)); log('member.remove', sid, why); w.remove(); toast('บันทึกแล้ว');
      if (route().name === 'm') location.hash = '#/members';
    });
  }
  function advisorForm(id) {
    const a = id ? cfg().advisors[id] : { kind: 'teacher' }; let photo;
    const w = modal('<h3>' + (id ? 'แก้ไขแอดมิน / ครู' : 'เพิ่มแอดมิน / ครู') + '</h3><form class="form">' +
      fld('ชื่อ-สกุล (พร้อมคำนำหน้า)', '<input class="in" id="a-name" value="' + esc(a.name || '') + '" required>') +
      fld('ประเภท', '<select class="in" id="a-kind">' + opt([['teacher', 'แอดมิน (ล็อกอินได้ สิทธิ์สูงสุด)'], ['expert', 'ที่ปรึกษา / ครูอาวุโส (มีแค่ชื่อ ไม่มีบัญชี)']], a.kind) + '</select>') +
      '<div id="a-ew"' + (a.kind === 'expert' ? ' hidden' : '') + '>' + fld('อีเมลที่ใช้ล็อกอิน', '<input class="in" id="a-email" type="email" value="' + esc(a.email || '') + '" autocomplete="off">', 'ต้องเป็นบัญชี Google แอดมินเห็นและแก้ไขข้อมูลได้ทั้งหมด') + '</div>' +
      fld('ตำแหน่งที่แสดงในแผนผัง', '<input class="in" id="a-pos" value="' + esc(a.position || '') + '" placeholder="เช่น ครูผู้ถ่ายทอด / แอดมิน">') +
      fld('รูป (ไม่บังคับ)', '<input class="in" type="file" accept="image/*" id="a-photo">') +
      '<div class="note bad" id="a-err" hidden></div><div class="row" style="margin-top:16px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button type="submit" class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true });
    $('#a-kind', w).addEventListener('change', e => { $('#a-ew', w).hidden = e.target.value === 'expert'; });
    $('#a-photo', w).addEventListener('change', async e => { const f = e.target.files[0]; if (f) try { photo = await M.fileToSquare(f, 240, 0.82); } catch (er) { toast(er.message); } });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const name = $('#a-name', w).value.trim(), kind = $('#a-kind', w).value, email = kind === 'teacher' ? $('#a-email', w).value.trim().toLowerCase() : '';
      const err = t => { const el = $('#a-err', w); el.textContent = t; el.hidden = false; };
      if (!name) return err('กรอกชื่อ'); if (kind === 'teacher' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('แอดมินต้องระบุอีเมลที่ใช้ล็อกอิน');
      const aid = id || 'a' + B.uid(); const upd = {};
      const rec = { name, kind, position: $('#a-pos', w).value.trim() || (kind === 'teacher' ? 'แอดมิน' : 'ที่ปรึกษา'), order: a.order || (advisors().length + 1) };
      if (email) rec.email = email; if (photo || a.photo) rec.photo = photo || a.photo;
      upd['config/advisors/' + aid] = rec;
      if (a.email && a.email !== email) upd['/teachers/' + B.emailKey(a.email) + '/' + C._club] = null;
      if (email && !B.isBootTeacher(email)) upd['/teachers/' + B.emailKey(email) + '/' + C._club] = true;
      W(B.update('', upd)); log('advisor.save', '', name); w.remove(); toast('บันทึกแล้ว');
    });
  }

  /* ---------- นำเข้ารายชื่อ: หนึ่งคนต่อบรรทัด เช่น “นายกานต์ ใจดี (กานต์) 2552” ---------- */
  const toArabic = s => String(s).replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d));
  function parseRoster(text) {
    const PRE = Array.from(new Set(['เด็กชาย', 'เด็กหญิง', 'นางสาว'].concat(C.prefixes))).sort((a, b) => b.length - a.length);
    const MAP = { 'เด็กชาย': 'ด.ช.', 'เด็กหญิง': 'ด.ญ.', 'นางสาว': 'น.ส.' };
    const out = [], bad = [];
    toArabic(text).split(/\r?\n/).forEach(raw => {
      let ln = raw.replace(/[|,\t]+/g, ' ').replace(/\s+/g, ' ').trim(); if (!ln || /^ลำดับ|^ชื่อ/.test(ln)) return;
      ln = ln.replace(/^[0-9]{1,3}[.)]?\s+/, '');
      let nick = '', yearIn = '';
      ln = ln.replace(/\(([^)]+)\)/, (x, n) => { nick = n.trim(); return ' '; });
      ln = ln.replace(/(?:^|\s)(25[0-9]{2})(?=\s|$)/, (x, y) => { yearIn = y; return ' '; });
      let rest = ln.replace(/\s+/g, ' ').trim(), prefix = '';
      for (const p of PRE) { if (rest.startsWith(p)) { prefix = MAP[p] || p; rest = rest.slice(p.length).trim(); break; } }
      const ps = rest.split(' '); const first = ps.shift() || ''; const last = ps.join(' ');
      if (!first || !last || !/[ก-๙a-zA-Z]/.test(first)) { if (/[ก-๙]/.test(raw)) bad.push(raw.trim()); return; }
      out.push({ prefix, first, last, nick, yearIn });
    });
    return { out, bad };
  }
  function importForm() {
    const w = modal('<h3>นำเข้ารายชื่อศิษย์</h3><div class="muted" style="margin-bottom:10px">คัดลอกรายชื่อ (เช่น จาก Excel หรือ Google Sheets) แล้ววางด้านล่าง หนึ่งคนต่อหนึ่งบรรทัด ต้องมีชื่อและนามสกุล ใส่ชื่อเล่นในวงเล็บ และปีที่เริ่มเรียนกับอาจารย์ได้ เช่น<br><code>นายกานต์ ใจดี (กานต์) 2552</code></div>' +
      '<textarea class="in" id="i-text" rows="8" placeholder="วางรายชื่อที่นี่" aria-label="รายชื่อ"></textarea>' +
      fld('ประเภทของผู้ที่นำเข้า', '<select class="in" id="i-type">' + opt(C.memberTypes.map(t => [t.id, t.name]), 'regular') + '</select>') +
      '<div id="i-res" class="note" hidden></div><div class="row" style="margin-top:16px"><button class="btn ghost grow" data-close>ปิด</button><button class="btn ghost grow" id="i-check">ตรวจรายชื่อ</button><button class="btn grow" id="i-go" disabled>นำเข้า</button></div>', { sticky: true, wide: true });
    let ready = [];
    $('#i-check', w).addEventListener('click', () => {
      const { out, bad } = parseRoster($('#i-text', w).value); const have = new Set(Object.values(members()).map(m => (m.first || '') + ' ' + (m.last || ''))), seen = {};
      ready = out.filter(o => { const k = o.first + ' ' + o.last; if (have.has(k) || seen[k]) return false; seen[k] = 1; return true; }); const dup = out.length - ready.length;
      const r = $('#i-res', w); r.hidden = false;
      r.innerHTML = '<b>พร้อมนำเข้า ' + ready.length + ' คน</b>' + (dup ? ' · ข้าม ' + dup + ' คนที่มีชื่อในทะเบียนแล้วหรือซ้ำกัน' : '') + (bad.length ? '<br>อ่านไม่ได้ ' + bad.length + ' บรรทัด: ' + esc(bad.slice(0, 3).join(' / ')) + (bad.length > 3 ? ' …' : '') : '') +
        (ready.length ? '<div class="muted" style="margin-top:6px">' + esc(ready.slice(0, 4).map(o => o.prefix + o.first + ' ' + o.last + (o.nick ? ' (' + o.nick + ')' : '') + (o.yearIn ? ' ' + o.yearIn : '')).join(' · ')) + (ready.length > 4 ? ' …' : '') + '</div>' : '');
      $('#i-go', w).disabled = !ready.length;
    });
    $('#i-go', w).addEventListener('click', async () => {
      $('#i-go', w).disabled = true; const upd = {}, now = Date.now(), type = $('#i-type', w).value;
      let n = +(await nextSid());
      try { await B.tx('config/lastSid', cur => Math.max(+cur || 0, n + ready.length - 1)); } catch (e) { /* ignore */ }
      ready.forEach(o => { const id = String(n++); const sh = { prefix: o.prefix, first: o.first, last: o.last, nick: o.nick, yearIn: o.yearIn }; Object.keys(sh).forEach(k => { if (sh[k] === '' || sh[k] === 0) delete sh[k]; });
        upd['members/' + id] = Object.assign({ type, status: 'active', createdAt: now, createdBy: by() }, sh); Object.keys(sh).forEach(f => { upd['/people/' + id + '/' + f] = sh[f]; }); upd['/people/' + id + '/clubs/' + C._club] = true; });
      W(B.update('', upd)); log('member.import', '', ready.length + ' คน'); w.remove(); toast('นำเข้า ' + ready.length + ' คนแล้ว');
    });
  }

  /* ============ ส่งออก: บอร์ด / แผนผัง / รายชื่อ DOCX ============ */
  const SCOPESF = () => [['all', 'ศิษย์ทั้งหมด'], ['committee', 'เฉพาะคณะกรรมการ'], ['keepers', 'ผู้เก็บรวบรวมโน้ต']].concat(eraOpts().map(g => ['e' + g[0], g[1]]));
  function scopeSids(sc) {
    const ms = members(); let l = activeSids();
    if (sc === 'committee') l = l.filter(s => roleOf(s)); else if (sc === 'keepers') l = l.filter(isKeeper); else if (/^e[0-9]+$/.test(sc)) l = l.filter(s => eraOf(ms[s]) === +sc.slice(1));
    return sc === 'committee' ? l.sort((a, b) => ROLE_ORDER.indexOf(roleOf(a).role) - ROLE_ORDER.indexOf(roleOf(b).role) ) : l.sort(byClass);
  }
  const pageHead = (title, sub) => '<div class="rp-head"><img src="' + C.club.logo + '" alt=""><div class="grow"><div class="rp-t">' + esc(title) + '</div><div class="rp-s">' + esc(sub) + '</div></div></div>';
  const bigAv = (m, src) => src ? '<img class="rp-ph" src="' + esc(src) + '" alt="">' : '<div class="rp-ph none">' + esc(((m.first || m.name || '?').replace(/^(ผู้ช่วยศาสตราจารย์|รองศาสตราจารย์|ศาสตราจารย์|อาจารย์|ครู|นาย|นางสาว|นาง)\s*/, '').replace(/^ดร\.\s*/, '').trim().charAt(0)) || '?') + '</div>';
  async function printPhotos(sids) { const o = {}; await Promise.all(sids.map(async s => { try { o[s] = await B.get('photos/' + s); } catch (e) { o[s] = null; } if (!o[s]) o[s] = members()[s].photo || null; })); return o; }
  /* ============ บอร์ด / แผนผังสำหรับพิมพ์ ============
     จัดหน้าด้วยการวัดความสูงจริงของเนื้อหา (ไม่ตัดข้อความ) · เลือกแนวตั้ง/แนวนอน · โปสเตอร์หน้าเดียวหรือหลายหน้า A4 */
  const CONTENTS = () => [['full', 'บอร์ดรวม: คณะกรรมการด้านบน ศิษย์แยกตามช่วงปีที่เริ่มเรียนด้านล่าง'], ['chart', 'แผนผังคณะกรรมการและผู้เก็บรวบรวมโน้ต'], ['all', 'ศิษย์ทุกคนแบบการ์ด']].concat(eraOpts().map(g => ['e' + g[0], 'ศิษย์' + g[1]]));
  const printHead = (title, sub) => '<div class="rp-head"><img src="' + C.club.logoPrint + '" alt=""><div class="grow"><div class="rp-t">' + esc(title) + '</div><div class="rp-s">' + esc(sub) + '</div></div></div>';
  function bpCard(m, sid, src, o) {
    o = o || {}; const ins = sid ? insts(m) : [];
    return '<div class="bp ' + (o.size || '') + '">' + bigAv(m, src) + '<div class="bp-n">' + esc(m.first ? fullName(m) : m.name) + '</div>' + (o.role ? '<div class="bp-r">' + esc(o.role) + '</div>' : '') +
      (sid ? '<div class="bp-c">' + esc(cls(m) + (m.nick ? ' · ' + m.nick : '')) + '</div>' : '') + (ins.length ? '<div class="bp-i">' + esc(ins.join(' · ')) + '</div>' : '') + '</div>';
  }
  async function boardData(content) {
    const ms = members(), act = activeSids(), withRole = id => act.filter(s => (roleOf(s) || {}).role === id).sort(byClass);
    const exec = content === 'full' || content === 'chart';
    const sids = content === 'chart' ? [] : content === 'full' ? act.filter(s => !roleOf(s)).sort(byClass) : scopeSids(content);
    const ph = await printPhotos(exec ? act : sids), blocks = [];
    if (exec) {
      const adv = advisors();
      if (adv.length) blocks.push({ lab: 'ครูผู้ถ่ายทอดและแอดมิน', cards: adv.map(a => bpCard(a, '', a.photo, { role: a.position || '', size: 'lg' })), tier: 1 });
      const pr = withRole('president'); if (pr.length) blocks.push({ lab: roleName({ role: 'president' }), cards: pr.map(s => bpCard(ms[s], s, ph[s], { role: roleName({ role: 'president' }), size: 'lg' })), tier: 1 });
      const vi = withRole('vice'); if (vi.length) blocks.push({ lab: roleName({ role: 'vice' }), cards: vi.map(s => bpCard(ms[s], s, ph[s], { role: roleName({ role: 'vice' }), size: 'lg' })), tier: 1 });
      const mid = ['treasurer', 'host', 'secretary'].reduce((a, id) => a.concat(withRole(id).map(s => bpCard(ms[s], s, ph[s], { role: roleName({ role: id }) }))), []); if (mid.length) blocks.push({ lab: 'คณะกรรมการ', cards: mid, tier: 1 });
      const kp = keepers(); if (kp.length) blocks.push({ lab: 'ผู้เก็บรวบรวมโน้ต (คลังโน้ตเพลง)', cards: kp.map(s => bpCard(ms[s], s, ph[s], { role: 'ผู้เก็บรวบรวมโน้ต' })), tier: 1 });
    }
    if (content === 'full') eraList().concat([0]).forEach(g => { const l = sids.filter(s => eraOf(ms[s]) === g); if (l.length) blocks.push({ lab: eraName(g) + ' (' + l.length + ' คน)', cards: l.map(s => bpCard(ms[s], s, ph[s], {})), tier: 0 }); });
    else if (sids.length) blocks.push({ lab: (CONTENTS().find(x => x[0] === content) || ['', 'ศิษย์'])[1] + ' (' + sids.length + ' คน)', cards: sids.map(s => bpCard(ms[s], s, ph[s], { role: roleName(roleOf(s)) })), tier: 0 });
    const title = content === 'chart' ? 'แผนผังคณะกรรมการ' + C.club.name : 'ทำเนียบ' + C.club.name;
    return { blocks, title, sub: C.club.long + ' · ปี ' + year() + ' · ศิษย์ทั้งหมด ' + act.length + ' คน' };
  }
  const blockHTML = (b, cont) => '<div class="bx-lab">' + esc(b.lab) + (cont ? ' (ต่อ)' : '') + '</div><div class="' + (b.tier ? 'bx-tier' : 'bx-grid') + '"></div>';
  const stageEl = el => { const w = document.createElement('div'); w.style.cssText = 'position:fixed;left:-30000px;top:0;'; w.appendChild(el); document.body.appendChild(w); return w; };
  const ready = async el => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* ignore */ } } await Promise.all($$('img', el).map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); };
  /* โปสเตอร์หน้าเดียว สัดส่วนกระดาษชุด A: ขยายความกว้างของผืนงานจนเนื้อหาทั้งหมดลงพอดี แล้วส่งออกด้วยความละเอียดสูง */
  async function buildPoster(content, land) {
    const d = await boardData(content), pg = document.createElement('div'); pg.className = 'rp-page poster' + (land ? ' land' : '');
    pg.innerHTML = printHead(d.title, d.sub) + '<div class="bx">' + d.blocks.map(b => '<div class="bx-sec ' + (b.tier ? 'bx-t' : 'bx-g') + '">' + blockHTML(b).replace('></div>', '>' + b.cards.join('') + '</div>') + '</div>').join('') + '</div><div class="bx-foot">' + esc(C.club.long) + ' · ข้อมูล ณ ' + esc(M.thDate(Date.now())) + '</div>';
    const st = stageEl(pg); await ready(pg); const R = land ? 1 / Math.SQRT2 : Math.SQRT2; let W = land ? 1123 : 794;
    for (; W < 7000; W += 40) { pg.style.width = W + 'px'; pg.style.height = 'auto'; if (pg.offsetHeight <= W * R) break; }
    const H = Math.round(W * R); pg.style.height = H + 'px'; pg.dataset.w = W; pg.dataset.h = H; st.remove();
    const root = document.createElement('div'); root.appendChild(pg); return root;
  }
  /* หลายหน้า A4: เติมการ์ดทีละใบ ถ้าล้นหน้าให้ขึ้นหน้าใหม่ */
  async function buildA4(content, land) {
    const d = await boardData(content), root = document.createElement('div'), st = stageEl(root), pages = [];
    const newPage = () => { const pg = document.createElement('div'); pg.className = 'rp-page a4b' + (land ? ' land' : ''); pg.innerHTML = printHead(d.title, d.sub) + '<div class="bx"></div><div class="rp-foot"></div>'; root.appendChild(pg); pages.push(pg); return pg; };
    const over = pg => { const bx = $('.bx', pg); return bx.getBoundingClientRect().bottom > pg.getBoundingClientRect().bottom - 52; };
    let pg = newPage(); await ready(root);
    for (const b of d.blocks) {
      let sec = document.createElement('div'); sec.className = 'bx-sec ' + (b.tier ? 'bx-t' : 'bx-g'); sec.innerHTML = blockHTML(b); $('.bx', pg).appendChild(sec); let box = sec.lastChild, n = 0;
      for (const c of b.cards) {
        box.insertAdjacentHTML('beforeend', c); await ready(box);
        if (over(pg) && (n > 0 || $('.bx', pg).children.length > 1)) {
          box.lastChild.remove(); if (!n) sec.remove();
          pg = newPage(); sec = document.createElement('div'); sec.className = 'bx-sec ' + (b.tier ? 'bx-t' : 'bx-g'); sec.innerHTML = blockHTML(b, n > 0); $('.bx', pg).appendChild(sec); box = sec.lastChild; box.insertAdjacentHTML('beforeend', c); await ready(box);
        }
        n++;
      }
    }
    pages.forEach((p, i) => { $('.rp-foot', p).textContent = 'หน้า ' + (i + 1) + ' / ' + pages.length; }); st.remove(); return root;
  }
  /* ---------- ตารางรายงานแบบหน้า A4 (ใช้ร่วมกับโมดูลอื่น) ---------- */
  function tablePages(title, sub, head, rows, o) {
    o = o || {}; const per = o.per || 26; const root = document.createElement('div'); const n = Math.max(1, Math.ceil(rows.length / per));
    for (let i = 0; i < n; i++) {
      const pg = document.createElement('div'); pg.className = 'rp-page';
      pg.innerHTML = pageHead(title, sub) + '<table class="rp-table"><thead><tr>' + head.map((h, j) => '<th style="' + ((o.widths || [])[j] ? 'width:' + o.widths[j] + '%' : '') + '">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
        rows.slice(i * per, (i + 1) * per).map(r => '<tr>' + r.map((c, j) => '<td class="' + ((o.align || [])[j] || '') + '">' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' + (i === n - 1 && o.after ? o.after : '') +
        '<div class="rp-foot">' + esc(o.foot || '') + ' หน้า ' + (i + 1) + ' / ' + n + '</div>';
      root.appendChild(pg);
    }
    return root;
  }
  const buildBoard = (content, land, poster) => poster ? buildPoster(content, land) : buildA4(content, land);
  function rosterDocx(sc) {
    const sids = scopeSids(sc), ms = members();
    return M.docxTable({
      title: 'รายชื่อ' + C.club.name, lines: [C.club.long + ' ปี ' + thNum(year()), (SCOPESF().find(x => x[0] === sc) || ['', ''])[1] + ' จำนวน ' + thNum(sids.length) + ' คน'],
      head: ['ลำดับ', 'รหัส', 'ชื่อ - สกุล', 'ชื่อเล่น', 'เริ่มเรียน', 'ตำแหน่ง', 'ความถนัด'], widths: [7, 10, 28, 10, 12, 15, 18], align: ['center', 'center', 'left', 'center', 'center', 'left', 'left'],
      rows: sids.map((s, i) => [thNum(i + 1), s, fullName(ms[s]), ms[s].nick || '-', thNum(ms[s].yearIn || '-'), thNum(roleName(roleOf(s))) || '-', insts(ms[s]).join(', ') || '-']),
      footer: ['', 'ข้อมูล ณ วันที่ ' + thNum(M.thDate(Date.now()))]
    });
  }
  function exportMenu() {
    const mob = /iPhone|iPad|Android/i.test(navigator.userAgent);
    const w = modal('<h3>ส่งออกบอร์ดและแผนผัง</h3><form class="form" onsubmit="return false">' + fld('เนื้อหา', '<select class="in" id="x-c">' + opt(CONTENTS()) + '</select>') +
      '<div class="fld"><span>แนวกระดาษ</span><div class="checks"><label class="ck"><input type="radio" name="xo" value="land" checked><span>แนวนอน</span></label><label class="ck"><input type="radio" name="xo" value="port"><span>แนวตั้ง</span></label></div></div>' +
      '<div class="fld"><span>รูปแบบ</span><label class="ck wide"><input type="radio" name="xf" value="poster" checked><span>โปสเตอร์หน้าเดียว — ทุกคนอยู่ในภาพเดียว สัดส่วนกระดาษชุด A (A4–A0) ส่งร้านพิมพ์ขยายได้</span></label><label class="ck wide"><input type="radio" name="xf" value="a4"><span>หลายหน้า A4 — พิมพ์เองแล้วนำไปติดต่อกัน</span></label></div></form>' +
      '<div class="xlist"><button class="xbtn" data-x="view"><b>ดูตัวอย่าง</b><span>ตรวจการจัดวางก่อนบันทึก</span></button><button class="xbtn" data-x="png"><b>รูปภาพ PNG ความละเอียดสูง</b><span>' + (mob ? 'ราว 4,400 พิกเซลด้านยาว (ขีดจำกัดของโทรศัพท์/แท็บเล็ต) — ต้องการละเอียดกว่านี้ให้ส่งออกจากคอมพิวเตอร์' : 'ราว 7,000 พิกเซลด้านยาว พิมพ์ได้ถึงขนาด A1 ที่ 200 dpi') + '</span></button>' +
      '<button class="xbtn" data-x="pdf"><b>PDF</b><span>โปสเตอร์เป็นหน้า A3 ขยายได้ตามสัดส่วน · หลายหน้าเป็น A4</span></button><button class="xbtn" data-x="docx"><b>รายชื่อศิษย์ (DOCX)</b><span>ตารางรายชื่อ เปิดแก้ต่อใน Word</span></button></div>' +
      '<div class="muted" id="x-msg" style="margin-top:10px"></div><button class="btn ghost block" data-close style="margin-top:12px">ปิด</button>', { center: true, wide: true });
    w.addEventListener('click', async e => {
      const b = e.target.closest('[data-x]'); if (!b || w.dataset.busy) return; const x = b.dataset.x, msg = $('#x-msg', w), content = $('#x-c', w).value, land = $('input[name=xo]:checked', w).value === 'land', poster = $('input[name=xf]:checked', w).value === 'poster';
      const prog = (i, n) => { msg.textContent = 'กำลังสร้างหน้า ' + i + ' / ' + n + ' …'; }, sc = content === 'chart' ? 'committee' : content === 'full' ? 'all' : content;
      const name = (content === 'chart' ? 'แผนผังคณะกรรมการ' : 'ทำเนียบ') + C.club.name + '-' + year() + '-' + (land ? 'แนวนอน' : 'แนวตั้ง');
      w.dataset.busy = '1'; msg.textContent = 'กำลังจัดหน้า …';
      try {
        if (x === 'docx') { await M.saveBlob(rosterDocx(sc), 'รายชื่อ' + C.club.name + '-' + M.safeName((SCOPESF().find(k => k[0] === sc) || ['', 'ทั้งหมด'])[1]) + '-' + year() + '.docx'); msg.textContent = 'เสร็จแล้ว'; }
        else {
          const root = await buildBoard(content, land, poster), pg = root.firstChild, long = poster ? Math.max(+pg.dataset.w, +pg.dataset.h) : 1123;
          if (x === 'view') { w.remove(); M.previewPages(root, 'ตัวอย่าง' + (poster ? 'โปสเตอร์' : ' (' + root.children.length + ' หน้า)')); return; }
          const scale = Math.max(2, Math.min(8, (mob ? 4400 : 7000) / long));
          if (x === 'png') await M.exportPNGs(root, name, prog, { scale }); else await M.exportPDF(root, name + '.pdf', prog, { scale: Math.min(scale, (mob ? 3600 : 5000) / long), format: poster ? 'a3' : 'a4' });
          msg.textContent = 'เสร็จแล้ว'; log('export', '', x + ' ' + content);
        }
      } catch (er) { console.error(er); msg.textContent = 'ส่งออกไม่สำเร็จ: ' + (er.message || er) + ' (PDF/PNG ต้องต่ออินเทอร์เน็ตครั้งแรกเพื่อโหลดตัวสร้างไฟล์)'; }
      delete w.dataset.busy;
    });
  }

  function viewMore() {
    const l = navItems().filter(n => !n.tab);
    return { title: 'เพิ่มเติม', body: '<div class="morelist">' + l.map(n => '<a class="more-i" href="#/' + n.id + '">' + ic(n.icon, 26) + '<span>' + n.label + '</span>' + (n.badge && n.badge() ? '<i class="bdg">' + n.badge() + '</i>' : '') + '</a>').join('') + '</div>' };
  }
  const V = { home: viewHome, chart: viewChart, members: viewMembers, m: viewMember, manage: viewManage, me: viewMe, more: viewMore, requests: viewRequests };
  const MANAGE = [];   /* การ์ดเพิ่มในหน้าจัดการ */

  /* ============ ตารางการทำงานของปุ่ม ============ */
  const ACT = {
    signin: async () => { try { B.authError = null; await B.signIn({}); } catch (e) { renderLogin(esc(B.authErrorText(e))); } },
    signout: () => B.signOut(),
    retry: () => B.retryFailed(),
    syncInfo: async () => {
      const f = await B.failedOps(), pn = B.pendingList(); const line = o => (o.t === 'update' && !o.p ? Object.keys(o.v || {}).slice(0, 3).join(', ') : o.p) || '(ราก)';
      const txt = '' + C.club.name + ' ' + C.version + ' · ' + B.mode + ' · ' + (USER ? USER.email : '') + '\n' + f.map(o => 'FAILED ' + o.t + ' ' + line(o) + ' :: ' + o.error).concat(pn.map(o => 'PENDING ' + o.t + ' ' + line(o))).join('\n');
      const w = modal('<h3>สถานะการส่งข้อมูล</h3>' + (D.rulesOld ? '<div class="note bad">ฐานข้อมูลยังใช้ Rules รุ่นเก่า — คัดลอกไฟล์ database.rules.json ไปวางที่ Firebase Console › Realtime Database › Rules แล้วกด Publish</div>' : '') +
        '<div class="lb">ส่งไม่สำเร็จ (' + f.length + ')</div>' + (f.map(o => '<div class="li"><b>' + esc(line(o)) + '</b><div class="muted">' + esc(errTH({ code: o.error })) + ' · ' + esc(M.thDate(o.failedAt)) + '</div></div>').join('') || '<div class="muted">ไม่มี</div>') +
        '<div class="lb" style="margin-top:14px">กำลังรอส่ง (' + pn.length + ')</div><div class="muted">' + (pn.map(o => esc(line(o))).join('<br>') || 'ไม่มี') + (STATUS.online === false ? '<br>ขณะนี้ออฟไลน์ ระบบจะส่งเองเมื่อมีสัญญาณ' : '') + '</div>' +
        '<div class="row wrap" style="margin-top:16px">' + (f.length ? '<button class="btn" id="s-retry">ลองส่งใหม่</button><button class="btn ghost danger" id="s-clear">ล้างรายการที่ส่งไม่สำเร็จ</button>' : '') + '<button class="btn ghost" id="s-copy">คัดลอกรายละเอียด</button><button class="btn ghost" data-close>ปิด</button></div><div class="muted" style="margin-top:8px">ถ้าส่งไม่สำเร็จซ้ำ ๆ ให้คัดลอกรายละเอียดส่งให้ผู้พัฒนา</div>', { center: true, wide: true });
      const on = (id, fn) => { const el = $(id, w); if (el) el.addEventListener('click', fn); };
      on('#s-retry', async () => { await B.retryFailed(); w.remove(); toast('กำลังลองส่งใหม่'); }); on('#s-clear', async () => { await B.discardFailed(); w.remove(); toast('ล้างรายการแล้ว'); });
      on('#s-copy', async () => { try { await navigator.clipboard.writeText(txt); toast('คัดลอกแล้ว'); } catch (e) { modal('<h3>รายละเอียด</h3><textarea class="in" rows="8" readonly>' + esc(txt) + '</textarea><button class="btn ghost block" data-close style="margin-top:10px">ปิด</button>', { center: true }); } });
    },
    addMember: () => { if (can.edit()) memberForm(null); },
    editMember: d => { if (can.edit()) memberForm(d.sid); },
    editSelf: () => { if (ME.sid && members()[ME.sid]) memberForm(ME.sid, true); },
    removeMember: d => { if (can.manage()) removeForm(d.sid); },
    role: d => { if (can.manage()) roleForm(d.sid); },
    importMembers: () => { if (can.edit()) importForm(); },
    exportMenu: () => { if (can.exp()) exportMenu(); },
    addAdvisor: () => advisorForm(null),
    editAdvisor: d => advisorForm(d.id),
    removeAdvisor: async d => {
      const a = cfg().advisors[d.id]; if (!a) return;
      if (a.email && a.email.toLowerCase() === ME.email) return toast('นำบัญชีที่กำลังใช้อยู่ออกไม่ได้', 3500);
      if (!(await M.confirmBox('นำที่ปรึกษาออก', esc(a.name) + (a.kind === 'teacher' ? ' จะเข้าใช้ระบบในฐานะครูไม่ได้อีก' : ' จะไม่แสดงในแผนผังและเอกสาร'), 'นำออก', true))) return;
      const upd = {}; upd['config/advisors/' + d.id] = null; if (a.email && !B.isBootTeacher(a.email)) upd['/teachers/' + B.emailKey(a.email) + '/' + C._club] = null;
      W(B.update('', upd)); log('advisor.remove', '', a.name);
    },
    restore: d => { const upd = { status: 'active', removedReason: null, removedAt: null, removedBy: null }; W(B.update('members/' + d.sid, upd)); W(B.set('/people/' + d.sid + '/clubs/' + C._club, true)); log('member.restore', d.sid); toast('กู้คืนแล้ว'); },
    purge: async d => {
      const m = members()[d.sid]; if (!m || m.removedReason !== 'mistake') return;
      if (!(await M.confirmBox('ลบถาวร', 'ลบข้อมูลของ ' + esc(fullName(m)) + ' ออกจากระบบทั้งหมด กู้คืนไม่ได้', 'ลบถาวร', true))) return;
      const upd = {}; ['members', 'roles', 'duties', 'contacts', 'learned', 'rites', 'noteacc', 'notereq'].forEach(k => upd[k + '/' + d.sid] = null); upd['/privateInfo/' + d.sid] = null; upd['/people/' + d.sid] = null;
      W(B.update('', upd)); W(B.remove('photos/' + d.sid)); log('member.purge', d.sid, fullName(m));
    },
    setYear: () => {
      const w = modal('<h3>ปีปัจจุบัน</h3><form class="form">' + fld('ปี พ.ศ.', '<input class="in" id="y" inputmode="numeric" value="' + esc(year()) + '">', 'กิจกรรม ประกาศ และบัญชีการเงินแยกเก็บรายปี เปลี่ยนปีเมื่อขึ้นปีใหม่ ข้อมูลปีเก่ายังอยู่ครบ') + '<div class="row" style="margin-top:16px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); const y = $('#y', w).value.trim(); if (!/^25[0-9]{2}$/.test(y)) return toast('ปี พ.ศ. ไม่ถูกต้อง'); W(B.set('config/year', y)); w.remove(); });
    },
    switchClub: () => {
      const w = modal('<h3>สลับสาขา</h3><div class="clubpick">' + C.clubs.filter(c => MYCLUBS.includes(c.id)).map(c => '<button class="clubbtn' + (c.id === C._club ? ' on' : '') + '" data-club="' + c.id + '"><img class="' + (c.round ? 'round' : '') + '" src="' + c.logo + '" alt=""><b>' + esc(c.name) + '</b><span>' + esc(c.full) + (c.id === C._club ? ' · กำลังใช้อยู่' : '') + '</span></button>').join('') + '</div><button class="btn ghost block" data-close style="margin-top:12px">ปิด</button>', { center: true });
      w.addEventListener('click', e => { const b = e.target.closest('[data-club]'); if (!b) return; if (b.dataset.club === C._club) return w.remove(); try { localStorage.setItem('ss_club', b.dataset.club); } catch (er) { /* ignore */ } location.href = location.pathname + '#/home'; location.reload(); });
    },
    joinCopy: async () => { try { await navigator.clipboard.writeText(joinURL()); toast('คัดลอกลิงก์แล้ว'); } catch (e) { toast('คัดลอกไม่ได้ — กดค้างที่ช่องลิงก์แล้วเลือกคัดลอก', 4000); } },
    joinToggle: async () => {
      if (!can.manage()) return; const open = (D.pubjoin || {}).open !== false;
      if (open && !(await M.confirmBox('ปิดรับสมัครชั่วคราว', 'ผู้ที่เปิดลิงก์สมัครจะเห็นข้อความว่าปิดรับสมัคร (สมาชิกเดิมใช้งานได้ตามปกติ)', 'ปิดรับสมัคร', true))) return;
      W(B.set('public/join', { open: !open, at: Date.now(), by: myName() })); log('join.' + (open ? 'close' : 'open'));
    },
    joinQR: async () => {
      const w = modal('<h3>QR Code สมัครสมาชิก</h3><div class="muted" style="margin-bottom:10px">ให้ผู้สมัครสแกนด้วยกล้องมือถือ</div><div id="qr" style="display:flex;justify-content:center;background:#fff;padding:16px;border-radius:12px"></div><div class="row" style="margin-top:12px"><button class="btn grow" id="qr-dl">บันทึกภาพ</button><button class="btn ghost grow" data-close>ปิด</button></div>', { center: true });
      try { if (!window.QRCode) await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; sc.onload = res; sc.onerror = () => rej(new Error('โหลดตัวสร้าง QR ไม่ได้ (ต้องต่ออินเทอร์เน็ต)')); document.head.appendChild(sc); });
        new window.QRCode($('#qr', w), { text: joinURL(), width: 260, height: 260, colorDark: '#3B2D12', colorLight: '#ffffff' });
        $('#qr-dl', w).addEventListener('click', () => { const c = $('#qr canvas', w); if (!c) return; c.toBlob(bl => M.saveBlob(bl, 'QR-สมัครสมาชิก-' + M.safeName(C.club.name) + '.png')); });
      } catch (e) { $('#qr', w).textContent = e.message; }
    },
    setupCommittee: async () => {
      if (!can.manage()) return; const list = C.initialCommittee || []; if (!list.length) return;
      if (!(await M.confirmBox('บันทึกคณะกรรมการ', 'เพิ่ม/กำหนดตำแหน่ง ' + list.length + ' รายชื่อตามโครงสร้างปัจจุบัน', 'บันทึก'))) return;
      const now = Date.now(); let n = 0;
      for (let i = 0; i < list.length; i++) {
        const x = list[i], upd = {};
        let sid = activeSids().find(s => members()[s].first === x.first && members()[s].last === x.last);
        if (!sid) { sid = await nextSid(); const rec = { prefix: x.prefix, first: x.first, last: x.last, type: 'special', status: 'active', createdAt: now, createdBy: by() }; if (x.yearIn) rec.yearIn = x.yearIn; upd['members/' + sid] = rec; upd['/people/' + sid + '/clubs/' + C._club] = true; sharedWrites(sid, sharedOf(rec), upd); D.members = Object.assign({}, D.members, { [sid]: rec }); n++; }
        if (x.role) { Object.keys(D.roles || {}).filter(s => s !== sid && (D.roles[s] || {}).role === x.role).forEach(s => { upd['roles/' + s] = null; }); upd['roles/' + sid] = { role: x.role }; }
        if (x.notes) upd['duties/' + sid] = { notes: true, order: i + 1 };
        if (x.email) { upd['/accounts/' + B.emailKey(x.email)] = sid; upd['/privateInfo/' + sid + '/loginEmail'] = x.email.toLowerCase(); }
        await B.update('', upd).catch(e => toast('บันทึกไม่สำเร็จ: ' + errTH(e), 5000));
      }
      log('committee.setup', '', list.length + ' รายชื่อ (เพิ่มใหม่ ' + n + ')'); toast('บันทึกคณะกรรมการแล้ว' + (n ? ' · เพิ่มชื่อใหม่ ' + n + ' คน' : ''), 4000);
      if (list.some(x => x.email && x.email.toLowerCase() === ME.email)) setTimeout(() => onAuth(USER), 1200);
    },
    editStudy: d => {
      const sid = d.sid, m = members()[sid]; if (!m || !(can.edit() || ME.sid === sid)) return;
      const w = modal('<h3>การเรียนกับ' + esc(C.master.short) + '</h3><div class="muted" style="margin-bottom:10px">' + esc(fullName(m)) + '</div><form class="form" id="stf">' +
        fld('เรียนที่ไหน เมื่อไร อย่างไร', '<textarea class="in" id="st-note" rows="4" placeholder="เช่น เรียนที่มหาวิทยาลัย… ปี 2548–2552 ต่อเพลงที่บ้านอาจารย์ทุกวันเสาร์">' + esc(m.studyNote || '') + '</textarea>') +
        '<div class="lb" style="margin-top:8px">เพลงที่เรียนกับอาจารย์</div>' + studiedEditor(m.studied) +
        '<div class="muted">ระบบบันทึกว่าใครแก้ไขล่าสุด และเมื่อไร</div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { sticky: true, wide: true });
      wireStudied($('#stf', w));
      $('#stf', w).addEventListener('submit', e => { e.preventDefault(); const now = Date.now(), note = $('#st-note', w).value.trim().slice(0, 2000);
        W(B.update('members/' + sid, { studyNote: note || null, studied: readStudied($('#stf', w)), studyAt: now, studyBy: by() })); log('study.edit', sid, ''); w.remove(); toast('บันทึกแล้ว'); });
    },
    reqApprove: d => { if (can.manage()) approveForm(d.k); },
    reqLink: d => { if (can.manage()) linkForm(d.k); },
    reqReject: async d => {
      if (!can.manage()) return; const r = (D.requests || {})[d.k]; if (!r) return;
      const w = modal('<h3>ไม่อนุมัติคำขอ</h3><div class="muted" style="margin-bottom:10px">' + esc(r.first + ' ' + (r.last || '')) + '</div><form class="form">' + fld('ข้อความถึงผู้ขอ (ไม่บังคับ)', '<textarea class="in" id="rj" rows="3" placeholder="เช่น โปรดระบุว่าเรียนกับอาจารย์ที่ใด"></textarea>') + '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn danger grow">ไม่อนุมัติ</button></div></form>', { center: true, sticky: true });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); W(B.update('requests/' + d.k, { status: 'rejected', reply: $('#rj', w).value.trim().slice(0, 500) || null, decidedAt: Date.now() })); log('request.reject', '', d.k); w.remove(); toast('บันทึกแล้ว'); });
    },
    reqDel: d => { if (can.manage()) W(B.remove('requests/' + d.k)); },
    reqEdit: () => { if (USER && !ME) renderRequest(USER, true); },
    reqCheck: () => { if (USER && !ME) onAuth(USER); },
    setInst: () => {
      const w = modal('<h3>รายการความถนัด / เครื่องดนตรี</h3><form class="form"><div class="muted" style="margin-bottom:8px">หนึ่งชนิดต่อหนึ่งบรรทัด ลำดับนี้ใช้ในฟอร์มและแผนผัง</div><textarea class="in" id="il" rows="12" aria-label="รายการเครื่องดนตรี">' + esc(instList().join('\n')) + '</textarea><div class="row" style="margin-top:16px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); const l = Array.from(new Set($('#il', w).value.split(/\r?\n/).map(s => s.trim().replace(/[.#$/\[\]]/g, '-')).filter(Boolean))); if (!l.length) return toast('ต้องมีอย่างน้อยหนึ่งชนิด'); W(B.set('config/instruments', l)); w.remove(); });
    },
    resetDemo: async () => { if (!(await M.confirmBox('ล้างข้อมูลสาธิต', 'เริ่มข้อมูลสมมติชุดใหม่', 'ล้าง', true))) return; await B.resetDemo(); location.hash = '#/home'; location.reload(); }
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const f = ACT[b.dataset.act]; if (f) { e.preventDefault(); f(b.dataset, b); }
  });
  document.addEventListener('input', e => { if (e.target.id === 'q') { UI.q = e.target.value; const l = $('#mlist'); if (l) { l.innerHTML = listHTML(); lastHTML = ''; } } });
  document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.filter; if (k) { UI[k] = e.target.value; const l = $('#mlist'); if (l) { l.innerHTML = listHTML(); lastHTML = ''; } } });

  /* ---------- เริ่มทำงาน ---------- */
  window.addEventListener('hashchange', () => { if (ME) render(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
  async function boot() {
    if (window.APP_PUBLIC && (await window.APP_PUBLIC())) return;   /* หน้าสาธารณะ (ถ้ามีโมดูลที่ลงทะเบียนไว้) ไม่ต้องล็อกอิน */
    try { await B.init(); } catch (er) { $('#root').innerHTML = '<div class="card" style="margin:20px">เชื่อมต่อระบบไม่สำเร็จ: ' + esc(er.message) + '<br>ตรวจอินเทอร์เน็ต แล้วลองเปิดใหม่</div>'; return; }
    B.onStatus(s => { const ch = s.pending !== STATUS.pending || s.failed !== STATUS.failed || s.online !== STATUS.online; STATUS = s; if (ch && ME) render(); });
    B.onAuth(u => { onAuth(u); });
  }
  document.addEventListener('DOMContentLoaded', boot);
  const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const DOWS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'], MONTHS_F = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  /* 'YYYY-MM-DD' → ข้อความไทย: mode 'short' = 2 ต.ค. 69 · 'full' = 2 ตุลาคม 2569 · 'dow' = วันศุกร์ที่ 2 ตุลาคม 2569 */
  function dTH(iso, mode) { if (!iso) return ''; const p = iso.split('-').map(Number); const d = new Date(p[0], p[1] - 1, p[2]); const y = p[0] + 543; return mode === 'short' ? p[2] + ' ' + M.MONTHS[p[1] - 1] + ' ' + String(y).slice(2) : (mode === 'dow' ? 'วัน' + DOWS[d.getDay()] + 'ที่ ' : '') + p[2] + ' ' + MONTHS_F[p[1] - 1] + ' ' + y; }
  window.APP = { joinURL, PERMS, permTable, V, ACT, NAVS, SUBS, HOME, MANAGE, TODO, MHOOKS, tablePages, eraOf, eraName, eraList, eraOpts, isKeeper, keepers, instChips, nickTxt, masterName, masterOpts, errTH, sharedOf, sharedWrites, SHARED, myClubs: () => MYCLUBS.slice(), UI, PRIV, ICON, can, ic, chip, fld, opt, avatar, brand, members, cfg, year, instList, activeSids, fullName, cls, typeName, roleOf, roleName, insts, byClass, advisors, myName, by, W, log, sesText, memberRow, pageHead, bigAv, printPhotos, route, todayISO, dTH, MONTHS_F, DOWS, ROLE_ORDER,
    get D() { return D; }, get ME() { return ME; }, get USER() { return USER; }, get STATUS() { return STATUS; },
    is: (...r) => !!ME && !ME.teacher && r.includes(ME.role), teacher: () => !!ME && ME.teacher, sid: () => ME && ME.sid,
    rerender() { lastHTML = ''; render(); } };
  window.__D = () => D; window.__ME = () => ME;
})();
