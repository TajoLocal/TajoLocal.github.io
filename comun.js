/* Tajo Local · código compartido por index.html y anunciar.html.
   Aquí viven los datos que antes estaban repetidos en las dos páginas (zonas, categorías,
   conexión con Supabase, texto de privacidad) y las funciones auxiliares, que tienen pruebas
   en tests/comun.test.js. Para añadir una zona o una categoría, basta con cambiarla aquí. */
const TL = (() => {
  const SUPABASE_URL = "https://czlkxadbxltirtlbxyko.supabase.co";
  const SUPABASE_KEY = "sb_publishable_YhkE6b9cqRcIHTMOWOfmnQ_kurrawSA";
  const FOTOS_URL = SUPABASE_URL + "/storage/v1/object/public/fotos/";
  const CORREO = "tajolocal@gmail.com";

  // "Toda la zona" solo se usa al anunciarse: el servicio llega a todos los municipios
  const TODA = "Toda la zona";
  const ZONAS = [
    "Aranjuez", "Chinchón", "Ciempozuelos", "Colmenar de Oreja",
    "Titulcia", "Villaconejos", "Urbanizaciones de Colmenar"
  ];

  // Cada categoría lleva su icono y su color de fondo (para los anuncios sin foto)
  const ICONOS = {
    "Fontanería": ["🔧", "#dbeafe"],
    "Electricidad": ["⚡", "#fef3c7"],
    "Cerrajería": ["🔑", "#e5e7eb"],
    "Obras y reformas": ["🧱", "#fde7d3"],
    "Jardinería y piscinas": ["🌿", "#dcfce7"],
    "Limpieza": ["🧽", "#cffafe"],
    "Cuidado de niños y mayores": ["🤝", "#fce7f3"],
    "Clases y formación": ["📚", "#ede9fe"],
    "Belleza y bienestar": ["💆", "#f3e8ff"],
    "Salud y terapias": ["🩺", "#d1fae5"],
    "Mascotas": ["🐾", "#fef9c3"],
    "Comida y reparto": ["🍽️", "#ffedd5"],
    "Comercio y tiendas": ["🛍️", "#fee2e2"],
    "Inmobiliaria y asesoría": ["🏠", "#e0f2fe"],
    "Automoción y transporte": ["🚗", "#e0e7ff"],
    "Informática y tecnología": ["💻", "#e2e8f0"],
    "Eventos y ocio": ["🎉", "#fce7f3"],
    "Otros": ["🏡", "#e8f3ed"]
  };
  const CATEGORIAS = Object.keys(ICONOS);   // mismo orden que arriba; "Otros" siempre la última
  // Nombres antiguos de categoría (por si quedan anuncios con ellos)
  const CAT_ANTIGUAS = { "Transporte": "Automoción y transporte" };
  const icono = cat => ICONOS[cat] || ICONOS[CAT_ANTIGUAS[cat]] || ICONOS["Otros"];

  // ---------- Texto ----------
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ESC[c]);

  // Una ficha puede tener hasta dos categorías, guardadas como "A, B"
  const cats = c => String(c || "").split(",").map(x => x.trim()).filter(Boolean);

  // Minúsculas y sin tildes, para que "fontaneria" encuentre "Fontanería"
  const normaliza = t => String(t == null ? "" : t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // ---------- Teléfono ----------
  const limpiaTel = t => String(t || "").replace(/[^\d+]/g, "");

  // Solo números, espacios y + ( ) . -, con entre 9 y 15 cifras
  function telValido(t) {
    const s = String(t || "").trim();
    if (!/^\+?[\d\s().-]+$/.test(s)) return false;
    const n = s.replace(/\D/g, "").length;
    return n >= 9 && n <= 15;
  }

  // Número para wa.me: solo móviles españoles (6xx / 7xx), con prefijo 34
  function numWhatsApp(t) {
    let d = limpiaTel(t);
    if (d.startsWith("+")) d = d.slice(1);
    else if (d.startsWith("00")) d = d.slice(2);
    else if (/^[6-9]\d{8}$/.test(d)) d = "34" + d;
    return /^34[67]\d{8}$/.test(d) ? d : "";
  }

  // ---------- Enlaces ----------
  // Solo se aceptan enlaces http/https (nunca javascript: ni similares)
  function urlSegura(u) {
    try {
      const x = new URL(String(u || "").trim());
      if (x.username || x.password) return "";   // p. ej. "correo@gmail.com" convertido en https://correo@gmail.com
      return (x.protocol === "http:" || x.protocol === "https:") ? x.href : "";
    } catch (e) { return ""; }
  }
  function normalizaUrl(u) {
    u = String(u || "").trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return urlSegura(u);
  }
  const pareceCorreo = t => /^[^\s@\/:]+@[^\s@\/:]+\.[^\s@\/:]+$/.test(String(t || "").trim());

  function dominio(u) {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "enlace"; }
  }
  // Nombre amigable para redes sociales conocidas (si no, se muestra el dominio)
  function etiquetaEnlace(u) {
    let x;
    try { x = new URL(u); } catch (e) { return "🔗 enlace"; }
    const h = x.hostname.replace(/^www\./, "").replace(/^m\./, "").toLowerCase();
    const seg = x.pathname.split("/").filter(Boolean)[0] || "";
    const es = d => h === d || h.endsWith("." + d);
    if (es("instagram.com")) return "📸 Instagram" + (seg && !/^(p|reel|stories|explore)$/i.test(seg) ? " @" + seg.replace(/^@/, "") : "");
    if (es("tiktok.com")) return "🎵 TikTok" + (seg.startsWith("@") ? " " + seg : "");
    if (es("facebook.com") || es("fb.com") || h === "fb.me") return "📘 Facebook";
    if (es("youtube.com") || h === "youtu.be") return "▶️ YouTube";
    if (h === "wa.me" || es("whatsapp.com")) return "💬 WhatsApp";
    if (es("linkedin.com")) return "💼 LinkedIn";
    if (es("t.me") || es("telegram.me")) return "✈️ Telegram";
    if (es("x.com") || es("twitter.com")) return "🐦 X";
    if (es("linktr.ee")) return "🔗 Linktree";
    return "🔗 " + dominio(u);
  }

  // Las fotos solo se aceptan si están en nuestro almacén de Supabase
  function fotoValida(u) {
    try { const x = new URL(String(u || "")); return x.protocol === "https:" && x.href.startsWith(FOTOS_URL); }
    catch (e) { return false; }
  }

  // Enlace "Informar de un problema" (abre el correo con el asunto ya escrito)
  function informarUrl(n) {
    const asunto = "Informar de un problema: " + (n.nombre || "anuncio");
    const cuerpo = "Anuncio: " + (n.nombre || "") + " (" + (n.categoria || "") + (n.zona ? ", " + n.zona : "") + ")\n\n" +
      "Qué ocurre (teléfono incorrecto, posible estafa, ya no ofrece el servicio, otro):\n";
    return "mailto:" + CORREO + "?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
  }

  // ---------- Listado ----------
  // Guarda una vez el texto "buscable" de cada anuncio (sin tildes, en minúsculas)
  const preparar = n => Object.assign({}, n, { _busca: normaliza([n.nombre, n.categoria, n.descripcion, n.zona].join(" ")) });

  // Todas las palabras de la búsqueda deben aparecer; un anuncio de "Toda la zona" sale en cualquier zona
  function filtra(lista, { q, cat, zona } = {}) {
    const palabras = normaliza(q).split(/\s+/).filter(Boolean);
    return lista.filter(n =>
      (!cat || cats(n.categoria).includes(cat)) &&
      (!zona || n.zona === zona || n.zona === TODA) &&
      palabras.every(p => (n._busca || "").includes(p))
    );
  }

  // Orden aleatorio en cada visita (se baraja una sola vez, así que no cambia al filtrar ni al pulsar "Mostrar más")
  function baraja(lista) {
    const a = Array.isArray(lista) ? lista.slice() : [];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- Navegador (solo se usan dentro de la web, no en las pruebas) ----------
  // Desplazamiento suave, salvo que la persona haya pedido menos animaciones
  function desplaza(el, opciones) {
    const quieta = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView(Object.assign({ behavior: quieta ? "auto" : "smooth" }, opciones));
  }

  // Ventana de privacidad: un solo texto para todas las páginas.
  // Se abre desde cualquier elemento con el atributo data-privacidad.
  function montaPrivacidad() {
    const d = document.createElement("dialog");
    d.id = "privacidad";
    d.setAttribute("aria-labelledby", "privacidad-titulo");
    d.innerHTML = `
      <h2 id="privacidad-titulo">Privacidad y condiciones de uso</h2>
      <p>Los datos que envías (nombre o negocio, categoría, descripción y teléfono) se publican en esta web para que los vecinos puedan contactar contigo. No se usan para ningún otro fin ni se ceden a terceros.</p>
      <p>Puedes pedir en cualquier momento que se modifique o elimine tu anuncio escribiendo al email de contacto indicado más abajo; se atenderá en un plazo máximo de 30 días. Los datos se almacenan en servidores de Supabase.</p>
      <p><strong>Responsable:</strong> Luis Gómez · <a href="mailto:${CORREO}">${CORREO}</a></p>
      <p><strong>Condiciones de uso:</strong> Tajo Local es un proyecto vecinal no oficial. Los anuncios los publican los propios anunciantes: Tajo Local no se responsabiliza de los servicios anunciados ni de los acuerdos entre vecinos y anunciantes. No se admiten anuncios ilegales ni datos de terceros sin su permiso, y cualquier anuncio puede retirarse sin previo aviso.</p>
      <button class="btn" type="button">Cerrar</button>`;
    document.body.appendChild(d);
    d.querySelector("button").addEventListener("click", () => d.close());
    document.addEventListener("click", e => {
      if (e.target.closest("[data-privacidad]")) { e.preventDefault(); d.showModal(); }
    });
  }
  if (typeof document !== "undefined") montaPrivacidad();

  return {
    SUPABASE_URL, SUPABASE_KEY, FOTOS_URL, CORREO, TODA, ZONAS, CATEGORIAS, ICONOS, icono,
    esc, cats, normaliza, limpiaTel, telValido, numWhatsApp,
    urlSegura, normalizaUrl, pareceCorreo, dominio, etiquetaEnlace, fotoValida, informarUrl,
    preparar, filtra, baraja, desplaza
  };
})();
