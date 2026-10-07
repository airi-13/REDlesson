const SPREADSHEET_ID = "1_luEJMbc6jKwaMppPGTHTwWpEpgJSCT5NuPgUKaAhr8";
const ABSENCE_SHEET_NAME = "申請一覧";
const PURCHASE_SHEET_NAME = "購入申請";
const ADMIN_EMAIL = "tennodai.red@gmail.com";
const TIME_ZONE = "Asia/Tokyo";
const PASSWORD = "11391";

/**
 * GitHub PagesからのGET受付。
 * callbackがあればJSONP、なければJSONを返す。
 */
function doGet(e) {
  try {
    e = e || {};
    const callback = String(e.parameter && e.parameter.callback || "").trim();
    const action = String(e.parameter && e.parameter.action || "").trim();

    let result;

    if (action === "purchase") {
      result = handlePurchaseJsonp_(e);
    } else if (e.parameter && e.parameter.data) {
      result = handleAbsenceJsonp_(e);
    } else {
      result = { success: true, message: "RED天王台教室 API は正常に動作しています。" };
    }

    if (callback) {
      return ContentService
        .createTextOutput(callback + "(" + JSON.stringify(result) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return jsonResponse_(result);

  } catch (error) {
    const result = {
      success: false,
      message: error && error.message ? error.message : "処理中にエラーが発生しました。"
    };

    const callback = String(e && e.parameter && e.parameter.callback || "").trim();

    if (callback) {
      return ContentService
        .createTextOutput(callback + "(" + JSON.stringify(result) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return jsonResponse_(result);
  }
}

/**
 * 旧Cloudflare等からのPOSTにも対応。
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({
        success: false,
        message: "データが送信されていません。"
      });
    }

    const data = JSON.parse(e.postData.contents);
    return jsonResponse_(submitApplication(data));

  } catch (error) {
    return jsonResponse_({
      success: false,
      message: error && error.message ? error.message : "処理中にエラーが発生しました。"
    });
  }
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =====================================================
   欠席・振替
===================================================== */

function handleAbsenceJsonp_(e) {
  const raw = String(e.parameter.data || "");
  if (!raw) {
    throw new Error("申請データがありません。");
  }

  let data;
  try {
    data = JSON.parse(decodeURIComponent(raw));
  } catch (error) {
    throw new Error("申請データを読み込めませんでした。");
  }

  return submitApplication(data);
}

function submitApplication(data) {
  if (!data) throw new Error("申請データがありません。");

  const studentId = String(data.studentId || "").trim();
  const studentName = String(data.studentName || "").trim();
  const absenceDate = String(data.absenceDate || "").trim();
  const absencePeriods = Array.isArray(data.absencePeriods) ? data.absencePeriods.map(String) : [];
  const makeupDate = String(data.makeupDate || "").trim();
  const makeupPeriods = Array.isArray(data.makeupPeriods) ? data.makeupPeriods.map(String) : [];
  const makeupUndecided = Boolean(data.makeupUndecided);
  const absenceRegistered = Boolean(data.absenceRegistered);
  const notes = String(data.notes || "").trim();
  const email = String(data.email || "").trim();

  if (!/^\d+$/.test(studentId)) throw new Error("生徒番号は半角数字で入力してください。");
  if (!studentName) throw new Error("生徒氏名を入力してください。");
  if (!absenceDate) throw new Error("欠席希望日を選択してください。");
  if (!absencePeriods.length) throw new Error("欠席する時間を選択してください。");
  if (!isValidEmail_(email)) throw new Error("メールアドレスの形式が正しくありません。");

  const absenceCheck = checkDateAndPeriods_(absenceDate, absencePeriods);
  if (!absenceCheck.valid) throw new Error(absenceCheck.message);

  if (!absenceRegistered && !isAbsenceDeadlineValid_(absenceDate, absencePeriods)) {
    throw new Error("授業開始5分前を過ぎたコマは欠席申請できません。");
  }

  let storedMakeupDate = "";
  let storedMakeupPeriods = "";

  if (makeupUndecided) {
    storedMakeupDate = "未定";
    storedMakeupPeriods = "未定";
  } else {
    if (!makeupDate) throw new Error("振替希望日を選択してください。");
    if (!makeupPeriods.length) throw new Error("振替希望時間を選択してください。");

    if (makeupPeriods.length !== absencePeriods.length) {
      throw new Error("欠席するコマ数と振替するコマ数を同じにしてください。");
    }

    const rangeCheck = checkMakeupDateWithinFourWeeks_(absenceDate, makeupDate);
    if (!rangeCheck.valid) throw new Error(rangeCheck.message);

    const makeupCheck = checkDateAndPeriods_(makeupDate, makeupPeriods);
    if (!makeupCheck.valid) throw new Error(makeupCheck.message);

    storedMakeupDate = formatJapaneseDate_(makeupDate);
    storedMakeupPeriods = getPeriodText_(makeupPeriods);
  }

  const storedAbsenceDate = formatJapaneseDate_(absenceDate);
  const storedAbsencePeriods = getPeriodText_(absencePeriods);

  let mailSuccess = true;

  const body =
    "欠席・振替申請を受け付けました。\n\n" +
    "【生徒番号】\n" + studentId + "\n\n" +
    "【生徒氏名】\n" + studentName + "\n\n" +
    "【欠席希望日】\n" + storedAbsenceDate + "\n\n" +
    "【欠席希望時間】\n" + storedAbsencePeriods + "\n\n" +
    "【振替希望日】\n" + storedMakeupDate + "\n\n" +
    "【振替希望時間】\n" + storedMakeupPeriods + "\n\n" +
    "【連絡事項】\n" + (notes || "なし") + "\n\n" +
    "※このメールは申請受付の確認メールです。\n" +
    "※変更がある場合は、その内容を連絡事項に記入して再申請してください。\n\n" +
    "自立学習RED 天王台教室";

  try {
    MailApp.sendEmail({
      to: email,
      subject: "欠席・振替申請を受け付けました",
      body: body
    });
  } catch (error) {
    mailSuccess = false;
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(ABSENCE_SHEET_NAME);

  if (!sheet) throw new Error("「" + ABSENCE_SHEET_NAME + "」シートが見つかりません。");

  const noteParts = [];
  if (absenceRegistered) noteParts.push("【欠席登録済み】");
  if (makeupUndecided) noteParts.push("【振替日未定】");
  if (notes) noteParts.push(notes);

  const row = [
    mailSuccess ? "未確認" : "メールエラー",
    new Date(),
    studentId,
    studentName,
    storedAbsenceDate,
    storedAbsencePeriods,
    storedMakeupDate,
    storedMakeupPeriods,
    email,
    noteParts.join("\n")
  ];

  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
  sheet.getRange(nextRow, 3).setNumberFormat("@");

  return {
    success: true,
    mailSuccess: mailSuccess
  };
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function checkDateAndPeriods_(dateString, periods) {
  const date = parseDate_(dateString);
  if (!date) return { valid: false, message: "日付が正しくありません。" };

  const day = date.getDay();
  if (day === 0) return { valid: false, message: "日曜日は休校日です。" };
  if (day === 1) return { valid: false, message: "月曜日は休校日です。" };

  const available = getAvailablePeriods_(day);

  for (const period of periods) {
    if (!available.includes(String(period))) {
      return {
        valid: false,
        message: formatJapaneseDate_(dateString) + "には、選択された時間枠はありません。"
      };
    }
  }

  return { valid: true };
}

function getAvailablePeriods_(day) {
  switch (day) {
    case 2: return ["④","⑤","⑥","⑦","⑧"];
    case 3: return ["③","④","⑤","⑥","⑦"];
    case 4: return ["④","⑤","⑥","⑦","⑧"];
    case 5: return ["③","④","⑤","⑥","⑦"];
    case 6: return ["①","②","③","④","⑤"];
    default: return [];
  }
}

function isAbsenceDeadlineValid_(dateString, periods) {
  const date = parseDate_(dateString);
  if (!date) return false;

  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (date < todayDate) return false;
  if (date > todayDate) return true;

  const startTimes = {
    "①":[15,0], "②":[15,45], "③":[16,30], "④":[17,15],
    "⑤":[18,0], "⑥":[18,45], "⑦":[19,30], "⑧":[20,15]
  };

  const limit = new Date(today.getTime() + 5 * 60 * 1000);

  return periods.every(function(period) {
    const t = startTimes[String(period)];
    if (!t) return false;

    const lessonStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      t[0],
      t[1],
      0,
      0
    );

    return lessonStart.getTime() >= limit.getTime();
  });
}

function checkMakeupDateWithinFourWeeks_(absenceDateString, makeupDateString) {
  const absenceDate = parseDate_(absenceDateString);
  const makeupDate = parseDate_(makeupDateString);

  if (!absenceDate || !makeupDate) {
    return { valid: false, message: "日付が正しくありません。" };
  }

  absenceDate.setHours(0,0,0,0);
  makeupDate.setHours(0,0,0,0);

  const maxDate = new Date(absenceDate);
  maxDate.setDate(maxDate.getDate() + 28);

  if (makeupDate < absenceDate || makeupDate > maxDate) {
    return {
      valid: false,
      message: "振替日は欠席日から4週間以内の日付を選択してください。"
    };
  }

  return { valid: true };
}

function parseDate_(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ""));
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) return null;

  return date;
}

function formatJapaneseDate_(dateString) {
  const date = parseDate_(dateString);
  if (!date) return dateString;

  const weekdays = ["日","月","火","水","木","金","土"];

  return (
    date.getFullYear() + "年" +
    (date.getMonth() + 1) + "月" +
    date.getDate() + "日（" +
    weekdays[date.getDay()] + "）"
  );
}

function getPeriodText_(periods) {
  if (!periods || !periods.length) return "";

  const times = {
    "①":"15:00～15:40", "②":"15:45～16:25", "③":"16:30～17:10",
    "④":"17:15～17:55", "⑤":"18:00～18:40", "⑥":"18:45～19:25",
    "⑦":"19:30～20:10", "⑧":"20:15～20:55"
  };

  return periods.map(function(period) {
    const p = String(period);
    return p + " " + (times[p] || "");
  }).join("、");
}

/* =====================================================
   テキスト購入
===================================================== */

function handlePurchaseJsonp_(e) {
  const raw = String(e.parameter.data || "");
  if (!raw) throw new Error("購入申請データがありません。");

  let data;
  try {
    data = JSON.parse(decodeURIComponent(raw));
  } catch (error) {
    throw new Error("購入申請データを読み込めませんでした。");
  }

  return submitPurchaseApplication_(data);
}

function submitPurchaseApplication_(data) {
  if (!data) throw new Error("申請内容がありません。");

  const studentId = String(data.studentId || "").trim();
  const studentName = String(data.studentName || "").trim();
  const email = String(data.email || "").trim();
  const notes = String(data.notes || "").trim();

  if (!/^\d+$/.test(studentId)) {
    throw new Error("生徒番号は半角数字で入力してください。");
  }

  if (!studentName) {
    throw new Error("生徒氏名を入力してください。");
  }

  if (!isValidEmail_(email)) {
    throw new Error("メールアドレスの形式が正しくありません。");
  }

  if (!Array.isArray(data.items) || !data.items.length) {
    throw new Error("購入するテキストを1つ以上追加してください。");
  }

  const items = data.items.map(function(item) {
    const level = String(item.level || "").trim();
    const subject = String(item.subject || "").trim();
    const title = String(item.title || "").trim();
    const quantity = Number(item.quantity);

    if (!level || !subject || !title) {
      throw new Error("購入するテキストの入力内容を確認してください。");
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("数量は1以上で入力してください。");
    }

    return {
      level: level,
      subject: subject,
      title: title,
      quantity: quantity
    };
  });

  const now = new Date();
  const timestamp = Utilities.formatDate(now, TIME_ZONE, "yyyy/MM/dd HH:mm:ss");
  const applicationId =
    "TXT-" + Utilities.formatDate(now, TIME_ZONE, "yyyyMMdd-HHmmss");

  savePurchaseApplication_({
    applicationId: applicationId,
    timestamp: timestamp,
    studentId: studentId,
    studentName: studentName,
    email: email,
    items: items,
    notes: notes
  });

  const itemLines = items.map(function(item) {
    return "・" + item.title + " × " + item.quantity;
  }).join("\n");

  const body =
    "テキスト購入申請を受け付けました。\n\n" +
    "【申請内容】\n" +
    "生徒番号：" + studentId + "\n" +
    "生徒氏名：" + studentName + "\n\n" +
    "購入テキスト：\n" + itemLines + "\n\n" +
    "連絡事項：\n" + (notes || "なし") + "\n\n" +
    "テキスト代は通常授業料と合わせて口座引き落としとなり、お支払い確認後に教室で直接お渡しいたします。\n" +
    "お急ぎの場合は、教室まで直接ご連絡ください。";

  let mailSuccess = true;

  try {
    MailApp.sendEmail({
      to: email,
      subject: "テキスト購入申請を受け付けました",
      body: body
    });
  } catch (error) {
    mailSuccess = false;
  }

  try {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: "新しいテキスト購入申請があります",
      body:
        "新しいテキスト購入申請があります。\n\n" +
        "受付番号：" + applicationId + "\n" +
        "受付日時：" + timestamp + "\n\n" +
        "生徒番号：" + studentId + "\n" +
        "生徒氏名：" + studentName + "\n\n" +
        "購入テキスト：\n" + itemLines + "\n\n" +
        "連絡事項：\n" + (notes || "なし") + "\n\n" +
        "確認メール送信先：" + email
    });
  } catch (error) {
    // 教室宛メールが失敗しても申請自体は成功扱い
  }

  return {
    success: true,
    mailSuccess: mailSuccess,
    applicationId: applicationId
  };
}

function savePurchaseApplication_(data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheet = spreadsheet.getSheetByName(PURCHASE_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(PURCHASE_SHEET_NAME);

    sheet.appendRow([
      "受付番号",
      "受付日時",
      "生徒番号",
      "生徒氏名",
      "購入テキスト",
      "数量",
      "区分",
      "科目",
      "連絡事項",
      "メールアドレス"
    ]);
  }

  data.items.forEach(function(item) {
    const row = sheet.getLastRow() + 1;

    sheet.getRange(row, 1, 1, 10).setValues([[
      data.applicationId,
      data.timestamp,
      data.studentId,
      data.studentName,
      item.title,
      item.quantity,
      item.level,
      item.subject,
      data.notes,
      data.email
    ]]);

    sheet.getRange(row, 3).setNumberFormat("@");
  });
}

/* =====================================================
   メール送信テスト
===================================================== */

function testMail() {
  const email = Session.getEffectiveUser().getEmail();

  if (!email) {
    throw new Error("現在のアカウントのメールアドレスを取得できませんでした。");
  }

  MailApp.sendEmail({
    to: email,
    subject: "RED天王台教室 GASメール送信テスト",
    body: "MailAppの送信権限テストです。"
  });

  return "送信しました。";
}
