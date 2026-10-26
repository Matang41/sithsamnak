/* ============================================================
   library.js — คลังเอกสาร (ส่วนหนึ่งของคลังวิชา) (แอดมินอัปโหลด ศิษย์ศึกษา)
   ข้อมูล: library/{id} = รายละเอียด · libfiles/{id} = เนื้อไฟล์ (base64, โหลดเมื่อเปิดดู) · config/libCats = หมวดหมู่
   ไฟล์เก็บในฐานข้อมูล จำกัด ~700 KB ต่อไฟล์ (รูปภาพถูกย่อให้อัตโนมัติ) ไฟล์ใหญ่/วิดีโอให้ใช้ “ลิงก์” (Google Drive, YouTube)
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP, C = M.C;
  const { $, esc, toast, modal } = M; const { ic, chip, fld, opt } = A;
  Object.assign(A.ICON, { lib: '<path d="M4 5h4v14H4zM10 5h4v14h-4z"/><path d="M16 6.5l3.8 1-3 11.5-3.8-1z"/>' });
  const T = () => A.teacher(), MAX = 700 * 1024, LB = { cat: '', q: '' };
  const cats = () => { const l = A.cfg().libCats; return Array.isArray(l) && l.length ? l : (C.libCats || ['อื่น ๆ']); };
  const items = () => Object.keys(A.D.library || {}).map(id => Object.assign({ id }, A.D.library[id])).filter(x => x.title).sort((a, b) => b.at - a.at);
  const allCats = () => cats().concat(items().map(x => x.cat).filter(c => c && !cats().includes(c))).filter((c, i, a) => a.indexOf(c) === i);
  const kindLabel = x => x.kind === 'link' ? 'ลิงก์' : /pdf/.test(x.mime || '') ? 'PDF' : /^image\//.test(x.mime || '') ? 'ภาพ' : /^audio\//.test(x.mime || '') ? 'เสียง' : /^video\//.test(x.mime || '') ? 'วิดีโอ' : 'ไฟล์';
  const size = n => n ? (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB') : '';

  A.SUBS.push({ key: 'library', path: () => 'library' });
  A.NAVS.push({ id: 'library', label: 'คลังเอกสาร', icon: 'lib', order: 24 });

  function card(x) {
    const isNew = Date.now() - x.at < 7 * 864e5;
    return '<div class="lib"><div class="row"><span class="lib-k">' + kindLabel(x) + '</span><div class="grow"><b>' + esc(x.title) + '</b><div class="muted">' + esc([x.cat, x.kind === 'file' ? size(x.size) : '', M.thDate(x.at)].filter(Boolean).join(' · ')) + '</div></div>' + (isNew ? chip('ใหม่', 'hot') : '') + '</div>' +
      (x.desc ? '<div class="lib-d">' + esc(x.desc) + '</div>' : '') + '<div class="row wrap" style="margin-top:8px"><button class="btn sm" data-act="libOpen" data-id="' + esc(x.id) + '">เปิดดู</button>' +
      (T() ? '<button class="btn ghost sm" data-act="libEdit" data-id="' + esc(x.id) + '">แก้ไข</button><button class="btn ghost sm danger" data-act="libDel" data-id="' + esc(x.id) + '">ลบ</button>' : '') + '</div></div>';
  }
  function listHTML() {
    const q = LB.q.trim().toLowerCase(), all = items(), l = all.filter(x => (!LB.cat || x.cat === LB.cat) && (!q || (x.title + ' ' + (x.desc || '') + ' ' + (x.cat || '') + ' ' + (x.fname || '')).toLowerCase().includes(q)));
    return l.map(card).join('') || '<div class="empty">' + (all.length ? 'ไม่พบรายการตามเงื่อนไข' : 'ยังไม่มีสื่อการเรียนรู้' + (T() ? ' — กด “เพิ่มสื่อ”' : '')) + '</div>';
  }
  A.V.library = function () {
    const cs = allCats(); let b = '';
    if (T()) b += '<div class="row wrap" style="margin-bottom:14px"><button class="btn" data-act="libNew">' + ic('plus', 18) + 'เพิ่มสื่อ / ไฟล์ความรู้</button><button class="btn ghost" data-act="libCats">จัดการหมวดหมู่</button></div>';
    b += '<div class="tabs" role="tablist"><button role="tab" aria-selected="' + !LB.cat + '" class="' + (!LB.cat ? 'on' : '') + '" data-act="libCat" data-c="">ทั้งหมด</button>' + cs.map(c => '<button role="tab" aria-selected="' + (LB.cat === c) + '" class="' + (LB.cat === c ? 'on' : '') + '" data-act="libCat" data-c="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
      '<section class="card"><input id="lq" class="in" type="search" placeholder="ค้นหาชื่อเรื่อง คำอธิบาย" value="' + esc(LB.q) + '" aria-label="ค้นหาในคลังความรู้" style="margin-bottom:10px"><div id="llist">' + listHTML() + '</div></section>';
    return { title: 'คลังเอกสาร', body: b, back: '#/kb' };
  };
  document.addEventListener('input', e => { if (e.target.id === 'lq') { LB.q = e.target.value; const l = $('#llist'); if (l) l.innerHTML = listHTML(); } });
  A.HOME.push({ order: 38, html: () => { const l = items().slice(0, 3); return l.length ? '<section class="card"><div class="row"><div class="lb grow" style="margin:0 0 8px">เอกสารในคลังล่าสุด</div><a href="#/library" class="muted">ดูทั้งหมด</a></div>' + l.map(x => '<a class="lib-r" href="#/library"><span class="lib-k">' + kindLabel(x) + '</span><span class="grow"><b>' + esc(x.title) + '</b><span class="muted">' + esc(x.cat || '') + '</span></span></a>').join('') + '</section>' : ''; } });

  const readURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('อ่านไฟล์ไม่ได้')); r.readAsDataURL(f); });
  const toBlob = d => { const i = d.indexOf(','), mime = (d.slice(5, i).split(';')[0]) || 'application/octet-stream', bin = atob(d.slice(i + 1)), u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); return new Blob([u], { type: mime }); };

  function form(id) {
    const x = id ? A.D.library[id] : { kind: 'file' };
    const w = modal('<h3>' + (id ? 'แก้ไขรายการ' : 'เพิ่มสื่อ / ไฟล์ความรู้') + '</h3><form class="form">' + fld('ชื่อเรื่อง', '<input class="in" id="l-t" value="' + esc(x.title || '') + '" required>') +
      fld('หมวดหมู่', '<select class="in" id="l-c">' + opt(allCats().map(c => [c, c]), x.cat || cats()[0]) + '</select>') + fld('คำอธิบายสั้น ๆ', '<textarea class="in" id="l-d" rows="2">' + esc(x.desc || '') + '</textarea>') +
      (id ? (x.kind === 'link' ? fld('ลิงก์', '<input class="in" id="l-u" value="' + esc(x.url || '') + '">') : '<div class="muted">ไฟล์: ' + esc(x.fname || '') + ' (ถ้าต้องเปลี่ยนไฟล์ ให้ลบแล้วเพิ่มใหม่)</div>')
        : '<div class="fld"><span>ประเภท</span><div class="checks"><label class="ck"><input type="radio" name="lt" value="file" checked><span>อัปโหลดไฟล์</span></label><label class="ck"><input type="radio" name="lt" value="link"><span>ลิงก์ภายนอก</span></label></div></div>' +
          '<div id="l-fw">' + fld('เลือกไฟล์', '<input class="in" type="file" id="l-f" accept="image/*,application/pdf,audio/*,video/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt">', 'ไฟล์ละไม่เกิน ~700 KB (รูปภาพย่อให้อัตโนมัติ) ไฟล์ใหญ่หรือวิดีโอให้เก็บที่ Google Drive / YouTube แล้วใช้ “ลิงก์ภายนอก”') + '</div>' +
          '<div id="l-uw" hidden>' + fld('ลิงก์ (ขึ้นต้นด้วย https://)', '<input class="in" id="l-u" inputmode="url">') + '</div>') +
      '<div class="note bad" id="l-err" hidden></div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { sticky: true, wide: true });
    w.addEventListener('change', e => { if (e.target.name === 'lt') { $('#l-fw', w).hidden = e.target.value !== 'file'; $('#l-uw', w).hidden = e.target.value !== 'link'; } });
    $('form', w).addEventListener('submit', async e => {
      e.preventDefault(); const v = k => { const el = $(k, w); return el ? el.value.trim() : ''; }, err = t => { const el = $('#l-err', w); el.textContent = t; el.hidden = false; }, btn = $('button.grow:not(.ghost)', w);
      if (!v('#l-t')) return err('กรอกชื่อเรื่อง');
      const base = { title: v('#l-t'), cat: v('#l-c'), desc: v('#l-d') || null };
      if (id) { if (x.kind === 'link') { if (!/^https?:\/\//i.test(v('#l-u'))) return err('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://'); base.url = v('#l-u'); } A.W(B.update('library/' + id, base)); w.remove(); return toast('บันทึกแล้ว'); }
      const kind = $('input[name=lt]:checked', w).value, nid = B.uid();
      if (kind === 'link') { if (!/^https?:\/\//i.test(v('#l-u'))) return err('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://'); A.W(B.set('library/' + nid, Object.assign(base, { kind: 'link', url: v('#l-u'), at: Date.now(), by: A.myName() }))); A.log('library.add', '', base.title); w.remove(); return toast('เพิ่มแล้ว'); }
      const f = $('#l-f', w).files[0]; if (!f) return err('เลือกไฟล์ก่อน'); if (A.STATUS.online === false) return err('ต้องออนไลน์จึงจะอัปโหลดไฟล์ได้');
      btn.disabled = true; btn.textContent = 'กำลังอัปโหลด …';
      try {
        let data; if (/^image\//.test(f.type)) data = await M.fileToImage(f, 1600, 0.8); else { if (f.size > MAX) throw new Error('ไฟล์ใหญ่เกิน 700 KB — ใช้ลิงก์ภายนอกแทน'); data = await readURL(f); }
        if (data.length > 990000) throw new Error('ไฟล์ใหญ่เกินไป — ใช้ลิงก์ภายนอกแทน');
        await B.direct('set', 'libfiles/' + nid, data);
        A.W(B.set('library/' + nid, Object.assign(base, { kind: 'file', fname: f.name, mime: data.slice(5, data.indexOf(';')), size: Math.round(data.length * 3 / 4), at: Date.now(), by: A.myName() })));
        A.log('library.add', '', base.title); w.remove(); toast('อัปโหลดแล้ว');
      } catch (er) { btn.disabled = false; btn.textContent = 'บันทึก'; err('อัปโหลดไม่สำเร็จ: ' + (er.message || A.errTH(er))); }
    });
  }

  Object.assign(A.ACT, {
    libCat: d => { LB.cat = d.c || ''; A.rerender(); },
    libNew: () => { if (T()) form(null); }, libEdit: d => { if (T()) form(d.id); },
    libDel: async d => { if (!T()) return; const x = A.D.library[d.id]; if (!x || !(await M.confirmBox('ลบรายการ', esc(x.title) + ' จะหายไปจากคลังความรู้', 'ลบ', true))) return; A.W(B.update('', { ['library/' + d.id]: null, ['libfiles/' + d.id]: null })); A.log('library.del', '', x.title); },
    libCats: () => {
      if (!T()) return; const w = modal('<h3>หมวดหมู่คลังความรู้</h3><form class="form"><div class="muted" style="margin-bottom:8px">หนึ่งหมวดต่อหนึ่งบรรทัด</div><textarea class="in" id="lc" rows="8" aria-label="หมวดหมู่">' + esc(cats().join('\n')) + '</textarea><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); const l = Array.from(new Set($('#lc', w).value.split(/\r?\n/).map(s => s.trim()).filter(Boolean))); if (!l.length) return toast('ต้องมีอย่างน้อยหนึ่งหมวด'); A.W(B.set('config/libCats', l)); w.remove(); toast('บันทึกหมวดหมู่แล้ว'); });
    },
    libOpen: async d => {
      const x = (A.D.library || {})[d.id]; if (!x) return; if (x.kind === 'link') { window.open(x.url, '_blank', 'noopener'); return; }
      let url = ''; const w = modal('<h3>' + esc(x.title) + '</h3><div id="lv" class="muted">กำลังโหลดไฟล์ …</div><button class="btn ghost block" data-close style="margin-top:12px">ปิด</button>', { center: true, wide: true, onClose: () => { if (url) URL.revokeObjectURL(url); } });
      try {
        const data = await B.get('libfiles/' + d.id); if (!data) throw new Error('ไม่พบไฟล์'); const blob = toBlob(data); url = URL.createObjectURL(blob); const mime = blob.type;
        const pv = /^image\//.test(mime) ? '<img src="' + url + '" alt="' + esc(x.title) + '" style="max-width:100%;border-radius:10px">' : /^audio\//.test(mime) ? '<audio controls src="' + url + '" style="width:100%"></audio>' : /^video\//.test(mime) ? '<video controls src="' + url + '" style="width:100%;border-radius:10px"></video>' : /pdf/.test(mime) ? '<iframe src="' + url + '" title="' + esc(x.title) + '" style="width:100%;height:55vh;border:1px solid var(--line);border-radius:10px"></iframe>' : '';
        $('#lv', w).innerHTML = (x.desc ? '<div style="margin-bottom:10px;white-space:pre-line">' + esc(x.desc) + '</div>' : '') + pv + '<div class="row wrap" style="margin-top:10px"><a class="btn sm" href="' + url + '" target="_blank" rel="noopener">เปิดในแท็บใหม่</a><button class="btn ghost sm" id="lv-save">บันทึกไฟล์ลงเครื่อง</button></div>';
        $('#lv-save', w).addEventListener('click', () => M.saveBlob(blob, x.fname || x.title));
      } catch (er) { $('#lv', w).textContent = 'เปิดไฟล์ไม่ได้: ' + (er.message || A.errTH(er)); }
    }
  });
})();
