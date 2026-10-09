const SPREADSHEET_ID = "1apUqDRpkV1leEvYegYv61a22vuf2YdQYe40yzvgOb9Q";
const ABSENCE_SHEET_NAME = "欠席振替申請";
const PURCHASE_SHEET_NAME = "購入申請";
const TEST_RANGE_SHEET_NAME = "テスト範囲";
const TEST_PERIOD_CONFIG_SHEET_NAME = "テスト期間設定";
const PLAN_CHANGE_SHEET_NAME = "プラン変更申請";
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
    } else if (action === "test_period_config") {
      result = getTestPeriodConfig_();
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
    if (String(data.action || "") === "purchase") {
      return jsonResponse_(submitPurchaseApplication_(data));
    }

    if (String(data.action || "") === "test_range") {
      return jsonResponse_(submitTestRangeApplication_(data));
    }
    if (String(data.action || "") === "test_subject") {
      return jsonResponse_(submitTestSubjectApplication_(data));
    }
    if (String(data.action || "") === "test_period") {
      return jsonResponse_(submitTestPeriodApplication_(data));
    }
    if (String(data.action || "") === "plan_change") {
      return jsonResponse_(submitPlanChangeApplication_(data));
    }

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
  let sheet = spreadsheet.getSheetByName(ABSENCE_SHEET_NAME);

  // 欠席・振替申請シートがなければ自動作成し、見出しを設定する
  if (!sheet) {
    sheet = spreadsheet.insertSheet(ABSENCE_SHEET_NAME);
    sheet.appendRow([
      "状態",
      "受付日時",
      "生徒ID",
      "生徒名",
      "欠席希望日",
      "欠席時間",
      "振替希望日",
      "振替希望時間",
      "メールアドレス",
      "連絡事項"
    ]);
    sheet.setFrozenRows(1);
  }

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
   テスト範囲登録
===================================================== */

function submitTestRangeApplication_(data) {
  if (!data) throw new Error("登録内容がありません。");

  const studentId = String(data.studentId || "").trim();
  const studentName = String(data.studentName || "").trim();
  const school = String(data.school || "").trim();
  const grade = String(data.grade || "").trim();
  const notes = String(data.notes || "").trim();
  const subjects = Array.isArray(data.subjects) ? data.subjects : [];

  if (!/^\d+$/.test(studentId)) {
    throw new Error("生徒番号は半角数字で入力してください。");
  }
  if (!studentName) throw new Error("氏名を入力してください。");
  if (!school) throw new Error("学校名を選択してください。");
  if (!grade) throw new Error("学年を選択してください。");

  if (!subjects.length) {
    throw new Error("少なくとも1教科のテスト範囲を登録してください。");
  }

  const allowedSubjects = ["英語","数学","国語","理科","社会"];
  const rows = [];

  subjects.forEach(function(item) {
    const subject = String(item.subject || "").trim();
    const testDate = String(item.testDate || "").trim();
    const publisher = String(item.publisher || "").trim();
    const ranges = Array.isArray(item.ranges) ? item.ranges : [];

    if (!allowedSubjects.includes(subject)) {
      throw new Error("教科が正しくありません。");
    }
    const parsedDate = parseDate_(testDate);
    if (!parsedDate) throw new Error(subject + "のテスト日が正しくありません。");
    if (!publisher) {
      throw new Error(subject + "の教科書出版社を選択してください。");
    }
    if (!ranges.length) {
      throw new Error(subject + "のページ範囲を入力してください。");
    }

    ranges.forEach(function(range) {
      const from = String(range.from || "").trim();
      const to = String(range.to || "").trim();

      if (!/^\d+$/.test(from) || !/^\d+$/.test(to)) {
        throw new Error(subject + "のページ番号は半角数字で入力してください。");
      }
      if (Number(from) > Number(to)) {
        throw new Error(subject + "のページ範囲が正しくありません。");
      }

      rows.push([
        new Date(),
        studentId,
        studentName,
        school,
        grade,
        formatJapaneseDate_(testDate),
        subject,
        "P" + from + "～P" + to,
        publisher,
        notes
      ]);
    });
  });

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(TEST_RANGE_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(TEST_RANGE_SHEET_NAME);
    sheet.appendRow([
      "受付日時","生徒番号","氏名","学校名","学年","テスト日",
      "教科","教科書ページ数","教科書出版社","連絡事項"
    ]);
  }

  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, 10).setValues(rows);
  sheet.getRange(startRow, 2, rows.length, 1).setNumberFormat("@");

  try {
    const itemLines = subjects.map(function(item) {
      return item.subject + "（" + formatJapaneseDate_(item.testDate) + "）：" +
        item.ranges.map(function(range) {
          return "P" + range.from + "～P" + range.to;
        }).join("、") +
        "（" + item.publisher + "）";
    }).join("\n");

    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: "新しいテスト範囲登録があります",
      body:
        "テスト範囲登録を受け付けました。\n\n" +
        "生徒番号：" + studentId + "\n" +
        "氏名：" + studentName + "\n" +
        "学校名：" + school + "\n" +
        "学年：" + grade + "\n\n" +
        itemLines + "\n\n" +
        "連絡事項：" + (notes || "なし")
    });
  } catch (error) {
    // 教室宛メールが失敗してもスプレッドシート登録は成功
  }

  return { success: true };
}

/* =====================================================
   テスト対策コマの期間設定
   シート「テスト期間設定」
   A列: 学校名 / B列: 学年 / C列: テスト開始日
   D列: テスト最終日 / E列: 対策期間開始日（最終日の13日前）
===================================================== */

const TEST_PERIOD_SCHOOLS_ = ["我孫子中","我孫子第二中","我孫子第三中","白山中","湖北台中","湖北中","その他"];
const TEST_PERIOD_GRADES_ = ["中学1年","中学2年","中学3年"];

function setupTestPeriodConfigSheet_(sh) {
  sh.getRange(1, 1, 1, 6).setValues([[
    "学校名", "学年", "テスト開始日", "テスト最終日", "対策期間開始日（自動計算）", "状態（有効／無効）"
  ]]);
  sh.setFrozenRows(1);
  sh.getRange("C:D").setNumberFormat("yyyy/mm/dd");
  sh.getRange("E:E").setNumberFormat("yyyy/mm/dd");

  const schoolRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(TEST_PERIOD_SCHOOLS_, true)
    .setAllowInvalid(false)
    .build();
  const gradeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(TEST_PERIOD_GRADES_, true)
    .setAllowInvalid(false)
    .build();
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["有効", "無効"], true)
    .setAllowInvalid(false)
    .build();

  sh.getRange("A2:A500").setDataValidation(schoolRule);
  sh.getRange("B2:B500").setDataValidation(gradeRule);
  sh.getRange("F2:F500").setDataValidation(statusRule);

  // 既存行の状態が空欄なら有効として扱い、過去データを消さずに移行する。
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const statuses = sh.getRange(2, 6, lastRow - 1, 1).getValues();
    let changed = false;
    statuses.forEach(function(row) {
      if (!String(row[0] || "").trim()) {
        row[0] = "有効";
        changed = true;
      }
    });
    if (changed) sh.getRange(2, 6, statuses.length, 1).setValues(statuses);
  }
}

/**
 * スプレッドシートの「テスト期間設定」に学校名・学年・状態のプルダウンを設定する。
 * 初回設定やプルダウンが消えた場合は、Apps Scriptエディタからこの関数を手動実行する。
 */
function setupTestPeriodConfigSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(TEST_PERIOD_CONFIG_SHEET_NAME);
  if (!sh) sh = ss.insertSheet(TEST_PERIOD_CONFIG_SHEET_NAME);
  setupTestPeriodConfigSheet_(sh);

  // テスト最終日（D列）を入力・変更したら、対策期間開始日（E列）を14日前に自動設定するトリガー。
  const triggers = ScriptApp.getProjectTriggers();
  const alreadyExists = triggers.some(function(trigger) {
    return trigger.getHandlerFunction() === "handleTestPeriodConfigEdit_";
  });
  if (!alreadyExists) {
    ScriptApp.newTrigger("handleTestPeriodConfigEdit_")
      .forSpreadsheet(ss)
      .onEdit()
      .create();
  }

  // 既存行も一度計算し直す。
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const endDates = sh.getRange(2, 4, lastRow - 1, 1).getValues();
    const startDates = endDates.map(function(row) {
      const endDate = row[0];
      if (endDate instanceof Date && !isNaN(endDate.getTime())) {
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 14);
        return [startDate];
      }
      return [""];
    });
    sh.getRange(2, 5, startDates.length, 1).setValues(startDates).setNumberFormat("yyyy/mm/dd");
  }

  SpreadsheetApp.flush();
  Logger.log("「テスト期間設定」のプルダウンと対策期間開始日の自動計算を設定しました。");
}

/**
 * 「テスト期間設定」のD列（テスト最終日）が編集されたら、
 * E列（対策期間開始日）に14日前の日付を自動入力する。
 */
function handleTestPeriodConfigEdit_(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== TEST_PERIOD_CONFIG_SHEET_NAME) return;

  const firstRow = Math.max(2, e.range.getRow());
  const lastRow = e.range.getLastRow();
  const firstCol = e.range.getColumn();
  const lastCol = e.range.getLastColumn();

  // 編集範囲がD列（テスト最終日）に重ならない場合は何もしない。
  if (firstCol > 4 || lastCol < 4 || lastRow < 2) return;

  for (let row = firstRow; row <= lastRow; row++) {
    const endDate = sh.getRange(row, 4).getValue();
    const target = sh.getRange(row, 5);
    if (endDate instanceof Date && !isNaN(endDate.getTime())) {
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 14);
      target.setValue(startDate).setNumberFormat("yyyy/mm/dd");
    } else {
      target.clearContent();
    }
  }
}

function getTestPeriodConfig_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(TEST_PERIOD_CONFIG_SHEET_NAME);

  if (!sh) {
    sh = ss.insertSheet(TEST_PERIOD_CONFIG_SHEET_NAME);
    setupTestPeriodConfigSheet_(sh);
  } else {
    const header = String(sh.getRange(1, 3).getDisplayValue() || "").trim();
    if (header === "テスト日") {
      // 旧形式のテスト日を、移行時の暫定値としてテスト最終日に移す。
      // 開始日は未設定にして、教室側で実際の日付を入力できるようにする。
      const last = sh.getLastRow();
      if (last >= 2) {
        const oldDates = sh.getRange(2, 3, last - 1, 1).getValues();
        sh.getRange(2, 4, last - 1, 1).setValues(oldDates);
        sh.getRange(2, 3, last - 1, 1).clearContent();
      }
    }
    setupTestPeriodConfigSheet_(sh);
  }

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { success: true, configs: [] };

  // F列が「有効」の行だけ対象。同じ学校・学年に複数の有効行があれば、最新行を残して古い行を無効化する。
  // 履歴行自体は削除しない。誤設定時はシートで最新行を無効、戻したい行を有効に変更できる。
  const values = sh.getRange(2, 1, lastRow - 1, 6).getValues();
  const configsByKey = {};
  const activeRowsByKey = {};

  values.forEach(function(row, index) {
    const school = String(row[0] || "").trim();
    const grade = String(row[1] || "").trim();
    const testStartDate = normalizeSheetDate_(row[2]);
    const testEndDate = normalizeSheetDate_(row[3]);
    const status = String(row[5] || "").trim();
    if (status !== "有効" || !school || !grade || !testStartDate || !testEndDate) return;
    if (parseDate_(testStartDate) > parseDate_(testEndDate)) return;

    const startDate = shiftIsoDate_(testEndDate, -14);
    const sheetRow = index + 2;
    sh.getRange(sheetRow, 5).setValue(parseDate_(startDate)).setNumberFormat("yyyy/mm/dd");

    const key = school + "｜" + grade;
    if (!activeRowsByKey[key]) activeRowsByKey[key] = [];
    activeRowsByKey[key].push(sheetRow);
    configsByKey[key] = {
      school: school,
      grade: grade,
      testStartDate: testStartDate,
      testEndDate: testEndDate,
      startDate: startDate
    };
  });

  // 同一学校・学年の有効行が複数ある場合、下にある最新の行以外は状態を「無効」にする。
  Object.keys(activeRowsByKey).forEach(function(key) {
    const rows = activeRowsByKey[key];
    if (rows.length <= 1) return;
    rows.slice(0, -1).forEach(function(rowNumber) {
      sh.getRange(rowNumber, 6).setValue("無効");
    });
  });

  return { success: true, configs: Object.keys(configsByKey).map(function(key) {
    return configsByKey[key];
  }) };
}
function normalizeSheetDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, TIME_ZONE, "yyyy-MM-dd");
  }

  const text = String(value || "").trim();
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(text) && parseDate_(text)) return text;

  const match = /^(\\d{4})[\\/.-](\\d{1,2})[\\/.-](\\d{1,2})$/.exec(text);
  if (!match) return "";
  const iso = match[1] + "-" + String(Number(match[2])).padStart(2, "0") + "-" +
    String(Number(match[3])).padStart(2, "0");
  return parseDate_(iso) ? iso : "";
}

function shiftIsoDate_(dateString, amount) {
  const date = parseDate_(dateString);
  if (!date) return "";
  date.setDate(date.getDate() + amount);
  return Utilities.formatDate(date, TIME_ZONE, "yyyy-MM-dd");
}

/* =====================================================
   テスト対策教科・コマ
===================================================== */

function submitTestSubjectApplication_(data) {
  const studentId=String(data.studentId||"").trim();
  const studentName=String(data.studentName||"").trim();
  const count=Number(data.normalSubjectCount);
  const subjects=Array.isArray(data.subjects)?data.subjects:[];
  const purchase=String(data.textbookPurchase||"").trim();
  const notes=String(data.notes||"").trim();
  const email=String(data.email||"").trim();
  if(!/^\d+$/.test(studentId)||!studentName) throw new Error("生徒情報を確認してください。");
  if(!Number.isInteger(count)||count<1||count>5) throw new Error("通常授業受講教科数を確認してください。");
  if(!subjects.length) throw new Error("テスト対策受講希望科目を1つ以上選択してください。");
  if(!["あり","なし"].includes(purchase)) throw new Error("テキスト追加購入の選択を確認してください。");
  if(!isValidEmail_(email)) throw new Error("メールアドレスの形式が正しくありません。");
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const name="テスト対策教科";
  let sh=ss.getSheetByName(name);
  if(!sh){sh=ss.insertSheet(name);sh.appendRow(["受付日時","生徒番号","氏名","通常授業受講教科数","テスト対策受講希望科目","テキスト追加購入","連絡事項","メールアドレス"]); }
  sh.appendRow([new Date(),studentId,studentName,count,subjects.join("、"),purchase,notes,email]);
  sh.getRange(sh.getLastRow(),2).setNumberFormat("@");
  try{MailApp.sendEmail({to:email,subject:"テスト対策教科登録を受け付けました",body:"テスト対策教科登録を受け付けました。\n\n生徒番号："+studentId+"\n氏名："+studentName+"\n通常授業受講教科数："+count+"教科\nテスト対策受講希望科目："+subjects.join("、")+"\nテキスト追加購入："+purchase+"\n\n自立学習RED 天王台教室"});}catch(e){}
  try{MailApp.sendEmail({to:ADMIN_EMAIL,subject:"新しいテスト対策教科登録があります",body:"生徒番号："+studentId+"\n氏名："+studentName+"\n通常授業受講教科数："+count+"教科\nテスト対策："+subjects.join("、")+"\nテキスト追加購入："+purchase+"\n連絡事項："+(notes||"なし")});}catch(e){}
  return {success:true};
}

function submitTestPeriodApplication_(data) {
  const studentId=String(data.studentId||"").trim();
  const studentName=String(data.studentName||"").trim();
  const school=String(data.school||"").trim();
  const grade=String(data.grade||"").trim();
  const startDate=String(data.startDate||"").trim();
  const periods=Array.isArray(data.periods)?data.periods:[];
  const notes=String(data.notes||"").trim();
  const email=String(data.email||"").trim();
  if(!/^\d+$/.test(studentId)||!studentName||!school||!grade||!parseDate_(startDate)) throw new Error("入力内容を確認してください。");
  if(!periods.length) throw new Error("受講コマを1つ以上選択してください。");
  if(!isValidEmail_(email)) throw new Error("メールアドレスの形式が正しくありません。");
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const name="テスト対策コマ";
  let sh=ss.getSheetByName(name);
  if(!sh){sh=ss.insertSheet(name);sh.appendRow(["受付日時","生徒番号","氏名","学校名","学年","日付","コマ","時間","連絡事項","メールアドレス"]); }
  periods.forEach(p=>{
    if(!parseDate_(p.date)||!p.period) throw new Error("受講コマの入力内容が正しくありません。");
    const d=parseDate_(p.date);
    if(!getAvailablePeriods_(d.getDay()).includes(String(p.period))) throw new Error("選択できないコマが含まれています。");
    sh.appendRow([new Date(),studentId,studentName,school,grade,formatJapaneseDate_(p.date),String(p.period),getPeriodText_([String(p.period)]),notes,email]);
    sh.getRange(sh.getLastRow(),2).setNumberFormat("@");
  });
  try{MailApp.sendEmail({to:email,subject:"テスト対策コマ登録を受け付けました",body:"テスト対策コマ登録を受け付けました。\n\n生徒番号："+studentId+"\n氏名："+studentName+"\n選択コマ数："+periods.length+"\n\n自立学習RED 天王台教室"});}catch(e){}
  try{MailApp.sendEmail({to:ADMIN_EMAIL,subject:"新しいテスト対策コマ登録があります",body:"生徒番号："+studentId+"\n氏名："+studentName+"\n学校名："+school+"\n学年："+grade+"\n選択コマ数："+periods.length+"\n\n"+periods.map(p=>formatJapaneseDate_(p.date)+" "+p.period+" "+getPeriodText_([p.period])).join("\n")+"\n\n連絡事項："+(notes||"なし")});}catch(e){}
  return {success:true};
}

/* =====================================================
   プラン変更申請
===================================================== */

function submitPlanChangeApplication_(data) {
  const studentId = String(data.studentId || "").trim();
  const studentName = String(data.studentName || "").trim();
  const grade = String(data.grade || "").trim();
  const currentPlan = String(data.currentPlan || "").trim();
  const nextPlan = String(data.nextPlan || "").trim();
  const currentSubjects = Array.isArray(data.currentSubjects) ? data.currentSubjects.map(String) : [];
  const nextSubjects = Array.isArray(data.nextSubjects) ? data.nextSubjects.map(String) : [];
  const currentSchedule = Array.isArray(data.currentSchedule) ? data.currentSchedule : [];
  const nextSchedule = Array.isArray(data.nextSchedule) ? data.nextSchedule : [];
  const needsTextbookPurchase = String(data.needsTextbookPurchase || "").trim();
  const notes = String(data.notes || "").trim();
  const email = String(data.email || "").trim();

  const allowedPlans = ["通い放題","週4パック","週6パック","週1","週2","週3","週4","週5","週6"];
  const allowedSubjects = ["英語","数学","国語","理科","社会"];

  if (!/^\d+$/.test(studentId)) throw new Error("生徒番号は半角数字で入力してください。");
  if (!studentName) throw new Error("氏名を入力してください。");
  if (!["小4以下","小5・6","中1","中2","中3","高1","高2","高3"].includes(grade)) throw new Error("学年を選択してください。");
  if (!allowedPlans.includes(currentPlan) || !allowedPlans.includes(nextPlan)) {
    throw new Error("プランの選択内容を確認してください。");
  }
  if (!currentSubjects.length || !currentSubjects.every(s => allowedSubjects.includes(s))) {
    throw new Error("現在の受講教科を確認してください。");
  }
  if (!nextSubjects.length || !nextSubjects.every(s => allowedSubjects.includes(s))) {
    throw new Error("来月以降の受講教科を確認してください。");
  }

  const packGradeAllowed = function(plan) { if (plan === "週4パック") return grade === "中1" || grade === "中2"; if (plan === "週6パック") return grade === "中3"; return true; };
  if (!packGradeAllowed(currentPlan) || !packGradeAllowed(nextPlan)) throw new Error("週4パックは中1・2、週6パックは中3のみ選択できます。");
  const planMaxSlots = function(plan) { if (plan === "通い放題") return Infinity; if (plan === "週4パック") return 8; if (plan === "週6パック") return 12; const match=String(plan||"").match(/^週([1-6])$/); return match ? Number(match[1])*2 : 0; };
  const planMaxSubjects = function(plan) {
    if (plan === "通い放題") return 5;
    if (plan === "週4パック" || plan === "週6パック") return 3;
    const match = plan.match(/^週([1-6])$/);
    return match ? Number(match[1]) : 0;
  };

  if (currentSubjects.length > planMaxSubjects(currentPlan)) {
    throw new Error("現在のプランで選択できる受講教科数を超えています。");
  }
  if (nextSubjects.length > planMaxSubjects(nextPlan)) {
    throw new Error("来月以降のプランで選択できる受講教科数を超えています。");
  }

  
  const validSchedule = function(schedule, allowed) {
    const days = { "火":[4,5,6,7,8], "水":[3,4,5,6,7], "木":[4,5,6,7,8], "金":[3,4,5,6,7], "土":[1,2,3,4,5] };
    return schedule.length > 0 && schedule.every(function(item) {
      return item && Object.prototype.hasOwnProperty.call(days, String(item.day)) && days[String(item.day)].includes(Number(item.period)) && allowed.includes(String(item.subject));
    }) && new Set(schedule.map(function(item) { return String(item.day) + "-" + String(item.period); })).size === schedule.length;
  };
  if (!validSchedule(currentSchedule, currentSubjects)) throw new Error("現在の受講コマを確認してください。");
  if (!validSchedule(nextSchedule, nextSubjects)) throw new Error("来月以降の受講コマを確認してください。");
  if (currentSchedule.length > planMaxSlots(currentPlan)) throw new Error("現在のプランで選択できる受講コマ数を超えています。");
  if (nextSchedule.length > planMaxSlots(nextPlan)) throw new Error("来月以降のプランで選択できる受講コマ数を超えています。");
  const formatScheduleForMail = function(schedule) {
    return schedule.map(function(item) { return String(item.day) + "曜 " + ["","①","②","③","④","⑤","⑥","⑦","⑧"][Number(item.period)] + " " + String(item.subject); }).join("、");
  };
  if (!["あり", "なし"].includes(needsTextbookPurchase)) throw new Error("テキスト追加購入の有無を選択してください。");
  if (!isValidEmail_(email)) throw new Error("メールアドレスの形式が正しくありません。");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(PLAN_CHANGE_SHEET_NAME);

  if (!sh) {
    sh = ss.insertSheet(PLAN_CHANGE_SHEET_NAME);
    sh.appendRow([
      "受付日時","生徒番号","氏名","現在のプラン","現在の受講教科",
      "来月以降のプラン","来月以降の受講教科","連絡事項","メールアドレス","テキスト追加購入","現在の受講コマ","来月以降の受講コマ"
    ]);
  }

  // 既存シートにも購入有無の列を追加し、過去の申請データは保持する。
  if (!String(sh.getRange(1, 10).getDisplayValue() || "").trim()) sh.getRange(1, 10).setValue("テキスト追加購入");
  if (!String(sh.getRange(1, 11).getDisplayValue() || "").trim()) sh.getRange(1, 11).setValue("現在の受講コマ");
  if (!String(sh.getRange(1, 12).getDisplayValue() || "").trim()) sh.getRange(1, 12).setValue("来月以降の受講コマ");
  if (!String(sh.getRange(1, 13).getDisplayValue() || "").trim()) sh.getRange(1, 13).setValue("学年");
  sh.appendRow([
    new Date(),
    studentId,
    studentName,
    currentPlan,
    currentSubjects.join("、"),
    nextPlan,
    nextSubjects.join("、"),
    notes,
    email,
    needsTextbookPurchase,
    formatScheduleForMail(currentSchedule),
    formatScheduleForMail(nextSchedule),
    grade
  ]);
  sh.getRange(sh.getLastRow(), 2).setNumberFormat("@");

  let mailSuccess = true;

  try {
    MailApp.sendEmail({
      to: email,
      subject: "プラン変更申請を受け付けました",
      body:
        "プラン変更申請を受け付けました。\n\n" +
        "【生徒番号】\n" + studentId + "\n\n" +
        "【氏名】\n" + studentName + "\n\n" +
        "【学年】\n" + grade + "\n\n" +
        "【現在のプラン】\n" + currentPlan + "\n\n" +
        "【現在の受講教科】\n" + currentSubjects.join("、") + "\n\n" +
        "【来月以降のプラン】\n" + nextPlan + "\n\n" +
        "【来月以降の受講教科】\n" + nextSubjects.join("、") + "\n\n" +
        "【現在の受講コマ】\n" + formatScheduleForMail(currentSchedule) + "\n\n" +
        "【来月以降の受講コマ】\n" + formatScheduleForMail(nextSchedule) + "\n\n" +
        "【テキスト追加購入】\n" + needsTextbookPurchase + "\n\n" +
        "【連絡事項】\n" + (notes || "なし") + "\n\n" +
        "自立学習RED 天王台教室"
    });
  } catch (e) {
    mailSuccess = false;
  }

  try {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: "新しいプラン変更申請があります",
      body:
        "プラン変更申請を受け付けました。\n\n" +
        "生徒番号：" + studentId + "\n" +
        "氏名：" + studentName + "\n" +
        "学年：" + grade + "\n" +
        "現在のプラン：" + currentPlan + "\n" +
        "現在の受講教科：" + currentSubjects.join("、") + "\n" +
        "来月以降のプラン：" + nextPlan + "\n" +
        "来月以降の受講教科：" + nextSubjects.join("、") + "\n" +
        "現在の受講コマ：" + formatScheduleForMail(currentSchedule) + "\n" +
        "来月以降の受講コマ：" + formatScheduleForMail(nextSchedule) + "\n" +
        "テキスト追加購入：" + needsTextbookPurchase + "\n" +
        "連絡事項：" + (notes || "なし") + "\n" +
        "確認メール送付先：" + email
    });
  } catch (e) {}

  return { success: true, mailSuccess: mailSuccess };
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
