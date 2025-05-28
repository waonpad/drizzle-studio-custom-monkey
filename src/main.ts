import hotkeys from "hotkeys-js";

/**
 * セレクタ定数
 */
const HEADER_ROW_SELECTOR = "div[role='row'][aria-rowindex='1']";
const RECORD_ROW_SELECTOR =
  "div[role='row']:not([aria-rowindex='1']):has(> div:first-child > button[aria-checked='true'])";

/**
 * 汎用ユーティリティ
 */
const queryAll = <T extends Element>(root: ParentNode, selector: string): T[] =>
  Array.from(root.querySelectorAll<T>(selector));

/**
 * ヘッダー行を取得
 */
const getHeaderRow = (documentRoot: Document): HTMLDivElement | null =>
  documentRoot.querySelector<HTMLDivElement>(HEADER_ROW_SELECTOR);

/**
 * 子要素が1つしかないセルのindexを取得
 */
const getSingleChildCellIndexes = (headerRow: HTMLDivElement): number[] =>
  Array.from(headerRow.children)
    .map((cell, idx) => (cell.children.length === 1 ? idx : -1))
    .filter((idx) => idx !== -1);

/**
 * セル内のspanで2つ目以降を返す（副作用なし）
 */
const getExtraSpans = (cells: Element[]): Element[] => {
  const extraSpans: Element[] = [];

  for (const cell of cells) {
    const spans = queryAll<Element>(cell, "span").slice(1);

    extraSpans.push(...spans);
  }

  return extraSpans;
};

/**
 * 指定indexのセルを返す（副作用なし）
 */
const getCellsByIndexes = (cells: Element[], indexesToGet: number[]): Element[] => {
  return indexesToGet.filter((idx) => cells[idx]).map((idx) => cells[idx]);
};

/**
 * レコード行から不要なセルをまとめて返す（副作用なし）
 */
const getCellsToRemoveFromRows = (rows: HTMLDivElement[], indexesToRemove: number[]): Element[] => {
  const cellsToRemove: Element[] = [];

  for (const row of rows) {
    const recordCells = Array.from(row.children);

    cellsToRemove.push(...getCellsByIndexes(recordCells, indexesToRemove));
  }

  return cellsToRemove;
};

/**
 * セルをまとめてremoveする（副作用あり）
 */
const removeElements = (elements: Element[]): void => {
  for (const el of elements) {
    el.remove();
  }
};

/**
 * table要素を生成
 */
const buildTable = (
  headerRow: HTMLDivElement | null,
  recordRows: HTMLDivElement[],
  withHeader: boolean,
): HTMLTableElement => {
  const table = document.createElement("table");

  if (withHeader && headerRow) {
    const headerTr = document.createElement("tr");

    for (const cell of Array.from(headerRow.children)) {
      const th = document.createElement("th");

      th.innerHTML = cell.innerHTML;

      headerTr.appendChild(th);
    }

    table.appendChild(headerTr);
  }

  for (const row of recordRows) {
    const tr = document.createElement("tr");

    for (const cell of Array.from(row.children)) {
      const td = document.createElement("td");

      td.innerHTML = cell.innerHTML;

      tr.appendChild(td);
    }

    table.appendChild(tr);
  }

  return table;
};

/**
 * table要素からTSV文字列を生成
 */
const tableToTSV = (table: HTMLTableElement): string =>
  Array.from(table.rows)
    .map((row) =>
      Array.from(row.cells)
        .map((cell) => cell.innerText.replace(/\r?\n/g, " ").replace(/\t/g, " "))
        .join("\t"),
    )
    .join("\n");

/**
 * クリップボードへコピー（text/html と text/plain 両対応）
 */
const copyTableToClipboard = async (table: HTMLTableElement): Promise<void> => {
  const html = table.outerHTML;
  const tsv = tableToTSV(table);

  try {
    const data = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([tsv], { type: "text/plain" }),
    });

    await navigator.clipboard.write([data]);

    // UI通知も可能だが、ここではconsoleのみ
    console.log("Copied to clipboard successfully.");
  } catch (error) {
    // 失敗時はUI通知も検討可
    console.error("Failed to copy to clipboard:", error);
  }
};

/**
 * メイン処理: 選択行をテーブルとしてクリップボードにコピー
 * @param withHeader ヘッダー行を含めるか
 */
const copySelectedRows = (withHeader = true): void => {
  const documentClone = document.cloneNode(true) as Document;
  const selectedRecords = queryAll<HTMLDivElement>(documentClone, RECORD_ROW_SELECTOR);

  if (selectedRecords.length === 0) {
    console.error("No rows selected.");

    return;
  }

  const headerRow = getHeaderRow(documentClone);
  let indexesToRemove: number[] = [];

  if (headerRow) {
    const headerCells = Array.from(headerRow.children);

    // spanの2つ目以降をまとめてremove
    const extraSpans = getExtraSpans(headerCells);

    removeElements(extraSpans);

    indexesToRemove = getSingleChildCellIndexes(headerRow);

    const headerCellsToRemove = getCellsByIndexes(headerCells, indexesToRemove);

    removeElements(headerCellsToRemove);
  }

  // レコード行の不要セルもまとめてremove
  const recordCellsToRemove = getCellsToRemoveFromRows(selectedRecords, indexesToRemove);

  removeElements(recordCellsToRemove);

  const table = buildTable(withHeader ? headerRow : null, selectedRecords, withHeader);

  copyTableToClipboard(table);
};

// 正規表現リテラルはトップレベルで定義
const NEWLINE_REGEX = /\r?\n/;

/**
 * クリップボードからTSV/CSVデータを取得し、2次元配列にパース
 * @param skipHeader 先頭行をヘッダーとして除外する場合はtrue
 */
const getClipboardRecords = async (skipHeader = true): Promise<string[][]> => {
  try {
    const text = await navigator.clipboard.readText();
    const delimiter = text.includes("\t") ? "\t" : ",";
    const lines = text.split(NEWLINE_REGEX).filter((l) => l.trim() !== "");

    if (lines.length === 0) {
      return [];
    }

    return (skipHeader ? lines.slice(1) : lines).map((line) => line.split(delimiter));
  } catch (e) {
    console.error("Failed to read clipboard:", e);

    return [];
  }
};

/**
 * 新規レコード行（未入力の行）を取得
 * - Drizzle StudioのUI構造に依存。必要に応じてセレクタを調整。
 */
const NEW_RECORD_ROW_SELECTOR = "div[role='row']:has(> div:nth-child(2) > div > span > span.text-edit-foreground)";
const getNewRecordRows = (documentRoot: Document = document): HTMLDivElement[] => {
  return queryAll<HTMLDivElement>(documentRoot, NEW_RECORD_ROW_SELECTOR);
};

/**
 * 新規レコード行の各セルに値をセット
 * @param row 対象行
 * @param values セル値配列
 */
const fillRowCells = async (row: HTMLDivElement, values: string[]): Promise<void> => {
  const [_, ...cells] = Array.from(row.children);

  for (let i = 0; i < Math.min(cells.length, values.length); i++) {
    const cell = cells[i];
    const btn = cell.querySelector("div > button") as HTMLButtonElement | null;

    if (!btn) {
      console.warn(`No input found in cell ${i + 1}. Skipping...`);

      break; // 次のセルへ
    }

    console.log(btn, values[i]);

    // セルをクリック
    btn.click();

    // inputが出現するまで待機
    let input: HTMLInputElement | null = null;

    for (let retry = 0; retry < 20; retry++) {
      input = document.querySelector("input.rdg-text-editor") as HTMLInputElement | null;

      if (input) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!input) {
      console.warn(`Input not found for cell ${i + 1}. Skipping...`);

      continue;
    }

    // inputにフォーカス
    input.focus();

    // 既存の値を全選択して消す（必要なら）
    input.select();

    document.execCommand("delete");

    // 代替手段が無いっぽいので非推奨だがexecCommandを使う
    document.execCommand("insertText", false, values[i]);

    // 入力確定（Enterキーイベントを送る）
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));

    // 入力後、少し待つ
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

/**
 * クリップボードのレコードを新規レコード行にペースト
 * @param skipHeader 先頭行をヘッダーとして除外する場合はtrue
 */
const pasteRecordsToNewRows = async (skipHeader = true): Promise<void> => {
  const records = await getClipboardRecords(skipHeader);

  if (records.length === 0) {
    console.warn("No records to paste.");

    return;
  }

  const newRows = getNewRecordRows();

  console.log(`Found ${newRows.length} new record rows.`);

  if (newRows.length === 0) {
    console.warn("No new record rows available.");

    return;
  }

  for await (const [index, record] of records.entries()) {
    if (index >= newRows.length) {
      console.warn("Not enough new rows to paste all records. Stopping...");

      break;
    }

    await fillRowCells(newRows[index], record);
  }

  console.log(`Pasted ${Math.min(records.length, newRows.length)} record(s).`);
};

/**
 * ホットキー登録
 */
const bindCopyShortcuts = (): void => {
  hotkeys("command+x", (event) => {
    if (!event.repeat) {
      copySelectedRows(true); // ヘッダーあり
    }
  });

  hotkeys("command+z", (event) => {
    if (!event.repeat) {
      copySelectedRows(false); // ヘッダーなし
    }
  });
};

/**
 * ホットキー登録（ペースト用）
 */
const bindPasteShortcut = (): void => {
  // 通常: command+v → 1行目をヘッダーとしてスキップ
  hotkeys("command+v", (event) => {
    if (!event.repeat) {
      event.preventDefault();

      pasteRecordsToNewRows(true);
    }
  });

  // 追加: command+shift+v → 1行目もデータとしてペースト
  hotkeys("command+shift+v", (event) => {
    if (!event.repeat) {
      event.preventDefault();

      pasteRecordsToNewRows(false);
    }
  });
};

const init = (): void => {
  console.log("Initializing application...");

  bindCopyShortcuts();

  bindPasteShortcut();

  console.log("Application initialized successfully.");
};

init();

// TODO: リファクタリング（要素弄りがぐちゃぐちゃすぎる）
