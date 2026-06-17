const transactions = [
  { merchant: "Bean & Budget Cafe", category: "Food & Dining", date: "17 Jun 2026", amount: -18.6, icon: "F" },
  { merchant: "Northline Payroll", category: "Income", date: "15 Jun 2026", amount: 2850, icon: "I" },
  { merchant: "Metro Card Top Up", category: "Transport", date: "14 Jun 2026", amount: -45, icon: "T" },
  { merchant: "Cloud Desk Suite", category: "Subscriptions", date: "12 Jun 2026", amount: -29, icon: "S" },
  { merchant: "Fresh Basket Market", category: "Groceries", date: "10 Jun 2026", amount: -86.35, icon: "G" },
];

const categories = [
  { name: "Food & Dining", amount: 680, percent: 78, color: "#d85c46" },
  { name: "Groceries", amount: 520, percent: 61, color: "#087f7a" },
  { name: "Transport", amount: 310, percent: 36, color: "#2855a3" },
  { name: "Subscriptions", amount: 184, percent: 22, color: "#cf8b21" },
  { name: "Savings", amount: 1760, percent: 82, color: "#20875a" },
];

const advice = [
  {
    title: "Dining is running 18% above your normal pace",
    detail: "Set a weekly dining cap of $145 to recover roughly $220 before month end.",
    icon: "!",
  },
  {
    title: "Subscription cleanup opportunity",
    detail: "Three recurring services have not changed in 90 days. Reviewing them could free $58 monthly.",
    icon: "$",
  },
  {
    title: "Savings momentum is healthy",
    detail: "Your current savings rate beats the 25% target. Move $420 to emergency savings automatically.",
    icon: "^",
  },
];

const demoSlips = [
  { merchant: "Bean & Budget Cafe", amount: "$18.60", category: "Food & Dining", date: "17 Jun 2026", confidence: "92%" },
  { merchant: "Fresh Basket Market", amount: "$86.35", category: "Groceries", date: "10 Jun 2026", confidence: "95%" },
  { merchant: "Metro Card Top Up", amount: "$45.00", category: "Transport", date: "14 Jun 2026", confidence: "89%" },
  { merchant: "Northline Payroll", amount: "$2,850.00", category: "Income", date: "15 Jun 2026", confidence: "98%" },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(Math.abs(value));

function renderCategories() {
  const categoryList = document.querySelector("#categoryList");
  categoryList.innerHTML = categories
    .map(
      (category) => `
        <div class="category-item">
          <div class="category-top">
            <span>${category.name}</span>
            <span>${formatCurrency(category.amount)}</span>
          </div>
          <div class="category-bar" aria-label="${category.name} ${category.percent}%">
            <span style="width: ${category.percent}%; background: ${category.color}"></span>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderTransactions() {
  const transactionList = document.querySelector("#transactionList");
  transactionList.innerHTML = transactions
    .map(
      (transaction) => `
        <div class="transaction-row">
          <span class="transaction-icon">${transaction.icon}</span>
          <div>
            <strong>${transaction.merchant}</strong>
            <small>${transaction.category} - ${transaction.date}</small>
          </div>
          <span class="transaction-amount ${transaction.amount > 0 ? "good" : ""}">
            ${transaction.amount > 0 ? "+" : "-"}${formatCurrency(transaction.amount)}
          </span>
        </div>
      `,
    )
    .join("");
}

function renderAdvice() {
  const adviceList = document.querySelector("#adviceList");
  adviceList.innerHTML = advice
    .map(
      (item) => `
        <div class="advice-item">
          <span class="advice-icon">${item.icon}</span>
          <div>
            <strong>${item.title}</strong>
            <small>${item.detail}</small>
          </div>
        </div>
      `,
    )
    .join("");
}

function analyzeSlip(fileName = "") {
  const status = document.querySelector("#scanStatus");
  const confidenceScore = document.querySelector("#confidenceScore");
  const sample = demoSlips[Math.floor(Math.random() * demoSlips.length)];

  status.textContent = "Reading";
  status.style.background = "#fff3d8";
  status.style.color = "#9a6719";

  window.setTimeout(() => {
    document.querySelector("#merchantValue").textContent = fileName || sample.merchant;
    document.querySelector("#amountValue").textContent = sample.amount;
    document.querySelector("#categoryValue").textContent = sample.category;
    document.querySelector("#dateValue").textContent = sample.date;
    confidenceScore.textContent = sample.confidence;
    document.querySelector(".meter span").style.width = sample.confidence;
    status.textContent = "Analyzed";
    status.style.background = "#e8f5ef";
    status.style.color = "#20875a";
  }, 700);
}

function setupUploader() {
  const input = document.querySelector("#slipInput");
  const dropZone = document.querySelector("#dropZone");

  input.addEventListener("change", (event) => {
    const file = event.target.files[0];
    analyzeSlip(file ? file.name.replace(/\.[^/.]+$/, "") : "");
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("dragging");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];
    analyzeSlip(file ? file.name.replace(/\.[^/.]+$/, "") : "");
  });
}

document.querySelector("#runDemo").addEventListener("click", () => analyzeSlip());
document.querySelector("#periodSelect").addEventListener("change", (event) => {
  const multiplier = event.target.value === "Last 90 days" ? 2.7 : event.target.value === "Last month" ? 0.84 : 1;
  categories.forEach((category) => {
    category.amount = Math.round(category.amount * multiplier);
    category.percent = Math.min(95, Math.max(18, Math.round(category.percent * (0.9 + Math.random() * 0.18))));
  });
  renderCategories();
});

renderCategories();
renderTransactions();
renderAdvice();
setupUploader();
