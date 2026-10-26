/* ============================================================
   push-relay.gs — ตัวส่งแจ้งเตือนของแอปศิษย์สำนัก (ยกจากระบบชมรมรุ่น 3.5) (Google Apps Script · ฟรี ไม่ต้องใช้แผน Blaze)
   หน้าที่: อ่านคิว c/{หน่วย}/pushq ในฐานข้อมูล → เลือกผู้รับ → ส่งผ่าน Firebase Cloud Messaging → ลบคิว
            และเตือนล่วงหน้าหนึ่งวันก่อนกิจกรรม (ทุกวัน 17.00 น.)

   หน้าที่เพิ่มในรุ่น 3.5: กล่องแจ้งเตือนในแอป · เตือนซ้ำคนที่ยังไม่ทำ · สรุปรายสัปดาห์ถึงครู · สำรองฐานข้อมูลลง Google Drive ทุกคืน
   ★ อัปเดตจากรุ่นก่อน: วางไฟล์นี้ทับของเดิม › เรียกใช้ setup อีกครั้ง (จะถามสิทธิ์ Google Drive) › ทำให้ใช้งานได้ › จัดการ › แก้ไข › เวอร์ชันใหม่

   ติดตั้ง (ครั้งเดียว):
   1) script.google.com › โปรเจ็กต์ใหม่ › วางไฟล์นี้ทั้งหมดแทน Code.gs
   2) Firebase Console › Project settings › Service accounts › Generate new private key (ได้ไฟล์ .json)
      Apps Script › ⚙ การตั้งค่าโปรเจ็กต์ › คุณสมบัติสคริปต์ › เพิ่ม  ชื่อ: SERVICE_ACCOUNT  ค่า: วางเนื้อหาไฟล์ .json ทั้งหมด
      ★ ไฟล์ .json นี้เป็นความลับ ห้ามอัปขึ้น GitHub หรือส่งให้ใคร เก็บไว้ในคุณสมบัติสคริปต์เท่านั้น
   3) เลือกฟังก์ชัน setup แล้วกด “เรียกใช้” (อนุญาตสิทธิ์ตามที่ถาม) — สร้างตัวตั้งเวลาให้
   4) ทำให้ใช้งานได้ › การทำให้ใช้งานได้รายการใหม่ › ประเภท “เว็บแอป” › เรียกใช้ในฐานะ “ฉัน” › ผู้มีสิทธิ์เข้าถึง “ทุกคน”
      คัดลอก URL (ลงท้าย /exec) ไปวางที่ config.js › pushRelay
   5) ทดสอบ: เปิดการแจ้งเตือนในแอปด้วยบัญชีแอดมิน แล้วเรียกใช้ฟังก์ชัน testTeachers
   ★ ก่อนติดตั้ง: แก้ค่าคงที่ DB และ PROJECT ด้านล่างให้ตรงกับโปรเจกต์ Firebase ใหม่ของศิษย์สำนัก
   ============================================================ */
const DB = 'https://ใส่ชื่อโปรเจกต์-default-rtdb.asia-southeast1.firebasedatabase.app';   // ★ ตรงกับ config.js › firebase.databaseURL
const PROJECT = 'ใส่ชื่อโปรเจกต์';                                                     // ★ ตรงกับ config.js › firebase.projectId
const APP_URL = 'https://ใส่ที่อยู่เว็บ/';                                             // ★ ที่อยู่เว็บของแอป (GitHub Pages) ลงท้ายด้วย /
const CLUBS = { ss: 'ศิษย์สำนัก' };
const PAGE = { ss: APP_URL + 'index.html' };
const BOOT_TEACHERS = ['ntpwm2541@gmail.com'];          // ตรงกับ teacherEmails ใน config.js และ BOOT ใน tools/build-rules.py
const DEFAULT_YEAR = '2569';
const TZ = 'Asia/Bangkok';
const FROM_STUDENT = { griev: 1, tx: 1, join: 1, sub: 1 };                        // ตัวส่งแต่งข้อความเอง ส่งถึงแอดมิน
const STAFF_OK = { ann: 1, ev: 1 };                                               // กรรมการส่งถึงสมาชิกได้
const GROUP = { ann: 'ann', msg: 'ann', ev: 'ev', poll: 'poll', cert: 'own', note: 'own' };   // หมวดที่ศิษย์เลือกปิดได้

function doGet() { let r; try { r = run(); } catch (e) { r = 'error'; console.error(e); } return ContentService.createTextOutput(String(r)); }

function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('run').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('remind').timeBased().atHour(17).everyDays(1).inTimezone(TZ).create();
  ScriptApp.newTrigger('weekly').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(17).inTimezone(TZ).create();
  ScriptApp.newTrigger('backup').timeBased().atHour(2).everyDays(1).inTimezone(TZ).create();
  DriveApp.getRootFolder();   // ขอสิทธิ์ Google Drive สำหรับไฟล์สำรอง
  token_(); console.log('พร้อมใช้งาน: อ่านคิวทุก 5 นาที · เตือนรายวัน 17.00 น. · สรุปรายสัปดาห์วันศุกร์ 17.00 น. · สำรองลง Google Drive ทุกคืน 02.00 น.');
}

/* ---------- สิทธิ์เข้าถึง ---------- */
function token_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('tok'); if (hit) return hit;
  const raw = PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT');
  if (!raw) throw new Error('ยังไม่ได้ใส่คุณสมบัติสคริปต์ SERVICE_ACCOUNT');
  const sa = JSON.parse(raw), now = Math.floor(Date.now() / 1000);
  const enc = o => Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, '');
  const input = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc({ iss: sa.client_email, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email' });
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(input, sa.private_key)).replace(/=+$/, '');
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: input + '.' + sig } });
  const tok = JSON.parse(res.getContentText()).access_token; cache.put('tok', tok, 3000); return tok;
}
function db_(method, path, body) {
  const opt = { method: method, headers: { Authorization: 'Bearer ' + token_() }, muteHttpExceptions: true };
  if (body !== undefined) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  const q = path.indexOf('?'), res = UrlFetchApp.fetch(DB + '/' + (q < 0 ? path : path.slice(0, q)) + '.json' + (q < 0 ? '' : path.slice(q)), opt);
  if (res.getResponseCode() >= 300) throw new Error('DB ' + method + ' ' + path + ' → ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText());
}

/* ---------- ข้อมูลผู้รับของชมรม ---------- */
function ctx_(cid) {
  const members = db_('get', 'c/' + cid + '/members') || {}, people = db_('get', 'people') || {}, teachers = db_('get', 'teachers') || {}, tpush = db_('get', 'tpush') || {};
  const key = e => String(e).toLowerCase().replace(/\./g, ',');
  const tkeys = {}; BOOT_TEACHERS.forEach(e => { tkeys[key(e)] = 1; });
  Object.keys(teachers).forEach(k => { const v = teachers[k]; if (v === true || (v && v[cid] === true)) tkeys[k] = 1; });
  const name = sid => { const m = members[sid]; return m ? (m.prefix || '') + (m.first || '') + ' ' + (m.last || '') : 'ศิษย์'; };
  const active = () => Object.keys(members).filter(s => members[s] && members[s].status === 'active');
  /* token ของนักเรียน (ข้ามคนที่ปิดหมวดนั้น) */
  const stu = (sids, group) => { const out = []; sids.forEach(s => { const p = people[s] || {}; if (!members[s] || members[s].status !== 'active') return; if (group && p.poff && p.poff[group]) return;
    out.push({ box: 'inbox/' + s }); Object.keys(p.fcm || {}).forEach(k => out.push({ t: p.fcm[k].t, path: 'people/' + s + '/fcm/' + k })); }); return out; };
  const tea = group => { const out = []; Object.keys(tkeys).forEach(k => { const p = tpush[k] || {}; if (group && p.off && p.off[group]) return; out.push({ box: 'tinbox/' + k });
    Object.keys(p.fcm || {}).forEach(h => out.push({ t: p.fcm[h].t, path: 'tpush/' + k + '/fcm/' + h })); }); return out; };
  return { cid: cid, members: members, people: people, name: name, active: active, stu: stu, tea: tea };
}

/* ---------- อ่านคิวแล้วส่ง ---------- */
function run() {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(500)) return 'busy';
  try {
    let n = 0;
    Object.keys(CLUBS).forEach(cid => {
      const q = db_('get', 'c/' + cid + '/pushq'); if (!q) return;
      const cx = ctx_(cid);
      Object.keys(q).sort((a, b) => (q[a].at || 0) - (q[b].at || 0)).forEach(id => {
        const it = q[id] || {};
        try { if (Date.now() - (it.at || 0) < 24 * 3600 * 1000) n += handle_(cx, id, it); } catch (e) { console.error(id, e); }
        db_('delete', 'c/' + cid + '/pushq/' + id);
      });
    });
    return 'sent ' + n;
  } finally { lock.releaseLock(); }
}
function handle_(cx, id, it) {
  const cid = cx.cid, club = CLUBS[cid], k = String(it.k || ''), by = String(it.by || ''), page = PAGE[cid];
  const fromT = by === 'T', who = fromT ? 'แอดมิน' : cx.name(by);
  if (FROM_STUDENT[k]) {                                   // ศิษย์/ผู้ขอเข้าร่วม → แอดมิน : ข้อความกำหนดโดยตัวส่ง
    let title, body, url;
    if (k === 'griev') { title = 'ข้อความลับใหม่'; body = 'มีข้อความใหม่ถึงแอดมิน'; url = '#/griev'; }
    else if (k === 'tx') { title = 'รายการเงินรออนุมัติ'; body = who + ' ส่งรายการ ' + String(it.ref || '').slice(0, 30); url = '#/finance'; }
    else if (k === 'sub') { const ref = String(it.ref || ''); if (!/^(teach|learned|notereq)\//.test(ref)) return 0;
      if (ref.indexOf('notereq/') === 0) { title = 'คำขอสิทธิ์ดูโน้ตเพลง'; body = who + ' ขอสิทธิ์ดูโน้ตเพลง'; url = '#/songs'; }
      else { title = ref.indexOf('teach/') === 0 ? 'บันทึกคำสอน/ผลงานรอตรวจ' : 'ทางเพลงที่ศิษย์บันทึก รอยืนยัน'; body = who + ' ส่งบันทึกเข้าคลังวิชา'; url = ref.indexOf('teach/') === 0 ? '#/teach' : '#/songs'; } }
    else { const a = db_('get', 'c/' + cid + '/requests/' + encodeURIComponent(it.ref)) || {}; if (!a.first) return 0; title = 'คำขอเข้าร่วมเครือข่ายใหม่'; body = (a.prefix || '') + a.first + ' ' + (a.last || '') + (a.nick ? ' (' + a.nick + ')' : '') + (a.yearIn ? ' · เริ่มเรียน ' + a.yearIn : ''); url = '#/requests'; }
    return send_(cx.tea(k), { title: title + ' · ' + club, body: body, url: page + url, tag: k + '-' + id });
  }
  if (!fromT && !STAFF_OK[k]) return 0;                    // ศิษย์ทั่วไปส่งถึงคนอื่นไม่ได้
  if (!fromT && !cx.members[by]) return 0;
  if (!it.title) return 0;
  let sids = it.to ? String(it.to).split(',').map(s => s.trim()).filter(s => cx.members[s]) : cx.active();
  if (it.grade) sids = sids.filter(s => +cx.members[s].grade === +it.grade);
  if (!fromT) sids = sids.filter(s => s !== by);
  const msg = { title: String(it.title).slice(0, 120), body: (fromT ? '' : who + ': ') + String(it.body || '').slice(0, 400), url: page + (it.url && /^#\//.test(it.url) ? it.url : ''), tag: k + '-' + id };
  let list = cx.stu(sids, GROUP[k] || 'own');
  if (!fromT) list = list.concat(cx.tea('ann'));           // แอดมินรับรู้สิ่งที่กรรมการประกาศ
  return send_(list, msg);
}

/* ---------- ส่งผ่าน FCM (HTTP v1) ---------- */
function send_(list, msg) {
  /* กล่องแจ้งเตือนในแอป (เก็บย้อนหลัง แม้เครื่องไม่เด้ง) */
  const boxes = {}, bid = 'n' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36), hash = (String(msg.url || '').match(/#\/.*$/) || [''])[0], cid = (String(msg.url || '').match(/club=([a-z0-9]+)/) || [])[1] || Object.keys(CLUBS)[0];
  list.forEach(x => { if (x.box) boxes[x.box + '/' + bid] = { t: msg.title, b: msg.body || null, u: hash || null, c: cid, at: Date.now() }; });
  if (Object.keys(boxes).length) { try { db_('patch', '', boxes); } catch (e) { console.warn('inbox', e); } }
  const seen = {}; list = list.filter(x => x.t && !seen[x.t] && (seen[x.t] = 1)); if (!list.length) return 0;
  const tok = token_(), url = 'https://fcm.googleapis.com/v1/projects/' + PROJECT + '/messages:send'; let ok = 0;
  for (let i = 0; i < list.length; i += 40) {
    const part = list.slice(i, i + 40);
    const res = UrlFetchApp.fetchAll(part.map(x => ({ url: url, method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true,
      payload: JSON.stringify({ message: { token: x.t, data: { title: msg.title, body: msg.body || '', url: msg.url || './', tag: msg.tag || '' }, webpush: { headers: { Urgency: 'high', TTL: '86400' } } } }) })));
    res.forEach((r, n) => { const c = r.getResponseCode(); if (c === 200) ok++; else if (c === 404 || /UNREGISTERED|registration-token-not-registered/.test(r.getContentText())) { try { db_('delete', part[n].path); } catch (e) { /* ignore */ } } else console.warn(c, r.getContentText().slice(0, 200)); });
  }
  return ok;
}

/* ---------- เตือนหนึ่งวันก่อนกิจกรรม (ตัวตั้งเวลารายวัน) ---------- */
function remind() {
  const tm = Utilities.formatDate(new Date(Date.now() + 24 * 3600 * 1000), TZ, 'yyyy-MM-dd'); let n = 0;
  Object.keys(CLUBS).forEach(cid => {
    const year = db_('get', 'c/' + cid + '/config/year') || DEFAULT_YEAR, evs = db_('get', 'c/' + cid + '/y/' + year + '/events') || {};
    const due = Object.keys(evs).filter(id => evs[id] && evs[id].date === tm && evs[id].status !== 'cancelled');
    const cx = ctx_(cid);
    due.forEach(id => { const e = evs[id], sids = e.people ? Object.keys(e.people) : cx.active();
      n += send_(cx.stu(sids, 'ev'), { title: 'พรุ่งนี้: ' + e.title, body: [e.start ? 'เวลา ' + e.start + (e.end ? '–' + e.end : '') : '', e.place ? 'ณ ' + e.place : ''].filter(String).join(' ') || CLUBS[cid], url: PAGE[cid] + '#/ev/' + id, tag: 'rem-' + id }); });
    try { n += nudge_(cid, cx, year); } catch (e) { console.error('nudge', cid, e); }
  });
  console.log('remind sent ' + n); return n;
}

/* ---------- เตือนซ้ำคนที่ยังไม่ทำ (เรียกจาก remind ทุกวัน) ---------- */
function nudge_(cid, cx, year) {
  const now = Date.now(), DAY = 24 * 3600 * 1000, act = cx.active(), base = 'c/' + cid + '/', todo = {};   // sid → [ข้อความ]
  const add = (s, t) => { (todo[s] = todo[s] || []).push(t); };
  /* โหวตที่เปิดมาเกิน 1 วันและยังไม่ลงคะแนน */
  const polls = db_('get', base + 'polls') || {};
  Object.keys(polls).forEach(pid => { const p = polls[pid]; if (!p || p.status !== 'open' || (p.who && p.who !== 'all') || now - (p.createdAt || 0) < DAY || now - (p.createdAt || 0) > 14 * DAY) return;
    const b = db_('get', base + 'ballots/' + pid + '?shallow=true') || {}; act.forEach(s => { if (!b[s]) add(s, 'ยังไม่ได้โหวต: ' + p.title); }); });
  /* ประกาศอายุ 1–7 วันที่ยังไม่กดรับทราบ */
  const ann = db_('get', base + 'y/' + year + '/announce') || {}, acks = db_('get', base + 'y/' + year + '/acks') || {};
  Object.keys(ann).forEach(aid => { const a = ann[aid]; if (!a || !a.title || now - (a.at || 0) < DAY || now - (a.at || 0) > 7 * DAY) return;
    act.forEach(s => { if (a.grade && +cx.members[s].grade !== +a.grade) return; if ((a.by || {}).id === s) return; if (!(acks[s] || {})[aid]) add(s, 'ยังไม่ได้รับทราบประกาศ: ' + a.title); }); });
  let n = 0;
  Object.keys(todo).forEach(s => { const l = todo[s]; n += send_(cx.stu([s], 'own'), { title: 'มี ' + l.length + ' เรื่องรอคุณอยู่ · ' + CLUBS[cid], body: l.slice(0, 3).join(' · ') + (l.length > 3 ? ' และอื่น ๆ' : ''), url: PAGE[cid] + '#/home', tag: 'nudge' }); });
  return n;
}

/* ---------- สรุปรายสัปดาห์ถึงแอดมิน (เย็นวันศุกร์): งานค้างและความเคลื่อนไหวของคลังวิชา ---------- */
function weekly() {
  let n = 0; const now = Date.now(), WEEK = 7 * 24 * 3600 * 1000;
  Object.keys(CLUBS).forEach(cid => { try {
    const cx = ctx_(cid), base = 'c/' + cid + '/', year = db_('get', base + 'config/year') || DEFAULT_YEAR;
    const req = db_('get', base + 'requests') || {}, teach = db_('get', base + 'teach') || {}, learned = db_('get', base + 'learned') || {}, led = db_('get', base + 'y/' + year + '/ledger') || {};
    const pr = Object.keys(req).filter(k => req[k] && req[k].first && req[k].status !== 'rejected').length;
    const pt = Object.keys(teach).filter(k => teach[k] && teach[k].status === 'pending').length;
    let pl = 0, nl = 0; Object.keys(learned).forEach(s => Object.keys(learned[s] || {}).forEach(g => { const r = learned[s][g] || {}; if (!r.ok) pl++; if (now - (r.at || 0) < WEEK) nl++; }));
    const nt = Object.keys(teach).filter(k => teach[k] && now - (teach[k].at || 0) < WEEK).length, px = Object.keys(led).filter(k => led[k] && led[k].status === 'pending').length;
    const parts = ['ศิษย์ในเครือข่าย ' + cx.active().length + ' คน'];
    if (nl || nt) parts.push('สัปดาห์นี้: บันทึกทางเพลง ' + nl + ' · คำสอน/ผลงาน ' + nt);
    const pend = []; if (pr) pend.push('คำขอเข้าร่วม ' + pr); if (pl) pend.push('ทางเพลงรอยืนยัน ' + pl); if (pt) pend.push('คำสอนรอตรวจ ' + pt); if (px) pend.push('รายการเงิน ' + px);
    parts.push(pend.length ? 'รอแอดมิน: ' + pend.join(' · ') : 'ไม่มีงานค้าง');
    n += send_(cx.tea('weekly'), { title: 'สรุปสัปดาห์นี้ · ' + CLUBS[cid], body: parts.join(' | '), url: PAGE[cid] + '#/home', tag: 'weekly' });
  } catch (e) { console.error('weekly', cid, e); } });
  console.log('weekly sent ' + n); return n;
}

/* ---------- สำรองฐานข้อมูลลง Google Drive (ทุกคืน) ---------- */
const BACKUP_FOLDER = 'สำรองฐานข้อมูลศิษย์สำนัก', BACKUP_KEEP_DAYS = 30;
function backup() {
  const res = UrlFetchApp.fetch(DB + '/.json', { headers: { Authorization: 'Bearer ' + token_() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('อ่านฐานข้อมูลไม่สำเร็จ ' + res.getResponseCode());
  const blob = res.getBlob(), bytes = blob.getBytes().length, name = 'sisamnak-' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd') + '.json';
  const it = DriveApp.getFoldersByName(BACKUP_FOLDER), folder = it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER);
  const same = folder.getFilesByName(name + '.gz'); while (same.hasNext()) same.next().setTrashed(true);
  folder.createFile(Utilities.gzip(blob, name + '.gz'));
  const cut = Date.now() - BACKUP_KEEP_DAYS * 24 * 3600 * 1000, fs = folder.getFiles();
  while (fs.hasNext()) { const f = fs.next(); if (/^sisamnak-.*\.json\.gz$/.test(f.getName()) && f.getDateCreated().getTime() < cut) f.setTrashed(true); }
  db_('put', 'backup/last', { at: Date.now(), bytes: bytes, file: name + '.gz' });
  console.log('สำรองแล้ว ' + name + '.gz · ' + Math.round(bytes / 1024) + ' KB'); return bytes;
}

/* ---------- ทดสอบ ---------- */
function testTeachers() { let n = 0; Object.keys(CLUBS).forEach(cid => { n += send_(ctx_(cid).tea(null), { title: 'ทดสอบการแจ้งเตือน · ' + CLUBS[cid], body: 'ตัวส่งทำงานแล้ว', url: PAGE[cid], tag: 'test' }); }); console.log('ส่งถึงเครื่องแอดมิน ' + n + ' เครื่อง'); }
