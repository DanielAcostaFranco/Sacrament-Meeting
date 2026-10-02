(function () {
  const wrap = document.getElementById("speakersWrap");
  const addBtn = document.getElementById("addSpeakerBtn");
  if (!wrap || !addBtn) return;

  function updateRemoveButtons() {
    const rows = wrap.querySelectorAll(".speaker-row");
    rows.forEach((row, idx) => {
      const btn = row.querySelector("button");
      if (!btn) return;
      btn.disabled = rows.length === 1;
      btn.title = rows.length === 1 ? "At least one row" : "Remove";
    });
  }

  function makeRow(name = "", topic = "") {
    const row = document.createElement("div");
    row.className = "speaker-row";
    row.innerHTML = `
      <input name="speakers_name" type="text" placeholder="Speaker name" value="${escapeHtml(name)}" />
      <input name="speakers_topic" type="text" placeholder="Topic (optional)" value="${escapeHtml(topic)}" />
      <button class="btn danger small" type="button">Remove</button>
    `;

    row.querySelector("button").addEventListener("click", () => {
      row.remove();
      updateRemoveButtons();
    });

    return row;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  addBtn.addEventListener("click", () => {
    wrap.appendChild(makeRow());
    updateRemoveButtons();
  });

  // Wire existing remove buttons (edit page)
  wrap.querySelectorAll(".speaker-row button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      btn.closest(".speaker-row")?.remove();
      updateRemoveButtons();
    });
  });

  updateRemoveButtons();
})();
