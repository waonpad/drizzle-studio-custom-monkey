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

const init = (): void => {
  console.log("Initializing application...");

  bindCopyShortcuts();

  console.log("Application initialized successfully.");
};

init();

// TODO: Studioへのペースト
// TODO: Studioへの複数行ペースト
// TODO: リファクタリング（要素弄りがぐちゃぐちゃすぎる）
