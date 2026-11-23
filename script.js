const STORAGE_KEY = "kanban-tasks";
const STATUSES = ["todo", "in-progress", "done"];
const DEFAULT_TASKS = [
    { id: "t1", text: "Wash Dishes", status: "todo" },
    { id: "t2", text: "Buy Groceries", status: "todo" },
    { id: "t3", text: "Learn to code", status: "in-progress" },
];

const board = document.querySelector(".board");
const lists = document.querySelectorAll(".list");

let tasks = loadTasks();

// ---------- Storage ----------

function isValidTask(task) {
    return task
        && typeof task.id === "string"
        && typeof task.text === "string"
        && STATUSES.includes(task.status);
}

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (Array.isArray(saved)) {
            return saved.filter(isValidTask);
        }
    } catch {
        // storage unavailable or corrupted: fall back to the default tasks
    }
    return DEFAULT_TASKS.map((task) => ({ ...task }));
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
        // storage unavailable: the board still works, it just won't persist
    }
}

function createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- Task actions ----------

function addTask(text, status) {
    tasks.push({ id: createId(), text, status });
    saveTasks();
    render();
}

function deleteTask(id) {
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    render();
}

function moveTask(id, status) {
    const task = tasks.find((t) => t.id === id);
    if (!task || !STATUSES.includes(status)) return;

    // Move it to the end of its new column
    tasks = tasks.filter((t) => t !== task);
    task.status = status;
    tasks.push(task);
    saveTasks();
    render();
}

// ---------- Rendering ----------

function createButton(label, title, action, disabled) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card-btn";
    button.textContent = label;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.dataset.action = action;
    button.disabled = disabled;
    return button;
}

function createCard(task) {
    const index = STATUSES.indexOf(task.status);

    const card = document.createElement("div");
    card.className = "card";
    card.draggable = true;
    card.dataset.id = task.id;

    const text = document.createElement("span");
    text.className = "card-text";
    text.textContent = task.text; // textContent keeps user input from being treated as HTML

    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.append(
        createButton("←", "Move left", "move-left", index === 0),
        createButton("→", "Move right", "move-right", index === STATUSES.length - 1),
        createButton("×", "Delete task", "delete", false)
    );

    card.append(text, actions);

    card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        clearDropHighlights();
    });

    return card;
}

function render() {
    lists.forEach((list) => {
        const status = list.dataset.status;
        const listTasks = tasks.filter((task) => task.status === status);

        list.querySelector(".cards").replaceChildren(...listTasks.map(createCard));
        list.querySelector(".count").textContent = listTasks.length;
    });
}

// ---------- Drag and drop ----------

// Counting enter/leave events per column stops the highlight from flickering
// when the dragged card passes over other cards inside the column.
const dragDepth = new Map();

function clearDropHighlights() {
    lists.forEach((list) => {
        dragDepth.set(list, 0);
        list.classList.remove("over");
    });
}

lists.forEach((list) => {
    dragDepth.set(list, 0);

    list.addEventListener("dragenter", (e) => {
        e.preventDefault();
        dragDepth.set(list, dragDepth.get(list) + 1);
        list.classList.add("over");
    });

    list.addEventListener("dragover", (e) => {
        // Browsers block dropping by default; this allows it
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    });

    list.addEventListener("dragleave", () => {
        const depth = Math.max(dragDepth.get(list) - 1, 0);
        dragDepth.set(list, depth);
        if (depth === 0) list.classList.remove("over");
    });

    list.addEventListener("drop", (e) => {
        e.preventDefault(); // also stops the browser from opening dropped links or files
        clearDropHighlights();

        const id = e.dataTransfer.getData("text/plain");
        // Ignore anything that isn't one of our cards (text, links, files...)
        if (!tasks.some((task) => task.id === id)) return;

        moveTask(id, list.dataset.status);
    });
});

// ---------- Buttons and forms ----------

board.addEventListener("click", (e) => {
    const button = e.target.closest(".card-btn");
    if (!button) return;

    const id = button.closest(".card").dataset.id;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const index = STATUSES.indexOf(task.status);

    if (button.dataset.action === "delete") {
        deleteTask(id);
    } else if (button.dataset.action === "move-left") {
        moveTask(id, STATUSES[index - 1]);
    } else if (button.dataset.action === "move-right") {
        moveTask(id, STATUSES[index + 1]);
    }
});

board.addEventListener("submit", (e) => {
    e.preventDefault();

    const form = e.target;
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (!text) return;

    addTask(text, form.closest(".list").dataset.status);
    input.value = "";
    input.focus();
});

render();
