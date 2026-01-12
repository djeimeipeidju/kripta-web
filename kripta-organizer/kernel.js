/* =========================================================
   SISTEMA DE EXISTÊNCIA — DECLARAÇÃO FUNDACIONAL

   Este kernel é um artefato do SISTEMA KRIPTA.

   Sua existência operacional, continuidade e legitimidade
   são determinadas exclusivamente pelas regras fundacionais
   do Sistema Kripta, executadas em ambiente web.

   Fora desse sistema, este artefato não constitui
   um MVP Kripta, independentemente de cópia, execução
   ou modificação de seus arquivos.

   Esta declaração é ontológica e não operacional.
   ========================================================= */


/* =========================================================
   KRIPTA-ORGANIZER — KERNEL v0.7.1-H
   HISTÓRICO SEMÂNTICO (append-only)
   BLINDAGEM CANÔNICA ATIVA
   ========================================================= */

const STORAGE_KEY = "kripta-organizer-kernel";

/* -------------------------
   Estado interno
------------------------- */
let state = {
  version: "0.7.1-H",
  units: {},
  relations: {},
  history: []
};

/* -------------------------
   Util
------------------------- */
function now() {
  return Date.now();
}

function uid(prefix = "u") {
  return prefix + "_" + Math.random().toString(36).slice(2) + "_" + now();
}

function ensureUnitShape(u) {
  if (!u) return u;
  if (!u.id) u.id = uid("u");
  if (typeof u.title !== "string") u.title = "";
  if (typeof u.content !== "string") u.content = "";
  if (!u.state) u.state = "ATIVO";
  if (!u.parentId) u.parentId = "root";
  if (!u.createdAt) u.createdAt = now();
  if (!u.updatedAt) u.updatedAt = now();
  return u;
}

/* -------------------------
   Persistência
------------------------- */
function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;

    state.version = parsed.version || state.version;
    state.units = parsed.units || {};
    state.relations = parsed.relations || {};
    state.history = Array.isArray(parsed.history) ? parsed.history : [];

    Object.keys(state.units).forEach(id => {
      state.units[id] = ensureUnitShape(state.units[id]);
    });
  } catch {
    console.warn("Kernel: falha ao carregar estado");
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* -------------------------
   Histórico Semântico (núcleo)
------------------------- */
function __addEvent(type, unitId, meta) {
  const event = {
    eventId: uid("e"),
    type,
    unitId,
    timestamp: now(),
    meta: {
      action: meta?.action || null,
      subject: meta?.subject || null,
      context: meta?.context ?? null,
      delta: meta?.delta ?? null,
      closed: meta?.closed === true
    }
  };

  state.history.push(event);
  save();
  return event;
}

/* -------------------------
   BLINDAGEM DO HISTÓRICO
------------------------- */
function addEvent(type, unitId, meta = {}) {
  const ALLOWED = new Set([
    "CRIADA",
    "EDITADA",
    "MOVIDA",
    "EXCLUÍDA",
    "RELACAO_CRIADA",
    "RELACAO_REMOVIDA"
  ]);

  if (!ALLOWED.has(type)) return null;

  if (type === "EDITADA") {
    const fields = meta?.delta?.fields || [];
    if (!Array.isArray(fields) || fields.length === 0) return null;
  }

  return __addEvent(type, unitId, meta);
}

function formatFieldChanges(before, after) {
  const fields = [];
  if ((before.title || "") !== (after.title || "")) fields.push("title");
  if ((before.content || "") !== (after.content || "")) fields.push("content");
  return fields;
}

/* -------------------------
   Inicialização
------------------------- */
load();

/* -------------------------
   API Pública
------------------------- */
const kernel = {

  getSnapshot() {
    return { version: state.version };
  },

  /* ========= UNITS ========= */

  createUnit({ title = "", content = "", context = "root" }) {
    const id = uid("u");
    const timestamp = now();

    const unit = ensureUnitShape({
      id,
      title,
      content,
      state: "ATIVO",
      parentId: context || "root",
      createdAt: timestamp,
      updatedAt: timestamp
    });

    state.units[id] = unit;
    save();

    addEvent("CRIADA", id, {
      action: "create",
      subject: "unit",
      context: { parentId: unit.parentId },
      delta: null,
      closed: true
    });

    return unit;
  },

  getUnit(id) {
    return state.units[id] || null;
  },

  updateUnit(id, data = {}) {
    const u = state.units[id];
    if (!u) return;

    const before = { title: u.title, content: u.content };

    if (typeof data.title === "string") u.title = data.title;
    if (typeof data.content === "string") u.content = data.content;

    const after = { title: u.title, content: u.content };
    const fields = formatFieldChanges(before, after);
    if (!fields.length) return;

    u.updatedAt = now();
    save();

    addEvent("EDITADA", id, {
      action: "update",
      subject: "unit",
      delta: { fields },
      closed: true
    });
  },

  changeState(id, newState) {
    const u = state.units[id];
    if (!u || u.state === newState) return;

    u.state = newState;
    u.updatedAt = now();
    save();
  },

  deleteUnit(id) {
    const u = state.units[id];
    if (!u || u.state === "EXCLUIDO_LOGICO") return;

    u.state = "EXCLUIDO_LOGICO";
    u.updatedAt = now();
    save();

    addEvent("EXCLUÍDA", id, {
      action: "delete",
      subject: "unit",
      closed: true
    });
  },

  moveUnit(id, newParentId) {
    const u = state.units[id];
    if (!u) return;

    const from = u.parentId;
    const to = newParentId || "root";
    if (from === to) return;

    u.parentId = to;
    u.updatedAt = now();
    save();

    addEvent("MOVIDA", id, {
      action: "move",
      subject: "unit",
      context: { from, to },
      closed: true
    });
  },

  getUnits(parentId = "root") {
    return Object.values(state.units).filter(
      u => u.parentId === parentId && u.state !== "EXCLUIDO_LOGICO"
    );
  },

  /* ========= RELATIONS ========= */

  createRelation({ originId, targetId, type = "GENERICA" }) {
    if (!state.units[originId] || !state.units[targetId]) return null;

    const id = uid("r");

    state.relations[id] = {
      id,
      originId,
      targetId,
      type,
      createdAt: now()
    };
    save();

    addEvent("RELACAO_CRIADA", originId, {
      action: "relate",
      subject: "relation",
      context: { targetId, type },
      closed: true
    });

    return state.relations[id];
  },

  removeRelation(relationId) {
    const r = state.relations[relationId];
    if (!r) return;

    delete state.relations[relationId];
    save();

    addEvent("RELACAO_REMOVIDA", r.originId, {
      action: "unrelate",
      subject: "relation",
      context: { targetId: r.targetId },
      closed: true
    });
  },

  getRelationsFrom(originId) {
    return Object.values(state.relations).filter(r => r.originId === originId);
  },

  /* ========= HISTORY ========= */

  getHistoryForUnit(unitId) {
    return state.history
      .filter(e => e.unitId === unitId)
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  getGlobalHistory(limit = 200) {
    return state.history
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },

  /* ========= EXPORT / IMPORT ========= */

  exportBundle() {
    return {
      exportedAt: new Date().toISOString(),
      version: state.version,
      units: Object.values(state.units),
      relations: Object.values(state.relations),
      history: state.history.slice()
    };
  },

  importBundle(bundle) {
    if (!bundle) return;

    (bundle.units || []).forEach(u => {
      state.units[u.id] = ensureUnitShape(u);
    });

    (bundle.relations || []).forEach(r => {
      state.relations[r.id] = r;
    });

    (bundle.history || []).forEach(e => {
      state.history.push(e);
    });

    save();
  }
};

window.kernel = kernel;

/* ===============================
   HISTORY — PAGINAÇÃO
   =============================== */

kernel.getGlobalHistoryPage = function ({
  limit = 50,
  offset = 0
} = {}) {
  const total = state.history.length;

  const items = state.history
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(offset, offset + limit);

  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
    items
  };
};

kernel.getHistoryForUnitPage = function (
  unitId,
  { limit = 50, offset = 0 } = {}
) {
  const all = state.history
    .filter(e => e.unitId === unitId)
    .sort((a, b) => b.timestamp - a.timestamp);

  const total = all.length;
  const items = all.slice(offset, offset + limit);

  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
    items
  };
};
