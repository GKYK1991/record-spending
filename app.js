let expenses = JSON.parse(localStorage.getItem("recordSpendingExpenses")) || [];

const typeOptions = {
  "Food": ["Breakfast", "Lunch", "Dinner", "Drinks", "Snacks"],
  "Transport": ["Train", "Bus", "Car"],
  "Shopping": ["Groceries", "Baby Items", "Household", "Personal Care", "Others"],
  "Child Expenses": ["Medical", "Items"],
  "Medical": ["GP (General Practitioner)", "Specialist", "Chinese Physician"],
  "Grab Pay Topup": ["Wallet Top Up", "Others"],
  "Bills": ["SP Bills", "Telco", "Others"],
  "Subscriptions": ["iCloud", "Netflix", "Spotify", "ChatGPT", "Others"],
  "Fun": ["Movie", "Games", "Activities", "Others"],
  "Other": ["Others"]
};

function showPage(page) {
  const pages = ["overview", "add", "activity", "settings"];

  pages.forEach((item) => {
    document.getElementById(item + "Page").classList.remove("active-page");
    document.getElementById(item + "Tab").classList.remove("active");
  });

  document.getElementById(page + "Page").classList.add("active-page");
  document.getElementById(page + "Tab").classList.add("active");

  const titleMap = {
    overview: "Overview",
    add: "Add Spending",
    activity: "Activity",
    settings: "Settings"
  };

  document.getElementById("pageTitle").textContent = titleMap[page];

  renderAll();
}

function formatMoney(amount) {
  return "SGD " + Number(amount).toFixed(2);
}

function saveToStorage() {
  localStorage.setItem("recordSpendingExpenses", JSON.stringify(expenses));
}

function updateTypeOptions() {
  const category = document.getElementById("categoryInput").value;
  const typeInput = document.getElementById("typeInput");

  typeInput.innerHTML = "";

  const options = typeOptions[category] || ["Others"];

  options.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeInput.appendChild(option);
  });
}

function setDefaultDateTime() {
  const dateInput = document.getElementById("dateInput");
  const now = new Date();

  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  dateInput.value = local;
}

function previewSelectedPhoto() {
  const file = document.getElementById("photoInput").files[0];
  const preview = document.getElementById("photoPreview");

  if (!file) {
    preview.style.display = "none";
    preview.src = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = function (event) {
    preview.src = event.target.result;
    preview.style.display = "block";
  };

  reader.readAsDataURL(file);
}

async function saveSpending() {
  const amount = Number(document.getElementById("amountInput").value);
  const merchant = document.getElementById("merchantInput").value.trim();
  const category = document.getElementById("categoryInput").value;
  const type = document.getElementById("typeInput").value;
  const payment = document.getElementById("paymentInput").value;
  const date = document.getElementById("dateInput").value;
  const remarks = document.getElementById("remarksInput").value.trim();
  const photoFile = document.getElementById("photoInput").files[0];

  if (!amount || amount <= 0) {
    alert("Please enter amount.");
    return;
  }

  let photo = "";

  if (photoFile) {
    photo = await resizePhoto(photoFile);
  }

  const expense = {
    id: Date.now(),
    amount,
    merchant: merchant || category,
    category,
    type,
    payment,
    date: date || new Date().toISOString(),
    remarks,
    photo
  };

  expenses.unshift(expense);
  saveToStorage();

  document.getElementById("amountInput").value = "";
  document.getElementById("merchantInput").value = "";
  document.getElementById("remarksInput").value = "";
  document.getElementById("photoInput").value = "";
  document.getElementById("photoPreview").style.display = "none";
  document.getElementById("photoPreview").src = "";

  setDefaultDateTime();

  alert("Spending saved.");
  showPage("activity");
}

function resizePhoto(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();

      img.onload = function () {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);

        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedPhoto = canvas.toDataURL("image/jpeg", 0.75);
        resolve(compressedPhoto);
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}

function deleteExpense(id) {
  const confirmDelete = confirm("Delete this spending record?");

  if (!confirmDelete) return;

  expenses = expenses.filter((expense) => expense.id !== id);
  saveToStorage();
  renderAll();
}

function renderOverview() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = expenses.filter((expense) => {
    const date = new Date(expense.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const total = thisMonth.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const count = thisMonth.length;
  const day = now.getDate();
  const average = day > 0 ? total / day : 0;

  document.getElementById("monthTotal").textContent = formatMoney(total);
  document.getElementById("transactionCount").textContent =
    count + (count === 1 ? " transaction" : " transactions");
  document.getElementById("miniTransactionCount").textContent = count;
  document.getElementById("dailyAverage").textContent = formatMoney(average);
  document.getElementById("totalRecords").textContent = expenses.length;

  renderCardSpending(thisMonth);
  renderCategorySpending(thisMonth);
}

function renderCardSpending(thisMonth) {
  const cards = ["Citi", "TRUST", "POSB"];
  const container = document.getElementById("cardSpendingList");

  container.innerHTML = "";

  cards.forEach((card) => {
    const total = thisMonth
      .filter((expense) => expense.payment === card)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    container.innerHTML += `
      <div class="summary-row">
        <span>${card}</span>
        <strong>${formatMoney(total)}</strong>
      </div>
    `;
  });
}

function renderCategorySpending(thisMonth) {
  const container = document.getElementById("categorySpendingList");
  container.innerHTML = "";

  const grouped = {};

  thisMonth.forEach((expense) => {
    const key = expense.category + " • " + expense.type;
    grouped[key] = (grouped[key] || 0) + Number(expense.amount);
  });

  const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  if (rows.length === 0) {
    container.innerHTML = `<p class="help-text">No spending this month yet.</p>`;
    return;
  }

  rows.forEach(([name, total]) => {
    container.innerHTML += `
      <div class="summary-row">
        <span>${name}</span>
        <strong>${formatMoney(total)}</strong>
      </div>
    `;
  });
}

function renderActivity() {
  const container = document.getElementById("activityList");
  container.innerHTML = "";

  if (expenses.length === 0) {
    container.innerHTML = `
      <div class="card">
        <h2>No expenses yet</h2>
        <p class="help-text">Tap Add to save your first spending record.</p>
      </div>
    `;
    return;
  }

  expenses.forEach((expense) => {
    const date = new Date(expense.date);
    const dateText = date.toLocaleString("en-SG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    container.innerHTML += `
      <div class="card">
        <div class="expense-row">
          <div class="circle">${iconForCategory(expense.category)}</div>
          <div>
            <h3>${expense.merchant}</h3>
            <p>${expense.type} · ${expense.payment}</p>
            <p>${dateText}</p>
          </div>
          <strong>${formatMoney(expense.amount)}</strong>
        </div>

        ${expense.remarks ? `<p class="help-text">${expense.remarks}</p>` : ""}

        ${
          expense.photo
            ? `
              <img class="expense-photo" src="${expense.photo}" />
              <a class="photo-link" href="${expense.photo}" download="record-spending-photo-${expense.id}.jpg">
                Open / Save Photo
              </a>
            `
            : ""
        }

        <button class="delete-button" onclick="deleteExpense(${expense.id})">
          Delete
        </button>
      </div>
    `;
  });
}

function iconForCategory(category) {
  switch (category) {
    case "Food":
      return "🍴";
    case "Transport":
      return "🚗";
    case "Shopping":
      return "🛍️";
    case "Child Expenses":
      return "👶";
    case "Medical":
      return "🏥";
    case "Grab Pay Topup":
      return "💳";
    case "Bills":
      return "📄";
    case "Subscriptions":
      return "🔁";
    case "Fun":
      return "🎮";
    default:
      return "⬛";
  }
}

function exportCSV() {
  if (expenses.length === 0) {
    alert("No records to export.");
    return;
  }

  const headers = [
    "Amount",
    "Merchant",
    "Category",
    "Type",
    "Payment",
    "Date",
    "Remarks"
  ];

  const rows = expenses.map((expense) => [
    expense.amount,
    csvEscape(expense.merchant),
    csvEscape(expense.category),
    csvEscape(expense.type),
    csvEscape(expense.payment),
    csvEscape(expense.date),
    csvEscape(expense.remarks)
  ]);

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "RecordSpendingBackup.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value || "");
  const escaped = text.replaceAll('"', '""');

  if (escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")) {
    return `"${escaped}"`;
  }

  return escaped;
}

function renderAll() {
  renderOverview();
  renderActivity();
}

document.addEventListener("DOMContentLoaded", () => {
  updateTypeOptions();
  setDefaultDateTime();
  renderAll();
});
