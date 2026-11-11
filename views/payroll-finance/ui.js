(() => {
  "use strict";

  const API = "/payroll-finance/api";
  const role = document.body.dataset.role;

  const CONFIG = {
    officer: {
      title: "Payroll / Finance Officer",
      pages: [
        ["dashboard", "Dashboard"],
        ["periods", "Payroll Periods"],
        ["payroll", "Payroll Processing"],
        ["rates", "Pay Rates"],
        ["payments", "Payments"],
        ["workers", "Worker Directory"],
        ["attendance", "Verified Attendance"],
        ["reports", "Reports"]
      ]
    },
    finance: {
      title: "Finance Manager",
      pages: [
        ["dashboard", "Dashboard"],
        ["review", "Payroll Review"],
        ["budgets", "Project Budgets"],
        ["expenses", "Project Expenses"],
        ["payments", "Payments"],
        ["reports", "Reports"]
      ]
    },
    hr: {
      title: "HR Manager",
      pages: [
        ["dashboard", "Dashboard"],
        ["workers", "Worker Directory"],
        ["attendance", "Verified Attendance"]
      ]
    },
    worker: {
      title: "Worker",
      pages: [["payslips", "My Payslips"]]
    }
  };

  if (!CONFIG[role]) return;

  const config = CONFIG[role];
  const $ = id => document.getElementById(id);
  const state = {
    user: null,
    token: "",
    page: role === "worker" ? "payslips" : "dashboard",
    data: {},
    search: "",
    modalAction: null,
    modalRecord: null,
    printRecord: null
  };

  const ICONS = {
    dashboard: "<rect width='7' height='9' x='3' y='3' rx='1'/><rect width='7' height='5' x='14' y='3' rx='1'/><rect width='7' height='9' x='14' y='12' rx='1'/><rect width='7' height='5' x='3' y='16' rx='1'/>",
    workers: "<path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M22 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/>",
    attendance: "<path d='M8 2v4'/><path d='M16 2v4'/><rect width='18' height='18' x='3' y='4' rx='2'/><path d='M3 10h18'/><path d='m9 16 2 2 4-4'/>",
    periods: "<path d='M8 2v4'/><path d='M16 2v4'/><rect width='18' height='18' x='3' y='4' rx='2'/><path d='M3 10h18'/>",
    payroll: "<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><path d='M14 2v6h6'/><path d='M16 13H8'/><path d='M16 17H8'/><path d='M10 9H8'/>",
    payslips: "<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><path d='M14 2v6h6'/><path d='M16 13H8'/><path d='M16 17H8'/><path d='M10 9H8'/>",
    rates: "<circle cx='12' cy='12' r='10'/><path d='M16 8h-5a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H8'/><path d='M12 6v2'/><path d='M12 16v2'/>",
    payments: "<rect width='20' height='14' x='2' y='5' rx='2'/><path d='M2 10h20'/>",
    reports: "<path d='M3 3v18h18'/><path d='M18 17V9'/><path d='M13 17V5'/><path d='M8 17v-3'/>",
    review: "<rect width='8' height='4' x='8' y='2' rx='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='m9 14 2 2 4-4'/>",
    budgets: "<path d='M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1'/><path d='M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'/>",
    expenses: "<path d='M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z'/><path d='M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8'/><path d='M12 17.5v-11'/>",
    clock: "<circle cx='12' cy='12' r='10'/><path d='M12 6v6l4 2'/>",
    check: "<path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><path d='m9 11 3 3L22 4'/>",
    bell: "<path d='M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'/><path d='M10.3 21a1.94 1.94 0 0 0 3.4 0'/>",
    menu: "<path d='M4 6h16'/><path d='M4 12h16'/><path d='M4 18h16'/>",
    logout: "<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><path d='m16 17 5-5-5-5'/><path d='M21 12H9'/>",
    inbox: "<path d='M22 12h-6l-2 3h-4l-2-3H2'/><path d='M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'/>"
  };

  function icon(name, size = "w-5 h-5") {
    return "<svg class='" + size + " shrink-0' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>" +
      (ICONS[name] || ICONS.dashboard) + "</svg>";
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function money(value) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(Number(value) || 0);
  }

  function date(value) {
    return value ? esc(String(value).slice(0, 10)) : "—";
  }

  function data(key) {
    return Array.isArray(state.data[key]) ? state.data[key] : [];
  }

  function find(key, id) {
    return data(key).find(record => String(record.id) === String(id));
  }

  function button(label, action, id = "", primary = false) {
    const color = primary
      ? "bg-[#efb600] border-[#efb600] hover:bg-[#d9a400] font-bold shadow-sm"
      : "bg-white border-[#d7d5cf] hover:bg-[#f1efea] font-semibold";

    return "<button type='button' data-action='" + esc(action) +
      "' data-id='" + esc(id) + "' class='border rounded-lg px-3.5 py-2 text-xs text-[#26343e] transition-colors " +
      color + "'>" + esc(label) + "</button>";
  }

  function badge(value) {
    const text = String(value || "—");
    let colors = "text-slate-600 bg-slate-100 border-slate-200";
    let dot = "bg-slate-400";

    if (/Approved|Paid|Completed|Verified|Active|Closed/i.test(text)) {
      colors = "text-green-700 bg-green-50 border-green-200";
      dot = "bg-green-500";
    } else if (/Failed|Rejected|Cancelled|Pending|For Approval/i.test(text)) {
      colors = "text-amber-800 bg-amber-50 border-amber-200";
      dot = "bg-amber-500";
    }

    return "<span class='inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border " +
      colors + "'><span class='w-1.5 h-1.5 rounded-full " + dot + "'></span>" + esc(text) + "</span>";
  }

  function panel(title, body, note = "") {
    return "<section class='bg-white border border-[#e1ded8] rounded-xl shadow-sm min-w-0 overflow-hidden'>" +
      "<header class='px-5 py-4 border-b border-[#eceae4]'>" +
      "<h3 class='font-bold text-sm'>" + esc(title) + "</h3>" +
      (note ? "<p class='text-xs text-slate-500 mt-1'>" + esc(note) + "</p>" : "") +
      "</header>" + body + "</section>";
  }

  function metric(label, value, iconName = "dashboard", tone = "blue") {
    const tones = {
      blue: "bg-blue-50 text-blue-700",
      green: "bg-green-50 text-green-700",
      amber: "bg-amber-50 text-amber-700",
      purple: "bg-violet-50 text-violet-700"
    };

    return "<article class='bg-white border border-[#e1ded8] rounded-xl shadow-sm p-5 transition hover:-translate-y-0.5 hover:shadow-md'>" +
      "<div class='flex items-center justify-between'>" +
      "<p class='text-xs font-medium text-slate-500'>" + esc(label) + "</p>" +
      "<span class='w-9 h-9 rounded-lg flex items-center justify-center " + (tones[tone] || tones.blue) + "'>" + icon(iconName) + "</span></div>" +
      "<strong class='block text-3xl font-extrabold mt-4 mb-2 break-words'>" + esc(value ?? "0") + "</strong>" +
      "<p class='text-[11px] text-slate-400'>Live from database</p></article>";
  }

  function table(headers, records, getCells) {
    const query = state.search.toLowerCase().trim();
    const filtered = records.filter(record =>
      !query || JSON.stringify(record).toLowerCase().includes(query)
    );
    const headerHtml = headers.map(label =>
      "<th class='py-3 px-3 border-b border-[#e1ded8] text-[11px] uppercase tracking-wider text-slate-500 font-semibold'>" +
      esc(label) + "</th>"
    ).join("");
    const rowHtml = filtered.map(record =>
      "<tr class='hover:bg-[#faf9f7] transition-colors'>" + getCells(record).map(cell =>
        "<td class='px-3 py-3.5 border-b border-[#efede8] align-middle'>" +
        cell + "</td>"
      ).join("") + "</tr>"
    ).join("");
    const empty = "<tr><td colspan='" + headers.length + "' class='py-12 text-center'>" +
      "<span class='mx-auto mb-3 w-12 h-12 rounded-full bg-[#f1efea] text-slate-400 flex items-center justify-center'>" + icon("inbox", "w-6 h-6") + "</span>" +
      "<p class='text-sm font-semibold text-slate-600'>No matching records</p>" +
      "<p class='text-xs text-slate-400 mt-1'>Records will appear here once available.</p></td></tr>";

    return "<div class='overflow-auto max-h-[520px] px-4 pb-4'>" +
      "<table class='w-full min-w-[650px] text-left text-xs border-collapse'>" +
      "<thead class='sticky top-0 bg-white'><tr>" + headerHtml +
      "</tr></thead><tbody>" + (rowHtml || empty) +
      "</tbody></table></div>";
  }

  async function api(path, method = "GET", body) {
    const headers = { Accept: "application/json" };
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      headers["X-CSRF-Token"] = state.token;
    }

    const response = await fetch(API + path, {
      method,
      credentials: "same-origin",
      headers,
      body: method === "GET" ? undefined : JSON.stringify(body || {})
    });

    if (response.status === 401) {
      location.assign("/login");
      throw new Error("Your login session has expired");
    }

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || ("Request failed (" + response.status + ")"));
    }
    return result.data;
  }

  function toast(message, isError = false) {
    const element = $("toast");
    if (!element) return;
    element.textContent = message;
    element.className = "fixed bottom-5 right-5 z-[120] max-w-sm text-sm p-4 rounded-lg shadow-lg text-white " +
      (isError ? "bg-red-700" : "bg-[#26343e]");
    element.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { element.hidden = true; }, 4000);
  }

  const DATASETS = {
    dashboard: ["dashboard"],
    periods: ["periods"],
    payroll: ["payroll", "periods", "workers"],
    review: ["payroll"],
    rates: ["rates", "workers"],
    payments: ["payments", "payroll"],
    budgets: ["budgets"],
    expenses: ["expenses"],
    workers: ["workers"],
    attendance: ["attendance"],
    reports: ["reports"],
    payslips: ["payslips"]
  };

  async function loadPage(page = state.page) {
    if (!config.pages.some(item => item[0] === page)) return;
    state.page = page;
    state.search = "";
    if ($("search")) $("search").value = "";
    if ($("sidebar")) $("sidebar").classList.add("-translate-x-full");
    if ($("overlay")) $("overlay").hidden = true;

    $("content").innerHTML = panel(
      "Loading", "<p class='p-6 text-sm text-slate-500'>Loading BUILDORA records...</p>"
    );

    try {
      const results = await Promise.all(
        DATASETS[page].map(async key => [key, await api("/" + key)])
      );
      for (const [key, value] of results) state.data[key] = value;
      render();
    } catch (error) {
      $("content").innerHTML = panel(
        "Unable to load records",
        "<p class='p-6 text-sm text-red-700'>" + esc(error.message) + "</p>"
      );
    }
  }

  function dashboardView() {
    const stats = state.data.dashboard?.stats || {};
    let metrics;
    let message;
    let action;

    if (role === "officer") {
      metrics = [
        ["Payroll Periods", stats.periods, "periods", "blue"],
        ["Payroll Records", stats.payroll_records, "payroll", "purple"],
        ["Awaiting Review", stats.pending_approval, "clock", "amber"],
        ["Recorded Payments", money(stats.disbursed), "payments", "green"]
      ];
      message = "Process payroll from verified attendance and pay rates. Submit records to the Finance Manager for approval before recording payment.";
      action = button("Generate Payroll", "generate", "", true);
    } else if (role === "finance") {
      metrics = [
        ["Pending Approval", stats.pending_approval, "clock", "amber"],
        ["Approved Payroll", money(stats.approved_payroll), "check", "green"],
        ["Approved Budgets", money(stats.approved_budget), "budgets", "blue"],
        ["Project Expenses", money(stats.project_expenses), "expenses", "purple"]
      ];
      message = "Review submitted payroll, inspect shared project finances, and approve authorized draft budgets.";
      action = button("Review Payroll", "go-review", "", true);
    } else {
      metrics = [
        ["Active Workers", stats.active_workers, "workers", "blue"],
        ["Verified Attendance", stats.verified_attendance, "check", "green"],
        ["Pending Verification", stats.pending_attendance, "clock", "amber"],
        ["Verified Hours", stats.verified_hours, "clock", "purple"]
      ];
      message = "View worker records and verified attendance. Attendance verification is managed by the Workforce module.";
      action = button("View Attendance", "go-attendance", "", true);
    }

    const shortcuts = {
      officer: [
        ["periods", "Payroll Periods", "Create and manage pay periods"],
        ["payroll", "Payroll Processing", "Generate and submit payroll"],
        ["payments", "Payments", "Record and review payments"]
      ],
      finance: [
        ["review", "Payroll Review", "Approve submitted payroll"],
        ["budgets", "Project Budgets", "Review and approve budgets"],
        ["expenses", "Project Expenses", "Track project spending"]
      ],
      hr: [
        ["workers", "Worker Directory", "Browse worker records"],
        ["attendance", "Verified Attendance", "View verified attendance"]
      ]
    }[role] || [];

    const quick = panel("Quick access",
      "<div class='grid sm:grid-cols-2 xl:grid-cols-3 gap-3 p-5'>" + shortcuts.map(item =>
        "<button type='button' data-nav='" + esc(item[0]) +
        "' class='flex items-center gap-3 text-left p-4 rounded-lg border border-[#e1ded8] bg-[#faf9f7] hover:border-[#efb600] hover:bg-white transition'>" +
        "<span class='w-10 h-10 rounded-lg bg-[#26343e] text-[#efb600] flex items-center justify-center shrink-0'>" + icon(item[0]) + "</span>" +
        "<span class='min-w-0'><strong class='block text-sm'>" + esc(item[1]) + "</strong>" +
        "<span class='block text-xs text-slate-500'>" + esc(item[2]) + "</span></span></button>"
      ).join("") + "</div>"
    );

    return "<section class='bg-white border border-[#e1ded8] border-l-4 border-l-[#efb600] rounded-xl shadow-sm p-6 flex flex-wrap items-center justify-between gap-4'>" +
      "<div><p class='text-xs uppercase font-bold tracking-widest text-[#a77d00]'>" + esc(config.title) + "</p>" +
      "<h2 class='font-extrabold text-xl mt-3'>Welcome back, " + esc(state.user?.name || "User") + "</h2>" +
      "<p class='text-sm text-slate-500 mt-2 max-w-2xl'>" + esc(message) + "</p></div>" + action + "</section>" +
      "<div class='grid grid-cols-2 xl:grid-cols-4 gap-4'>" +
      metrics.map(row => metric(row[0], row[1], row[2], row[3])).join("") + "</div>" + quick;
  }

  function payrollTable(review = false) {
    return table(
      ["Worker", "Period", "Gross", "Deductions", "Net Pay", "Status", "Actions"],
      data("payroll"),
      record => {
        let actions = button("Details", "details", record.id);
        if (review && record.payroll_status === "For Approval") {
          actions += button("Approve", "approve-payroll", record.id, true);
        }
        if (role === "officer" && record.payroll_status === "Draft") {
          actions += button("Add Item", "new-item", record.id);
          actions += button("Submit", "submit-payroll", record.id, true);
        }
        if (role === "officer" && record.payroll_status === "Approved") {
          actions += button("Record Payment", "payment", record.id, true);
        }
        return [
          "<strong>" + esc(record.worker_name) + "</strong><p class='text-slate-500'>" + esc(record.worker_code) + "</p>",
          esc(record.period_name),
          money(record.gross_pay),
          money(record.total_deductions),
          "<strong>" + money(record.net_pay) + "</strong>",
          badge(record.payroll_status),
          "<div class='flex flex-wrap gap-1'>" + actions + "</div>"
        ];
      }
    );
  }

  function pageContent() {
    switch (state.page) {
      case "dashboard": return dashboardView();
      case "periods":
        return panel("Payroll Periods", table(
          ["Period", "Start", "End", "Payment Date", "Status", "Records"], data("periods"),
          r => ["<strong>" + esc(r.period_name) + "</strong>", date(r.start_date),
            date(r.end_date), date(r.payment_date), badge(r.period_status), esc(r.record_count)]
        ));
      case "payroll": return panel("Payroll Processing", payrollTable());
      case "review": return panel("Payroll Review Queue", payrollTable(true));
      case "rates":
        return panel("Worker Pay Rates", table(
          ["Worker", "Type", "Rate", "Effective", "End Date", "Action"], data("rates"),
          r => ["<strong>" + esc(r.worker_name) + "</strong>", badge(r.pay_type),
            money(r.pay_rate), date(r.effective_date), date(r.end_date),
            r.end_date ? "—" : button("Close Rate", "close-rate", r.id)]
        ));
      case "payments":
        return panel("Recorded Payments", table(
          ["Reference", "Worker", "Period", "Amount", "Method", "Date", "Status"], data("payments"),
          r => [esc(r.payment_reference), esc(r.worker_name), esc(r.period_name), money(r.payment_amount),
            esc(r.payment_method), date(r.payment_date), badge(r.payment_status)]
        ));
      case "budgets":
        return panel("Project Budgets", table(
          ["Budget", "Project", "Category", "Amount", "Status", "Action"], data("budgets"),
          r => ["<strong>" + esc(r.budget_name) + "</strong>", esc(r.project_name),
            esc(r.budget_category), money(r.allocated_amount), badge(r.budget_status),
            role === "finance" && r.budget_status === "Draft"
              ? button("Approve Budget", "approve-budget", r.id, true) : "—"]
        ));
      case "expenses":
        return panel("Project Expenses", table(
          ["Expense", "Project", "Category", "Amount", "Date", "Payment Status"], data("expenses"),
          r => ["<strong>" + esc(r.expense_description) + "</strong><p class='text-slate-500'>" +
            esc(r.expense_code) + "</p>", esc(r.project_name), esc(r.expense_category),
            money(r.expense_amount), date(r.expense_date), badge(r.payment_status)]
        ));
      case "workers":
        return panel("Worker Directory", table(
          ["Worker Code", "Worker Name", "Employment", "Hire Date", "Status"], data("workers"),
          r => ["<strong>" + esc(r.worker_code) + "</strong>",
            esc((r.first_name || "") + " " + (r.last_name || "")),
            esc(r.employment_type), date(r.hire_date), badge(r.employment_status)]
        ));
      case "attendance":
        return panel("Verified Attendance", table(
          ["Worker", "Date", "Attendance", "Hours", "Verification"], data("attendance"),
          r => ["<strong>" + esc(r.worker_name) + "</strong>", date(r.attendance_date),
            badge(r.attendance_status), esc(r.total_work_hours), badge(r.verification_status)]
        ));
      case "reports": {
        const report = state.data.reports || {};
        return panel("Payroll Status Summary", table(
          ["Status", "Records", "Gross", "Deductions", "Net"], report.byStatus || [],
          r => [badge(r.status), esc(r.records), money(r.gross), money(r.deductions), money(r.net)]
        )) + panel("Payroll Period Summary", table(
          ["Period", "Status", "Workers", "Gross", "Net"], report.byPeriod || [],
          r => [esc(r.period_name), badge(r.period_status), esc(r.workers), money(r.gross), money(r.net)]
        )) + panel("Project Expenses by Project", table(
          ["Project", "Total Expenses"], report.spending || [],
          r => [esc(r.project_name), money(r.total_expenses)]
        ));
      }
      case "payslips":
        return panel("My Paid Payslips", table(
          ["Period", "Start", "End", "Gross", "Deductions", "Net", "Action"], data("payslips"),
          r => [esc(r.period_name), date(r.start_date), date(r.end_date),
            money(r.gross_pay), money(r.total_deductions),
            "<strong>" + money(r.net_pay) + "</strong>",
            button("View Payslip", "view-payslip", r.id)]
        ), "Read-only: only your own fully paid payroll records are displayed.");
      default: return "";
    }
  }

  const PAGE_ACTIONS = {
    officer: {
      periods: [["New Payroll Period", "new-period"]],
      payroll: [["Generate Payroll", "generate"]],
      rates: [["Set Pay Rate", "new-rate"]],
      payments: [["Record Payment", "payment"]]
    },
    finance: {},
    hr: {},
    worker: {}
  };

  function input(name, label, type = "text", value = "", required = true) {
    return "<label class='block text-xs font-semibold'><span class='block mb-2'>" + esc(label) +
      "</span><input name='" + esc(name) + "' type='" + esc(type) +
      "' value='" + esc(value) + "' " + (required ? "required " : "") +
      (type === "number" ? "min='0' step='0.01' " : "") +
      "class='w-full bg-white border border-[#d7d5cf] rounded-lg px-3 py-3 outline-none focus:border-[#efb600]'></label>";
  }

  function select(name, label, choices, selected = "") {
    return "<label class='block text-xs font-semibold'><span class='block mb-2'>" + esc(label) +
      "</span><select name='" + esc(name) +
      "' required class='w-full bg-white border border-[#d7d5cf] rounded-lg px-3 py-3 outline-none focus:border-[#efb600]'>" +
      (choices.length ? choices.map(item =>
        "<option value='" + esc(item[0]) + "' " +
        (String(item[0]) === String(selected) ? "selected" : "") + ">" +
        esc(item[1]) + "</option>"
      ).join("") : "<option value=''>No available records</option>") +
      "</select></label>";
  }

  function workerOptions() {
    return data("workers")
      .filter(record => record.employment_status === "Active")
      .map(record => [record.id, (record.first_name || "") + " " + (record.last_name || "")]);
  }

  function periodOptions() {
    return data("periods")
      .filter(record => ["Open", "Processing"].includes(record.period_status))
      .map(record => [record.id, record.period_name]);
  }

  function payrollOptions() {
    return data("payroll")
      .filter(record => record.payroll_status === "Approved")
      .map(record => [record.id, record.worker_name + " — " + record.period_name]);
  }

  function formFields(action, record = {}) {
    switch (action) {
      case "new-period":
        return input("period_name", "Period Name") +
          input("start_date", "Start Date", "date") +
          input("end_date", "End Date", "date") +
          input("payment_date", "Scheduled Payment Date", "date", "", false);
      case "new-rate":
        return select("worker_id", "Worker", workerOptions()) +
          select("pay_type", "Pay Type", [["Hourly", "Hourly"], ["Daily", "Daily"], ["Monthly", "Monthly"]]) +
          input("pay_rate", "Pay Rate (PHP)", "number") +
          input("effective_date", "Effective Date", "date") +
          input("end_date", "End Date", "date", "", false);
      case "close-rate":
        return input("end_date", "Close Rate On", "date");
      case "generate":
        return select("payroll_period_id", "Payroll Period", periodOptions()) +
          select("worker_id", "Worker", workerOptions()) +
          input("basic_pay", "Approved Basic Pay (for Monthly rates)", "number", "", false);
      case "new-item":
        return select("item_type", "Item Type", [["Earning", "Earning / Allowance"], ["Deduction", "Deduction"]]) +
          input("item_name", "Item Name") +
          input("amount", "Amount (PHP)", "number") +
          input("description", "Description", "text", "", false);
      case "payment":
        return select("payroll_record_id", "Approved Payroll", payrollOptions(), record.id || "") +
          input("payment_amount", "Payment Amount (PHP)", "number") +
          select("payment_method", "Payment Method", [
            ["Cash", "Cash"], ["Bank Transfer", "Bank Transfer"],
            ["E-Wallet", "E-Wallet"], ["Check", "Check"]
          ]) + input("remarks", "Remarks", "text", "", false);
      default: return "";
    }
  }

  async function ensureData(keys) {
    for (const key of keys) {
      if (!state.data[key]) state.data[key] = await api("/" + key);
    }
  }

  async function openForm(action, record = {}) {
    const required = {
      "new-rate": ["workers"],
      generate: ["workers", "periods"],
      payment: ["payroll"]
    };
    await ensureData(required[action] || []);
    state.modalAction = action;
    state.modalRecord = record;
    $("modalTitle").textContent = action.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    $("modalFields").innerHTML = formFields(action, record);
    $("saveModal").hidden = false;
    $("modal").hidden = false;
  }

  function showDetails(title, html) {
    state.modalAction = null;
    state.modalRecord = null;
    $("modalTitle").textContent = title;
    $("modalFields").innerHTML = "<div class='col-span-full space-y-3 text-sm'>" + html + "</div>";
    $("saveModal").hidden = true;
    $("modal").hidden = false;
  }

  function closeModal() {
    state.modalAction = null;
    state.modalRecord = null;
    if ($("modal")) $("modal").hidden = true;
  }

  async function saveForm(event) {
    event.preventDefault();
    const action = state.modalAction;
    const record = state.modalRecord || {};
    const body = Object.fromEntries(new FormData(event.currentTarget));
    let path;
    let method = "POST";

    switch (action) {
      case "new-period":
        path = "/periods";
        body.payment_date ||= null;
        break;
      case "new-rate":
        path = "/rates";
        body.worker_id = Number(body.worker_id);
        body.pay_rate = Number(body.pay_rate);
        body.end_date ||= null;
        break;
      case "close-rate":
        path = "/rates/" + record.id + "/close";
        method = "PATCH";
        break;
      case "generate":
        path = "/payroll";
        body.worker_id = Number(body.worker_id);
        body.payroll_period_id = Number(body.payroll_period_id);
        if (!body.basic_pay) delete body.basic_pay;
        break;
      case "new-item":
        path = "/payroll/" + record.id + "/items";
        body.amount = Number(body.amount);
        break;
      case "payment":
        path = "/payments";
        body.payroll_record_id = Number(body.payroll_record_id);
        body.payment_amount = Number(body.payment_amount);
        break;
      default:
        toast("Unsupported form action", true);
        return;
    }

    const submit = $("saveModal");
    submit.disabled = true;
    try {
      await api(path, method, body);
      closeModal();
      toast("Saved successfully");
      await loadPage();
    } catch (error) {
      toast(error.message, true);
    } finally {
      submit.disabled = false;
    }
  }

  async function showPayroll(id) {
    const record = await api("/payroll/" + id);
    const itemsHtml = (record.items || []).map(item =>
      "<div class='flex flex-wrap gap-2 justify-between border-b py-2'>" +
      "<span>" + esc(item.item_type) + " — " + esc(item.item_name) + "</span>" +
      "<span>" + money(item.amount) + "</span>" +
      (role === "officer" && record.payroll_status === "Draft"
        ? button("Remove", "remove-item", item.id) : "") + "</div>"
    ).join("") || "<p class='text-slate-500'>No additional items.</p>";
    const paymentsHtml = (record.payments || []).map(payment =>
      "<div class='flex justify-between border-b py-2'><span>" + esc(payment.payment_reference) +
      "</span><span>" + money(payment.payment_amount) + "</span></div>"
    ).join("") || "<p class='text-slate-500'>No payments recorded.</p>";

    showDetails("Payroll #" + record.id,
      "<h3 class='font-bold text-lg'>" + esc(record.worker_name) + " — " + esc(record.period_name) + "</h3>" +
      "<p>Status: " + badge(record.payroll_status) + "</p>" +
      "<p>Basic Pay: " + money(record.basic_pay) + "</p>" +
      "<p>Gross Pay: " + money(record.gross_pay) + "</p>" +
      "<p>Deductions: " + money(record.total_deductions) + "</p>" +
      "<p class='font-extrabold'>Net Pay: " + money(record.net_pay) + "</p>" +
      "<h4 class='font-bold pt-4'>Earnings and Deductions</h4>" + itemsHtml +
      "<h4 class='font-bold pt-4'>Payments</h4>" + paymentsHtml +
      (/Approved|Paid/i.test(String(record.payroll_status || "")) ? printButton() : "")
    );
    state.printRecord = record;
  }

  function showPayslip(id) {
    const record = find("payslips", id);
    if (!record) return;
    const lines = [
      ["Basic Pay", record.basic_pay],
      ["Overtime Pay", record.overtime_pay],
      ["Other Earnings", record.allowances],
      ["Gross Pay", record.gross_pay],
      ["Deductions", record.total_deductions],
      ["Net Pay", record.net_pay]
    ];
    showDetails("Payslip — " + record.period_name,
      "<p class='font-extrabold text-xl'>BUILDORA</p>" +
      "<p class='text-slate-500'>" + date(record.start_date) + " to " + date(record.end_date) + "</p>" +
      "<div class='grid grid-cols-2 gap-3 border-y py-4'>" + lines.map(item =>
        "<span>" + esc(item[0]) + "</span><strong class='text-right'>" + money(item[1]) + "</strong>"
      ).join("") + "</div>" +
      (record.items || []).map(item =>
        "<p class='flex justify-between'><span>" + esc(item.item_type) + ": " +
        esc(item.item_name) + "</span><strong>" + money(item.amount) + "</strong></p>"
      ).join("") +
      "<p class='text-xs text-slate-500 pt-3'>This payslip is read-only.</p>" +
      printButton()
    );
    state.printRecord = record;
  }

  function printButton() {
    return "<div class='flex justify-end pt-4'>" + button("Print Payslip", "print-payslip", "", true) + "</div>";
  }

  function printPayslip() {
    const record = state.printRecord;
    if (!record) return;

    const summary = [
      ["Basic Pay", record.basic_pay],
      ["Overtime Pay", record.overtime_pay],
      ["Other Earnings", record.allowances],
      ["Gross Pay", record.gross_pay],
      ["Total Deductions", record.total_deductions]
    ].filter(item => item[1] !== undefined && item[1] !== null);

    const summaryRows = summary.map(item =>
      "<tr><td>" + esc(item[0]) + "</td><td class='r'>" + money(item[1]) + "</td></tr>"
    ).join("");
    const itemRows = (record.items || []).map(item =>
      "<tr><td>" + esc(item.item_type) + ": " + esc(item.item_name) + "</td><td class='r'>" + money(item.amount) + "</td></tr>"
    ).join("");
    const paymentRows = (record.payments || []).map(payment =>
      "<tr><td>" + esc(payment.payment_reference) +
      (payment.payment_method ? " — " + esc(payment.payment_method) : "") +
      "</td><td class='r'>" + money(payment.payment_amount) + "</td></tr>"
    ).join("");
    const workerName = record.worker_name || state.user?.name || "";
    const periodDates = record.start_date
      ? date(record.start_date) + " to " + date(record.end_date)
      : "";
    const printedOn = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

    const html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Payslip</title><style>" +
      "*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,Helvetica,sans-serif;color:#26343e;margin:0;padding:32px;font-size:13px}" +
      ".head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #efb600;padding-bottom:14px;margin-bottom:20px}" +
      ".brand{font-size:26px;font-weight:800;letter-spacing:1px}.sub{font-size:11px;color:#6b7a86;letter-spacing:2px;text-transform:uppercase}" +
      ".title{font-size:18px;font-weight:700;text-align:right}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}" +
      ".meta div{margin:0}.lbl{font-size:11px;color:#6b7a86;text-transform:uppercase;letter-spacing:1px}" +
      ".val{font-size:14px;font-weight:700;margin-top:3px}h4{margin:22px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7a86}" +
      "table{width:100%;border-collapse:collapse}td{padding:8px 4px;border-bottom:1px solid #e3e0da}.r{text-align:right}" +
      ".net{margin-top:20px;padding:14px 16px;background:#26343e;color:#fff;display:flex;justify-content:space-between;font-size:16px;font-weight:700}" +
      ".net span:last-child{color:#efb600}.sign{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:70px}" +
      ".line{border-top:1px solid #26343e;padding-top:6px;text-align:center;font-size:12px}.foot{margin-top:30px;font-size:11px;color:#6b7a86;text-align:center}" +
      "@media print{body{padding:0}}</style></head><body>" +
      "<div class='head'><div><div class='brand'><span style='display:inline-block;width:14px;height:26px;margin-right:10px;vertical-align:-3px;border-radius:2px;background:repeating-linear-gradient(135deg,#efb600 0 5px,#111 5px 10px)'></span>BUILDORA</div><div class='sub'>Payroll &amp; Finance</div></div><div class='title'>PAYSLIP</div></div>" +
      "<div class='meta'><div><div class='lbl'>Employee</div><div class='val'>" + esc(workerName) + "</div></div>" +
      "<div><div class='lbl'>Pay Period</div><div class='val'>" + esc(record.period_name) + "</div>" +
      (periodDates ? "<div>" + periodDates + "</div>" : "") + "</div></div>" +
      "<h4>Summary</h4><table>" + summaryRows + "</table>" +
      (itemRows ? "<h4>Earnings and Deductions</h4><table>" + itemRows + "</table>" : "") +
      (paymentRows ? "<h4>Payment</h4><table>" + paymentRows + "</table>" : "") +
      "<div class='net'><span>Net Pay</span><span>" + money(record.net_pay) + "</span></div>" +
      "<div class='sign'><div class='line'>Employee Signature</div><div class='line'>Payroll Officer</div></div>" +
      "<p class='foot'>Printed on " + esc(printedOn) + "</p></body></html>";

    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    frame.contentWindow.onafterprint = () => frame.remove();
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }, 250);
    setTimeout(() => frame.remove(), 120000);
  }

  async function actionHandler(action, id) {
    try {
      if (action === "print-payslip") return printPayslip();
      if (action === "go-review") return loadPage("review");
      if (action === "go-attendance") return loadPage("attendance");
      if (action === "details") return showPayroll(id);
      if (action === "view-payslip") return showPayslip(id);

      if (action === "remove-item") {
        if (!confirm("Remove this payroll item?")) return;
        await api("/payroll/items/" + id, "DELETE");
        closeModal();
        toast("Payroll item removed");
        return loadPage();
      }
      if (action === "submit-payroll") {
        if (!confirm("Submit this payroll for Finance Manager approval?")) return;
        await api("/payroll/" + id + "/submit", "POST");
        toast("Payroll submitted for approval");
        return loadPage();
      }
      if (action === "approve-payroll") {
        if (!confirm("Approve this payroll?")) return;
        await api("/payroll/" + id + "/approve", "POST");
        toast("Payroll approved");
        return loadPage();
      }
      if (action === "approve-budget") {
        if (!confirm("Approve this project budget?")) return;
        await api("/budgets/" + id + "/approve", "POST");
        toast("Project budget approved");
        return loadPage();
      }

      const record = action === "new-item" ? find("payroll", id)
        : action === "close-rate" ? find("rates", id)
          : action === "payment" ? find("payroll", id)
            : null;
      return openForm(action, record || {});
    } catch (error) {
      toast(error.message, true);
    }
  }

  function render() {
    const current = config.pages.find(item => item[0] === state.page);
    $("pageTitle").textContent = current ? current[1] : "Dashboard";
    $("userName").textContent = state.user?.name || "User";
    $("userAvatar").textContent = String(state.user?.name || "U").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

    document.querySelectorAll("#sidebar [data-nav]").forEach(element => {
      const selected = element.dataset.nav === state.page;
      element.classList.toggle("bg-[#3b4b55]", selected);
      element.classList.toggle("text-white", selected);
      element.classList.toggle("text-slate-300", !selected);
      element.classList.toggle("border-[#efb600]", selected);
      element.classList.toggle("border-transparent", !selected);
    });

    const actions = PAGE_ACTIONS[role][state.page] || [];
    $("pageActions").innerHTML = actions.map(item =>
      button(item[0], item[1], "", true)
    ).join("");
    $("toolbar").hidden = state.page === "dashboard";
    $("content").innerHTML = pageContent();

    const stats = state.data.dashboard?.stats || {};
    const notifications = [];
    if (role === "finance" && Number(stats.pending_approval) > 0) {
      notifications.push(stats.pending_approval + " payroll records awaiting review");
    }
    if (role === "hr" && Number(stats.pending_attendance) > 0) {
      notifications.push(stats.pending_attendance + " attendance records pending Workforce verification");
    }
    $("notificationCount").textContent = notifications.length;
    $("notificationCount").hidden = notifications.length === 0;
    $("notificationList").innerHTML = notifications.length
      ? notifications.map(text => "<p class='p-3 border-b text-xs'>" + esc(text) + "</p>").join("")
      : "<p class='p-3 text-xs text-slate-500'>No new alerts.</p>";
  }

  function shell() {
    const navigation = config.pages.map(item =>
      "<button type='button' data-nav='" + esc(item[0]) +
      "' class='flex items-center gap-3 w-full text-left text-sm text-slate-300 px-3 py-2.5 rounded-r-lg rounded-l-sm border-l-4 border-transparent hover:bg-[#2c3e4c] hover:text-white transition-colors'>" +
      icon(item[0]) + "<span>" + esc(item[1]) + "</span></button>"
    ).join("");

    $("app").innerHTML =
      "<div id='overlay' hidden class='fixed inset-0 bg-black/50 z-30 lg:hidden'></div>" +
      "<aside id='sidebar' class='fixed inset-y-0 left-0 z-40 w-[225px] flex flex-col bg-[#1f2d3a] text-white -translate-x-full lg:translate-x-0 transition-transform'>" +
      "<div class='flex items-center gap-3 px-6 pt-6 pb-2'><span class='w-4 h-8 rounded-sm shrink-0' style='background:repeating-linear-gradient(135deg,#efb600 0 5px,#111 5px 10px)'></span><strong class='text-2xl font-extrabold tracking-wide'>BUILDORA</strong></div>" +
      "<p class='text-[10px] uppercase tracking-widest text-slate-400 px-6 mb-5'>Payroll &amp; Finance</p>" +
      "<nav class='flex-1 px-3 space-y-1 overflow-auto'>" + navigation + "</nav>" +
      "<button type='button' id='logout' class='flex items-center gap-3 border-t border-[#34475a] px-6 py-5 text-left text-sm text-slate-300 hover:bg-[#2c3e4c] hover:text-white transition-colors'>" +
      icon("logout") + "Sign Out</button>" +
      "</aside>" +
      "<div class='min-h-screen lg:ml-[225px]'>" +
      "<header class='flex flex-wrap items-center justify-between px-5 md:px-8 pt-7 pb-5 gap-4'>" +
      "<div class='flex gap-3 items-center'><button type='button' id='menu' aria-label='Open menu' class='lg:hidden bg-white border border-[#e1ded8] rounded-lg w-10 h-10 flex items-center justify-center'>" + icon("menu") + "</button>" +
      "<div><h1 id='pageTitle' class='text-2xl md:text-3xl font-extrabold'>Dashboard</h1>" +
      "<p class='text-xs text-slate-500 mt-1'>BUILDORA Payroll &amp; Finance Management</p></div></div>" +
      "<div class='flex gap-3 items-center'><div class='relative'>" +
      "<button type='button' id='bell' aria-label='Notifications' class='w-10 h-10 bg-white border border-[#e1ded8] rounded-lg flex items-center justify-center text-slate-600 hover:bg-[#f1efea] transition-colors'>" + icon("bell") + "</button>" +
      "<span id='notificationCount' hidden class='absolute -top-1.5 -right-1.5 min-w-[18px] text-center text-[10px] font-bold bg-[#efb600] text-[#26343e] px-1 rounded-full'>0</span>" +
      "<div id='notificationPopover' hidden class='absolute top-12 right-0 z-50 w-72 bg-white border border-[#e1ded8] rounded-xl shadow-lg overflow-hidden'>" +
      "<strong class='block p-3 border-b text-sm'>Notifications</strong><div id='notificationList'></div></div></div>" +
      "<div class='flex items-center gap-3'><span id='userAvatar' class='w-10 h-10 rounded-full bg-[#efb600] text-[#26343e] flex items-center justify-center text-sm font-bold'>U</span>" +
      "<div class='text-right hidden sm:block'><strong id='userName' class='block text-sm'>User</strong>" +
      "<span class='block text-xs text-slate-500'>" + esc(config.title) + "</span></div></div></div></header>" +
      "<main class='px-5 md:px-8 pb-10 max-w-[1550px] mx-auto'>" +
      "<div id='toolbar' hidden class='flex flex-wrap justify-between items-center gap-3 mb-4'>" +
      "<input id='search' type='search' placeholder='Search records...' class='w-[245px] max-w-full bg-white border border-[#d7d5cf] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#efb600]'>" +
      "<div id='pageActions' class='flex flex-wrap gap-2'></div></div>" +
      "<div id='content' class='grid gap-4'></div></main></div>" +
      "<div id='modal' hidden class='fixed inset-0 z-[100] bg-[#14202a]/70 overflow-auto p-4 md:p-10'>" +
      "<div role='dialog' aria-modal='true' aria-labelledby='modalTitle' class='max-w-2xl mx-auto bg-white border border-[#e1ded8] rounded-xl shadow-xl overflow-hidden'>" +
      "<header class='flex items-center justify-between px-6 py-5 border-b'><h2 id='modalTitle' class='text-lg font-bold'></h2>" +
      "<button type='button' id='closeModal' aria-label='Close' class='text-2xl text-slate-500 hover:text-slate-800'>×</button></header>" +
      "<form id='modalForm'><div id='modalFields' class='grid md:grid-cols-2 gap-4 p-6'></div>" +
      "<footer class='flex justify-end gap-2 px-6 pb-6'>" +
      "<button type='button' id='cancelModal' class='border border-[#d7d5cf] rounded-lg px-4 py-2 text-sm hover:bg-[#f1efea]'>Close</button>" +
      "<button type='submit' id='saveModal' class='bg-[#efb600] hover:bg-[#d9a400] rounded-lg px-5 py-2 text-sm font-bold'>Save</button>" +
      "</footer></form></div></div><div id='toast' hidden></div>";

    $("menu").onclick = () => {
      $("sidebar").classList.remove("-translate-x-full");
      $("overlay").hidden = false;
    };
    $("overlay").onclick = () => {
      $("sidebar").classList.add("-translate-x-full");
      $("overlay").hidden = true;
    };
    $("bell").onclick = () => {
      $("notificationPopover").hidden = !$("notificationPopover").hidden;
    };
    $("closeModal").onclick = closeModal;
    $("cancelModal").onclick = closeModal;
    $("modalForm").onsubmit = saveForm;
    $("search").oninput = event => {
      state.search = event.target.value;
      $("content").innerHTML = pageContent();
    };
    $("logout").onclick = async () => {
      try {
        const response = await fetch("/api/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: { "X-CSRF-Token": state.token }
        });
        if (!response.ok) throw new Error("Logout failed");
        location.assign("/login");
      } catch (error) {
        toast(error.message, true);
      }
    };
    $("app").addEventListener("click", event => {
      const nav = event.target.closest("[data-nav]");
      if (nav) return loadPage(nav.dataset.nav);
      const action = event.target.closest("[data-action]");
      if (action) return actionHandler(action.dataset.action, action.dataset.id);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeModal();
        $("notificationPopover").hidden = true;
      }
    });
  }

  async function start() {
    try {
      const response = await fetch(API + "/me", { credentials: "same-origin" });
      if (response.status === 401) {
        location.assign("/login");
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not authenticate");
      }
      state.user = result.data;
      state.token = result.data.csrfToken;
      if (!state.user.roles?.includes(config.title)) {
        throw new Error("Your account is not authorized for this dashboard");
      }
      shell();
      await loadPage();
    } catch (error) {
      $("app").innerHTML = "<div class='max-w-lg mx-auto mt-20 bg-white border p-8'>" +
        "<h2 class='font-bold text-xl'>Unable to load BUILDORA</h2>" +
        "<p class='text-red-700 mt-3'>" + esc(error.message) + "</p>" +
        "<a class='text-[#a77d00] inline-block mt-5' href='/login'>Return to Login</a></div>";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();