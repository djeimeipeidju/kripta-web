/* =========================================================
   UI-1 ↔ Kernel Bridge — USÁVEL
   Regime: Kernel governa • UI consome
   MVP Kripta-Organizer v1
   ========================================================= */

if (!window.kernel) {
  throw new Error("Kernel não encontrado.");
}

/* --------- Estado Visual --------- */
let currentContext = "root";
let currentUnitId = null;

/* --------- Boot --------- */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  bindGlobalActions();
});

/* --------- Render Geral --------- */
function renderAll() {
  renderHierarchy();
  renderUnits();
}

/* --------- Hierarquia (APENAS VISUAL NA v1) --------- */
function renderHierarchy() {
  const tree = kernel.getHierarchy();
  const container = document.getElementById("hierarchy");
  if (!container) return;

  container.innerHTML = "";
  tree.forEach(node => {
    const el = document.createElement("div");
    el.textContent = node.label;
    el.className = "node";
    container.appendChild(el);
  });
}

/* --------- Lista de Unidades --------- */
function renderUnits() {
  const units = kernel.getUnits("root");
  const container = document.getElementById("unit-list");
  if (!container) return;

  container.innerHTML = "";

  units.forEach(unit => {
    const row = document.createElement("div");
    row.className = "unit-row";

    const title = document.createElement("span");
    title.textContent = unit.title;
    title.style.cursor = "pointer";
    title.onclick = () => openUnit(unit.id);

    const actions = document.createElement("div");
    actions.className = "unit-actions";

    actions.appendChild(btn("Editar", () => openUnit(unit.id)));
    actions.appendChild(btn("Arquivar", () => changeState(unit.id, "ARQUIVADO")));
    actions.appendChild(btn("Excluir", () => deleteUnit(unit.id)));

    row.appendChild(title);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

/* --------- Abrir / Editar Unidade --------- */
function openUnit(id) {
  const unit = kernel.getUnit(id);
  const panel = document.getElementById("unit-detail");
  if (!panel || !unit) return;

  currentUnitId = id;

  panel.innerHTML = `
    <h2>${unit.title}</h2>
    <textarea id="unit-editor">${unit.content || ""}</textarea>
    <div style="margin-top:6px; font-size:12px; color:#888">
      Salvamento automático
    </div>
  `;

  const editor = document.getElementById("unit-editor");
  editor.onblur = () => {
    kernel.updateUnit(currentUnitId, { content: editor.value });
  };
}

/* --------- Ações --------- */
function bindGlobalActions() {
  const btnNew = document.getElementById("btn-new-unit");
  if (btnNew) {
    btnNew.onclick = () => {
      kernel.createUnit({ context: "root" });
      renderUnits();
    };
  }
}

function changeState(id, state) {
  kernel.changeState(id, state);
  renderUnits();
}

function deleteUnit(id) {
  kernel.deleteUnit(id);
  renderUnits();
}

/* --------- Util --------- */
function btn(label, handler) {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = handler;
  return b;
}
