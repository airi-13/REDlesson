/**
 * REDlesson：スプレッドシートの選択式項目にプルダウンを設定
 * 既存データ・見出し・GASの受付処理は変更しません。
 * 実行する関数：setupDropdowns
 */
const RED_DROPDOWN_SPREADSHEET_ID = "1apUqDRpkV1leEvYegYv61a22vuf2YdQYe40yzvgOb9Q";
const RED_DROPDOWN_ROWS = 1000;

function buildPlanScheduleOptions_() {
  const days = { "火": [4,5,6,7,8], "水": [3,4,5,6,7], "木": [4,5,6,7,8], "金": [3,4,5,6,7], "土": [1,2,3,4,5] };
  const marks = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];
  const subjects = ["英語", "数学", "国語", "理科", "社会"];
  const options = [];
  Object.keys(days).forEach(function(day) {
    days[day].forEach(function(period) {
      subjects.forEach(function(subject) {
        options.push(day + "曜 " + marks[period] + " " + subject);
      });
    });
  });
  return options;
}

/**
 * プルダウンの選択を複数登録できるようにする。
 * 対象セルで選択済みの値を再選択すると、その項目だけ解除する。
 * 対象：複数教科・複数コマを格納する申請一覧の列。
 */
function handleMultiSelectEdit(e) {
  if (!e || !e.range || typeof e.value === "undefined") return;
  const sheet = e.range.getSheet();
  if (e.range.getRow() < 2 || e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;
  const sheetName = sheet.getName();
  const header = String(sheet.getRange(1, e.range.getColumn()).getDisplayValue() || "").trim();
  const multiHeaders = {
    "プラン変更申請": ["現在の受講教科", "現在の受講コマ", "来月以降の受講教科", "来月以降の受講コマ"],
    "テスト対策教科": ["テスト対策受講希望科目"]
  };
  if (!multiHeaders[sheetName] || multiHeaders[sheetName].indexOf(header) === -1) return;

  const selected = String(e.value || "").trim();
  const previous = String(e.oldValue || "").trim();
  if (!selected) return;
  const items = previous ? previous.split("、").map(function(item) { return item.trim(); }).filter(Boolean) : [];
  const index = items.indexOf(selected);
  if (index >= 0) items.splice(index, 1);
  else items.push(selected);
  e.range.setValue(items.join("、"));
}

function setupDropdowns() {
  const ss = SpreadsheetApp.openById(RED_DROPDOWN_SPREADSHEET_ID);

  // このGASがスプレッドシートに直接紐づいていない場合も動くよう、
  // 対象スプレッドシートの編集時トリガーを1つだけ登録する。
  const hasEditTrigger = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === "handleMultiSelectEdit" &&
      trigger.getEventType() === ScriptApp.EventType.ON_EDIT;
  });
  if (!hasEditTrigger) {
    ScriptApp.newTrigger("handleMultiSelectEdit")
      .forSpreadsheet(ss)
      .onEdit()
      .create();
  }
  const rules = {
    "欠席振替申請": {
      "状態": ["未確認", "確認済み", "対応済み", "メールエラー"]
    },
    "購入申請": {
      "区分": ["小学生", "中学生", "高校生"],
      "科目": ["英語", "数学", "国語", "理科", "社会", "英語・数学"]
    },
    "プラン変更申請": {
      "現在のプラン": ["通い放題", "週4パック", "週6パック", "週1", "週2", "週3", "週4", "週5", "週6"],
      "現在の受講教科": ["英語", "数学", "国語", "理科", "社会"],
      "現在の受講コマ": buildPlanScheduleOptions_(),
      "来月以降のプラン": ["通い放題", "週4パック", "週6パック", "週1", "週2", "週3", "週4", "週5", "週6"],
      "来月以降の受講教科": ["英語", "数学", "国語", "理科", "社会"],
      "来月以降の受講コマ": buildPlanScheduleOptions_(),
      "学年": ["小4以下", "小5・6", "中1", "中2", "中3", "高1", "高2", "高3"],
      "テキスト追加購入": ["あり", "なし"]
    },
    "テスト対策コマ": {
      "学校名": ["我孫子中", "我孫子第二中", "我孫子第三中", "白山中", "湖北台中", "湖北中", "その他"],
      "学年": ["中学1年", "中学2年", "中学3年"],
      "コマ": ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"]
    },
    "テスト対策教科": {
      "通常授業受講教科数": ["1", "2", "3", "4", "5"],
      "テスト対策受講希望科目": ["英語", "数学", "国語", "理科", "社会"],
      "テキスト追加購入": ["あり", "なし"]
    },
    "テスト範囲": {
      "学校名": ["我孫子中", "我孫子第二中", "我孫子第三中", "白山中", "湖北台中", "湖北中", "その他"],
      "学年": ["中学1年", "中学2年", "中学3年"],
      "教科": ["英語", "数学", "国語", "理科", "社会"],
      "教科書出版社": ["東京書籍", "開隆堂", "三省堂", "教育出版", "光村図書", "啓林館", "大日本図書", "学校図書", "数研出版", "帝国書院", "日本文教出版", "山川出版社", "その他"]
    },
    "テスト期間設定": {
      "学年": ["中学1年", "中学2年", "中学3年"],
      "状態（有効／無効）": ["有効", "無効"]
    }
  };

  const summary = [];
  Object.keys(rules).forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      summary.push(sheetName + "：シートが見つからないためスキップ");
      return;
    }

    const lastColumn = sheet.getLastColumn();
    if (lastColumn < 1) {
      summary.push(sheetName + "：見出しがないためスキップ");
      return;
    }

    const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];

    // プラン変更申請は列順を移行した際、旧列に残ったプルダウンを消してから
    // 現在の見出し位置に設定し直す（他シートの入力規則には触れない）。
    if (sheetName === "プラン変更申請") {
      const dataRows = Math.max(sheet.getMaxRows() - 1, RED_DROPDOWN_ROWS - 1, 1);
      sheet.getRange(2, 1, dataRows, lastColumn).clearDataValidations();
    }

    Object.keys(rules[sheetName]).forEach(function(headerName) {
      const colIndex = headers.indexOf(headerName);
      if (colIndex === -1) {
        summary.push(sheetName + " / " + headerName + "：見出しが見つからないためスキップ");
        return;
      }
      const firstRow = 2;
      const rowCount = Math.max(RED_DROPDOWN_ROWS - 1, Math.max(sheet.getMaxRows() - 1, 1));
      const range = sheet.getRange(firstRow, colIndex + 1, rowCount, 1);
      const validation = SpreadsheetApp.newDataValidation()
        .requireValueInList(rules[sheetName][headerName], true)
        .setAllowInvalid(
          (sheetName === "プラン変更申請" &&
            ["現在の受講教科", "現在の受講コマ", "来月以降の受講教科", "来月以降の受講コマ"].indexOf(headerName) !== -1) ||
          (sheetName === "テスト対策教科" && headerName === "テスト対策受講希望科目")
        )
        .setHelpText("リストから選択してください。複数選択できる項目は、選択を繰り返してください。")
        .build();
      range.setDataValidation(validation);
      summary.push(sheetName + " / " + headerName + "：設定完了");
    });
  });

  Logger.log(summary.join("\n"));
  Logger.log("プルダウン設定処理が完了しました。");
}
