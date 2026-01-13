const storageKey = "canvas-task-tracker";
const connectionKey = "canvas-connection";

const taskForm = document.querySelector("#task-form");
const taskList = document.querySelector("#task-list");
const clearTasksButton = document.querySelector("#clear-tasks");
const filterHigh = document.querySelector("#filter-high");
const filterCourse = document.querySelector("#filter-course");
const filterStatus = document.querySelector("#filter-status");
const sortTasks = document.querySelector("#sort-tasks");
const connectButton = document.querySelector("#connect-btn");
const connectionStatus = document.querySelector("#connection-status");
const exportButton = document.querySelector("#export-tasks");
const importInput = document.querySelector("#import-tasks");
const toggleViewButton = document.querySelector("#toggle-view");
const calendarView = document.querySelector("#calendar-view");
const courseRings = document.querySelector("#course-rings");

const statWeek = document.querySelector("#stat-week");
const statOverdue = document.querySelector("#stat-overdue");
const statCompleted = document.querySelector("#stat-completed");

const statusOrder = ["Not started", "In progress", "Submitted"];
const courseColors = [
  "#3c5cff",
  "#1f9d66",
  "#e88b3a",
  "#8b5cf6",
  "#e85e5e",
  "#0ea5e9",
];

const formatDate = (dateValue) => {
  if (!dateValue) return "No due date";
  const date = new Date(dateValue + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const loadTasks = () => {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return [];
  try {
    return JSON.parse(stored).map((task) => ({
      ...task,
      status: task.status || (task.completed ? "Submitted" : "Not started"),
      type: task.type || "Assignment",
      repeat: task.repeat || "None",
    }));
  } catch {
    return [];
  }
};

const saveTasks = (tasks) => {
  localStorage.setItem(storageKey, JSON.stringify(tasks));
};

const getDueStatus = (dateValue) => {
  if (!dateValue) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateValue + "T00:00:00");
  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= 2) return "upcoming";
  return "";
};

const getFilteredTasks = () => {
  const tasks = loadTasks();
  const courseFilter = filterCourse.value.trim().toLowerCase();
  const statusFilter = filterStatus.value;

  let filtered = tasks;

  if (filterHigh.checked) {
    filtered = filtered.filter((task) => task.priority === "High");
  }

  if (courseFilter) {
    filtered = filtered.filter((task) =>
      task.course.toLowerCase().includes(courseFilter)
    );
  }

  if (statusFilter !== "All") {
    filtered = filtered.filter((task) => task.status === statusFilter);
  }

  if (sortTasks.value === "due") {
    filtered = filtered.slice().sort((a, b) => a.due.localeCompare(b.due));
  }

  if (sortTasks.value === "course") {
    filtered = filtered.slice().sort((a, b) => a.course.localeCompare(b.course));
  }

  if (sortTasks.value === "created") {
    filtered = filtered.slice().sort((a, b) => b.createdAt - a.createdAt);
  }

  return filtered;
};

const updateStats = (tasks) => {
  const now = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(now.getDate() + 7);

  const dueThisWeek = tasks.filter((task) => {
    const dueDate = new Date(task.due + "T00:00:00");
    return dueDate >= now && dueDate <= weekFromNow;
  });

  const overdue = tasks.filter((task) => getDueStatus(task.due) === "overdue");
  const completed = tasks.filter((task) => task.status === "Submitted");

  statWeek.textContent = `${dueThisWeek.length}`;
  statOverdue.textContent = `${overdue.length}`;
  statCompleted.textContent = `${completed.length}`;
  updateCourseRings(tasks);
};

const updateCourseRings = (tasks) => {
  const courses = tasks.reduce((acc, task) => {
    if (!acc[task.course]) {
      acc[task.course] = { total: 0, completed: 0 };
    }
    acc[task.course].total += 1;
    if (task.status === "Submitted") {
      acc[task.course].completed += 1;
    }
    return acc;
  }, {});

  courseRings.innerHTML = "";

  const entries = Object.entries(courses);
  if (entries.length === 0) {
    courseRings.innerHTML =
      "<p class=\"subtext\">Add tasks to see class completion rings.</p>";
    return;
  }

  const radius = 28;
  const circumference = 2 * Math.PI * radius;

  entries.forEach(([course, stats], index) => {
    const percent = Math.round((stats.completed / stats.total) * 100);
    const offset = circumference - (percent / 100) * circumference;
    const color = courseColors[index % courseColors.length];

    const card = document.createElement("div");
    card.className = "ring-card";
    card.style.setProperty("--ring-color", color);
    card.setAttribute(
      "aria-label",
      `${course} is ${percent}% complete (${stats.completed} of ${stats.total} tasks)`
    );
    card.innerHTML = `
      <svg class="ring" viewBox="0 0 64 64" aria-hidden="true">
        <circle class="ring-circle ring-bg" cx="32" cy="32" r="${radius}"></circle>
        <circle
          class="ring-circle ring-fg"
          cx="32"
          cy="32"
          r="${radius}"
          stroke="${color}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
        ></circle>
        <text
          class="ring-text"
          x="32"
          y="36"
          text-anchor="middle"
          transform="rotate(90 32 32)"
        >
          ${percent}%
        </text>
      </svg>
      <div class="ring-content">
        <strong>${course}</strong>
        <span>${percent}% complete</span>
        <span>${stats.completed}/${stats.total} tasks</span>
      </div>
    `;

    courseRings.appendChild(card);
  });
};

const renderTasks = () => {
  const tasks = getFilteredTasks();
  taskList.innerHTML = "";

  updateStats(loadTasks());

  if (tasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "task-card";
    empty.innerHTML = "<p>No tasks yet. Add one to get started!</p>";
    taskList.appendChild(empty);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("li");
    const dueStatus = getDueStatus(task.due);
    const isCompleted = task.status === "Submitted";
    item.className = `task-card ${isCompleted ? "completed" : ""}`;

    const badgeClass = task.priority.toLowerCase();

    item.innerHTML = `
      <header>
        <div>
          <h4>${task.title}</h4>
          <div class="task-meta">
            <span>${task.course}</span>
            <span>${task.type}</span>
            <span>Status: ${task.status}</span>
            <span>Due ${formatDate(task.due)}</span>
            ${
              task.reminder
                ? `<span>Reminder ${formatDateTime(task.reminder)}</span>`
                : ""
            }
            ${task.repeat !== "None" ? `<span>Repeats ${task.repeat}</span>` : ""}
          </div>
        </div>
        <span class="badges">
          <span class="badge ${badgeClass}">${task.priority}</span>
          ${
            dueStatus
              ? `<span class="badge ${dueStatus}">${
                  dueStatus === "overdue" ? "Overdue" : "Due soon"
                }</span>`
              : ""
          }
        </span>
      </header>
      <p>${task.notes || "Add a note to remember key details."}</p>
      <div class="task-actions">
        <button class="advance" data-id="${task.id}" type="button">
          ${isCompleted ? "Reopen" : "Advance status"}
        </button>
        <button class="remove" data-id="${task.id}" type="button">Remove</button>
      </div>
    `;

    taskList.appendChild(item);
  });
};

const renderCalendar = () => {
  const tasks = loadTasks();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const header = `
    <div class="calendar-header">
      <strong>${now.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })}</strong>
      <span>${tasks.length} tasks</span>
    </div>
  `;

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const labelRow = dayLabels
    .map((label) => `<div class="calendar-cell"><strong>${label}</strong></div>`)
    .join("");

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push('<div class="calendar-cell"></div>');
  }
  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = new Date(year, month, day)
      .toISOString()
      .slice(0, 10);
    const dayTasks = tasks.filter((task) => task.due === dateKey);
    const taskListMarkup = dayTasks
      .map((task) => `<div class="calendar-task">${task.title}</div>`)
      .join("");
    cells.push(`
      <div class="calendar-cell">
        <strong>${day}</strong>
        ${taskListMarkup || ""}
      </div>
    `);
  }

  calendarView.innerHTML = `
    ${header}
    <div class="calendar-grid">
      ${labelRow}
      ${cells.join("")}
    </div>
  `;
};

const addTask = (event) => {
  event.preventDefault();
  const formData = new FormData(taskForm);
  const newTask = {
    id: crypto.randomUUID(),
    title: formData.get("title").trim(),
    course: formData.get("course").trim(),
    type: formData.get("type"),
    status: formData.get("status"),
    due: formData.get("due"),
    priority: formData.get("priority"),
    reminder: formData.get("reminder"),
    repeat: formData.get("repeat"),
    notes: formData.get("notes").trim(),
    createdAt: Date.now(),
  };

  const tasks = loadTasks();
  tasks.unshift(newTask);
  saveTasks(tasks);
  taskForm.reset();
  renderTasks();
  renderCalendar();
};

const handleTaskAction = (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const taskId = button.dataset.id;
  if (!taskId) return;

  const tasks = loadTasks();
  const taskIndex = tasks.findIndex((task) => task.id === taskId);
  if (taskIndex === -1) return;

  if (button.classList.contains("remove")) {
    tasks.splice(taskIndex, 1);
  }

  if (button.classList.contains("advance")) {
    const currentStatus = tasks[taskIndex].status || "Not started";
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % statusOrder.length;
    tasks[taskIndex].status = statusOrder[nextIndex];
  }

  saveTasks(tasks);
  renderTasks();
  renderCalendar();
};

const clearTasks = () => {
  saveTasks([]);
  renderTasks();
  renderCalendar();
};

const exportTasks = () => {
  const data = JSON.stringify(loadTasks(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "canvas-tasks.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const importTasks = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (Array.isArray(imported)) {
        saveTasks(imported);
        renderTasks();
        renderCalendar();
      }
    } catch {
      // Ignore invalid JSON.
    }
  };
  reader.readAsText(file);
  importInput.value = "";
};

const toggleCalendarView = () => {
  const isHidden = calendarView.hasAttribute("hidden");
  if (isHidden) {
    calendarView.removeAttribute("hidden");
    taskList.setAttribute("hidden", "hidden");
    toggleViewButton.textContent = "List view";
    renderCalendar();
  } else {
    calendarView.setAttribute("hidden", "hidden");
    taskList.removeAttribute("hidden");
    toggleViewButton.textContent = "Calendar view";
  }
};

const loadConnection = () => {
  const stored = localStorage.getItem(connectionKey);
  return stored === "connected";
};

const updateConnectionUI = (connected) => {
  if (connected) {
    connectionStatus.textContent = "Connected to Canvas";
    connectButton.textContent = "Sync now";
    connectButton.classList.add("connected");
  } else {
    connectionStatus.textContent = "Not connected";
    connectButton.textContent = "Connect Canvas";
    connectButton.classList.remove("connected");
  }
};

const toggleConnection = () => {
  const connected = loadConnection();
  if (!connected) {
    localStorage.setItem(connectionKey, "connected");
    updateConnectionUI(true);
    connectionStatus.insertAdjacentText(
      "beforeend",
      " · Mock sync complete"
    );
  } else {
    connectionStatus.textContent = "Syncing assignments...";
    setTimeout(() => {
      updateConnectionUI(true);
    }, 900);
  }
};

taskForm.addEventListener("submit", addTask);
taskList.addEventListener("click", handleTaskAction);
clearTasksButton.addEventListener("click", clearTasks);
filterHigh.addEventListener("change", renderTasks);
filterCourse.addEventListener("input", renderTasks);
filterStatus.addEventListener("change", renderTasks);
sortTasks.addEventListener("change", renderTasks);
connectButton.addEventListener("click", toggleConnection);
exportButton.addEventListener("click", exportTasks);
importInput.addEventListener("change", importTasks);
toggleViewButton.addEventListener("click", toggleCalendarView);

updateConnectionUI(loadConnection());
renderTasks();
renderCalendar();
