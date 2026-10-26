/* ============================================================
   core.js — window.MC : ตัวช่วยทั่วไป, modal/toast, ภาพ, ส่งออก PDF/PNG/DOCX, ตรวจขนาดจอ
   (โครงเดียวกับระบบ Mae Sot Musicology ตัดส่วนเฉพาะโดเมนเดิมออก)
   ============================================================ */
(function () {
  'use strict';
  const C = window.APP_CONFIG;
  /* ชมรมปัจจุบัน: C.club คืนข้อมูลของชมรมที่เลือกอยู่ (ตั้งด้วย C._club) */
  C.clubs.forEach(c => { c.school = C.school; c.year = C.year; c.long = c.long || c.full; });
  try { C._club = new URLSearchParams(location.search).get('club') || window.CLUB_DEFAULT || localStorage.getItem('ss_club') || C.clubs[0].id; } catch (e) { C._club = C.clubs[0].id; }
  Object.defineProperty(C, 'club', { get: () => C.clubs.find(c => c.id === C._club) || C.clubs[0] });
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const thDate = ts => { if (!ts) return ''; const d = new Date(ts); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + (d.getFullYear() + 543); };
  const thNum = s => String(s == null ? '' : s).replace(/[0-9]/g, d => '๐๑๒๓๔๕๖๗๘๙'[d]);
  const safeName = s => String(s || 'file').replace(/[\\/:*?"<>|\s]+/g, '_');

  /* ---------- ไลบรารีภายนอก (โหลดเมื่อใช้) ---------- */
  const LIBS = {
    h2c: [['html2canvas.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => window.html2canvas]],
    pdf: [['jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => window.jspdf]],
    fb: [
      ['firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js', () => window.firebase],
      ['firebase-auth-compat.js', 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js', () => window.firebase && window.firebase.auth],
      ['firebase-database-compat.js', 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js', () => window.firebase && window.firebase.database]
    ]
  };
  const libCache = {};
  const injectScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = res; s.onerror = () => { s.remove(); rej(new Error('load fail ' + src)); }; document.head.appendChild(s); });
  function loadLibs(name) {
    if (!libCache[name]) libCache[name] = (async () => {
      for (const [file, cdn, check] of LIBS[name]) { if (check()) continue; try { await injectScript('lib/' + file); } catch (e) { /* no local copy */ } if (!check()) await injectScript(cdn); }
    })().catch(e => { delete libCache[name]; throw e; });
    return libCache[name];
  }

  /* ---------- บันทึกไฟล์ ---------- */
  const mobile = () => /iPhone|iPad|Android/i.test(navigator.userAgent);
  async function saveBlob(blob, name) {
    const file = new File([blob], name, { type: blob.type });
    if (mobile() && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000); return 'downloaded';
  }
  async function saveFiles(files) {
    if (files.length > 1 && mobile() && navigator.canShare && navigator.canShare({ files })) { try { await navigator.share({ files }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    for (const f of files) { await saveBlob(f, f.name); await new Promise(r => setTimeout(r, 400)); }
  }

  /* ---------- หน้า A4 (.rp-page 794×1123) → PDF / PNG / ตัวอย่าง ---------- */
  function stage(el) { const w = document.createElement('div'); w.style.cssText = 'position:fixed;left:-30000px;top:0;'; w.appendChild(el); document.body.appendChild(w); return w; }
  const canvasBlob = (c, type, q) => new Promise(res => c.toBlob(res, type, q));
  const imgsReady = el => Promise.all($$('img', el).map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  const fontsReady = () => (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(() => { }) : Promise.resolve();
  /* opts: { scale: ตัวคูณความละเอียด, format: 'a4' | 'a3' … } — หน้าแนวนอนใช้ class "land" · หน้าขนาดกำหนดเองใส่ data-w / data-h (px) */
  async function exportPDF(root, filename, onProgress, opts) {
    opts = opts || {}; await Promise.all([loadLibs('h2c'), loadLibs('pdf'), fontsReady()]);
    const w = stage(root); await imgsReady(root); const pages = $$('.rp-page', root); const { jsPDF } = window.jspdf;
    const land = pages[0] && pages[0].classList.contains('land');
    const doc = new jsPDF({ unit: 'mm', format: opts.format || 'a4', orientation: land ? 'landscape' : 'portrait', compress: true });
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    try { for (let i = 0; i < pages.length; i++) { if (onProgress) onProgress(i + 1, pages.length); const cv = await html2canvas(pages[i], { scale: opts.scale || 2, backgroundColor: '#ffffff', useCORS: true, logging: false }); if (i) doc.addPage(); doc.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, ph); cv.width = cv.height = 0; } }
    finally { w.remove(); }
    return saveBlob(doc.output('blob'), filename);
  }
  async function exportPNGs(root, base, onProgress, opts) {
    opts = opts || {}; await Promise.all([loadLibs('h2c'), fontsReady()]); const w = stage(root); await imgsReady(root); const pages = $$('.rp-page', root); const files = [];
    try { for (let i = 0; i < pages.length; i++) { if (onProgress) onProgress(i + 1, pages.length); const cv = await html2canvas(pages[i], { scale: opts.scale || 2, backgroundColor: '#ffffff', useCORS: true, logging: false }); files.push(new File([await canvasBlob(cv, 'image/png')], base + (pages.length > 1 ? '-หน้า' + (i + 1) : '') + '.png', { type: 'image/png' })); cv.width = cv.height = 0; } }
    finally { w.remove(); }
    return saveFiles(files);
  }
  function previewPages(root, title, footerHTML) {
    const pages = Array.from(root.children); const land = pages[0] && pages[0].classList.contains('land');
    const PW = +(pages[0] && pages[0].dataset.w) || (land ? 1123 : 794), PH = +(pages[0] && pages[0].dataset.h) || (land ? 794 : 1123);
    const k = Math.min(1, (Math.min(window.innerWidth, 900) - 40) / PW);
    const w = modal('<div class="row" style="margin-bottom:10px"><h3 class="grow" style="margin:0">' + esc(title || 'ตัวอย่าง') + '</h3><button class="btn ghost sm" data-close>ปิด</button></div>' + (footerHTML || '') + '<div class="pv"></div>', { full: true });
    const box = $('.pv', w);
    pages.forEach(pg => { const o = document.createElement('div'); o.style.cssText = 'width:' + PW * k + 'px;height:' + PH * k + 'px;margin:0 auto 14px;box-shadow:0 4px 16px rgba(63,34,54,.25);overflow:hidden;background:#fff;border-radius:4px'; const i = document.createElement('div'); i.style.cssText = 'transform:scale(' + k + ');transform-origin:top left;width:' + PW + 'px'; i.appendChild(pg); o.appendChild(i); box.appendChild(o); });
    return w;
  }

  /* ---------- UI ทั่วไป ---------- */
  function toast(msg, ms) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms || 2600); }
  function modal(html, opts) {
    opts = opts || {}; const w = document.createElement('div'); w.className = 'modal' + (opts.center ? ' center' : '') + (opts.full ? ' full' : '');
    w.innerHTML = '<div class="modal-in' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>'; document.body.appendChild(w);
    w.addEventListener('click', e => { if ((e.target === w && !opts.sticky) || e.target.closest('[data-close]')) { w.remove(); if (opts.onClose) opts.onClose(); } });
    return w;
  }
  /* กล่องยืนยัน (ไม่ใช้ window.confirm เพราะแอปที่ติดตั้งบน iOS บางรุ่นไม่แสดง) */
  function confirmBox(title, text, okLabel, danger) {
    return new Promise(res => {
      const w = modal('<h3>' + esc(title) + '</h3><div class="muted" style="margin-bottom:16px">' + text + '</div><div class="row"><button class="btn ghost grow" data-no>ยกเลิก</button><button class="btn grow ' + (danger ? 'danger' : '') + '" data-yes>' + esc(okLabel || 'ยืนยัน') + '</button></div>', { center: true, sticky: true });
      w.addEventListener('click', e => { if (e.target.closest('[data-yes]')) { w.remove(); res(true); } else if (e.target.closest('[data-no]')) { w.remove(); res(false); } });
    });
  }
  /* ย่อ/ครอปภาพเป็นสี่เหลี่ยมจัตุรัสกลางภาพ (รูปสมาชิก) */
  function fileToSquare(file, size, q) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => { const s = Math.min(img.naturalWidth, img.naturalHeight); const sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2.6; const c = document.createElement('canvas'); c.width = c.height = Math.min(size, s); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, sx, Math.max(0, sy), s, s, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q || 0.8)); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('อ่านภาพไม่ได้')); }; img.src = url;
    });
  }

  /* ---------- ตัวเขียน DOCX (WordprocessingML + ZIP ในเครื่อง ไม่พึ่งไลบรารี) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = s => new TextEncoder().encode(s);
  function zip(files) {
    const parts = [], cen = []; let off = 0; const d = new Date(); const dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    files.forEach(f => {
      const name = enc(f.name), data = typeof f.data === 'string' ? enc(f.data) : f.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      cen.push(new Uint8Array(c.buffer), name); off += 30 + name.length + data.length;
    });
    const cenSize = cen.reduce((a, b) => a + b.length, 0);
    const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cenSize, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [new Uint8Array(e.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  const xe = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const DFONT = 'TH SarabunPSK';
  const wRun = (text, o) => { o = o || {}; const rp = (o.b ? '<w:b/><w:bCs/>' : '') + (o.sz ? '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>' : ''); return '<w:r>' + (rp ? '<w:rPr>' + rp + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + xe(text) + '</w:t></w:r>'; };
  const wPara = (inner, o) => { o = o || {}; const pp = '<w:spacing w:before="0" w:after="' + (o.after == null ? 0 : o.after) + '"/>' + (o.jc ? '<w:jc w:val="' + o.jc + '"/>' : ''); return '<w:p><w:pPr>' + pp + '</w:pPr>' + inner + '</w:p>'; };
  /* spec: { title, lines:[...], head:[...], rows:[[...]], widths:[สัดส่วน], align:['center'|'left'], footer:[...] } */
  function docxTable(spec) {
    const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    const total = 9638; /* กว้างเนื้อหา A4 (ขอบ 2 ซม.) หน่วย twip */
    const sum = spec.widths.reduce((a, b) => a + b, 0); const ws = spec.widths.map(x => Math.round(total * x / sum));
    const bd = '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
    const cell = (txt, i, head) => '<w:tc><w:tcPr><w:tcW w:w="' + ws[i] + '" w:type="dxa"/>' + (head ? '<w:shd w:val="clear" w:color="auto" w:fill="EFE4EB"/>' : '') + '<w:vAlign w:val="center"/></w:tcPr>' + wPara(wRun(txt, { b: head }), { jc: head ? 'center' : ((spec.align || [])[i] || 'left') }) + '</w:tc>';
    const row = (cells, head) => '<w:tr>' + (head ? '<w:trPr><w:tblHeader/></w:trPr>' : '') + cells.map((c, i) => cell(c, i, head)).join('') + '</w:tr>';
    const tbl = '<w:tbl><w:tblPr><w:tblW w:w="' + total + '" w:type="dxa"/><w:tblBorders>' + bd + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + ws.map(x => '<w:gridCol w:w="' + x + '"/>').join('') + '</w:tblGrid>' + row(spec.head, true) + spec.rows.map(r => row(r, false)).join('') + '</w:tbl>';
    const body = wPara(wRun(spec.title, { b: true, sz: 40 }), { jc: 'center' }) + (spec.lines || []).map((l, i, a) => wPara(wRun(l, { sz: 32 }), { jc: 'center', after: i === a.length - 1 ? 160 : 0 })).join('') + tbl + (spec.footer || []).map((l, i) => wPara(wRun(l, { sz: 28 }), { after: 0 })).join('');
    const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';
    const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + '><w:body>' + body + wPara('', {}) + sect + '</w:body></w:document>';
    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + NS + '><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + DFONT + '" w:hAnsi="' + DFONT + '" w:cs="' + DFONT + '" w:eastAsia="' + DFONT + '"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:lang w:val="en-US" w:bidi="th-TH"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
    return zip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'word/document.xml', data: doc },
      { name: 'word/styles.xml', data: styles }
    ]);
  }

  /* เอกสาร DOCX ทั่วไป: body = สตริง WordprocessingML (ใช้ wPara/wRun/wTable ประกอบ) */
  function docxDoc(body, o) {
    o = o || {}; const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'; const mar = o.margin || 1134;
    const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="' + mar + '" w:right="' + mar + '" w:bottom="' + mar + '" w:left="' + mar + '" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';
    const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + '><w:body>' + body + sect + '</w:body></w:document>';
    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + NS + '><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + DFONT + '" w:hAnsi="' + DFONT + '" w:cs="' + DFONT + '" w:eastAsia="' + DFONT + '"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:lang w:val="en-US" w:bidi="th-TH"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
    return zip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'word/document.xml', data: doc }, { name: 'word/styles.xml', data: styles }
    ]);
  }
  /* ตาราง: rows = [[ข้อความ,...]], ws = ความกว้างคอลัมน์ (twip), o.head = แถวแรกเป็นหัวตาราง, o.align = [..] */
  function wTable(rows, ws, o) {
    o = o || {}; const total = ws.reduce((a, b) => a + b, 0);
    const bd = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(k => '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="000000"/>').join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="' + total + '" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' + bd + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + ws.map(x => '<w:gridCol w:w="' + x + '"/>').join('') + '</w:tblGrid>' +
      rows.map((r, ri) => '<w:tr>' + r.map((c, i) => '<w:tc><w:tcPr><w:tcW w:w="' + ws[i] + '" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>' + wPara(wRun(c, { b: o.head && ri === 0, sz: o.sz }), { jc: o.head && ri === 0 ? 'center' : ((o.align || [])[i] || 'left') }) + '</w:tc>').join('') + '</w:tr>').join('') + '</w:tbl>';
  }
  const wBreak = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

  /* จำนวนเงิน → ตัวอักษรไทย (บาทถ้วน / สตางค์) */
  function bahtText(n) {
    n = Math.round((+n || 0) * 100) / 100; if (!n) return 'ศูนย์บาทถ้วน';
    const D = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'], U = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
    const grp = s => { let o = ''; const L = s.length; for (let i = 0; i < L; i++) { const d = +s[i], pos = L - i - 1; if (!d) continue; if (pos === 1) o += (d === 1 ? '' : d === 2 ? 'ยี่' : D[d]) + 'สิบ'; else if (pos === 0 && d === 1 && L > 1) o += 'เอ็ด'; else o += D[d] + U[pos]; } return o; };
    const rd = s => { s = s.replace(/^0+/, ''); if (!s) return ''; if (s.length <= 6) return grp(s); return rd(s.slice(0, -6)) + 'ล้าน' + grp(s.slice(-6).replace(/^0+/, '')); };
    const b = Math.floor(n), st = Math.round((n - b) * 100);
    return (b ? rd(String(b)) + 'บาท' : '') + (st ? rd(String(st)) + 'สตางค์' : 'ถ้วน');
  }
  const money = n => (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /* ย่อภาพถ่าย (ไม่ครอป) สำหรับรูปหลักฐาน */
  function fileToImage(file, max, q) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => { let w = img.naturalWidth, h = img.naturalHeight; const k = Math.min(1, (max || 1100) / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k); const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q || 0.7)); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('อ่านภาพไม่ได้')); }; img.src = url;
    });
  }

  /* ---------- ตรวจขนาดจอ/อุปกรณ์ → data-attribute บน <html> ให้ CSS จัดวางให้เหมาะ ---------- */
  (function () {
    const de = document.documentElement, ua = navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios) de.dataset.ios = '1';
    try { if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) de.dataset.standalone = '1'; } catch (e) { /* ignore */ }
    let lastW = 0, raf = 0;
    function fit() {
      const w = Math.round(window.innerWidth || de.clientWidth || 0), h = Math.round(window.innerHeight || 0); if (!w) return;
      const o = w > h ? 'land' : 'port'; if (de.dataset.orient !== o) de.dataset.orient = o;
      if (w === lastW) return; lastW = w;
      const s = w < 350 ? 'xs' : w < 480 ? 'sm' : w < 768 ? 'md' : w < 1100 ? 'lg' : 'xl'; if (de.dataset.size !== s) { de.dataset.size = s; window.dispatchEvent(new Event('mc-resize')); }
    }
    fit(); const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
    window.addEventListener('resize', on); window.addEventListener('orientationchange', () => setTimeout(fit, 250));
  })();
  const inAppBrowser = () => /Line\/|FBAN|FBAV|Instagram|Messenger/i.test(navigator.userAgent || '');

  window.MC = { C, $, $$, esc, uid, thDate, thNum, safeName, MONTHS, loadLibs, saveBlob, saveFiles, exportPDF, exportPNGs, previewPages,
    toast, modal, confirmBox, fileToSquare, fileToImage, docxTable, docxDoc, wTable, wPara, wRun, wBreak, bahtText, money, zip, inAppBrowser };
})();
