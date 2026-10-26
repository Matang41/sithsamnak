/* ============================================================
   signature.js — รุ่น 3.2: ลายเซ็นแอดมินสำหรับรับรองเอกสาร (จัดการ › ลายเซ็นแอดมิน)
   ข้อมูล: sigs/{emailKey} = { img (PNG โปร่งใส), name, pos, auto, at }  — บันทึกในทุกเครือข่ายที่แอดมินคนนี้ดูแล
   ใช้ใน: เกียรติบัตร (ติ๊กเลือกตอนออก) · ใบรับเงิน/ใบเบิกเงินที่แอดมินอนุมัติ (อัตโนมัติ เปิด/ปิดได้) · รายงานรายชื่อ PDF · แบบ วก.12 PDF
   หมายเหตุ: ศิษย์ในเครือข่ายอ่านรูปลายเซ็นได้ (เพื่อให้เกียรติบัตรของตัวเองแสดงลายเซ็นครบ) ใช้กับเอกสารของเครือข่ายเท่านั้น
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP;
  const { $, esc, toast, modal } = M; const { fld } = A;
  A.SUBS.push({ key: 'sigs', path: () => 'sigs' });
  const sigs = () => A.D.sigs || {}, key = () => (A.teacher() && A.USER) ? B.emailKey(A.USER.email) : '';
  A.mySigKey = key;
  A.mySigRec = () => { const r = sigs()[key()]; return r && r.img ? r : null; };
  A.sigByName = n => { if (!n) return ''; const k = Object.keys(sigs()).find(x => sigs()[x] && sigs()[x].name === n && sigs()[x].img && sigs()[x].auto !== false); return k ? sigs()[k].img : ''; };

  /* ตัดขอบ ย่อขนาด และ (ถ้าเป็นภาพถ่ายลายเซ็นบนกระดาษ) ทำพื้นขาวให้โปร่งใส */
  function finalize(src, wipe) {
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, k = Math.min(1, 1000 / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4;
      if (wipe) { const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; if (lum > 228) p[i + 3] = 0; else if (lum > 170) p[i + 3] = Math.round(p[i + 3] * (228 - lum) / 58); }
      if (p[i + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 < 0) throw new Error('ไม่พบลายเซ็นในภาพ');
    g.putImageData(d, 0, 0); const bw = x1 - x0 + 1, bh = y1 - y0 + 1; let out = '';
    for (const W of [480, 360, 260]) { const s2 = Math.min(1, W / bw), o = document.createElement('canvas'); o.width = Math.max(1, Math.round(bw * s2)); o.height = Math.max(1, Math.round(bh * s2)); o.getContext('2d').drawImage(c, x0, y0, bw, bh, 0, 0, o.width, o.height); out = o.toDataURL('image/png'); if (out.length < 70000) break; }
    if (out.length >= 79000) throw new Error('ภาพลายเซ็นใหญ่เกินไป ลองถ่ายให้ใกล้ขึ้นหรือเซ็นด้วยเส้นหนา');
    return out;
  }
  function save(patch) {
    if (!A.teacher()) return; const k = key(), old = sigs()[k] || {}, rec = Object.assign({ name: A.myName(), pos: 'แอดมิน', auto: true }, old, patch, { at: Date.now() }), upd = {};
    A.myClubs().forEach(c => { upd['/c/' + c + '/sigs/' + k] = rec; }); A.W(B.update('', upd));
  }

  A.MANAGE.push(() => {
    const r = A.mySigRec();
    return '<section class="card"><div class="lb">ลายเซ็นแอดมิน</div><div class="muted" style="margin-bottom:10px">เก็บลายเซ็นของแอดมินไว้ประทับลงเอกสารที่แอดมินรับรอง ได้แก่ เกียรติบัตร (ติ๊กเลือกตอนออก) · ใบรับเงิน/ใบเบิกเงินที่แอดมินอนุมัติ (อัตโนมัติ) · รายงานรายชื่อ PDF · แบบ วก.12 PDF</div>' +
      (r ? '<div class="sigprev"><img src="' + esc(r.img) + '" alt="ลายเซ็นแอดมิน"></div><div class="kv"><span>ชื่อใต้ลายเซ็น</span><b>' + esc(r.name || '') + '</b></div><div class="kv"><span>ตำแหน่ง</span><b>' + esc(r.pos || '') + '</b></div>' +
        '<label class="ck wide" style="margin-top:8px"><input type="checkbox" data-sgauto' + (r.auto !== false ? ' checked' : '') + '><span>ประทับลายเซ็นอัตโนมัติในใบรับเงิน/ใบเบิกเงินที่แอดมินอนุมัติ</span></label>' : '<div class="note">ยังไม่ได้เพิ่มลายเซ็น</div>') +
      '<div class="row wrap" style="margin-top:10px"><button class="btn" data-act="sgUpload">' + (r ? 'เปลี่ยนด้วยรูปภาพ' : 'อัปโหลดรูปลายเซ็น') + '</button><button class="btn ghost" data-act="sgDraw">เซ็นบนหน้าจอ</button>' + (r ? '<button class="btn ghost" data-act="sgEdit">แก้ชื่อ / ตำแหน่ง</button><button class="btn ghost danger" data-act="sgDel">ลบ</button>' : '') + '</div>' +
      '<div class="muted" style="margin-top:8px">เคล็ดลับ: เซ็นด้วยปากกาสีเข้มบนกระดาษขาว ถ่ายให้ใกล้ แสงสว่างสม่ำเสมอ ระบบตัดพื้นหลังขาวให้โปร่งใสเอง · ศิษย์ในเครือข่ายอ่านรูปลายเซ็นได้เพื่อแสดงบนเกียรติบัตรของตนเอง</div></section>';
  });
  document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.sgauto !== undefined && A.teacher()) save({ auto: e.target.checked }); });

  function nameFields(r) { return '<div class="g3">' + fld('ชื่อใต้ลายเซ็น', '<input class="in" id="sg-n" value="' + esc((r && r.name) || A.myName()) + '">') + fld('ตำแหน่ง', '<input class="in" id="sg-p" value="' + esc((r && r.pos) || 'แอดมิน') + '">') + '</div>'; }
  Object.assign(A.ACT, {
    sgUpload: () => {
      if (!A.teacher()) return; let img = '';
      const w = modal('<h3>อัปโหลดรูปลายเซ็น</h3><form class="form">' + fld('รูปลายเซ็น (ถ่ายภาพหรือไฟล์ PNG/JPG)', '<input class="in" type="file" accept="image/*" id="sg-f">') + '<div id="sg-pv" class="sigprev" hidden></div>' + nameFields(A.mySigRec()) + '<div class="note bad" id="sg-e" hidden></div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true });
      $('#sg-f', w).addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const u = URL.createObjectURL(f), im = new Image(); const er = t => { const el = $('#sg-e', w); el.textContent = t; el.hidden = false; };
        im.onload = () => { try { img = finalize(im, true); $('#sg-pv', w).hidden = false; $('#sg-pv', w).innerHTML = '<img src="' + img + '" alt="ตัวอย่างลายเซ็น">'; $('#sg-e', w).hidden = true; } catch (x) { img = ''; er(x.message); } URL.revokeObjectURL(u); }; im.onerror = () => { er('อ่านภาพไม่ได้'); URL.revokeObjectURL(u); }; im.src = u; });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); if (!img) { const el = $('#sg-e', w); el.textContent = 'เลือกรูปลายเซ็นก่อน'; el.hidden = false; return; } save({ img, name: $('#sg-n', w).value.trim(), pos: $('#sg-p', w).value.trim() }); w.remove(); toast('บันทึกลายเซ็นแล้ว'); });
    },
    sgDraw: () => {
      if (!A.teacher()) return;
      const w = modal('<h3>เซ็นบนหน้าจอ</h3><form class="form"><canvas id="sg-c" class="sig" width="720" height="270" aria-label="ช่องลงลายมือชื่อ"></canvas><button type="button" class="btn ghost sm" id="sg-clr" style="margin:6px 0 10px">ล้าง</button>' + nameFields(A.mySigRec()) + '<div class="note bad" id="sg-e" hidden></div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true });
      const cv = $('#sg-c', w), g = cv.getContext('2d'); let drawn = 0, down = false; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#14143a';
      const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
      cv.addEventListener('pointerdown', e => { e.preventDefault(); down = true; cv.setPointerCapture(e.pointerId); const p = pos(e); g.beginPath(); g.moveTo(p[0], p[1]); });
      cv.addEventListener('pointermove', e => { if (!down) return; e.preventDefault(); const p = pos(e); g.lineTo(p[0], p[1]); g.stroke(); drawn++; });
      ['pointerup', 'pointercancel'].forEach(k => cv.addEventListener(k, () => { down = false; }));
      $('#sg-clr', w).addEventListener('click', () => { g.clearRect(0, 0, cv.width, cv.height); drawn = 0; });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); const er = t => { const el = $('#sg-e', w); el.textContent = t; el.hidden = false; }; if (drawn < 8) return er('กรุณาเซ็นชื่อในกรอบ');
        try { save({ img: finalize(cv, false), name: $('#sg-n', w).value.trim(), pos: $('#sg-p', w).value.trim() }); w.remove(); toast('บันทึกลายเซ็นแล้ว'); } catch (x) { er(x.message); } });
    },
    sgEdit: () => {
      if (!A.teacher()) return; const w = modal('<h3>แก้ชื่อ / ตำแหน่ง</h3><form class="form">' + nameFields(A.mySigRec()) + '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); save({ name: $('#sg-n', w).value.trim(), pos: $('#sg-p', w).value.trim() }); w.remove(); toast('บันทึกแล้ว'); });
    },
    sgDel: async () => { if (!A.teacher() || !(await M.confirmBox('ลบลายเซ็น', 'เอกสารที่ออกไปแล้วด้วยลายเซ็นนี้จะไม่แสดงลายเซ็นอีก', 'ลบ', true))) return; const k = key(), upd = {}; A.myClubs().forEach(c => { upd['/c/' + c + '/sigs/' + k] = null; }); A.W(B.update('', upd)); toast('ลบลายเซ็นแล้ว'); }
  });
})();
