
"use strict";

const $ = id => document.getElementById(id);
const today = new Date().toISOString().slice(0, 10);
$("date").value = today;
$("mdate").value = today;
$("fdate").value = today;

const KEY = "monElevageAvicole_v1";
let data = { lots: [], moves: [], finances: [] };

try {
  const saved = localStorage.getItem(KEY);
  if (saved) data = JSON.parse(saved);
} catch (e) {
  console.warn("Impossible de lire les données locales.", e);
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    render();
    toast("Enregistré avec succès.");
  } catch (e) {
    alert("Enregistrement impossible. Vérifie l'espace disponible sur le téléphone.");
  }
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 2500);
}

function money(n) {
  return Math.round(n).toLocaleString("fr-FR") + " F CFA";
}

function liveCount(lot) {
  return lot.initial + data.moves
    .filter(m => m.lotId === lot.id)
    .reduce((sum, m) => sum +
      (m.type === "add" ? m.qty : -m.qty), 0);
}

function render() {
  $("live").textContent = data.lots.reduce((s, l) => s + liveCount(l), 0);
  $("lotsnum").textContent = data.lots.filter(l => liveCount(l) > 0).length;

  const expenses = data.finances
    .filter(f => f.type === "expense")
    .reduce((s, f) => s + f.amount, 0);
  const income = data.finances
    .filter(f => f.type === "income")
    .reduce((s, f) => s + f.amount, 0);

  $("exp").textContent = money(expenses);
  $("inc").textContent = money(income);
  $("balance").textContent = money(income - expenses);

  $("lotselect").innerHTML = data.lots.map(l =>
    `<option value="${l.id}">${escapeHTML(l.name)}</option>`
  ).join("");

  $("lotlist").innerHTML = data.lots.map(l => `
    <article class="item">
      <h3>${escapeHTML(l.name)}</h3>
      <p>Arrivée : ${l.date}</p>
      <p>Poulets vivants : <b>${liveCount(l)}</b></p>
      <p class="muted">Effectif initial : ${l.initial}</p>
    </article>
  `).join("") || '<p class="muted">Aucun lot créé pour le moment.</p>';

  $("movelist").innerHTML = [...data.moves].reverse().map(m => {
    const lot = data.lots.find(l => l.id === m.lotId);
    const labels = { mort: "Mortalité", sale: "Vente", add: "Ajout" };
    return `<article class="item">
      <b>${labels[m.type] || m.type}</b> — ${m.qty} poulet(s)
      <p>${escapeHTML(lot ? lot.name : "Lot supprimé")} · ${m.date}</p>
      <p class="muted">${escapeHTML(m.note || "")}</p>
    </article>`;
  }).join("") || '<p class="muted">Aucun mouvement enregistré.</p>';

  $("finlist").innerHTML = [...data.finances].reverse().map(f => `
    <article class="item">
      <b>${f.type === "income" ? "Recette" : "Dépense"}</b>
      — ${money(f.amount)}
      <p>${escapeHTML(f.category)} · ${f.date}</p>
      <p class="muted">${escapeHTML(f.note || "")}</p>
    </article>
  `).join("") || '<p class="muted">Aucune opération enregistrée.</p>';
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[ch]);
}

document.querySelectorAll("nav button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach(b =>
      b.classList.toggle("active", b === button)
    );
    ["lots", "mouv", "finance", "backup"].forEach(id => {
      $(id).hidden = id !== button.dataset.page;
    });
  });
});

$("lotform").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("name").value.trim();
  const initial = Number($("count").value);
  if (!name || initial < 1 || initial > 100) {
    alert("Indique un nom et un effectif entre 1 et 100.");
    return;
  }
  data.lots.push({
    id: Date.now().toString(),
    name,
    initial,
    date: $("date").value
  });
  e.target.reset();
  $("count").value = 50;
  $("date").value = today;
  save();
});

$("moveform").addEventListener("submit", e => {
  e.preventDefault();
  const lotId = $("lotselect").value;
  const type = $("type").value;
  const qty = Number($("qty").value);
  const lot = data.lots.find(l => l.id === lotId);

  if (!lot || !Number.isInteger(qty) || qty < 1) {
    alert("Vérifie le lot et la quantité.");
    return;
  }
  if (type !== "add" && qty > liveCount(lot)) {
    alert("La quantité dépasse le nombre de poulets vivants.");
    return;
  }
  if (type === "add" && liveCount(lot) + qty > 100) {
    alert("Le lot ne peut pas dépasser 100 poulets vivants.");
    return;
  }

  data.moves.push({
    id: Date.now().toString(),
    lotId, type, qty,
    date: $("mdate").value,
    note: $("note").value.trim()
  });
  e.target.reset();
  $("qty").value = 1;
  $("mdate").value = today;
  save();
});

$("finform").addEventListener("submit", e => {
  e.preventDefault();
  const amount = Number($("amount").value);
  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Le montant doit être supérieur à zéro.");
    return;
  }
  data.finances.push({
    id: Date.now().toString(),
    type: $("ftype").value,
    category: $("cat").value,
    amount,
    date: $("fdate").value,
    note: $("fnote").value.trim()
  });
  e.target.reset();
  $("fdate").value = today;
  save();
});

$("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sauvegarde-mon-elevage-avicole.json";
  a.click();
  URL.revokeObjectURL(url);
});

$("import").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.lots) ||
        !Array.isArray(imported.moves) ||
        !Array.isArray(imported.finances)) {
      throw new Error("Format invalide");
    }
    if (!confirm("Remplacer les données actuelles par cette sauvegarde ?")) return;
    data = imported;
    save();
  } catch (err) {
    alert("Sauvegarde invalide ou illisible.");
  } finally {
    e.target.value = "";
  }
});

$("clear").addEventListener("click", () => {
  if (!confirm("Effacer définitivement toutes les données locales ?")) return;
  data = { lots: [], moves: [], finances: [] };
  save();
});

render();
