// =========================
// Zuletzt v2.0
// =========================

const STORAGE = "zuletztTasks";

let tasks = JSON.parse(localStorage.getItem(STORAGE)) || [];

const list = document.getElementById("taskList");
const input = document.getElementById("taskInput");
const addButton = document.getElementById("addButton");

const category = document.getElementById("category");
const priority = document.getElementById("priority");
const dueDate = document.getElementById("dueDate");
const search = document.getElementById("search");

const today = document.getElementById("todayCount");
const done = document.getElementById("doneCount");
const open = document.getElementById("openCount");

function save() {
    localStorage.setItem(STORAGE, JSON.stringify(tasks));
    render();
}

function categoryClass(cat) {

    switch (cat) {
        case "Privat":
            return "private";

        case "Arbeit":
            return "work";

        case "Einkaufen":
            return "shop";

        case "Gesundheit":
            return "health";

        default:
            return "other";
    }

}

function priorityClass(value) {

    if (value == 3) return "priorityHigh";
    if (value == 2) return "priorityMedium";

    return "priorityLow";

}

function render() {

    list.innerHTML = "";

    const query = search.value.toLowerCase();

    let filtered = tasks.filter(task => {

        return task.title.toLowerCase().includes(query);

    });

    filtered.sort((a, b) => {

        if (a.done !== b.done) {

            return a.done - b.done;

        }

        return b.priority - a.priority;

    });

    filtered.forEach(task => {

        const li = document.createElement("li");

        if (task.done) {

            li.classList.add("done");

        }

        const left = document.createElement("div");

        left.style.flex = "1";

        const title = document.createElement("div");

        title.className = "taskTitle";

        title.textContent = task.title;

        left.appendChild(title);

        const badges = document.createElement("div");

        badges.className = "badges";

        const cat = document.createElement("span");

        cat.className = "badge " + categoryClass(task.category);

        cat.textContent = task.category;

        badges.appendChild(cat);

        const prio = document.createElement("span");

        prio.className = "badge " + priorityClass(task.priority);

        prio.textContent = "Priorität " + task.priority;

        badges.appendChild(prio);

        left.appendChild(badges);

        if (task.date) {

            const date = document.createElement("div");

            date.className = "taskDate";

            date.textContent = "📅 " + task.date;

            left.appendChild(date);

        }

        const buttons = document.createElement("div");

        buttons.className = "taskButtons";

        const finish = document.createElement("button");

        finish.textContent = "✓";

        finish.onclick = () => {

            task.done = !task.done;

            save();

        };

        const remove = document.createElement("button");

        remove.textContent = "🗑️";

        remove.onclick = () => {

            tasks = tasks.filter(t => t !== task);

            save();

        };

        buttons.appendChild(finish);

        buttons.appendChild(remove);

        li.appendChild(left);

        li.appendChild(buttons);

        list.appendChild(li);

    });

    today.textContent = tasks.length + " Aufgaben";

    done.textContent = tasks.filter(t => t.done).length;

    open.textContent = tasks.filter(t => !t.done).length;

}
// =========================
// Neue Aufgabe anlegen
// =========================

addButton.onclick = () => {

    const title = input.value.trim();

    if (title === "") return;

    tasks.push({
        id: Date.now(),
        title: title,
        done: false,
        category: category.value,
        priority: Number(priority.value),
        date: dueDate.value
    });

    input.value = "";
    dueDate.value = "";

    save();

};

// Enter-Taste fügt ebenfalls eine Aufgabe hinzu
input.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {

        addButton.click();

    }

});

// =========================
// Live-Suche
// =========================

search.addEventListener("input", render);

// =========================
// Dark Mode
// =========================

const darkModeButton = document.getElementById("darkModeButton");

darkModeButton.onclick = () => {

    document.body.classList.toggle("dark");

    localStorage.setItem(
        "theme",
        document.body.classList.contains("dark")
    );

};

if (localStorage.getItem("theme") === "true") {

    document.body.classList.add("dark");

}

// =========================
// Dashboard
// =========================

function updateDashboard() {

    const completed = tasks.filter(task => task.done).length;
    const openTasks = tasks.length - completed;

    today.textContent = `${tasks.length} Aufgaben`;
    done.textContent = completed;
    open.textContent = openTasks;

}

// Dashboard automatisch aktualisieren
const originalRender = render;

render = function () {

    originalRender();

    updateDashboard();

};

// =========================
// Service Worker
// =========================


}

// =========================
// Erste Darstellung
// =========================

render();
