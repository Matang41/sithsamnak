/* ============================================================
   push.js — การแจ้งเตือน (Web Push / FCM) สองทาง: แอดมิน → ศิษย์ และ ศิษย์ → แอดมิน
   รับ:  ขอสิทธิ์ → ขอ FCM token ด้วย VAPID key → เก็บที่ people/{sid}/fcm/{hash} (ศิษย์) หรือ tpush/{อีเมล}/fcm/{hash} (แอดมิน)
   ส่ง:  แอปเขียน “คำขอแจ้งเตือน” ลงคิว c/{เครือข่าย}/pushq/{id} แล้วสะกิดตัวส่ง (Google Apps Script — tools/push-relay.gs)
         ตัวส่งเป็นผู้เลือกผู้รับและส่งจริง · คำขอจากศิษย์บอกได้แค่ชนิด + รหัสรายการ ตัวส่งแต่งข้อความเอง
   ตั้งค่า: config.js › vapidKey (กุญแจ Web Push) และ pushRelay (URL เว็บแอปของ Apps Script)
   • ใช้ Firebase app ชื่อ "push" แยกจากแอปหลัก และลงทะเบียน firebase-messaging-sw.js ด้วย scope แยก จึงไม่ชนกับ sw.js
   • การขอสิทธิ์ต้องเกิดจากการกดปุ่มของผู้ใช้เท่านั้น (ข้อกำหนดของ iOS)
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP, C = M.C;
  const { $, esc, toast, modal } = M;
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/', SW = 'firebase-messaging-sw.js', SCOPE = './firebase-cloud-messaging-push-scope';
  const standalone = () => { try { return window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone; } catch (e) { return false; } };
  const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const supported = () => 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  const sha = async s => { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 24); } catch (e) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return 'h' + h.toString(36) + s.length; } };
  const KEY = 'ss_push_key';
  const isT = () => !!(A.teacher && A.teacher());
  const me = () => isT() || !!A.sid();
  /* ที่เก็บของผู้ใช้คนนี้: token และชนิดที่ปิดไว้ */
  const base = () => isT() ? '/tpush/' + B.emailKey(A.ME.email) : '/people/' + A.sid();
  const offKey = () => isT() ? 'off' : 'poff';
  /* ชนิดการแจ้งเตือนที่เลือกรับได้ */
  const GROUPS_S = [['ann', 'ประกาศและข้อความจากแอดมิน'], ['ev', 'กิจกรรมใหม่ และเตือนก่อนวันกิจกรรม'], ['poll', 'เปิดโหวต'], ['own', 'เรื่องของฉัน (สิทธิ์ดูโน้ต รางวัล เกียรติบัตร)']];
  const GROUPS_T = [['join', 'คำขอเข้าร่วมเครือข่ายใหม่'], ['sub', 'คำขอดูโน้ต และบันทึกคำสอน / ทางเพลงที่รอตรวจ'], ['griev', 'ร้องทุกข์ / ข้อความลับ'], ['tx', 'รายการเงินรออนุมัติ'], ['ann', 'ประกาศ/กิจกรรมที่กรรมการสร้าง'], ['weekly', 'สรุปรายสัปดาห์ (เย็นวันศุกร์)']];
  let OFF = null;   /* { ชนิด: true } ที่ผู้ใช้ปิดไว้ */

  async function waitActive(reg) {
    if (reg.active) return reg; const w = reg.installing || reg.waiting; if (!w) return reg;
    await new Promise(res => { if (w.state === 'activated') return res(); w.addEventListener('statechange', () => { if (w.state === 'activated') res(); }); }); return reg;
  }
  let MSG = null;
  async function messaging() {
    if (MSG) return MSG;
    const [app_, msg_] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-messaging.js')]);
    if (!(await msg_.isSupported())) throw new Error('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
    const app = app_.getApps().find(a => a.name === 'push') || app_.initializeApp(C.firebase, 'push');
    const reg = await waitActive(await navigator.serviceWorker.register(SW, { scope: SCOPE }));
    const m = msg_.getMessaging(app);
    msg_.onMessage(m, p => { const d = p.data || p.notification || {}; toast((d.title ? d.title + ': ' : '') + (d.body || ''), 7000); });   /* ขณะเปิดแอปอยู่ */
    MSG = { m, reg, getToken: msg_.getToken, deleteToken: msg_.deleteToken }; return MSG;
  }

  /* silent = true: ไม่ขอสิทธิ์ใหม่ แค่ต่ออายุ token ที่เคยอนุญาตไว้ */
  async function enable(silent) {
    if (!me()) throw new Error('ต้องเข้าสู่ระบบก่อน');
    if (!C.vapidKey) throw new Error('ยังไม่ได้ใส่ vapidKey ใน config.js');
    if (!supported()) throw new Error(ios() && !standalone() ? 'iPhone/iPad ต้องกด “เพิ่มไปยังหน้าจอโฮม” แล้วเปิดแอปจากไอคอนก่อน' : 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
    let perm = Notification.permission;
    if (perm === 'default' && !silent) perm = await Notification.requestPermission();   /* เรียกก่อน await อื่น เพื่อให้ยังนับเป็นการกดของผู้ใช้ */
    if (perm !== 'granted') throw new Error(perm === 'denied' ? 'การแจ้งเตือนถูกปิดกั้น — เปิดได้ที่ตั้งค่าของเบราว์เซอร์/เครื่อง' : 'ยังไม่ได้อนุญาตการแจ้งเตือน');
    const { m, reg, getToken } = await messaging();
    const token = await getToken(m, { vapidKey: C.vapidKey, serviceWorkerRegistration: reg });
    if (!token) throw new Error('ขอ token ไม่สำเร็จ');
    const key = await sha(token); let old = ''; try { old = localStorage.getItem(KEY) || ''; } catch (e) { /* ignore */ }
    await B.set(base() + '/fcm/' + key, { t: token, at: Date.now(), p: standalone() ? 'pwa' : 'web', ua: navigator.userAgent.slice(0, 120) });
    if (old && old !== key) B.remove(base() + '/fcm/' + old).catch(() => { });   /* token เปลี่ยน: ลบของเก่าของเครื่องนี้ */
    try { localStorage.setItem(KEY, key); } catch (e) { /* ignore */ }
    return token;
  }
  async function disable() {
    let key = ''; try { key = localStorage.getItem(KEY) || ''; } catch (e) { /* ignore */ }
    try { const { m, deleteToken } = await messaging(); await deleteToken(m); } catch (e) { /* ignore */ }
    if (me() && key) await B.remove(base() + '/fcm/' + key); try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  /* ---------- ส่ง: เขียนคำขอลงคิว แล้วสะกิดตัวส่ง ---------- */
  let kickT = 0;
  function kick() { if (!C.pushRelay) return; clearTimeout(kickT); kickT = setTimeout(() => { try { fetch(C.pushRelay, { mode: 'no-cors', cache: 'no-store' }).catch(() => { }); } catch (e) { /* ignore */ } }, 1200); }
  const clean = o => { const r = {}; Object.keys(o).forEach(k => { if (o[k] !== undefined && o[k] !== null && o[k] !== '') r[k] = o[k]; }); return r; };
  /* ใช้ได้ทั้งหน้าที่ล็อกอินและหน้าสาธารณะ (ใบสมัคร / ผู้ปกครองเซ็น) */
  async function raw(cid, id, rec) {
    if (B.mode === 'demo' || !cid) return;
    const p = '/c/' + cid + '/pushq/' + id, v = clean(Object.assign({ at: Date.now() }, rec));
    try { await B.direct('set', p, v); kick(); } catch (e) { console.warn('pushq', e); }
  }
  /* kind: leave | griev | tx | att (ศิษย์ → แอดมิน: ส่งแค่ ref)  ·  ann | ev | poll | msg | leaveok | cert | ctreq (→ ศิษย์: มี title/body, to = รหัสศิษย์คั่นด้วย , หรือเว้นไว้ = ทุกคน) */
  function notify(kind, o) {
    try {
      if (!me()) return; o = o || {};
      const rec = { k: kind, by: isT() ? 'T' : A.sid(), ref: o.ref ? String(o.ref).slice(0, 80) : null, title: o.title ? String(o.title).slice(0, 110) : null, body: o.body ? String(o.body).slice(0, 380) : null,
        url: o.url ? String(o.url).slice(0, 120) : null, to: o.to ? (Array.isArray(o.to) ? o.to.join(',') : String(o.to)).slice(0, 4000) : null, grade: o.grade || null };
      raw(C.club.id, B.uid(), rec);
    } catch (e) { console.warn('notify', e); }
  }
  window.PUSH = { notify, raw, enable, disable };

  /* ---------- การ์ดบนหน้าหลัก ---------- */
  function loadOff() { if (OFF || !me() || B.mode === 'demo') { OFF = OFF || {}; return; } OFF = {}; B.get(base() + '/' + offKey()).then(v => { OFF = v || {}; A.rerender(); }).catch(() => { }); }
  A.HOME.push({ order: 97, html: () => {
    if (!me()) return ''; loadOff();
    const T = isT(), st = ('Notification' in window) ? Notification.permission : 'unsupported'; let body;
    if (!supported()) body = '<div class="muted">' + (ios() && !standalone() ? 'บน iPhone/iPad: กดปุ่มแชร์ › “เพิ่มไปยังหน้าจอโฮม” แล้วเปิดแอปจากไอคอนนั้น (ต้องใช้ iOS 16.4 ขึ้นไป) จึงจะเปิดการแจ้งเตือนได้' : 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน') + '</div>';
    else if (st === 'granted') body = '<div class="row wrap">' + A.chip('เครื่องนี้เปิดการแจ้งเตือนแล้ว', 'ok') + '<button class="btn ghost sm" data-act="pushOff">ปิดบนเครื่องนี้</button></div>' +
      '<div class="muted" style="margin:10px 0 6px">เลือกเรื่องที่ต้องการรับ (ใช้กับทุกเครื่องของบัญชีนี้)</div><div class="checks">' + (T ? GROUPS_T : GROUPS_S).map(g => '<label class="ck"><input type="checkbox" data-pg="' + g[0] + '"' + ((OFF || {})[g[0]] ? '' : ' checked') + '><span>' + esc(g[1]) + '</span></label>').join('') + '</div>';
    else if (st === 'denied') body = '<div class="muted">การแจ้งเตือนถูกปิดกั้นไว้ — เปิดได้ที่ตั้งค่าของเบราว์เซอร์หรือเครื่อง แล้วกลับมากดใหม่</div>';
    else body = '<div class="muted" style="margin-bottom:8px">' + (T ? 'รับแจ้งเตือนเมื่อมีคำขอเข้าร่วม ศิษย์ส่งบันทึก ร้องทุกข์ หรือมีรายการรออนุมัติ' : 'รับแจ้งเตือนนัดซ้อม กิจกรรม ประกาศ และผลใบลาจากแอดมิน') + '</div><button class="btn sm" data-act="pushOn">เปิดการแจ้งเตือนบนเครื่องนี้</button>';
    if (T) body += '<div class="row wrap" style="margin-top:12px"><button class="btn ghost sm" data-act="pushSend">ส่งข้อความแจ้งเตือนถึงศิษย์</button></div>' + (C.pushRelay ? '' : '<div class="note warn">ยังไม่ได้ตั้งค่าตัวส่ง (pushRelay ใน config.js) การแจ้งเตือนจะยังไม่ถูกส่งออก — ดูวิธีตั้งค่าใน README หัวข้อ “การแจ้งเตือนสองทาง”</div>');
    return '<section class="card"><div class="lb">การแจ้งเตือน</div>' + body + '</section>';
  } });
  document.addEventListener('change', e => {
    const k = e.target && e.target.dataset && e.target.dataset.pg; if (!k || !me()) return;
    OFF = OFF || {}; if (e.target.checked) delete OFF[k]; else OFF[k] = true;
    A.W(B.set(base() + '/' + offKey() + '/' + k, e.target.checked ? null : true));
  });
  Object.assign(A.ACT, {
    pushOn: async () => { try { await enable(false); toast('เปิดการแจ้งเตือนแล้ว', 3000); } catch (e) { console.error(e); toast('เปิดการแจ้งเตือนไม่สำเร็จ: ' + (e.message || e), 7000); } A.rerender(); },
    pushOff: async () => { try { await disable(); toast('ปิดการแจ้งเตือนบนเครื่องนี้แล้ว'); } catch (e) { toast('ปิดไม่สำเร็จ: ' + (e.message || e), 5000); } A.rerender(); },
    pushSend: () => {
      if (!isT()) return;
      const w = modal('<h3>ส่งข้อความแจ้งเตือน</h3><form class="form"><div class="muted" style="margin-bottom:8px">ส่งถึงศิษย์ในเครือข่าย' + esc(C.club.name) + 'ที่เปิดการแจ้งเตือนไว้</div>' +
        A.fld('หัวข้อ', '<input class="in" id="ps-t" maxlength="100" required>') + A.fld('ข้อความ', '<textarea class="in" id="ps-b" rows="3" maxlength="350"></textarea>') +
        '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">ส่ง</button></div></form>', { center: true, sticky: true });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); const t = $('#ps-t', w).value.trim(); if (!t) return;
        notify('msg', { title: t, body: $('#ps-b', w).value.trim(), grade: null }); A.log('push.send', '', t); w.remove(); toast(C.pushRelay ? 'ส่งเข้าคิวแล้ว จะถึงเครื่องศิษย์ในไม่ช้า' : 'บันทึกเข้าคิวแล้ว แต่ยังไม่ได้ตั้งค่าตัวส่ง', 4000); });
    }
  });
  /* ต่ออายุ token อัตโนมัติ 1 ครั้งต่อการเปิดแอป (เฉพาะคนที่เคยอนุญาตแล้ว) */
  let done = false;
  setInterval(() => { if (done || !me() || B.mode === 'demo' || !('Notification' in window) || Notification.permission !== 'granted' || !C.vapidKey || A.STATUS.online === false) return; done = true; enable(true).catch(e => console.warn('push refresh', e)); }, 4000);
})();
