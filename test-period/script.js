const GAS_URL = RED.GAS_URL;
const SCHOOLS = ["我孫子中","我孫子第二中","我孫子第三中","白山中","湖北台中","湖北中","その他"];
const GRADES = ["中学1年","中学2年","中学3年"];
const PERIODS = {
  2:["④","⑤","⑥","⑦","⑧"], 3:["③","④","⑤","⑥","⑦"],
  4:["④","⑤","⑥","⑦","⑧"], 5:["③","④","⑤","⑥","⑦"], 6:["①","②","③","④","⑤"]
};
const TIMES = {
  "①":"15:00～15:40","②":"15:45～16:25","③":"16:30～17:10","④":"17:15～17:55",
  "⑤":"18:00～18:40","⑥":"18:45～19:25","⑦":"19:30～20:10","⑧":"20:15～20:55"
};
const $ = id => document.getElementById(id);
const esc = RED.escapeHtml;
let current = null;
let testPeriodConfigs = [];
let configsLoaded = false;
let configLoadError = false;

$("school").innerHTML = '<option value="">学校を選択</option>' + SCHOOLS.map(s => '<option>'+esc(s)+'</option>').join("");
$("grade").innerHTML = '<option value="">学年を選択</option>' + GRADES.map(s => '<option>'+esc(s)+'</option>').join("");

function setConfigMessage(message, isError = false) {
  $("configMessage").textContent = message;
  $("configMessage").classList.toggle("error", isError);
}

function loadTestPeriodConfigs() {
  setConfigMessage("学校・学年ごとのテスト日を読み込んでいます…");
  const script = document.createElement("script");
  script.async = true;
  script.src = GAS_URL + "?action=test_period_config&callback=redTestPeriodConfigCallback&_=" + Date.now();
  script.onerror = () => {
    configLoadError = true;
    configsLoaded = true;
    setConfigMessage("テスト日を読み込めませんでした。時間をおいて再読み込みしてください。", true);
  };
  document.body.appendChild(script);
}

window.redTestPeriodConfigCallback = function(result) {
  configsLoaded = true;
  configLoadError = false;
  testPeriodConfigs = result && result.success && Array.isArray(result.configs) ? result.configs : [];
  if (!result || !result.success) {
    configLoadError = true;
    setConfigMessage((result && result.message) || "テスト日を読み込めませんでした。", true);
    return;
  }
  applySelectedConfig();
};

function localIsoDate(date) {
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}

function addDays(isoDate, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate || "");
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
}

function applySelectedConfig() {
  const school = $("school").value;
  const grade = $("grade").value;
  $("testDateDisplay").value = "";
  $("startDate").value = "";
  $("calendarWrap").innerHTML = "";

  if (!school || !grade) {
    setConfigMessage("学校名と学年を選択してください。");
    return;
  }
  if (!configsLoaded) {
    setConfigMessage("学校・学年ごとのテスト日を読み込んでいます…");
    return;
  }
  if (configLoadError) return;

  const config = testPeriodConfigs.find(item => item.school === school && item.grade === grade);
  if (!config) {
    setConfigMessage("この学校・学年のテスト日が設定されていません。教室でスプレッドシートに登録してください。", true);
    return;
  }

  const calculatedStart = addDays(config.testDate, -14);
  if (!calculatedStart || config.startDate !== calculatedStart) {
    setConfigMessage("テスト日の設定が正しくありません。スプレッドシートの日付を確認してください。", true);
    return;
  }

  $("testDateDisplay").value = config.testDate;
  $("startDate").value = calculatedStart;
  setConfigMessage("テスト日の14日前から14日間の予定を表示しています。");
  render();
}

function render() {
  const start = $("startDate").value;
  if (!start) {
    $("calendarWrap").innerHTML = "";
    return;
  }

  const parts = start.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const weekdays = ["日","月","火","水","木","金","土"];
  const allPeriods = ["①","②","③","④","⑤","⑥","⑦","⑧"];
  let html = '<div class="calendar-days">';

  for (let i = 0; i < 14; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    const key = x.getDay();
    const ds = localIsoDate(x);
    const available = PERIODS[key] || [];
    const dateLabel = (x.getMonth()+1)+'/'+x.getDate();
    const dayClass = key === 0 || key === 1 ? ' closed-day' : (key === 6 ? ' saturday' : ' weekday');
    html += '<section class="day-row'+dayClass+'">';
    html += '<div class="day-date"><span class="date-number">'+dateLabel+'</span><span class="date-weekday">（'+weekdays[key]+'）</span></div>';

    if (!available.length) {
      html += '<div class="closed-label">休講</div>';
    } else {
      html += '<div class="day-periods">';
      available.forEach(p => {
        html += '<label class="day-period"><span class="day-period-name">'+p+'</span><span class="day-period-time">'+TIMES[p]+'</span><input type="checkbox" data-date="'+ds+'" data-period="'+p+'" aria-label="'+dateLabel+' '+p+' '+TIMES[p]+'"></label>';
      });
      html += '</div>';
    }
    html += '</section>';
  }

  html += '</div>';
  $("calendarWrap").innerHTML = html;
}

$("school").addEventListener("change", applySelectedConfig);
$("grade").addEventListener("change", applySelectedConfig);

$("form").addEventListener("submit", e => {
  e.preventDefault();
  $("error").textContent = "";

  const id = $("studentId").value.trim();
  const name = $("studentName").value.trim();
  const email = $("email").value.trim();
  const school = $("school").value;
  const grade = $("grade").value;
  const startDate = $("startDate").value;
  const selected = [...document.querySelectorAll("[data-date]:checked")].map(x => ({
    date: x.dataset.date,
    period: x.dataset.period
  }));

  if (configLoadError || !configsLoaded || !startDate) {
    $("error").textContent = "学校・学年ごとのテスト日が設定されていません。学校名と学年を確認してください。";
    return;
  }
  if (!/^\d+$/.test(id) || !name || !school || !grade || !selected.length || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    $("error").textContent = "必須項目を正しく入力し、受講コマを1つ以上選択してください。";
    return;
  }

  current = {
    action: "test_period", studentId: id, studentName: name, school: school, grade: grade,
    startDate: startDate, periods: selected, notes: $("notes").value.trim(), email: email
  };

  $("summary").innerHTML =
    '<p><b>生徒番号</b><br>'+esc(id)+'</p>' +
    '<p><b>氏名</b><br>'+esc(name)+'</p>' +
    '<p><b>学校名・学年</b><br>'+esc(school)+'・'+esc(grade)+'</p>' +
    '<p><b>テスト日・2週間の開始日</b><br>'+esc($("testDateDisplay").value)+'・'+esc(startDate)+'</p>' +
    '<p><b>受講コマ</b><br>'+selected.map(x => esc(x.date)+' '+esc(x.period)+' '+TIMES[x.period]).join("<br>")+'</p>' +
    '<p><b>連絡事項</b><br>'+esc(current.notes || "なし")+'</p>' +
    '<p><b>メールアドレス</b><br>'+esc(email)+'</p>';

  $("form").classList.add("hidden");
  $("confirm").classList.remove("hidden");
  window.scrollTo(0, 0);
});

$("back").onclick = () => {
  $("confirm").classList.add("hidden");
  $("form").classList.remove("hidden");
};

$("submit").onclick = async () => {
  if (!current) return;
  $("submit").disabled = true;
  $("loading").classList.remove("hidden");
  try {
    await fetch(GAS_URL, {
      method: "POST", mode: "no-cors",
      headers: {"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify(current)
    });
    $("confirm").classList.add("hidden");
    $("success").classList.remove("hidden");
  } catch (e) {
    alert("通信エラーが発生しました。");
    $("submit").disabled = false;
    $("loading").classList.add("hidden");
  }
};

loadTestPeriodConfigs();
