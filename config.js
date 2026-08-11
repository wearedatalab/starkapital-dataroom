/* ============================================================
   Starkapital · Data Room — Conexión a la nube
   ------------------------------------------------------------
   MIENTRAS ESTE ARCHIVO ESTÉ VACÍO, la página funciona con la
   lista local de users.js (solo se administra desde este equipo).

   PARA ADMINISTRAR DESDE CUALQUIER LUGAR — pasos, una sola vez:

   1) Entre a  https://console.firebase.google.com  con su cuenta
      de Google y pulse "Crear un proyecto".
      Nombre sugerido: starkapital-dataroom. Puede desactivar
      Google Analytics. Es gratuito.

   2) Dentro del proyecto, en el menú de la izquierda:
      Compilación → Firestore Database → "Crear base de datos"
      → elija "Modo de producción" → ubicación: us-central o
      southamerica-east1.

   3) En la pestaña "Reglas" de Firestore, BORRE lo que haya y
      pegue exactamente esto, luego pulse "Publicar":

      ------------------------------------------------------
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {

          function esAdmin() {
            return request.auth != null
                && request.auth.token.email == 'gerencia@starkapital.com';
          }

          // Acceso de inversionistas: un documento solo se puede
          // leer si se conocen correo y clave exactos, porque el
          // identificador del documento es la huella de ambos.
          // Listar la colección está prohibido: nadie puede
          // descargar la lista de accesos.
          match /access/{id} {
            allow get: if true;
            allow list: if false;
            allow write: if esAdmin();
          }

          // Lista administrativa: solo el administrador.
          match /roster/{id} {
            allow read, write: if esAdmin();
          }
        }
      }
      ------------------------------------------------------

   4) Menú izquierdo → Compilación → Authentication → "Comenzar"
      → pestaña "Sign-in method" → habilite "Correo electrónico
      /contraseña" → Guardar.
      Luego pestaña "Users" → "Agregar usuario":
         correo: gerencia@starkapital.com
         contraseña: la que usted elija (será la clave de admin)

   5) Menú izquierdo → arriba, el engranaje ⚙ → "Configuración
      del proyecto" → baje hasta "Tus apps" → pulse el icono
      web </> → nombre: dataroom → "Registrar app".
      Firebase le mostrará un bloque como el de abajo.
      Copie SOLO los valores y péguelos aquí, quitando las dos
      barras // del inicio de cada línea.

   6) Guarde el archivo y publíquelo en GitHub.
      Listo: desde ese momento podrá crear y administrar
      inversionistas desde cualquier computador o celular.
   ============================================================ */

window.SK_FIREBASE = {
  apiKey: "AIzaSyCuScX4zA9uF8OUDuzYl66zS4o3wUPcHkM",
  authDomain: "starkapital-dataroom.firebaseapp.com",
  projectId: "starkapital-dataroom",
  storageBucket: "starkapital-dataroom.firebasestorage.app",
  messagingSenderId: "979818814052",
  appId: "1:979818814052:web:f5bc08014cf96c101add71"
};

window.SK_ADMIN_EMAIL = "gerencia@starkapital.com";
