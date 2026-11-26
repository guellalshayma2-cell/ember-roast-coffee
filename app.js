/* =========================================================
   Ember & Roast — Coffee Shop App Logic
   Renders menu, manages order, handles checkout
   ========================================================= */

(function () {
  "use strict";

  // ---------- Data ----------
  const DRINKS = [
    { id: "espresso",   name: "Espresso",          price: 3.50, emoji: "☕", desc: "A bold, single-shot of pure roasted intensity." },
    { id: "cappuccino", name: "Cappuccino",        price: 4.50, emoji: "🍵", desc: "Equal parts espresso, steamed milk, and silky foam." },
    { id: "latte",      name: "Caramel Latte",     price: 4.75, emoji: "🥛", desc: "Smooth steamed milk over espresso with vanilla syrup." },
    { id: "americano",  name: "Americano",         price: 3.75, emoji: "🫗", desc: "Espresso lengthened with hot water for a clean finish." },
    { id: "mocha",      name: "Mocha",             price: 5.25, emoji: "🍫", desc: "Chocolate-kissed espresso with steamed milk and whipped cream." },
    { id: "coldbrew",   name: "Cold Brew",         price: 4.95, emoji: "🧊", desc: "Slow-steeped 16 hours for a smooth, low-acid sip." }
  ];

  // ---------- State ----------
  const order = []; // [{ id, name, price, qty }]
  const orderHistory = []; // [{ customer, items, itemCount, subtotal, placedAt }]
  const STORAGE_KEY = "ember_roast_history_v1";

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const format = (n) => `$${n.toFixed(2)}`;

  function findLine(id) {
    return order.find((l) => l.id === id);
  }

  function totalQty() {
    return order.reduce((sum, l) => sum + l.qty, 0);
  }

  function totalPrice() {
    return order.reduce((sum, l) => sum + l.qty * l.price, 0);
  }

  function formatTime(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (_) { return iso; }
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ---------- History (localStorage) ----------
  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        orderHistory.length = 0;
        orderHistory.push(...arr);
      }
    } catch (_) { /* ignore corrupt storage */ }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orderHistory));
    } catch (_) { /* ignore quota errors */ }
  }

  // ---------- Renderers ----------
  function renderMenu() {
    const grid = $("#menu-grid");
    if (!grid) return;

    const frag = document.createDocumentFragment();

    DRINKS.forEach((d) => {
      const card = document.createElement("article");
      card.className = "drink-card";
      card.setAttribute("aria-label", d.name);

      card.innerHTML = `
        <div class="drink-image" aria-hidden="true">${d.emoji}</div>
        <div class="drink-body">
          <h3 class="drink-name">${d.name}</h3>
          <p class="drink-desc">${d.desc}</p>
          <div class="drink-foot">
            <span class="drink-price">${format(d.price)}</span>
            <button class="btn-add" data-id="${d.id}" type="button">Add to Order</button>
          </div>
        </div>
      `;
      frag.appendChild(card);
    });

    grid.appendChild(frag);
  }

  function renderOrder() {
    const list = $("#order-list");
    const totalEl = $("#order-total");
    if (!list || !totalEl) return;

    list.innerHTML = "";

    if (order.length === 0) {
      const empty = document.createElement("li");
      empty.className = "order-empty";
      empty.textContent = "No items yet — pick something delicious.";
      list.appendChild(empty);
    } else {
      const frag = document.createDocumentFragment();

      order.forEach((line) => {
        const li = document.createElement("li");
        li.className = "order-item";
        li.innerHTML = `
          <div>
            <div class="name">${line.name}</div>
            <div class="meta">${line.qty} × ${format(line.price)}</div>
          </div>
          <div class="price">${format(line.qty * line.price)}</div>
          <div class="actions">
            <button class="btn-remove" data-id="${line.id}" type="button" aria-label="Remove ${line.name}">
              Remove
            </button>
          </div>
        `;
        frag.appendChild(li);
      });

      list.appendChild(frag);
    }

    totalEl.textContent = format(totalPrice());
  }

  function renderHistory(opts) {
    const grid = $("#history-grid");
    const empty = $("#history-empty");
    if (!grid || !empty) return;

    const flashNewest = opts && opts.flashNewest;
    grid.innerHTML = "";

    if (orderHistory.length === 0) {
      empty.hidden = false;
      updateNavBadge();
      return;
    }

    empty.hidden = true;

    // Newest first
    const sorted = orderHistory.slice().reverse();
    const frag = document.createDocumentFragment();

    sorted.forEach((o, idxFromNewest) => {
      const orderNumber = orderHistory.length - idxFromNewest;
      const isNewest = idxFromNewest === 0;

      const li = document.createElement("article");
      li.className = "history-card" + (isNewest && flashNewest ? " flash" : "");
      li.setAttribute("aria-label", `Order #${orderNumber} for ${o.customer.name}`);

      const itemsHTML = o.items.map((it) => `
        <li>
          <span><span class="qty">${it.qty}×</span>${escapeHTML(it.name)}</span>
          <span>${format(it.lineTotal)}</span>
        </li>
      `).join("");

      const notesHTML = o.customer.notes
        ? `<div class="history-notes">📝 ${escapeHTML(o.customer.notes)}</div>`
        : "";

      li.innerHTML = `
        <div class="history-card-head">
          <span class="history-num">Order #${orderNumber}</span>
          <span class="history-time" title="${escapeHTML(o.placedAt)}">${formatTime(o.placedAt)}</span>
        </div>
        <div class="history-customer">
          <span class="name">${escapeHTML(o.customer.name)}</span>
          <span class="phone">${escapeHTML(o.customer.phone)}</span>
        </div>
        <ul class="history-items">${itemsHTML}</ul>
        ${notesHTML}
        <div class="history-foot">
          <span class="label">${o.itemCount} item${o.itemCount === 1 ? "" : "s"}</span>
          <span class="total">${format(o.subtotal)}</span>
        </div>
      `;

      frag.appendChild(li);
    });

    grid.appendChild(frag);
    updateNavBadge();
  }

  function updateNavBadge() {
    const badge = $("#nav-badge");
    if (!badge) return;
    const n = orderHistory.length;
    badge.textContent = String(n);
    badge.hidden = n === 0;
  }

  function clearHistory() {
    orderHistory.length = 0;
    saveHistory();
    renderHistory();
  }

  // ---------- Actions ----------
  function addToOrder(id) {
    const drink = DRINKS.find((d) => d.id === id);
    if (!drink) return;

    const line = findLine(id);
    if (line) {
      line.qty += 1;
    } else {
      order.push({ id: drink.id, name: drink.name, price: drink.price, qty: 1 });
    }
    renderOrder();
  }

  function removeFromOrder(id) {
    const idx = order.findIndex((l) => l.id === id);
    if (idx === -1) return;
    order.splice(idx, 1);
    renderOrder();
  }

  function clearOrder() {
    order.length = 0;
    renderOrder();
  }

  function validateForm(data) {
    if (!data.name || data.name.trim().length < 2) {
      return "Please enter your name.";
    }
    const phoneClean = data.phone.replace(/[^0-9+]/g, "");
    if (phoneClean.length < 7) {
      return "Please enter a valid phone number.";
    }
    return null;
  }

  function handleCheckout(e) {
    e.preventDefault();

    const feedback = $("#form-feedback");
    feedback.className = "form-feedback";
    feedback.textContent = "";

    if (order.length === 0) {
      feedback.classList.add("err");
      feedback.textContent = "Your order is empty.";
      return;
    }

    const formData = {
      name: $("#cust-name").value,
      phone: $("#cust-phone").value,
      notes: $("#cust-notes").value,
    };

    const error = validateForm(formData);
    if (error) {
      feedback.classList.add("err");
      feedback.textContent = error;
      return;
    }

    // Print the order to the browser console
    const orderPayload = {
      customer: {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes.trim(),
      },
      items: order.map((l) => ({
        id: l.id,
        name: l.name,
        qty: l.qty,
        unitPrice: l.price,
        lineTotal: +(l.qty * l.price).toFixed(2),
      })),
      itemCount: totalQty(),
      subtotal: +totalPrice().toFixed(2),
      placedAt: new Date().toISOString(),
    };

    // Pretty + structured logs
    console.log("================= NEW ORDER =================");
    console.log("Customer :", orderPayload.customer.name);
    console.log("Phone    :", orderPayload.customer.phone);
    console.log("Notes    :", orderPayload.customer.notes || "(none)");
    console.log("Items    :");
    console.table(orderPayload.items);
    console.log("Item count:", orderPayload.itemCount);
    console.log("Subtotal  :", format(orderPayload.subtotal));
    console.log("Placed at :", orderPayload.placedAt);
    console.log("Full payload:", orderPayload);
    console.log("============================================");

    // Reset UI
    feedback.classList.add("ok");
    feedback.textContent = `Thanks ${formData.name.trim()}! Order #${orderHistory.length} placed.`;

    // Add to history (rendered on page + persisted)
    orderHistory.push(orderPayload);
    saveHistory();
    renderHistory({ flashNewest: true });

    // Scroll to history so the user sees the result
    const historyEl = document.getElementById("history");
    if (historyEl) {
      // delay slightly so layout/render settles
      setTimeout(() => historyEl.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }

    clearOrder();
    e.target.reset();
  }

  // ---------- Event Wiring ----------
  function bindEvents() {
    const grid = $("#menu-grid");
    if (grid) {
      grid.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-add");
        if (!btn) return;
        addToOrder(btn.dataset.id);
      });
    }

    const list = $("#order-list");
    if (list) {
      list.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-remove");
        if (!btn) return;
        removeFromOrder(btn.dataset.id);
      });
    }

    const form = $("#checkout-form");
    if (form) form.addEventListener("submit", handleCheckout);

    const clearBtn = $("#clear-history");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (orderHistory.length === 0) return;
        if (confirm("Clear all past orders?")) clearHistory();
      });
    }
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    loadHistory();
    renderMenu();
    renderOrder();
    renderHistory();
    bindEvents();
  });
})();