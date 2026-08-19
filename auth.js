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

   PERMISOS POR DOCUMENTO
   Cada inversionista lleva un campo "docs":
     · null / ausente  -> ve TODOS los documentos (valor por defecto,
                          para no romper los accesos ya creados)
     · ["ov1","fh2"]   -> ve únicamente esos documentos
   Los identificadores provienen de docs.js.
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

  /* Normaliza la lista de permisos: null = acceso a todo. */
  function normDocs(v) {
    if (!Array.isArray(v)) return null;
    var known = {}, all = [];
    (global.SK_DOCS || []).forEach(function (g) {
      (g.d || []).forEach(function (x) { known[x.id] = 1; all.push(x.id); });
    });
    if (!all.length) return v.slice();
    return v.filter(function (id) { return known[id]; });
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
      return Promise.resolve(hit
        ? { name: hit.name, email: hit.email, role: 'inversionista', docs: normDocs(hit.docs) }
        : null);
    },

    refresh: function () { return Promise.resolve(undefined); },

    adminLogin: function (email, pass) {
      var stored = 'starkadmin2026';
      try { stored = localStorage.getItem('sk_dr_adminpass') || stored; } catch (_) {}
      return Promise.resolve(pass === stored);
    },

    list: function () {
      return Promise.resolve(localApi._get().map(function (x, i) {
        return { id: String(i), name: x.name, email: x.email, pass: x.pass, docs: normDocs(x.docs) };
      }));
    },
    create: function (name, email, chosen, docs) {
      var pass = (chosen && String(chosen).trim()) || genPass(), l = localApi._get();
      l.push({ name: name, email: String(email).toLowerCase(), pass: pass, docs: normDocs(docs) });
      localApi._set(l);
      return Promise.resolve({ pass: pass });
    },
    reset: function (id) {
      var l = localApi._get(), pass = genPass();
      l[+id].pass = pass; localApi._set(l);
      return Promise.resolve({ pass: pass, name: l[+id].name, email: l[+id].email });
    },
    update: function (id, name, email, pass, docs) {
      var l = localApi._get();
      l[+id] = { name: name, email: String(email).toLowerCase(),
                 pass: pass || l[+id].pass, docs: normDocs(docs) };
      localApi._set(l);
      return Promise.resolve();
    },
    remove: function (id) {
      var l = localApi._get(); l.splice(+id, 1); localApi._set(l);
      return Promise.resolve();
    }
  };

  /* ---------- modo NUBE (Firebase) ----------
     El acceso del inversionista SOLO necesita Firestore. No se
     inicializa Authentication en esa ruta, porque Auth depende de
     IndexedDB y en ventanas de incógnito (o con almacenamiento
     restringido) puede fallar y tumbar todo el login. */
  var authP = null;

  function loadFirebase() {
    if (readyP) return readyP;
    readyP = (async function () {
      var appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      var dbMod  = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      var app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(CFG);
      fb = { app: app, db: dbMod.getFirestore(app), D: dbMod };
    })();
    return readyP;
  }

  /* Authentication solo se carga cuando entra el administrador, y con
     una cadena de persistencia que degrada a memoria si el navegador
     no permite almacenamiento. */
  function loadAuth() {
    if (authP) return authP;
    authP = (async function () {
      await loadFirebase();
      var A = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      var auth;
      try {
        auth = A.initializeAuth(fb.app, {
          persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence,
                        A.browserSessionPersistence, A.inMemoryPersistence]
        });
      } catch (_) { auth = A.getAuth(fb.app); }
      fb.auth = auth; fb.A = A;
      /* Esperar a que Firebase restaure la sesión guardada. Sin esto,
         tras recargar la página las operaciones del administrador se
         lanzan sin sesión y el servidor las rechaza en silencio. */
      await new Promise(function (res) {
        var done = false;
        var off = A.onAuthStateChanged(auth, function () {
          if (done) return; done = true; try { off(); } catch (_) {} res();
        });
        setTimeout(function () { if (!done) { done = true; res(); } }, 6000);
      });
    })();
    return authP;
  }

  var cloudApi = {
    mode: 'cloud',
    ready: loadFirebase,
    sync: function () { return Promise.resolve(); },
    adminSignedIn: function () { return !!(fb && fb.auth && fb.auth.currentUser); },

    /* El inversionista solo puede encontrar SU documento si acierta
       correo y clave: el id del documento es la huella de ambos.
       Si no está en la nube, se acepta la lista publicada en
       users.js — así ningún acceso vigente se cae durante la
       migración. */
    login: async function (email, pass) {
      var caido = false;
      try {
        await loadFirebase();
        var id = await fingerprint(email, pass);
        var snap = await fb.D.getDoc(fb.D.doc(fb.db, 'access', id));
        if (snap.exists()) {
          var d = snap.data();
          return { name: d.name, email: d.email, role: 'inversionista', docs: normDocs(d.docs), aid: id };
        }
      } catch (e) { cloudApi.lastError = e; caido = true; }
      if (!caido) return null;   // la nube respondió: no hay tal credencial
      var v = String(email).trim().toLowerCase();
      var PUB = Array.isArray(global.SK_USERS) ? global.SK_USERS : [];
      var hit = PUB.filter(function (x) {
        return String(x.email).toLowerCase() === v && x.pass === pass;
      })[0];
      return hit
        ? { name: hit.name, email: hit.email, role: 'inversionista', docs: normDocs(hit.docs) }
        : null;
    },

    /* Relee los permisos vigentes de una sesión ya autenticada.
       Devuelve null si el acceso fue revocado o la clave reiniciada. */
    refresh: async function (aid) {
      await loadFirebase();
      var snap = await fb.D.getDoc(fb.D.doc(fb.db, 'access', aid));
      if (!snap.exists()) return null;
      var d = snap.data();
      return { name: d.name, email: d.email, role: 'inversionista', docs: normDocs(d.docs), aid: aid };
    },

    adminLogin: async function (email, pass) {
      await loadAuth();
      try { await fb.A.signInWithEmailAndPassword(fb.auth, email, pass); return true; }
      catch (e) { cloudApi.lastError = e; return false; }
    },

    signOut: async function () {
      if (fb && fb.auth && fb.auth.currentUser) { try { await fb.A.signOut(fb.auth); } catch (_) {} }
    },

    list: async function () {
      await loadAuth();
      if (!fb.auth.currentUser) throw new Error('sin-sesion-admin');
      var q = await fb.D.getDocs(fb.D.collection(fb.db, 'roster'));
      var out = [];
      q.forEach(function (d) {
        var r = Object.assign({ id: d.id }, d.data());
        r.docs = normDocs(r.docs);
        out.push(r);
      });
      out.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
      return out;
    },

    create: async function (name, email, chosen, docs) {
      await loadAuth();
      var mail = String(email).trim().toLowerCase();
      var pass = (chosen && String(chosen).trim()) || genPass();
      var perm = normDocs(docs);
      var rid = await emailId(mail), aid = await fingerprint(mail, pass);
      try {
        var prev = await fb.D.getDoc(fb.D.doc(fb.db, 'roster', rid));
        if (prev.exists() && prev.data().accessId && prev.data().accessId !== aid) {
          await fb.D.deleteDoc(fb.D.doc(fb.db, 'access', prev.data().accessId));
        }
      } catch (_) {}
      await fb.D.setDoc(fb.D.doc(fb.db, 'access', aid), { name: name, email: mail, docs: perm });
      await fb.D.setDoc(fb.D.doc(fb.db, 'roster', rid), { name: name, email: mail, accessId: aid, docs: perm });
      return { pass: pass };
    },

    reset: async function (id) {
      await loadAuth();
      var snap = await fb.D.getDoc(fb.D.doc(fb.db, 'roster', id));
      if (!snap.exists()) throw new Error('no-user');
      var d = snap.data(), pass = genPass();
      var perm = normDocs(d.docs);
      var aid = await fingerprint(d.email, pass);
      await fb.D.setDoc(fb.D.doc(fb.db, 'access', aid), { name: d.name, email: d.email, docs: perm });
      if (d.accessId) { try { await fb.D.deleteDoc(fb.D.doc(fb.db, 'access', d.accessId)); } catch (_) {} }
      await fb.D.setDoc(fb.D.doc(fb.db, 'roster', id), { name: d.name, email: d.email, accessId: aid, docs: perm });
      return { pass: pass, name: d.name, email: d.email };
    },

    update: async function (id, name, email, pass, docs) {
      await loadAuth();
      var snap = await fb.D.getDoc(fb.D.doc(fb.db, 'roster', id));
      var old = snap.exists() ? snap.data() : {};
      var mail = String(email).trim().toLowerCase();
      var perm = normDocs(docs);

      /* Sin clave nueva se conserva la vigente: solo se actualiza el
         nombre. El correo no puede cambiar, porque la huella guardada
         depende de él y no es posible recalcularla sin la clave. */
      if (!pass) {
        if (!old.accessId || mail !== String(old.email || '').toLowerCase()) {
          throw new Error('clave-requerida');
        }
        await fb.D.setDoc(fb.D.doc(fb.db, 'access', old.accessId), { name: name, email: mail, docs: perm });
        await fb.D.setDoc(fb.D.doc(fb.db, 'roster', id), { name: name, email: mail, accessId: old.accessId, docs: perm });
        return;
      }

      var nrid = await emailId(mail), aid = await fingerprint(mail, pass);
      await fb.D.setDoc(fb.D.doc(fb.db, 'access', aid), { name: name, email: mail, docs: perm });
      if (old.accessId && old.accessId !== aid) {
        try { await fb.D.deleteDoc(fb.D.doc(fb.db, 'access', old.accessId)); } catch (_) {}
      }
      await fb.D.setDoc(fb.D.doc(fb.db, 'roster', nrid), { name: name, email: mail, accessId: aid, docs: perm });
      if (nrid !== id) { try { await fb.D.deleteDoc(fb.D.doc(fb.db, 'roster', id)); } catch (_) {} }
    },

    remove: async function (id) {
      await loadAuth();
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
  api.normDocs = normDocs;
  global.SKAuth = api;
})(window);
