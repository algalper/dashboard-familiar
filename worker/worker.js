// Buzón del panel familiar (Cloudflare Worker + KV).
// Se pega tal cual en el editor de Cloudflare. Necesita:
//   - un espacio KV enlazado con el nombre PANEL
//   - un secreto llamado CLAVE (la clave de la familia)
// El Worker nunca ve contraseñas de Apple: solo guarda lo que el Atajo le envía
// y las acciones que el panel deja para el Atajo.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS },
  });
}

async function leer(env, clave, defecto) {
  const v = await env.PANEL.get(clave, "json");
  return v ?? defecto;
}

// El Atajo envía texto plano con tres secciones:
// ##EVENTOS   -> título|inicio|fin|ubicación   (una línea por evento)
// ##TAREAS    -> título|vencimiento            (La Bicholista, sin completar)
// ##COMPRA    -> título                        (Compra, sin completar)
function leerFoto(texto) {
  const foto = { eventos: [], tareas: [], compra: [] };
  let seccion = null;
  for (const bruta of texto.replace(/\r/g, "\n").split("\n")) {
    const linea = bruta.trim();
    if (!linea) continue;
    const cab = linea.match(/^##\s*(EVENTOS|TAREAS|COMPRA)/i);
    if (cab) { seccion = cab[1].toLowerCase(); continue; }
    const p = linea.split("|").map((s) => s.trim());
    if (seccion === "eventos") foto.eventos.push({ titulo: p[0], inicio: p[1] || "", fin: p[2] || "", lugar: p[3] || "" });
    else if (seccion === "tareas") foto.tareas.push({ titulo: p[0], vence: p[1] || "" });
    else if (seccion === "compra") foto.compra.push({ titulo: p[0] });
  }
  return foto;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (url.pathname === "/") return new Response("Buzón del panel familiar: funcionando", { headers: CORS });
    if (!env.PANEL) return json({ error: "Falta enlazar el espacio KV con el nombre PANEL" }, 500);
    if (!env.CLAVE) return json({ error: "Falta el secreto CLAVE" }, 500);
    if (url.searchParams.get("clave") !== env.CLAVE) return json({ error: "Clave incorrecta" }, 401);

    // Panel: todo lo que hay que mostrar.
    if (url.pathname === "/api/estado" && req.method === "GET") {
      const [foto, pendientes] = await Promise.all([leer(env, "foto", null), leer(env, "pendientes", [])]);
      return json({ foto, pendientes });
    }

    // Panel: deja una acción para el Atajo.
    // { tipo: "completar" | "anadir", lista: "La Bicholista" | "Compra", titulo }
    if (url.pathname === "/api/accion" && req.method === "POST") {
      const a = await req.json().catch(() => null);
      const titulo = (a?.titulo || "").trim();
      if (!titulo || !["completar", "anadir"].includes(a.tipo) || !["La Bicholista", "Compra"].includes(a.lista) || (a.tipo === "completar" && a.lista !== "La Bicholista")) {
        return json({ error: "Acción no válida" }, 400);
      }
      const pendientes = await leer(env, "pendientes", []);
      const id = Math.max(await leer(env, "ultimoId", 0), ...pendientes.map((p) => p.id), 0) + 1;
      pendientes.push({ id, tipo: a.tipo, lista: a.lista, titulo, creada: new Date().toISOString() });
      await env.PANEL.put("pendientes", JSON.stringify(pendientes));
      await env.PANEL.put("ultimoId", JSON.stringify(id));
      return json({ ok: true, id });
    }

    // Atajo: recoge lo pendiente, en listas simples de títulos.
    if (url.pathname === "/api/pendientes" && req.method === "GET") {
      const pendientes = await leer(env, "pendientes", []);
      const de = (tipo, lista) => pendientes.filter((p) => p.tipo === tipo && p.lista === lista).map((p) => p.titulo);
      return json({
        hasta: pendientes.reduce((m, p) => Math.max(m, p.id), 0),
        completar: de("completar", "La Bicholista"),
        anadir_tarea: de("anadir", "La Bicholista"),
        anadir_compra: de("anadir", "Compra"),
      });
    }

    // Atajo: sube la foto de Calendario y Recordatorios y confirma lo aplicado.
    if (url.pathname === "/api/foto" && req.method === "POST") {
      const texto = await req.text();
      const foto = leerFoto(texto);
      foto.recibida = new Date().toISOString();
      foto.dispositivo = url.searchParams.get("desde") || "";
      foto.texto = texto.slice(0, 20000); // copia en bruto, para revisar la prueba
      await env.PANEL.put("foto", JSON.stringify(foto));
      const hasta = parseInt(url.searchParams.get("hasta") || "0", 10) || 0;
      if (hasta > 0) {
        const pendientes = await leer(env, "pendientes", []);
        await env.PANEL.put("pendientes", JSON.stringify(pendientes.filter((p) => p.id > hasta)));
      }
      return json({ ok: true, eventos: foto.eventos.length, tareas: foto.tareas.length, compra: foto.compra.length });
    }

    return json({ error: "No encontrado" }, 404);
  },
};
