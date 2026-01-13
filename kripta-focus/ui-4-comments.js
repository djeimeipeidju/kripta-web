// =========================================================
// UI-4 — Comentários | Lógica mínima (localStorage)
// v1.1 — sem estética extra
// =========================================================

(function CommentsMinimal() {
  const STORAGE_KEY = "kripta_focus_comments_v1";
  const MAX_VISIBLE = 20;

  const listEl = document.querySelector(".ui2-comments-list");
  const textarea = document.querySelector(".ui2-comment-input textarea");
  const button = document.querySelector(".ui2-comment-input button");

  if (!listEl || !textarea || !button) return;

  // habilita entrada
  textarea.removeAttribute("disabled");
  button.removeAttribute("disabled");

  // utils
  function nowLabel() {
    const d = new Date();
    return d.toLocaleDateString("pt-BR") + " · " +
           d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function render(items) {
    listEl.innerHTML = "";
    items.slice(0, MAX_VISIBLE).forEach(item => {
      const wrap = document.createElement("div");
      wrap.className = "ui2-comment";

      const meta = document.createElement("div");
      meta.className = "ui2-comment-meta";
      meta.textContent = item.date;

      const text = document.createElement("div");
      text.className = "ui2-comment-text";
      text.textContent = item.text;

      wrap.appendChild(meta);
      wrap.appendChild(text);
      listEl.appendChild(wrap);
    });
  }

  // estado inicial
  let comments = load();
  render(comments);

  // salvar
  button.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text) return;

    const entry = {
      text,
      date: nowLabel()
    };

    comments.unshift(entry);
    save(comments);
    render(comments);
    textarea.value = "";
  });

  // salvar com Enter (Ctrl/Cmd)
  textarea.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      button.click();
    }
  });

})();
