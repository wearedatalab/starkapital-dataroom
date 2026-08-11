/* ============================================================
   Starkapital · Data Room — Módulo de acceso
   ------------------------------------------------------------
   Dos modos, automáticos:

   • NUBE  — si config.js trae la configuración de Firebase.
             Los accesos se administran desde cualquier lugar y
             quedan guardados en la nube. Las claves NUNCA se
             guardan: se guarda solo una huella criptográfica
             (PBKDF2-SHA256, 150.000 iteraciones) imposible de
             revertir. Ni siquiera nosotros podemos leerlas.

   • LOCAL — si no hay configuración, funciona como antes con
             la lista publicada en users.js. Sirve de respaldo.
   ============================================================ */
(function (global) {
  'use strict';

  var CFG = global.SK_FIREBASE || null;
  var ADMIN_EMAIL = (global.SK_ADMIN_EMAIL || 'gerencia@starkapital.com').toLowerCase();
  var PEPPER = 'starkapital-dataroom-2026';
  var IKEY = 'sk_dr_investors';

  var mode = (CFG && CFG.apiKey && CFG.projectId) ? 'cloud' : 'local';
  var fb = null;          // { auth, db } cuando el modo es nube
  var readyP = null;

  /* ---------- utilidades ---------- */
  function genPass() {
    var C = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', p = '', a = new Uint32Array(8);
    (global.crypto || {}).getRandomValues
      ? global.crypto.getRandomValues(a)
      : a.forEach(function (_, i) { a[i] = Math.floor(Math.random() * 4294967296); });
    for (var i = 0; i < 8; i++) p += C[a[i] % C.length];
    return p;
  }

  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  /* Huella del par correo+clave. El id del documento ES la huella:
     sin las credenciales exactas no se puede ni encontrar el registro. */
  async function fingerprint(email, pass) {
    var enc = new TextEncoder();
    var key = await crypto.subtle.importKey(
      'raw', enc.encode(String(email).trim().toLowerCase() + '|' + pass),
      'PBKDF2', false, ['deriveBits']);
    var bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(PEPPER), iterations: 150000, hash: 'SHA-256' },
      key, 256);
    return hex(bits);
  }

  async function emailId(email) {
    var b = await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(String(email).trim().toLowerCase() + '|' + PEPPER));
    return hex(b);
  }

  /* ---------- modo LOCAL (respaldo con users.js) ---------- */
  var localApi = {
    mode: 'local',
    ready: function () { return Promise.resolve(); },
    adminSignedIn: function () { return false; },

    _get: function () {
      try { var v = JSON.parse(localStorage.getItem(IKEY)); return Array.isArray(v) ? v : []; }
      catch (_) { return []; }
    },
    _set: function (l) { try { localStorage.setItem(IKEY, JSON.stringify(l)); } catch (_) {} },

    sync: function () {
      var PUB = Array.isArray(global.SK_USERS) ? global.SK_USERS : [];
      var PUBV = +global.SK_USERS_VERSION || 0, sv = 0;
      try { sv = +localStorage.getItem('sk_dr_ver') || 0; } catch (_) {}
      if (!localStorage.getItem(IKEY) || sv < PUBV) {
        localApi._set(PUB.map(function (x) {
          return { name: x.name, email: String(x.email).toLowerCase(), pass: x.pass };
        }));
        try { localStorage.setItem('sk_dr_ver', PUBV); } catch (_) {}
      }
      return Promise.resolve();
    },

    login: function (email, pass) {
      var v = String(email).trim().toLowerCase();
      var hit = localApi._get().filter(function (x) {
        return String(x.email).toLowerCase() === v && x.pass === pass;
      })[0];
      return Promise.resolve(hit ? { name: hit.name, email: hit.email, role: 'inversionista' } : null);
    },

    adminLogin: function (email, pass) {
      var stored = 'starkadmin2026';
      try { stored = localStorage.getItem('sk_dr_adminpass') || stored; } catch (_) {}
      return Promise.resolve(pass === stored);
    },

    list: function () {
      return Promise.resolve(localApi._get().map(function (x, i) {
        return { id: String(i), name: x.name, email: x.email, pass: x.pass };
      }));
    },
    create: function (name, email) {
      var pass = genPass(), l = localApi._get();
      l.push({ name: name, email: String(email).toLowerCase(), pass: pass });
      localApi._set(l);
      return Promise.resolve({ pass: pass });
    },
    reset: function (id) {
      var l = localApi._get(), pass = genPass();
      l[+id].pass = pass; localApi._set(l);
      return Promise.resolve({ pass: pass, name: l[+id].name, email: l[+id].email });
    },
    update: function (id, name, email, pass) {
      var l = localApi._get();
      l[+id] = { name: name, email: String(email).toLowerCase(), pass: pass };
      localApi._set(l);
      return Promise.resolve();
    },
    remove: function (id) {
      var l = localApi._get(); l.splice(+id, 1); localApi._set(l);
      return Promise.resolve();
    }
  };

  /* ---------- modo NUBE (Firebase) ---------- */
  function loadFirebase() {
    if (readyP) return readyP;
    readyP = (async function () {
      var appMod  = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      var authMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      var dbMod   = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      var app = appMod.initializeApp(CFG);
      fb = { auth: authMod.getAuth(app), db: dbMod.getFirestore(app), A: authMod, D: dbMod };
      await new Promise(function (res) {
        var off = authMod.onAuthStateChanged(fb.auth, function () { off(); res(); });
      });
    })();
    return readyP;
  }

  var cloudApi = {
    mode: 'cloud',
    ready: loadFirebase,
    sync: function () { return Promise.resolve(); },
    adminSignedIn: function () { return !!(fb && fb.auth.currentUser); },

    /* El inversionista solo puede encontrar SU documento si acierta
       correo y clave: el id del documento es la huella de ambos. */
    login: async function (email, pass) {
      await loadFirebase();
      var id = await fingerprint(email, pass);
      var snap = await fb.D.getDoc(fb.D.doc(fb.db, 'access', id));
      if (!snap.exists()) return null;
      var d = snap.data();
      return { name: d.name, email: d.email, role: 'inversionista' };
    },

    adminLogin: async function (email, pass) {
      await loadFirebase();
      try { await fb.A.signInWithEmailAndPassword(fb.auth, email, pass); return true; }
      catch (e) { return false; }
    },

    signOut: async function () {
      if (fb && fb.auth.currentUser) { try { await fb.A.signOut(fb.auth); } catch (_) {} }
    },

    list: async function () {
      await loadFirebase();
      var q = await fb.D.getDocs(fb.D.collection(fb.db, 'roster'));
      var out = [];
      q.forEach(function (d) { out.push(Object.assign({ id: d.id }, d.data())); });
      out.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
      return out;
    },

    create: async function (name, email) {
      await loadFirebase();
      var mail = String(email).trim().toLowerCase(), pass = genPass();
      var rid = await emailId(mail), aid = await fingerprint(mail, pass);
      await fb.D.setDoc(fb.D.doc(fb.db, 'access', aid), { name: name, email: mail });
      await fb.D.setDoc(fb.D.doc(fb.db, 'roster', rid), { name: name, email: mail, accessId: aid });
      return { pass: pass };
    },

    reset: async function (id) {
      await loadFirebase();
      var snap = await fb.D.getDoc(fb.D.doc(fb.db, 'roster', id));
      if (!snap.exists()) throw new Error('no-user');
      var d = snap.data(), pass = genPass();
      var aid = await fingerprint(d.email, pass);
      await fb.D.setDoc(fb.D.doc(fb.db, 'access', aid), { name: d.name, email: d.email });
      if (d.accessId) { try { await fb.D.deleteDoc(fb.D.doc(fb.db, 'access', d.accessId)); } catch (_) {} }
      await fb.D.setDoc(fb.D.doc(fb.db, 'roster', id), { name: d.name, email: d.email, accessId: aid });
      return { pass: pass, name: d.name, email: d.email };
    },

    update: async function (id, name, email, pass) {
      await loadFirebase();
      var snap = await fb.D.getDoc(fb.D.doc(fb.db, 'roster', id));
      var old = snap.exists() ? snap.data() : {};
      var mail = String(email).trim().toLowerCase();
      var nrid = await emailId(mail), aid = await fingerprint(mail, pass);
      await fb.D.setDoc(fb.D.doc(fb.db, 'access', aid), { name: name, email: mail });
      if (old.accessId && old.accessId !== aid) {
        try { await fb.D.deleteDoc(fb.D.doc(fb.db, 'access', old.accessId)); } catch (_) {}
      }
      await fb.D.setDoc(fb.D.doc(fb.db, 'roster', nrid), { name: name, email: mail, accessId: aid });
      if (nrid !== id) { try { await fb.D.deleteDoc(fb.D.doc(fb.db, 'roster', id)); } catch (_) {} }
    },

    remove: async function (id) {
      await loadFirebase();
      var snap = await fb.D.getDoc(fb.D.doc(fb.db, 'roster', id));
      if (snap.exists() && snap.data().accessId) {
        try { await fb.D.deleteDoc(fb.D.doc(fb.db, 'access', snap.data().accessId)); } catch (_) {}
      }
      await fb.D.deleteDoc(fb.D.doc(fb.db, 'roster', id));
    }
  };

  var api = mode === 'cloud' ? cloudApi : localApi;
  api.genPass = genPass;
  api.isCloud = mode === 'cloud';
  api.adminEmail = ADMIN_EMAIL;
  global.SKAuth = api;
})(window);
