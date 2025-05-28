import hotkeys from "hotkeys-js";

/**
 * ヘッダー行を取得
 */
function getHeaderRow(documentClone: Document): HTMLDivElement | null {
  return documentClone.querySelector<HTMLDivElement>("div[role='row'][aria-rowindex='1']");
}

/**
 * ヘッダーセルのうち、子要素が1つしかないものの要素とindexを取得
 */
function getHeaderCellsToRemove(headerRow: HTMLDivElement): { item: Element; index: number }[] {
  return Array.from(headerRow.children)
    .map((cell, index) => (cell.children.length === 1 ? { item: cell, index } : null))
    .filter((item): item is { item: Element; index: number } => item !== null);
}

/**
 * セル内のspanで2つ目以降を削除
 */
function removeExtraSpans(cells: Element[]): void {
  for (const cell of cells) {
    const spansToRemove = Array.from(cell.querySelectorAll("span")).slice(1);

    for (const span of spansToRemove) {
      span.remove();
    }
  }
}

/**
 * 指定indexのセルを削除
 */
function removeCellsByIndex(cells: Element[], indexesToRemove: number[]): void {
  for (let i = cells.length - 1; i >= 0; i--) {
    if (indexesToRemove.includes(i)) {
      cells[i].remove();
    }
  }
}

/**
 * レコード行から不要なセルを削除
 */
function cleanRecordRows(rows: HTMLDivElement[], indexesToRemove: number[]): void {
  for (const row of rows) {
    const recordCells = Array.from(row.children);

    removeCellsByIndex(recordCells, indexesToRemove);
  }
}

/**
 * table要素を生成
 */
function buildTable(
  headerRow: HTMLDivElement | null,
  recordRows: HTMLDivElement[],
  withHeader: boolean,
): HTMLTableElement {
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
}

/**
 * クリップボードへコピー
 */
function copyTableToClipboard(table: HTMLTableElement): void {
  const data = new ClipboardItem({
    "text/html": new Blob([table.outerHTML], { type: "text/html" }),
  });

  navigator.clipboard.write([data]).then(
    () => {
      console.log("Copied to clipboard successfully.");
    },
    (error) => {
      console.error("Failed to copy to clipboard:", error);
    },
  );
}

/**
 * メイン処理
 */
function copyRow(withHeader = true): void {
  const documentClone = document.cloneNode(true) as Document;

  const selectedRecords = Array.from(
    documentClone.querySelectorAll<HTMLDivElement>(
      "div[role='row']:not([aria-rowindex='1']):has(> div:first-child > button[aria-checked='true'])",
    ),
  );

  if (selectedRecords.length === 0) {
    console.error("No rows selected.");

    return;
  }

  const headerRow = getHeaderRow(documentClone);
  let indexesToRemove: number[] = [];

  if (headerRow) {
    const headerCells = Array.from(headerRow.children);

    removeExtraSpans(headerCells);

    const headerCellsToRemove = getHeaderCellsToRemove(headerRow);

    indexesToRemove = headerCellsToRemove.map((item) => item.index);

    removeCellsByIndex(headerCells, indexesToRemove);
  }

  cleanRecordRows(selectedRecords, indexesToRemove);

  const table = buildTable(withHeader ? headerRow : null, selectedRecords, withHeader);

  copyTableToClipboard(table);
}

/**
 * ホットキー登録
 */
function bindCopyRow(): void {
  hotkeys("command+x", (event) => {
    if (event.repeat) {
      return;
    }

    copyRow(true); // ヘッダーあり
  });

  hotkeys("command+z", (event) => {
    if (event.repeat) {
      return;
    }

    copyRow(false); // ヘッダーなし
  });
}

function init(): void {
  console.log("Initializing application...");

  bindCopyRow();

  console.log("Application initialized successfully.");
}

init();

// TODO: Studioへのペースト
// TODO: Studioへの複数行ペースト
// TODO: リファクタリング（要素弄りがぐちゃぐちゃすぎる）
