const STORAGE_KEY = "todo-items";
const THEME_KEY = "todo-theme";

const form = document.getElementById("add-form");
const input = document.getElementById("task-input");
const dueInput = document.getElementById("due-input");
const priorityInput = document.getElementById("priority-input");
const categoryInput = document.getElementById("category-input");
const list = document.getElementById("task-list");
const summary = document.getElementById("summary");
const emptyState = document.getElementById("empty-state");
const filterBtns = document.querySelectorAll(".filter-btn");
const categoryFilter = document.getElementById("category-filter");
const clearBtn = document.getElementById("clear-btn");
const themeBtn = document.getElementById("theme-btn");

let tasks = loadTasks();
let statusFilter = "all"; // all | active | completed
let catFilter = "";

/* ---------- Storage ---------- */

function loadTasks() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    // 이전 버전 데이터에 없는 필드 기본값 채우기
    return raw.map((t) => ({
      id: t.id,
      text: t.text,
      done: !!t.done,
      due: t.due || "",
      priority: Number(t.priority) || 0,
      category: t.category || "",
    }));
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/* ---------- Helpers ---------- */

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dueInfo(str) {
  if (!str) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = parseDate(str);
  const diff = Math.round((date - today) / 86400000);
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (diff < 0) return { text: `Overdue · ${label}`, cls: "overdue" };
  if (diff === 0) return { text: "Today", cls: "today" };
  if (diff === 1) return { text: "Tomorrow", cls: "" };
  return { text: label, cls: "" };
}

function matchesFilter(task) {
  if (statusFilter === "active" && task.done) return false;
  if (statusFilter === "completed" && !task.done) return false;
  if (catFilter && task.category !== catFilter) return false;
  return true;
}

function slide(el, fromDy, duration = 300) {
  el.style.transition = "none";
  el.style.transform = `translateY(${fromDy}px)`;
  el.offsetHeight; // 강제 리플로우로 시작 위치 확정
  el.style.transition = `transform ${duration}ms ease`;
  el.style.transform = "";
  el.addEventListener("transitionend", () => (el.style.transition = ""), { once: true });
}

/* ---------- Item DOM ---------- */

// 화면에 그려진 <li>를 id별로 보관해서, 매번 새로 만들지 않고 재사용
const elements = new Map();

function createItem(task) {
  const li = document.createElement("li");
  li.className = "task-item";
  li.dataset.id = task.id;

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "drag-handle";
  handle.textContent = "⋮⋮";
  handle.setAttribute("aria-label", "Drag to reorder");
  handle.addEventListener("pointerdown", (e) => startDrag(e, li));

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.setAttribute("aria-label", "Mark as done");
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const body = document.createElement("div");
  body.className = "task-body";

  const title = document.createElement("div");
  title.className = "task-title";

  const priority = document.createElement("span");
  priority.className = "task-priority";
  priority.title = "Click to change priority";
  priority.addEventListener("click", () => cyclePriority(task.id));

  const text = document.createElement("span");
  text.className = "task-text";
  text.addEventListener("dblclick", () => startEdit(task.id, li));

  const meta = document.createElement("div");
  meta.className = "task-meta";

  title.append(priority, text);
  body.append(title, meta);

  const del = document.createElement("button");
  del.type = "button";
  del.className = "delete-btn";
  del.textContent = "×";
  del.setAttribute("aria-label", "Delete task");
  del.addEventListener("click", () => deleteTask(task.id));

  li.append(handle, checkbox, body, del);
  return li;
}

function updateItem(li, task) {
  li.classList.toggle("done", task.done);
  li.dataset.done = task.done;
  li.querySelector(".task-check").checked = task.done;

  const priority = li.querySelector(".task-priority");
  priority.textContent = "!".repeat(task.priority);
  priority.hidden = task.priority === 0;

  if (!li.classList.contains("editing")) {
    li.querySelector(".task-text").textContent = task.text;
  }

  const meta = li.querySelector(".task-meta");
  meta.innerHTML = "";
  if (task.category) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = task.category;
    meta.appendChild(tag);
  }
  const due = dueInfo(task.due);
  if (due) {
    const badge = document.createElement("span");
    badge.className = "due " + (task.done ? "" : due.cls);
    badge.textContent = due.text;
    meta.appendChild(badge);
  }
}

/* ---------- Render ---------- */

function render({ animateNew = true } = {}) {
  // 1) 이동 전 위치 기록
  const before = new Map();
  for (const li of list.children) {
    before.set(Number(li.dataset.id), li.getBoundingClientRect().top);
  }
  const focused = document.activeElement;

  // 2) 삭제된 항목 정리
  const ids = new Set(tasks.map((t) => t.id));
  elements.forEach((li, id) => {
    if (!ids.has(id)) {
      li.remove();
      elements.delete(id);
    }
  });

  // 3) 미완료 → 완료 순서로 정렬 (각 그룹 안에서는 사용자가 정한 순서 유지) 후 필터
  const visible = [...tasks]
    .sort((a, b) => a.done - b.done)
    .filter(matchesFilter);
  const visibleIds = new Set(visible.map((t) => t.id));

  // 필터에서 빠진 항목은 화면에서만 숨김
  [...list.children].forEach((li) => {
    if (!visibleIds.has(Number(li.dataset.id))) li.remove();
  });

  visible.forEach((task, i) => {
    let li = elements.get(task.id);
    if (!li) {
      li = createItem(task);
      elements.set(task.id, li);
    }
    updateItem(li, task);

    if (!li.isConnected && animateNew) {
      li.classList.remove("enter");
      li.offsetHeight;
      li.classList.add("enter");
      li.addEventListener("animationend", () => li.classList.remove("enter"), { once: true });
    }
    if (list.children[i] !== li) list.insertBefore(li, list.children[i] || null);
  });

  if (focused && document.activeElement !== focused && focused.isConnected) {
    focused.focus({ preventScroll: true });
  }

  // 4) FLIP: 원래 위치에서 새 위치로 부드럽게 이동
  for (const li of list.children) {
    const id = Number(li.dataset.id);
    if (!before.has(id)) continue;
    const dy = before.get(id) - li.getBoundingClientRect().top;
    if (dy !== 0) slide(li, dy);
  }

  // 5) 요약 / 빈 상태 / 버튼 상태
  const remaining = tasks.filter((t) => !t.done).length;
  const completed = tasks.length - remaining;
  summary.textContent =
    tasks.length === 0 ? "0 tasks" : `${remaining} of ${tasks.length} remaining`;

  emptyState.textContent =
    tasks.length === 0 ? "Nothing to do. Enjoy your day." : "No tasks here.";
  emptyState.classList.toggle("hidden", visible.length > 0);

  clearBtn.disabled = completed === 0;
  clearBtn.textContent = completed ? `Clear completed (${completed})` : "Clear completed";
}

/* ---------- Actions ---------- */

function addTask(text) {
  tasks.push({
    id: Date.now(),
    text,
    done: false,
    due: dueInput.value,
    priority: Number(priorityInput.value),
    category: categoryInput.value,
  });
  saveTasks();
  render();
}

function updateTask(id, changes) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  Object.assign(task, changes);
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) updateTask(id, { done: !task.done });
}

function cyclePriority(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) updateTask(id, { priority: (task.priority + 1) % 4 });
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function clearCompleted() {
  tasks = tasks.filter((t) => !t.done);
  saveTasks();
  render();
}

/* ---------- Edit (double-click) ---------- */

function startEdit(id, li) {
  const task = tasks.find((t) => t.id === id);
  if (!task || li.classList.contains("editing")) return;

  li.classList.add("editing");
  const text = li.querySelector(".task-text");
  const editor = document.createElement("input");
  editor.className = "edit-input";
  editor.value = task.text;
  editor.maxLength = 120;
  text.replaceWith(editor);
  editor.focus();
  editor.select();

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    li.classList.remove("editing");
    editor.replaceWith(text);
    const value = editor.value.trim();
    if (save && value && value !== task.text) {
      updateTask(id, { text: value });
    } else {
      text.textContent = task.text;
    }
  };

  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  editor.addEventListener("blur", () => finish(true));
}

/* ---------- Drag to reorder ---------- */

let drag = null;

function startDrag(e, li) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);
  li.style.transition = "none";
  li.classList.add("dragging");
  drag = { li, handle: e.currentTarget, startY: e.clientY };

  drag.handle.addEventListener("pointermove", onDragMove);
  drag.handle.addEventListener("pointerup", endDrag);
  drag.handle.addEventListener("pointercancel", endDrag);
}

function onDragMove(e) {
  if (!drag) return;
  const { li } = drag;
  let dy = e.clientY - drag.startY;

  // 같은 그룹(미완료/완료) 안에서만 자리 바꾸기
  let next = li.nextElementSibling;
  while (next && next.dataset.done === li.dataset.done && dy > next.offsetHeight / 2) {
    const h = next.offsetHeight;
    list.insertBefore(next, li);
    slide(next, li.offsetHeight, 200);
    drag.startY += h;
    dy -= h;
    next = li.nextElementSibling;
  }

  let prev = li.previousElementSibling;
  while (prev && prev.dataset.done === li.dataset.done && dy < -prev.offsetHeight / 2) {
    const h = prev.offsetHeight;
    list.insertBefore(li, prev);
    slide(prev, -li.offsetHeight, 200);
    drag.startY -= h;
    dy += h;
    prev = li.previousElementSibling;
  }

  li.style.transform = `translateY(${dy}px)`;
}

function endDrag() {
  if (!drag) return;
  const { li, handle } = drag;
  drag = null;

  handle.removeEventListener("pointermove", onDragMove);
  handle.removeEventListener("pointerup", endDrag);
  handle.removeEventListener("pointercancel", endDrag);

  // 놓은 자리로 부드럽게 정착
  li.style.transition = "transform 0.2s ease";
  li.style.transform = "";
  li.addEventListener(
    "transitionend",
    () => {
      li.style.transition = "";
      li.classList.remove("dragging");
    },
    { once: true }
  );
  setTimeout(() => li.classList.remove("dragging"), 250); // transitionend가 안 오는 경우 대비

  // 화면 순서를 데이터에 반영 (필터로 숨겨진 항목의 위치는 그대로 유지)
  const domIds = [...list.children].map((el) => Number(el.dataset.id));
  const domSet = new Set(domIds);
  const slots = [];
  tasks.forEach((t, i) => domSet.has(t.id) && slots.push(i));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const reordered = [...tasks];
  slots.forEach((slot, i) => (reordered[slot] = byId.get(domIds[i])));
  tasks = reordered;
  saveTasks();
}

/* ---------- Theme ---------- */

function applyThemeLabel() {
  const dark = document.documentElement.dataset.theme === "dark";
  themeBtn.textContent = dark ? "Light" : "Dark";
}

themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  applyThemeLabel();
});

/* ---------- Events ---------- */

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addTask(text);
  input.value = "";
  dueInput.value = "";
  priorityInput.value = "0";
  categoryInput.value = "";
  input.focus();
});

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    statusFilter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

categoryFilter.addEventListener("change", () => {
  catFilter = categoryFilter.value;
  render();
});

clearBtn.addEventListener("click", clearCompleted);

applyThemeLabel();
render({ animateNew: false });
