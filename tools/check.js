#!/usr/bin/env node
/* tools/check.js — ตรวจความครบของไฟล์ก่อนอัปขึ้น GitHub
   ใช้:  node tools/check.js        (รันจากโฟลเดอร์เว็บ)   ผ่านทั้งหมด = ขึ้น “พร้อมเผยแพร่” · มีข้อผิดพลาด = จบด้วยรหัส 1 */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..'), R = f => fs.readFileSync(path.join(root, f), 'utf8'), has = f => fs.existsSync(path.join(root, f));
const errs = [], warns = [], ok = m => console.log('  ✓ ' + m), bad = m => { errs.push(m); console.log('  ✗ ' + m); }, warn = m => { warns.push(m); console.log('  ! ' + m); };
console.log('ตรวจโฟลเดอร์ ' + root);
/* 1) ไฟล์ที่หน้าเว็บเรียก */
['index.html'].forEach(h => { if (!has(h)) return bad('ไม่พบ ' + h); const miss = (R(h).match(/(?:src|href)="([^":#?]+)"/g) || []).map(x => x.split('"')[1]).filter(f => !has(f)); miss.length ? bad(h + ' เรียกไฟล์ที่ไม่มี: ' + miss.join(', ')) : ok(h + ' — ไฟล์ที่เรียกมีครบ'); });
const scripts = h => (R(h).match(/<script src="([^"]+)"/g) || []).map(x => x.split('"')[1]);
const a = scripts('index.html'); ok('index.html โหลดสคริปต์ ' + a.length + ' ไฟล์');
/* 2) service worker */
const sw = R('sw.js'), shell = ((sw.match(/SHELL = \[([\s\S]*?)\];/) || [])[1] || '').match(/'[^']+'/g) || [];
const sh = shell.map(x => x.slice(1, -1)), smiss = sh.filter(f => f !== './' && !has(f)); smiss.length ? bad('sw.js อ้างไฟล์ที่ไม่มี: ' + smiss.join(', ')) : ok('sw.js — ไฟล์ในรายการแคชมีครบ (' + sh.length + ')');
const notCached = a.filter(f => !sh.includes(f)); notCached.length ? warn('สคริปต์ที่ยังไม่อยู่ในรายการแคชของ sw.js (ใช้ออฟไลน์ไม่ได้): ' + notCached.join(', ')) : ok('สคริปต์ทุกไฟล์อยู่ในรายการแคช');
console.log('  · CACHE = ' + ((sw.match(/CACHE = '([^']+)'/) || [])[1] || '?') + '  (ต้องเพิ่มเลขทุกครั้งที่ออกรุ่น)');
/* 3) ไวยากรณ์ */
fs.readdirSync(root).filter(f => f.endsWith('.js')).forEach(f => { try { execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); } catch (e) { bad('ไวยากรณ์ผิดใน ' + f + ': ' + String(e.stderr || e.message).split('\n').slice(0, 3).join(' ')); } });
ok('ตรวจไวยากรณ์ไฟล์ .js แล้ว');
/* 4) Rules ↔ แอป (สร้างด้วย python3 tools/build-rules.py) */
let rules = null; try { rules = JSON.parse(R('database.rules.json')).rules; ok('database.rules.json เป็น JSON ที่ถูกต้อง'); } catch (e) { bad('database.rules.json ไม่ใช่ JSON ที่ถูกต้อง: ' + e.message); }
const rv = (R('app.js').match(/RULES_V\s*=\s*(\d+)/) || [])[1];
if (rules) (rules.rulesProbe && rules.rulesProbe['v' + rv]) ? ok('Rules รุ่น v' + rv + ' ตรงกับ app.js') : bad('app.js ต้องการ Rules v' + rv + ' แต่ database.rules.json มี ' + Object.keys(rules.rulesProbe || {}).join(','));
/* 5) รุ่นและการตั้งค่า */
const cfg = R('config.js'), ver = (cfg.match(/version:\s*"([^"]+)"/) || [])[1], top = (cfg.match(/changelog:\s*\[\s*\{\s*v:\s*"([^"]+)"/) || [])[1];
ver === top ? ok('รุ่น ' + ver + ' ตรงกับรายการอัปเดตบนสุด') : bad('version (' + ver + ') ไม่ตรงกับรายการอัปเดตบนสุด (' + top + ')');
/vapidKey:\s*"B[\w-]{60,}"/.test(cfg) ? ok('มี vapidKey') : warn('ยังไม่ได้ใส่ vapidKey — การแจ้งเตือนจะเปิดไม่ได้');
/pushRelay:\s*"https:\/\/script\.google\.com\/.+\/exec"/.test(cfg) ? ok('มี pushRelay') : warn('ยังไม่ได้ใส่ pushRelay — การแจ้งเตือนจะไม่ถูกส่งออก');
const pid = (cfg.match(/projectId:\s*"([^"]*)"/) || [])[1]; if (!pid) warn('ยังไม่ได้ใส่ค่า Firebase ใน config.js — แอปจะทำงานในโหมดสาธิต'); else if (has('firebase-messaging-sw.js')) R('firebase-messaging-sw.js').includes('"' + pid + '"') ? ok('firebase-messaging-sw.js ใช้โปรเจกต์เดียวกับ config.js') : bad('firebase-messaging-sw.js ไม่ได้ใช้โปรเจกต์ ' + pid);
/* 6) ของที่ห้ามขึ้นเว็บ */
const secret = []; (function walk(d) { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { if (e.name === '.git' || e.name === 'node_modules') return; const p = path.join(d, e.name); if (e.isDirectory()) return walk(p); if (/serviceAccount.*\.json$/i.test(e.name) || (e.name.endsWith('.json') && fs.statSync(p).size < 20000 && /"private_key"\s*:/.test(fs.readFileSync(p, 'utf8')))) secret.push(path.relative(root, p)); }); })(root);
secret.length ? bad('พบไฟล์กุญแจ service account ในโฟลเดอร์เว็บ — ย้ายออกก่อนอัปโหลด: ' + secret.join(', ')) : ok('ไม่พบไฟล์กุญแจ service account');
['files', 'files.zip', '_backup_before_merge'].filter(has).forEach(f => warn('“' + f + '” ไม่จำเป็นต้องอัปขึ้น GitHub'));
console.log(errs.length ? '\nไม่ผ่าน ' + errs.length + ' ข้อ — แก้ก่อนเผยแพร่' : '\nพร้อมเผยแพร่' + (warns.length ? ' (มีข้อสังเกต ' + warns.length + ' ข้อ)' : ''));
process.exit(errs.length ? 1 : 0);
