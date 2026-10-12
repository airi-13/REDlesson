(() => {
  "use strict";
  const names = {
    "v-mogi": "Vもぎ",
    "proken": "プロ検",
    "tofas": "TOFAS"
  };
  const params = new URLSearchParams(location.search);
  const examType = names[params.get("type")] || "";
  const form = document.getElementById("examForm");
  const confirmPanel = document.getElementById("confirmPanel");
  const successPanel = document.getElementById("successPanel");
  const summary = document.getElementById("summary");
  const error = document.getElementById("formError");
  const dateInput = document.getElementById("examDate");
  const submitButton = document.getElementById("submitButton");
  const loading = document.getElementById("loading");
  document.getElementById("examTypeLabel").textContent = examType || "試験が選択されていません";
  if (!examType) {
    form.querySelector('button[type="submit"]').disabled = true;
    error.textContent = "外部試験一覧から試験を選択してください。";
  }

  const val = id => (document.getElementById(id)?.value || "").trim();
  const esc = value => window.RED.escapeHtml(value);
  function showSummary() {
    const rows = [
      ["生徒番号", val("studentId")],
      ["生徒氏名", val("studentName")],
      ["外部試験", examType],
      ["受験日", val("examDate")],
      ["連絡事項", val("notes") || "なし"],
      ["メールアドレス", val("email")]
    ];
    summary.innerHTML = rows.map(([label, value]) =>
      '<div class="summary-row"><div class="summary-label">' + esc(label) +
      '</div><div>' + esc(value) + '</div></div>').join("");
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    error.textContent = "";
    document.querySelectorAll(".error").forEach(node => {
      if (node.id !== "formError") node.textContent = "";
    });
    let valid = true;
    if (!/^1139\d{5}$/.test(val("studentId"))) {
      document.getElementById("studentIdError").textContent = "生徒番号は1139で始まる9桁の半角数字で入力してください。";
      valid = false;
    }
    if (!val("studentName")) {
      document.getElementById("studentNameError").textContent = "生徒氏名を入力してください。";
      valid = false;
    }
    if (!examType) valid = false;
    if (!val("examDate")) {
      document.getElementById("examDateError").textContent = "受験日を選択してください。";
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email"))) {
      document.getElementById("emailError").textContent = "メールアドレスを正しく入力してください。";
      valid = false;
    }
    if (!valid) return;
    showSummary();
    form.classList.add("hidden");
    confirmPanel.classList.remove("hidden");
    window.scrollTo({top: 0, behavior: "smooth"});
  });

  document.getElementById("backButton").addEventListener("click", () => {
    confirmPanel.classList.add("hidden");
    form.classList.remove("hidden");
    window.scrollTo({top: 0, behavior: "smooth"});
  });

  submitButton.addEventListener("click", async () => {
    submitButton.disabled = true;
    loading.classList.remove("hidden");
    error.textContent = "";
    try {
      await window.RED.submitApplication({
        action: "external_exam",
        examType,
        examDate: val("examDate"),
        studentId: val("studentId"),
        studentName: val("studentName"),
        notes: val("notes"),
        email: val("email")
      });
      confirmPanel.classList.add("hidden");
      successPanel.classList.remove("hidden");
      window.scrollTo({top: 0, behavior: "smooth"});
    } catch (err) {
      error.textContent = err.message || "登録に失敗しました。入力内容を確認して再度お試しください。";
      submitButton.disabled = false;
    } finally {
      loading.classList.add("hidden");
    }
  });
})();