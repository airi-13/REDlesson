/**
 * REDlesson：スプレッドシートの選択式項目にプルダウンを設定
 * 既存データ・見出し・GASの受付処理は変更しません。
 * 実行する関数：setupDropdowns
 */
const RED_DROPDOWN_SPREADSHEET_ID = "1apUqDRpkV1leEvYegYv61a22vuf2YdQYe40yzvgOb9Q";
const RED_DROPDOWN_ROWS = 1000;

function setupDropdowns() {
  const ss = SpreadsheetApp.openById(RED_DROPDOWN_SPREADSHEET_ID);
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
      "来月以降のプラン": ["通い放題", "週4パック", "週6パック", "週1", "週2", "週3", "週4", "週5", "週6"],
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
        .setAllowInvalid(false)
        .setHelpText("リストから選択してください。")
        .build();
      range.setDataValidation(validation);
      summary.push(sheetName + " / " + headerName + "：設定完了");
    });
  });

  Logger.log(summary.join("\n"));
  Logger.log("プルダウン設定処理が完了しました。");
}
