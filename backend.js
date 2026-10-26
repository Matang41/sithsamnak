/* ============================================================
   backend.js — ชั้นข้อมูลของแอปศิษย์สำนัก (ยกจากระบบชมรมสรรพวาทิต รุ่น 3.5)
   • Firebase Realtime Database + Google Sign-in
   • โหมดสาธิต (ไม่ต้องมีเซิร์ฟเวอร์) — ข้อมูลอยู่ในเบราว์เซอร์นี้ เปิดหลายแท็บจำลองหลายผู้ใช้
   • กันข้อมูลหาย: ทุกการเขียนเข้า "กล่องขาออก" (Outbox) ใน IndexedDB ก่อน → ส่งขึ้นเซิร์ฟเวอร์
   ============================================================ */
(function () {
  'use strict';
  const C = window.APP_CONFIG;
  const clone = v => v == null ? null : JSON.parse(JSON.stringify(v));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const parts = p => String(p).split('/').filter(Boolean);
  function getAt(t, p) { let n = t; for (const k of parts(p)) { if (n == null || typeof n !== 'object') return null; n = n[k]; } return n === undefined ? null : n; }
  function setAt(t, p, v) {
    const ks = parts(p); let n = t;
    for (let i = 0; i < ks.length - 1; i++) { if (n[ks[i]] == null || typeof n[ks[i]] !== 'object') n[ks[i]] = {}; n = n[ks[i]]; }
    const last = ks[ks.length - 1];
    if (v == null) delete n[last]; else n[last] = clone(v);
  }
  function applyOp(t, op) {
    if (op.t === 'set') setAt(t, op.p, op.v);
    else if (op.t === 'update') Object.keys(op.v).forEach(k => setAt(t, op.p + '/' + k, op.v[k]));
    else if (op.t === 'remove') setAt(t, op.p, null);
  }
  const isBlob = p => /^photos\/[^/]+$|(^|\/)libfiles\/[^/]+$|(^|\/)teachfiles\/[^/]+$|(^|\/)notefiles\/[^/]+\/[^/]+$/.test(String(p || ''));   /* ภาพขนาดใหญ่ — โหมดสาธิตเก็บใน IndexedDB แทน localStorage */
  const norm = p => parts(p).join('/');
  /* ขอบเขตชมรม: path ที่ขึ้นต้นด้วยรากข้อมูลของชมรมจะถูกเติม c/{ชมรม}/ ให้อัตโนมัติ · path ที่ขึ้นต้นด้วย "/" คือระบุเต็ม ไม่เติม
     ข้อมูลส่วนกลาง (ไม่เติม): teachers, accounts, people, privateInfo, photos, inbox, rulesProbe */
  const CLUB_ROOTS = ['config', 'members', 'roles', 'duties', 'history', 'actions', 'y', 'polls', 'ballots', 'griev', 'alumni', 'archive', 'public', 'applications', 'awards', 'certs', 'certidx', 'library', 'libfiles', 'gtok', 'sigs', 'requests', 'contacts', 'songs', 'learned', 'lineage', 'rites', 'teach', 'teachfiles', 'notes', 'notefiles', 'noteacc', 'notereq'];
  let scope = '';
  const mp = p => { p = String(p == null ? '' : p); if (p.charAt(0) === '/') return norm(p); p = norm(p); if (!scope || !p) return p; return CLUB_ROOTS.includes(p.split('/')[0]) ? scope + '/' + p : p; };
  const mv = (t, p, v) => (t === 'update' && !norm(p) && v) ? Object.keys(v).reduce((o, k) => { o[mp(k)] = v[k]; return o; }, {}) : v;
  const under = (p, base) => { p = norm(p); base = norm(base); return p === base || !p || p.startsWith(base + '/') || base.startsWith(p + '/'); };
  const opTouches = (op, base) => op.t === 'update' ? Object.keys(op.v || {}).some(k => under(norm(op.p) + '/' + k, base)) : under(op.p, base);

  /* ---------- IndexedDB ---------- */
  const STORES = ['media', 'outbox', 'cache', 'snaps', 'demomedia', 'failed'];
  let dbp = null;
  function idbOpen() {
    if (!dbp) dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no idb'));
      const r = indexedDB.open('ss-v1', 1);
      r.onupgradeneeded = () => STORES.forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const mem = {}; STORES.forEach(s => mem[s] = new Map());
  async function idb(store, mode, fn) {
    try {
      const db = await idbOpen();
      return await new Promise((res, rej) => { const t = db.transaction(store, mode); const rq = fn(t.objectStore(store)); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
    } catch (e) { return undefined; }
  }
  const IDB = {
    async put(s, o) { mem[s].set(o.id, o); await idb(s, 'readwrite', st => st.put(o)); },
    async get(s, id) { const r = await idb(s, 'readonly', st => st.get(id)); return r || mem[s].get(id) || null; },
    async del(s, id) { mem[s].delete(id); await idb(s, 'readwrite', st => st.delete(id)); },
    async all(s) { const r = await idb(s, 'readonly', st => st.getAll()); return r || Array.from(mem[s].values()); },
    async clear(s) { mem[s].clear(); await idb(s, 'readwrite', st => st.clear()); }
  };

  /* ---------- สถานะ ---------- */
  const status = { online: navigator.onLine, pending: 0, failed: 0, lastSync: 0 };
  const statusCbs = new Set();
  function emitStatus() { statusCbs.forEach(cb => { try { cb(Object.assign({}, status)); } catch (e) { /* ignore */ } }); }

  /* ---------- Firebase implementation ---------- */
  const FBImpl = {
    name: 'firebase',
    async init() {
      await window.MC.loadLibs('fb');
      /* ถ้าเว็บอยู่บน Firebase Hosting ให้ใช้โดเมนเดียวกันเป็น authDomain → ล็อกอินได้ทุกเบราว์เซอร์ (รวม iPhone ที่ติดตั้งเป็นแอป) */
      const cfg = Object.assign({}, C.firebase); const h = location.hostname;
      if (/\.(web\.app|firebaseapp\.com)$/.test(h)) cfg.authDomain = h;
      this.sameOriginAuth = cfg.authDomain === h; this.authDomain = cfg.authDomain;
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      this.db = firebase.database(); this.auth = firebase.auth();
      try { await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) { /* ignore */ }
      try { await this.auth.getRedirectResult(); } catch (e) { B.authError = e; }
      this.db.ref('.info/connected').on('value', s => { status.online = !!s.val(); emitStatus(); });
    },
    onAuth(cb) { return this.auth.onAuthStateChanged(u => cb(u ? { uid: u.uid, email: (u.email || '').toLowerCase(), name: u.displayName || '', photo: u.photoURL || '', verified: u.emailVerified } : null)); },
    async signIn(opts) {
      const p = new firebase.auth.GoogleAuthProvider();
      const params = { prompt: 'select_account' }; if (opts && opts.hd) params.hd = opts.hd; p.setCustomParameters(params);
      /* ใช้ popup ก่อนเสมอ (ทำงานข้ามโดเมนได้) — redirect ใช้เฉพาะเมื่อเว็บอยู่โดเมนเดียวกับ authDomain เท่านั้น
         เพราะ redirect ข้ามโดเมน (github.io ↔ firebaseapp.com) ถูก Safari/Chrome บล็อกคุกกี้ ทำให้ล็อกอินค้าง */
      try { await this.auth.signInWithPopup(p); }
      catch (e) {
        if (this.sameOriginAuth && ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) return this.auth.signInWithRedirect(p);
        throw e;
      }
    },
    signOut() { return this.auth.signOut(); },
    raw(op) { const r = op.p ? this.db.ref(op.p) : this.db.ref(); return op.t === 'set' ? r.set(op.v) : op.t === 'update' ? r.update(op.v) : r.remove(); },
    get(p) { return this.db.ref(p).once('value').then(s => s.val()); },
    on(p, cb, err) { const r = this.db.ref(p); const h = s => cb(s.val()); r.on('value', h, e => err && err(e)); return () => r.off('value', h); },
    query(p, child, eq) { return this.db.ref(p).orderByChild(child).equalTo(eq).once('value').then(s => s.val()); },
    tx(p, fn) { return this.db.ref(p).transaction(v => fn(v)).then(r => { if (!r.committed) throw new Error('transaction aborted'); return r.snapshot.val(); }); }
  };

  /* ---------- Demo implementation (localStorage + IndexedDB) ---------- */
  const DKEY = 'ss_demo_db1', DUSER = 'ss_demo_user';
  const DemoImpl = {
    name: 'demo', ls: [], authCb: null,
    tree() { try { return JSON.parse(localStorage.getItem(DKEY)) || {}; } catch (e) { return {}; } },
    save(t) {
      try { localStorage.setItem(DKEY, JSON.stringify(t)); }
      catch (e) { console.warn('demo storage full', e); if (window.MC) window.MC.toast('พื้นที่โหมดสาธิตเต็ม — ไปที่ จัดการ › ตั้งค่า › ล้างข้อมูลสาธิต', 5000); }
      this.emit(t);
    },
    async init() {
      if (!localStorage.getItem(DKEY)) this.save(seedDemo());
      window.addEventListener('storage', e => { if (e.key === DKEY) this.emit(); });
      status.online = true;
    },
    onAuth(cb) { this.authCb = cb; let u = null; try { u = JSON.parse(sessionStorage.getItem(DUSER)); } catch (e) { /* ignore */ } setTimeout(() => cb(u), 0); return () => { }; },
    async signIn() { const u = await demoChooser(); if (!u) return; sessionStorage.setItem(DUSER, JSON.stringify(u)); this.authCb && this.authCb(u); },
    async signOut() { sessionStorage.removeItem(DUSER); this.authCb && this.authCb(null); },
    async raw(op) {
      if (op.p && isBlob(op.p) && op.t !== 'update') { if (op.t === 'remove' || op.v == null) await IDB.del('demomedia', op.p); else await IDB.put('demomedia', { id: op.p, v: op.v }); return; }
      const t = this.tree(); applyOp(t, op); this.save(t);
    },
    async get(p) { if (isBlob(p)) { const r = await IDB.get('demomedia', p); return r ? clone(r.v) : null; } return clone(getAt(this.tree(), p)); },
    on(p, cb) { const l = { p, cb, last: undefined }; this.ls.push(l); this.fire(l); return () => { this.ls = this.ls.filter(x => x !== l); }; },
    emit(t) { t = t || this.tree(); this.ls.forEach(l => this.fire(l, t)); },
    fire(l, t) { t = t || this.tree(); const v = getAt(t, l.p); const s = JSON.stringify(v); if (s !== l.last) { l.last = s; setTimeout(() => l.cb(v == null ? null : JSON.parse(s)), 0); } },
    async tx(p, fn) { const t = this.tree(); const v = fn(clone(getAt(t, p))); setAt(t, p, v); this.save(t); return clone(v); },
    async query(p, child, eq) { const v = getAt(this.tree(), p) || {}; const o = {}; Object.keys(v).forEach(k => { if (v[k] && v[k][child] === eq) o[k] = v[k]; }); return Object.keys(o).length ? o : null; }
  };

  /* ข้อมูลสาธิต — ชื่อสมมติทั้งหมด ห้ามใส่ข้อมูลจริงของศิษย์ในไฟล์นี้ (repo เป็นสาธารณะ) */
  const demoEmail = sid => 's' + sid + '@example.com';
  function seedDemo() {
    const now = Date.now(), Y = C.year, by = { id: 'teacher', name: 'แอดมินตัวอย่าง' };
    const iso = n => { const d = new Date(now + n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const ss = { config: {}, members: {}, roles: {}, duties: {}, history: {}, contacts: {}, requests: {}, songs: {}, learned: {}, lineage: {}, rites: {}, teach: {} };
    const people = {}, accounts = {}, privateInfo = {};
    ss.config = {
      year: Y,
      advisors: {
        a1: { name: C.master.name, kind: 'teacher', email: 'master@example.com', position: C.master.title || 'ครูผู้ถ่ายทอด', order: 1 },
        a2: { name: 'แอดมิน (ตัวอย่าง)', kind: 'teacher', email: (C.teacherEmails[0] || 'admin@example.com'), position: 'แอดมิน', order: 2 }
      },
      school: { teacher: C.master.name, position: 'ครูผู้ถ่ายทอด', dept: '', deputy: '', director: '' },
      bio: 'ประวัติย่อของอาจารย์ (ข้อความตัวอย่าง) — แอดมินแก้ไขได้ที่หน้า คลังวิชา › คำสอนและผลงาน › แก้ประวัติ'
    };
    /* sid, คำนำหน้า, ชื่อ, สกุล, ชื่อเล่น, รุ่น, ปีที่เริ่ม, ประเภท, เครื่อง, ตำแหน่ง, ครูผู้ถ่ายทอด (''=อาจารย์), จังหวัด, งาน, ระดับ */
    const rows = [
      ['10001', 'อ.', 'กานต์', 'ตัวอย่างหนึ่ง', 'กานต์', 1, '2540', 'special', ['ระนาดเอก', 'ปี่ใน'], 'president', '', 'กรุงเทพมหานคร', 'อาจารย์มหาวิทยาลัย (ตัวอย่าง)', [6, 4]],
      ['10002', 'นาย', 'ขจร', 'ตัวอย่างสอง', 'จร', 1, '2541', 'special', ['ฆ้องวงใหญ่'], '', '', 'นครปฐม', 'ครูโรงเรียนตัวอย่าง', [6]],
      ['10003', 'นาง', 'คีตา', 'ตัวอย่างสาม', 'ตา', 2, '2545', 'special', ['ซอสามสาย', 'ขับร้อง'], 'vice', '', 'เชียงใหม่', 'นักวิชาการวัฒนธรรม (ตัวอย่าง)', [5, 5]],
      ['10004', 'น.ส.', 'จันทร์เพ็ญ', 'ตัวอย่างสี่', 'เพ็ญ', 2, '2546', 'regular', ['จะเข้'], 'treasurer', '', 'นนทบุรี', 'ธุรกิจส่วนตัว (ตัวอย่าง)', [4]],
      ['10005', 'นาย', 'ชลธี', 'ตัวอย่างห้า', 'ธี', 3, '2550', 'regular', ['ระนาดทุ้ม', 'ฆ้องวงเล็ก'], 'secretary', '', 'ราชบุรี', 'ครูโรงเรียนตัวอย่าง', [4, 3]],
      ['10006', 'น.ส.', 'ดารณี', 'ตัวอย่างหก', 'ดา', 3, '2551', 'regular', ['ซออู้'], 'host', '', 'ขอนแก่น', 'นักดนตรีอิสระ', [3]],
      ['10007', 'นาย', 'ธนา', 'ตัวอย่างเจ็ด', 'นา', 4, '2555', 'regular', ['ตะโพน', 'กลองทัด'], '', '', 'สุพรรณบุรี', 'ครูโรงเรียนตัวอย่าง', [3, 3]],
      ['10008', 'นาย', 'นที', 'ตัวอย่างแปด', 'ที', 4, '2556', 'regular', ['ปี่ใน'], '', '10001', 'กรุงเทพมหานคร', 'นักศึกษาปริญญาเอก (ตัวอย่าง)', [3]],
      ['10009', 'น.ส.', 'ปรางทิพย์', 'ตัวอย่างเก้า', 'ปราง', 5, '2560', 'regular', ['ขิม', 'ขลุ่ย'], '', '', 'ชลบุรี', 'ครูผู้ช่วย (ตัวอย่าง)', [2, 2]],
      ['10010', 'นาย', 'พบ', 'ตัวอย่างสิบ', 'พบ', 5, '2561', 'start', ['ระนาดเอก'], '', '10001', 'พะเยา', 'นักศึกษา', [2]],
      ['10011', 'น.ส.', 'มุกดา', 'ตัวอย่างสิบเอ็ด', 'มุก', 6, '2565', 'start', ['ซอด้วง'], '', '10003', 'เชียงใหม่', 'นักศึกษา', [1]],
      ['10012', 'นาย', 'ยศ', 'ตัวอย่างสิบสอง', 'ยศ', 6, '2566', 'start', ['ฆ้องวงใหญ่'], '', '10002', 'นครปฐม', 'นักศึกษา', [1]],
      ['10013', 'น.ส.', 'รินรดา', 'ตัวอย่างสิบสาม', 'ริน', 6, '2566', 'start', ['ขับร้อง'], '', '', 'ตาก', 'นักเรียนมัธยม', [1]]
    ];
    rows.forEach(r => {
      const inst = {}; r[8].forEach(n => inst[n] = true);
      const m = { prefix: r[1], first: r[2], last: r[3], nick: r[4], yearIn: r[6], type: r[7], status: 'active', inst, master: r[10], createdAt: now, createdBy: by };
      ss.members[r[0]] = m;
      if (r[9]) ss.roles[r[0]] = { role: r[9] };
      people[r[0]] = { prefix: m.prefix, first: m.first, last: m.last, nick: m.nick, yearIn: m.yearIn, clubs: { ss: true } };
      accounts[r[0] === '10013' ? 'x' : demoEmail(r[0]).replace(/\./g, ',')] = r[0];
      if (+r[0] % 4 !== 1) ss.contacts[r[0]] = { phone: '08000' + r[0], line: 'line_' + r[4], email: demoEmail(r[0]), province: r[11], work: r[12], at: now };
      else ss.contacts[r[0]] = { province: r[11], work: r[12], at: now };
    });
    delete accounts.x;
    Object.assign(ss.members['10001'], { studyNote: 'เรียนกับอาจารย์ที่มหาวิทยาลัยตัวอย่าง ปี 2540–2544 และต่อเพลงที่บ้านอาจารย์ (ข้อความตัวอย่าง)', studied: { solo: { s1: { song: 'ลาวแพน', inst: 'ปี่ใน', tang: 'ทางครูตัวอย่าง' } }, band: { s1: { song: 'โหมโรงมหาฤกษ์' }, s2: { song: 'เขมรไทรโยค เถา', tang: 'ทางครูตัวอย่าง' } } }, studyAt: now - 5e6, studyBy: { id: '10001', name: 'อ.กานต์ ตัวอย่างหนึ่ง' } });
    ss.duties = { '10003': { notes: true, order: 1 }, '10007': { notes: true, order: 2 }, '10009': { notes: true, order: 3 } };
    ss.members['10014'] = { prefix: 'นาย', first: 'ศักดิ์', last: 'ตัวอย่างสิบสี่', nick: 'ศักดิ์', yearIn: '2540', type: 'special', status: 'alumni', removedReason: 'graduate', removedAt: now - 3e9, inst: { 'ระนาดเอก': true }, master: '', createdAt: now, createdBy: by };
    people['10014'] = { prefix: 'นาย', first: 'ศักดิ์', last: 'ตัวอย่างสิบสี่', nick: 'ศักดิ์', yearIn: '2540', clubs: {} };
    ss.requests['s99001@example,com'] = { email: 's99001@example.com', uid: 'demo-s99001@example.com', prefix: 'น.ส.', first: 'ใหม่', last: 'ตัวอย่างขอเข้าร่วม', nick: 'ใหม่', yearIn: '2567', inst: { 'ซออู้': true }, province: 'ลำปาง', work: 'นักศึกษา', phone: '0800099001', note: 'เรียนกับอาจารย์ที่ค่ายดนตรีไทยปี 2567 (ข้อความตัวอย่าง)', studied: { solo: { s1: { song: 'แขกมอญ', inst: 'ซออู้', tang: 'ทางครูตัวอย่าง' } }, band: { s1: { song: 'ลาวดวงเดือน' } } }, at: now - 5e6 };
    privateInfo['10004'] = { address: 'ที่อยู่ตัวอย่าง', emergency: 'ญาติตัวอย่าง 0800000000' };

    /* ---- คลังวิชา ---- */
    const song = (name, cat, desc, tang) => ({ name, cat, desc, tang, at: now, by: 'แอดมินตัวอย่าง' });
    ss.songs = {
      g1: song('สาธุการ', 'เพลงหน้าพาทย์', 'เพลงหน้าพาทย์เบื้องต้นที่ศิษย์ต่อเป็นเพลงแรกตามธรรมเนียม (ข้อความตัวอย่าง)', { t1: { name: 'ทางฆ้องวงใหญ่ (ทางสำนัก)', inst: 'ฆ้องวงใหญ่', from: C.master.short, desc: 'เพลงแรกที่ต่อหลังพิธีไหว้ครู (ข้อความตัวอย่าง)' } }),
      g2: song('โหมโรงมหาฤกษ์', 'เพลงโหมโรง', 'ข้อความตัวอย่าง', { t1: { name: 'ทางระนาดเอก', inst: 'ระนาดเอก', from: C.master.short } }),
      g3: song('เขมรไทรโยค เถา', 'เพลงเถา', 'ข้อความตัวอย่าง', { t1: { name: 'ทางร้อง', inst: 'ขับร้อง', from: 'นางคีตา ตัวอย่างสาม' }, t2: { name: 'ทางจะเข้', inst: 'จะเข้', from: C.master.short } }),
      g4: song('ลาวแพน', 'เพลงเดี่ยว', 'เพลงเดี่ยวที่ใช้แสดงฝีมือ (ข้อความตัวอย่าง)', { t1: { name: 'ทางเดี่ยวปี่ใน', inst: 'ปี่ใน', from: C.master.short, desc: 'ต่อเฉพาะศิษย์ที่บรรเลงเพลงหน้าพาทย์ได้แล้ว (ตัวอย่าง)' } }),
      g5: song('ตระนิมิตร', 'เพลงหน้าพาทย์', 'ข้อความตัวอย่าง', {})
    };
    const L = (sid, g, t, inst, from, d) => { (ss.learned[sid] = ss.learned[sid] || {})[g] = { tang: t, inst, from, at: now - d * 864e5, ok: true }; };
    L('10001', 'g1', 't1', 'ฆ้องวงใหญ่', C.master.short, 9000); L('10001', 'g2', 't1', 'ระนาดเอก', C.master.short, 8000); L('10001', 'g4', 't1', 'ปี่ใน', C.master.short, 6000);
    L('10002', 'g1', 't1', 'ฆ้องวงใหญ่', C.master.short, 8500); L('10003', 'g3', 't1', 'ขับร้อง', C.master.short, 5000); L('10004', 'g3', 't2', 'จะเข้', C.master.short, 4000);
    L('10005', 'g1', 't1', 'ฆ้องวงใหญ่', C.master.short, 3000); L('10008', 'g4', 't1', 'ปี่ใน', 'อ.กานต์ ตัวอย่างหนึ่ง', 900); L('10012', 'g1', 't1', 'ฆ้องวงใหญ่', 'นายขจร ตัวอย่างสอง', 200);
    const nt = (text, url) => ({ text, url: url || null, at: now, by: 'แอดมินตัวอย่าง' });
    ss.notes = { g1: { t1: nt('(โน้ตตัวอย่าง — ไม่ใช่โน้ตจริง)\n- - - ด   - ร - ม   - - - ซ   - ล - ซ\n- - - ม   - ร - ด   - - - ร   - ม - ร') }, g3: { t1: nt('(บทร้องและโน้ตตัวอย่าง)'), t2: nt('(โน้ตจะเข้ตัวอย่าง)', 'https://example.com') }, g4: { t1: nt('(โน้ตเดี่ยวตัวอย่าง)') } };
    const ac = (sid, gs) => { ss.noteacc[sid] = ss.noteacc[sid] || {}; gs.forEach(g => { ss.noteacc[sid][g] = { at: now, by: 'แอดมินตัวอย่าง' }; }); };
    ss.noteacc = {}; ac('10001', ['g1', 'g2', 'g4']); ac('10002', ['g1']); ac('10003', ['g3']); ac('10004', ['g3']); ac('10005', ['g1']);
    ss.notereq = { '10008': { g4: { at: now - 3e6, msg: 'อ.กานต์ต่อเดี่ยวให้แล้ว (ข้อความตัวอย่าง)' } } };
    (ss.learned['10010'] = {}).g2 = { tang: 't1', inst: 'ระนาดเอก', from: 'อ.กานต์ ตัวอย่างหนึ่ง', at: now - 2e6, ok: false };
    ss.lineage = {
      u1: { name: 'บรมครูตัวอย่าง', role: 'ครูต้นสาย (ข้อมูลตัวอย่าง)', years: '', note: 'แทนที่ด้วยสายครูจริงของสำนักในเมนู คลังวิชา › สายการสืบทอด', parent: '', order: 1 },
      u2: { name: 'ครูตัวอย่าง ชั้นที่ 2', role: 'ศิษย์ของบรมครูตัวอย่าง', years: '', note: '', parent: 'u1', toMaster: true, order: 2 },
      u3: { name: 'ครูตัวอย่าง อีกสายหนึ่ง', role: 'ครูขับร้อง (ตัวอย่าง)', years: '', note: '', parent: '', toMaster: true, order: 3 }
    };
    ss.rites = {
      '10001': { r1: { kind: 'ไหว้ครู', date: '2540-09-01', place: 'สถานที่ตัวอย่าง', by: C.master.short, note: '' }, r2: { kind: 'ครอบครู (ครอบมือ)', date: '2545-09-07', place: 'สถานที่ตัวอย่าง', by: C.master.short, note: 'ข้อมูลตัวอย่าง' }, r3: { kind: 'รับมอบให้เป็นผู้ประกอบพิธีไหว้ครู', date: '2560-09-10', place: 'สถานที่ตัวอย่าง', by: C.master.short, note: '' } },
      '10003': { r1: { kind: 'ไหว้ครู', date: '2545-09-01', place: 'สถานที่ตัวอย่าง', by: C.master.short } },
      '10010': { r1: { kind: 'ไหว้ครู', date: '2561-09-02', place: 'สถานที่ตัวอย่าง', by: 'อ.กานต์ ตัวอย่างหนึ่ง' } }
    };
    ss.teach = {
      t1: { kind: 'saying', title: 'ว่าด้วยการฟังวง (ตัวอย่าง)', body: 'ข้อความตัวอย่างของคำสอน — เช่น “ตีให้ฟังวง อย่าตีให้ฟังตัวเอง”\nแอดมินหรือศิษย์ส่งบันทึกคำสอนจริงได้ที่ปุ่ม “ส่งบันทึก”', date: '2550', src: 'บันทึกจากการต่อเพลง (ตัวอย่าง)', status: 'ok', at: now - 9e6, by: { id: '10001', name: 'อ.กานต์ ตัวอย่างหนึ่ง' } },
      t2: { kind: 'work', title: 'ผลงานตัวอย่าง: การบันทึกเสียงเพลงชุด', body: 'รายละเอียดผลงาน (ข้อความตัวอย่าง)', date: '2555', src: '', url: 'https://example.com', status: 'ok', at: now - 8e6, by: by },
      t3: { kind: 'story', title: 'ความทรงจำวันครอบครู (ตัวอย่าง)', body: 'ข้อความตัวอย่างที่ศิษย์ส่งมา รอแอดมินตรวจก่อนเผยแพร่', date: '2560', status: 'pending', at: now - 2e6, by: { id: '10006', name: 'น.ส.ดารณี ตัวอย่างหก' } }
    };
    ss.library = { l1: { title: 'ตัวอย่างลิงก์เอกสาร', cat: 'บทความ / งานวิจัย', desc: 'ข้อมูลตัวอย่าง', kind: 'link', url: 'https://example.com', at: now - 2e6, by: 'แอดมินตัวอย่าง' } };

    /* ---- กิจกรรม ประกาศ การเงิน (รายปี) ---- */
    const yy = { events: {}, announce: {}, ledger: {}, counters: {}, finsum: {} };
    const pp = {}; rows.slice(0, 9).forEach(r => pp[r[0]] = true);
    yy.events.e1 = { title: 'พิธีไหว้ครูดนตรีไทยประจำปี (สาธิต)', kind: 'activity', date: iso(9), start: '08:00', end: '12:00', place: 'สถานที่ตัวอย่าง', purpose: 'ศิษย์ทุกท่านร่วมพิธีไหว้ครู', people: pp, status: 'on', createdAt: now, createdBy: by };
    yy.events.e2 = { title: 'ประชุมคณะกรรมการ', kind: 'meet', date: iso(3), start: '19:00', end: '20:30', place: 'ออนไลน์', status: 'on', createdAt: now, createdBy: by };
    yy.events.e3 = { title: 'บรรเลงงานมุทิตาจิต (สาธิต)', kind: 'perform', date: iso(-25), start: '17:00', end: '21:00', place: 'สถานที่ตัวอย่าง', people: pp, status: 'on', createdAt: now, createdBy: by };
    yy.announce.a1 = { title: 'เชิญศิษย์ทุกท่านร่วมพิธีไหว้ครู', body: 'ขอเชิญศิษย์ทุกท่านร่วมพิธีไหว้ครู แต่งกายชุดไทยหรือชุดสุภาพ (ข้อความตัวอย่าง)', at: now - 72e5, by: { id: '10005', name: 'นายชลธี ตัวอย่างห้า' } };
    const tx = (kind, no, d, amount, party, title, cat, status) => Object.assign({ kind, no: (kind === 'in' ? 'ร.' : 'บ.') + no + '/' + Y, date: iso(d), amount, party, title, cat, at: now + d * 864e5, by: { id: '10004', name: 'น.ส.จันทร์เพ็ญ ตัวอย่างสี่' }, status }, status === 'approved' ? { approvedBy: 'แอดมินตัวอย่าง', approvedAt: now + d * 864e5 } : {});
    yy.ledger = { t1: tx('in', '001', -40, 15000, 'เครือข่ายศิษย์', 'ยอดยกมา (ตัวอย่าง)', 'ยอดยกมา', 'approved'), t2: tx('in', '002', -12, 5000, 'ศิษย์รุ่น 1', 'เงินทำบุญงานไหว้ครู', 'เงินบริจาค', 'approved'),
      t3: tx('out', '001', -6, 2500, 'ร้านตัวอย่าง', 'เครื่องสักการะพิธีไหว้ครู', 'อุปกรณ์ / เครื่องดนตรี', 'approved'), t4: tx('out', '002', -1, 900, 'ร้านตัวอย่าง', 'ค่าพิมพ์เกียรติบัตร', 'อื่น ๆ', 'pending') };
    yy.counters = { in: 2, out: 2 };
    const fs = { bal: 17500, inSum: 20000, outSum: 2500, months: {}, n: 3, at: now }; ['t1', 't2', 't3'].forEach(k => { const x = yy.ledger[k], mk = x.date.slice(0, 7); fs.months[mk] = fs.months[mk] || { in: 0, out: 0 }; fs.months[mk][x.kind] += x.amount; }); yy.finsum = fs;
    ss.y = { [Y]: yy };
    ss.polls = { p1: { title: 'เลือกวันจัดงานคืนสู่เหย้าศิษย์', kind: 'single', options: ['เสาร์ต้นเดือน', 'เสาร์กลางเดือน', 'อาทิตย์ปลายเดือน'], openBallot: true, who: 'all', status: 'open', createdAt: now - 5e6, by: 'แอดมินตัวอย่าง', y: Y } };
    ss.ballots = { p1: { '10003': { v: 0, at: now }, '10005': { v: 1, at: now } } };
    ss.awards = { w1: { title: 'ผู้ร่วมสร้างคลังวิชา', body: 'ที่ได้ร่วมบันทึกทางเพลงของสำนัก (ข้อมูลตัวอย่าง)', rcp: { '10003': 'นางคีตา ตัวอย่างสาม' }, pinned: true, at: now - 3e6, by: 'แอดมินตัวอย่าง', y: Y } };
    return { teachers: { 'master@example,com': true }, accounts, people, privateInfo, c: { ss }, _demo: { seededAt: now } };
  }
  function demoChooser() {
    return new Promise(res => {
      const T = DemoImpl.tree(), t = (T.c || {}).ss || {}; const ms = t.members || {}; const rl = t.roles || {}, acc = T.accounts || {};
      const rn = r => { if (!r) return 'สมาชิก'; const x = (C.roles || []).find(y => y.id === r.role); return x ? x.name : 'สมาชิก'; };
      const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const tch = Object.values((t.config || {}).advisors || {}).filter(a => a.kind === 'teacher' && a.email).map(a => ({ email: a.email, name: a.name, note: 'แอดมิน · ' + (a.position || '') }));
      const bySid = {}; Object.keys(acc).forEach(k => { bySid[acc[k]] = k.replace(/,/g, '.'); });
      const order = ['president', 'vice', 'treasurer', 'host', 'secretary', ''];
      const studs = Object.keys(ms).filter(s => ms[s].status === 'active' && bySid[s]).sort((a, b) => order.indexOf((rl[a] || {}).role || '') - order.indexOf((rl[b] || {}).role || '') || a.localeCompare(b))
        .map(s => ({ email: bySid[s], name: ms[s].prefix + ms[s].first + ' ' + ms[s].last, note: rn(rl[s]) + (((t.duties || {})[s] || {}).notes ? ' · ผู้เก็บรวบรวมโน้ต' : '') + ' · เริ่มเรียน ' + ms[s].yearIn }));
      const list = tch.concat(studs.slice(0, 7));
      const w = document.createElement('div'); w.className = 'modal center';
      w.innerHTML = '<div class="modal-in"><h3>เลือกบัญชีสาธิต</h3><div class="muted" style="margin-bottom:10px">โหมดสาธิต: จำลองการล็อกอินด้วย Google แต่ละบทบาทเห็นเมนูและสิทธิ์ต่างกัน</div>' +
        list.map((u, i) => '<button class="acct" data-i="' + i + '"><b>' + esc(u.name) + '</b><span>' + esc(u.note) + ' · ' + esc(u.email) + '</span></button>').join('') +
        '<button class="acct" data-i="r"><b>บัญชีที่ส่งคำขอแล้ว รออนุมัติ</b><span>s99001@example.com</span></button>' +
        '<button class="acct" data-i="n"><b>บัญชี Google ใหม่ (ยังไม่เคยขอเข้าร่วม)</b><span>newcomer@example.com</span></button>' +
        '<button class="btn ghost block" data-i="c" style="margin-top:10px">ยกเลิก</button></div>';
      document.body.appendChild(w);
      w.onclick = e => {
        const b = e.target.closest('[data-i]'); if (!b) return; const i = b.dataset.i; w.remove();
        if (i === 'c') return res(null);
        if (i === 'r') return res({ uid: 'demo-s99001@example.com', email: 's99001@example.com', name: 'ใหม่ ตัวอย่างขอเข้าร่วม', verified: true });
        if (i === 'n') return res({ uid: 'demo-newcomer', email: 'newcomer@example.com', name: 'ผู้ใช้ใหม่', verified: true });
        const u = list[+i]; res({ uid: 'demo-' + u.email, email: u.email, name: u.name, verified: true });
      };
    });
  }

  /* ---------- Outbox: ทุกการเขียนเก็บไว้ในเครื่องก่อน แล้วค่อยส่ง ---------- */
  let impl = null; const pendingOps = new Map();
  async function refreshCounts() { status.pending = pendingOps.size; status.failed = (await IDB.all('failed')).length; emitStatus(); }
  function send(op) {
    pendingOps.set(op.id, op); refreshCounts();
    let pr; try { pr = Promise.resolve(impl.raw(op)); } catch (e) { pr = Promise.reject(e); }   /* SDK อาจ throw ทันที (ข้อมูลผิดรูปแบบ) — ต้องนับเป็นส่งไม่สำเร็จ ไม่ค้างในกล่องขาออก */
    return pr.then(async () => {
      pendingOps.delete(op.id); await IDB.del('outbox', op.id); status.lastSync = Date.now(); refreshCounts();
    }).catch(async e => {
      pendingOps.delete(op.id); await IDB.del('outbox', op.id);
      subs.forEach(s => { if (opTouches(op, s.p)) { try { s.cb(overlay(s.p, s.last)); } catch (e2) { /* ignore */ } } });   /* ถอนค่าที่แสดงล่วงหน้าออก ให้หน้าจอตรงกับฐานข้อมูล */
      if (op.replayed && /^history\//.test(op.p || '')) { refreshCounts(); return; } // ประวัติที่ส่งสำเร็จไปแล้วก่อนปิดแอป
      op.error = (e && (e.code || e.message)) || String(e); op.failedAt = Date.now(); await IDB.put('failed', op);
      refreshCounts(); console.warn('write failed', op.p, e); throw e;
    });
  }
  async function write(t, p, v) {
    const op = { id: uid(), seq: Date.now() + Math.random(), t, p, v: clone(v), at: Date.now() };
    await IDB.put('outbox', op);
    overlayNotify(op);
    return send(op);
  }
  async function replayOutbox() {
    const ops = (await IDB.all('outbox')).sort((a, b) => a.seq - b.seq);
    ops.forEach(op => { op.replayed = true; send(op).catch(() => { }); });
    refreshCounts();
  }

  /* ---------- on(): แคช + ซ้อนการแก้ที่ยังไม่ได้ส่ง ---------- */
  const subs = new Set();
  function overlay(path, val) {
    const ops = Array.from(pendingOps.values()).filter(op => opTouches(op, path)).sort((a, b) => a.seq - b.seq);
    if (!ops.length) return val;
    const w = {}; setAt(w, path, val); ops.forEach(op => applyOp(w, op)); return clone(getAt(w, path));
  }
  function overlayNotify(op) { subs.forEach(s => { if (opTouches(op, s.p)) { pendingOps.set(op.id, op); s.cb(overlay(s.p, s.last)); } }); }
  const cacheT = {};
  function on(path, cb, err) {
    const s = { p: path, cb, last: null, got: false }; subs.add(s);
    IDB.get('cache', path).then(c => { if (c && !s.got) { s.last = c.v; cb(overlay(path, c.v)); } });
    const off = impl.on(path, v => {
      s.got = true; s.last = v; cb(overlay(path, v));
      clearTimeout(cacheT[path]); cacheT[path] = setTimeout(() => IDB.put('cache', { id: path, v, at: Date.now() }), 800);
    }, e => { if (err) err(e); });
    return () => { subs.delete(s); off(); };
  }

  /* ---------- สำเนาสำรองในเครื่อง (เก็บ 15 ชุดล่าสุด) ---------- */
  async function snapshot(key, data) {
    const all = (await IDB.all('snaps')).filter(s => s.key === key).sort((a, b) => b.at - a.at);
    if (all[0] && JSON.stringify(all[0].data) === JSON.stringify(data)) return;
    await IDB.put('snaps', { id: key + '@' + Date.now(), key, at: Date.now(), data: clone(data) });
    for (const old of all.slice(14)) await IDB.del('snaps', old.id);
  }
  async function snapshots(key) { return (await IDB.all('snaps')).filter(s => s.key === key).sort((a, b) => b.at - a.at); }

  /* ---------- public ---------- */
  const B = window.B = {
    mode: 'demo', status, IDB, uid, clone, getAt, setAt,
    configured() {
      try { const q = new URLSearchParams(location.search).get('demo');
        if (q === '1') sessionStorage.setItem('ss_force_demo', '1'); if (q === '0') sessionStorage.removeItem('ss_force_demo');
        if (sessionStorage.getItem('ss_force_demo')) return false; } catch (e) { /* ignore */ }
      return this.realConfigured(); },
    async init() {
      impl = this.configured() ? FBImpl : DemoImpl; this.mode = impl.name;
      await impl.init();
      window.addEventListener('online', () => { if (impl === DemoImpl) { status.online = true; emitStatus(); } });
      window.addEventListener('offline', () => { if (impl === DemoImpl) { status.online = false; emitStatus(); } });
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
      await replayOutbox();
    },
    onAuth: cb => impl.onAuth(cb),
    signIn: opts => impl.signIn(opts),
    signOut: () => impl.signOut(),
    setScope(cid) { scope = cid ? 'c/' + cid : ''; }, path: p => mp(p),
    set: (p, v) => write('set', mp(p), v),
    update: (p, v) => write('update', mp(p), mv('update', p, v)),
    remove: p => write('remove', mp(p), null),
    get: p => impl.get(mp(p)),
    /* tx: นับเลขที่เอกสารแบบ transaction · direct: เขียนตรงไม่ผ่านกล่องขาออก (ต้องออนไลน์ ไม่เก็บค้างในเครื่อง) */
    tx: (p, fn) => impl.tx(mp(p), fn),
    direct: (t, p, v) => Promise.resolve(impl.raw({ t, p: mp(p), v: clone(mv(t, p, v)) })),
    on: (p, cb, err) => on(mp(p), cb, err), query: (p, c, e) => impl.query(mp(p), c, e),
    snapshot, snapshots,
    failedOps: () => IDB.all('failed'),
    pendingList: () => Array.from(pendingOps.values()),
    async discardFailed() { for (const op of await IDB.all('failed')) await IDB.del('failed', op.id); refreshCounts(); },
    async retryFailed() { for (const op of await IDB.all('failed')) { await IDB.del('failed', op.id); delete op.error; await IDB.put('outbox', op); send(op).catch(() => { }); } refreshCounts(); },
    onStatus(cb) { statusCbs.add(cb); cb(Object.assign({}, status)); return () => statusCbs.delete(cb); },
    authErrorText(e) {
      const code = (e && e.code) || ''; const host = location.hostname;
      const T = {
        'auth/unauthorized-domain': 'โดเมน ' + host + ' ยังไม่ได้รับอนุญาต → Firebase › Authentication › Settings › Authorized domains › เพิ่ม ' + host,
        'auth/operation-not-allowed': 'ยังไม่ได้เปิดการล็อกอินด้วย Google → Firebase › Authentication › Sign-in method › Google › Enable',
        'auth/popup-blocked': 'เบราว์เซอร์บล็อกหน้าต่างล็อกอิน → อนุญาต pop-up สำหรับเว็บนี้ แล้วกดใหม่',
        'auth/popup-closed-by-user': 'หน้าต่างล็อกอินถูกปิดก่อนเสร็จ — ถ้าหน้าต่าง Google ขึ้นว่า “Access blocked / ถูกบล็อก / แอดมินจำกัดการเข้าถึง” แปลว่าแอดมินอีเมลโรงเรียน (@sappha.ac.th) ต้องอนุญาตแอปนี้ก่อน ให้แจ้งครู; ถ้าไม่ใช่ ให้กดเข้าสู่ระบบใหม่',
        'auth/cancelled-popup-request': 'มีหน้าต่างล็อกอินเปิดอยู่แล้ว — ปิดแล้วกดใหม่',
        'auth/network-request-failed': 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ — ตรวจสัญญาณแล้วลองใหม่',
        'auth/web-storage-unsupported': 'เบราว์เซอร์นี้ปิดการเก็บข้อมูล (โหมดส่วนตัว/บล็อกคุกกี้) — เปิดด้วย Safari/Chrome ปกติ',
        'auth/operation-not-supported-in-this-environment': 'แอปที่ติดตั้งบนหน้าจอโฮมล็อกอินด้วยวิธีนี้ไม่ได้ — เปิดผ่านเบราว์เซอร์ หรือย้ายเว็บไป Firebase Hosting (ดูคู่มือ)',
        'auth/internal-error': 'ระบบล็อกอินขัดข้อง — ถ้าเปิดจากแอปบนหน้าจอโฮม ให้ลองเปิดผ่านเบราว์เซอร์',
        'auth/too-many-requests': 'ลองหลายครั้งเกินไป — รอสักครู่แล้วลองใหม่'
      };
      return (T[code] || ((e && e.message) || String(e))) + (code ? ' [' + code + ']' : '');
    },
    diagnostics() {
      const ua = navigator.userAgent; const sa = window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone;
      return { mode: this.mode, host: location.hostname, authDomain: impl && impl.authDomain, sameOriginAuth: !!(impl && impl.sameOriginAuth), online: status.online, navigatorOnline: navigator.onLine,
        standalone: sa, ios: /iPhone|iPad|iPod/.test(ua), browser: (/CriOS|Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : /Firefox/.test(ua) ? 'Firefox' : 'อื่น ๆ'), pending: status.pending, failed: status.failed, lastAuthError: this.authError ? this.authErrorText(this.authError) : '' };
    },
    /* รหัสศิษย์ของอีเมลนี้ (แอดมินผูกไว้ตอนอนุมัติคำขอเข้าร่วม) — null ถ้ายังไม่ได้ผูก */
    async sidOf(email) { if (!email) return null; try { const v = await impl.get('accounts/' + this.emailKey(email)); return v && new RegExp(C.auth.sidPattern).test(String(v)) ? String(v) : null; } catch (e) { return null; } },
    sidFromEmail: () => null,
    isBootTeacher: email => (C.teacherEmails || []).map(e => e.toLowerCase()).includes(String(email || '').toLowerCase()),
    emailKey: email => String(email || '').toLowerCase().replace(/\./g, ','),
    realConfigured() { const f = C.firebase || {}; return !!(f.apiKey && f.databaseURL); },
    resetDemo() { localStorage.removeItem(DKEY); sessionStorage.removeItem(DUSER); return IDB.clear('demomedia'); }
  };
})();
