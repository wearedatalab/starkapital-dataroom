/* ============================================================
   Starkapital · Data Room — Catálogo de documentos
   ------------------------------------------------------------
   Fuente única de verdad. Lo usan las 4 páginas y el panel de
   administración para asignar permisos por inversionista.

   El campo "id" NO debe cambiarse nunca: es lo que queda guardado
   en los permisos de cada inversionista. Si cambia un id, quienes
   lo tuvieran asignado pierden el acceso a ese documento.

   Para agregar un documento: añádalo con un id nuevo y único.
   Para retirarlo: elimínelo de esta lista.
   ============================================================ */

window.SK_DOCS = [
  { t: "Starkapital Overview", i: "i-book", d: [
    { id: "ov1", n: "Starkapital Presentación para Inversionistas", u: "https://docs.google.com/presentation/d/1G3J7xC-xlAFCj5W7DzzfTStCL4BFDNFL/edit?slide=id.p1#slide=id.p1", k: "slides" },
    { id: "ov2", n: "Starkapital Pitch", u: "https://docs.google.com/document/d/14kKqC7FKoUqRFP33g1ABCgoYol9jwPURUM7JHPhEqsQ/edit?tab=t.0#heading=h.gxtgrnixzmv", k: "doc" },
    { id: "ov3", n: "Starkapital Manifesto", u: "https://docs.google.com/document/d/1ZveXf5soY0qOTVDLu6cqS1dtS06vNxLbGQ5p6YbYdP0/edit?tab=t.0#heading=h.gxtgrnixzmv", k: "doc" },
    { id: "ov4", n: "Starkapital Documento Maestro", u: "https://docs.google.com/document/d/1VmSteAjjrtEtuOC7guCFljPEUCX5Fuj9/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "doc" },
    { id: "ov5", n: "Starkapital Video Corporativo", u: "https://drive.google.com/file/d/1O2aDxxH5jpfilONYh9E4pDslqUMRA9IX/view?usp=sharing", k: "video" }
  ]},
  { t: "Product & Technology", i: "i-cpu", d: [
    { id: "pt1", n: "Manual de Usuario — Versión 1.0", u: "https://docs.google.com/document/d/1FlCs27hrczq0vrA01A7fnOQVDNV312Db/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "doc" },
    { id: "pt2", n: "Diagrama de Infraestructura", u: "https://drive.google.com/file/d/17C5Nj_woH1UsvXk_rOOyegnBu2NF7rWn/view?usp=sharing", k: "pdf" },
    { id: "pt3", n: "Plan de tecnología", u: "https://docs.google.com/presentation/d/12REqoK64EUC1LZF2kKxkXYM7LA0RErsL/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "slides" }
  ]},
  { t: "Market & Competitors", i: "i-target", d: [
    { id: "mc1", n: "Estudio de Mercado", u: "https://docs.google.com/document/d/1Id4AaXNmqo4IZfS2TAR9AN4baG1QRVWC/edit", k: "doc" }
  ]},
  { t: "Financial Highlights", i: "i-chart", d: [
    { id: "fh1", n: "Balance General 2025", u: "https://drive.google.com/file/d/1dlFTfzLPk7Tnm43xYIU4rLuHtgMwz0_J/view?usp=sharing", k: "pdf" },
    { id: "fh2", n: "Estado de Resultados 2025", u: "https://drive.google.com/file/d/14utF8_Go3ZYCM3kqS4987Gken1zhb0AA/view?usp=sharing", k: "pdf" },
    { id: "fh3", n: "Nota estados Financieros 2025", u: "https://drive.google.com/file/d/1ppVWEhFj0Iep1RKTtc6HHrO8_-FwGU7R/view?usp=sharing", k: "pdf" },
    { id: "fh4", n: "Balance General 2026", u: "https://drive.google.com/file/d/1ViE5IGEx7BO_8WmGMZT9GFkpzxReMDbE/view?usp=sharing", k: "pdf" },
    { id: "fh5", n: "Estado de Resultados 2026", u: "https://drive.google.com/file/d/1HhkHsHBvFGM5ltsKi-jhXvZQb471jHwG/view?usp=sharing", k: "pdf" },
    { id: "fh6", n: "Financial Projections 2026", u: "https://docs.google.com/spreadsheets/d/1fPhagKm4uSpgI-sL9Ya6UQYZOq3v7dtA/edit?gid=1713705583#gid=1713705583", k: "sheet" }
  ]},
  { t: "Team & Governance", i: "i-scale", d: [
    { id: "tg1", n: "Estructura Legal y Control de Riesgo Institucional", u: "https://docs.google.com/document/d/1OcbGUgh1HXLGKcpOWX7phKBTT8wLo335/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "doc" },
    { id: "tg2", n: "Información Corporativa", u: "https://docs.google.com/presentation/d/1Loh-aDFjclW7MTQlGCP-HDiHwALtf3_6/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "slides" },
    { id: "tg3", n: "Código de Buen Gobierno Corporativo", u: "https://docs.google.com/document/d/1Oe6X4kXaf6wKjLA-K2Pu-OL6lSaoq6Tg/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "doc" },
    { id: "tg4", n: "Plan de Inversión Starkapital", u: "https://docs.google.com/document/d/1axYBIaIIb785kZ1g3bB3dPg5ylUW2xfC/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "doc" },
    { id: "tg5", n: "Nuestro Equipo", u: "https://docs.google.com/document/d/1GPlLeS1IVfOiw1wHqpqq0UIQuwLin1IP/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "doc" },
    { id: "tg6", n: "Política de Castigo de Cartera", u: "https://docs.google.com/document/d/1DenvnfNv8MvMQv-9qJf6Y_UFRxkM10BB/edit", k: "doc" },
    { id: "tg7", n: "Política de Crédito", u: "https://docs.google.com/document/d/1IJdqDkejRUWVD_G3SWexS-TC5VaTCk-E/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "doc" },
    { id: "tg8", n: "Posición institucional sobre la legalidad de nuestro modelo financiero", u: "https://docs.google.com/document/d/1Dcr5ww0HnhdlwlvVTI1VOLbuGq45zpI6/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "doc" }
  ]},
  { t: "Marketing & Press", i: "i-mega", d: [
    { id: "mp1", n: "Starkapital Brand Book", u: "https://drive.google.com/file/d/1L58A-U00xY2UjcX834Lqg_1SK5uC85PX/view?usp=sharing", k: "pdf" },
    { id: "mp2", n: "Plan de Marketing Digital", u: "https://docs.google.com/document/d/1cE31x3-jMq3WV61UckQAmhHYbsWk7R15/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "doc" },
    { id: "mp3", n: "Plan de Diversificación", u: "https://docs.google.com/document/d/1y7IV9WanaCOL4v73k7hqCFCNPr9pCoXf/edit?usp=sharing&ouid=109686496718890253832&rtpof=true&sd=true", k: "doc" }
  ]}
];

/* Total de documentos: 26 */
