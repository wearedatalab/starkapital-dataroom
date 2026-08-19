/* Pone (o actualiza) el número de versión de los scripts locales para que
   cada publicación se aplique de inmediato, sin quedar servida desde la
   caché del navegador del inversionista. */
const fs = require('fs');
const V = process.argv[2] || '20260818a';
const SCRIPTS = ['docs.js', 'config.js', 'users.js', 'auth.js'];

for (const f of ['index.html', 'en.html', 'm.html', 'en-m.html']) {
  const raw = fs.readFileSync(f, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  for (const n of SCRIPTS) {
    const re = new RegExp('src="' + n.replace(/\./g, '\\.') + '(?:\\?v=[^"]*)?"', 'g');
    const antes = (s.match(re) || []).length;
    if (!antes) throw new Error(f + ': no se halló ' + n);
    s = s.replace(re, 'src="' + n + '?v=' + V + '"');
  }
  fs.writeFileSync(f, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
  console.log(f, 'OK');
}
console.log('versión aplicada:', V);
