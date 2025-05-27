import hotkeys from "hotkeys-js";

const copyRow = () => {
  const documentClone = document.cloneNode(true) as Document;

  const selectedRecords = Array.from(
    documentClone.querySelectorAll<HTMLDivElement>(
      "div[role='row']:not([aria-rowindex='1']):has(> div:first-child > button[aria-checked='true'])",
    ),
  );

  console.log("Selected Rows:", selectedRecords);

  if (selectedRecords.length === 0) {
    console.error("No rows selected.");

    return;
  }

  const headerRow = documentClone.querySelector<HTMLDivElement>("div[role='row'][aria-rowindex='1']");

  console.log("Header Row:", headerRow);

  if (!headerRow) {
    console.error("Header row not found.");

    return;
  }

  const headerCells = Array.from(headerRow.children);

  // headerRowの直接の子要素のdivで、子要素が1つしか無いものを削除
  const headerCellsToRemove = headerCells
    .map((cell, index) => (cell.children.length === 1 ? { item: cell, index } : null))
    .filter((item): item is { item: Element; index: number } => item !== null);

  for (const cell of headerCells) {
    // cellの中のspanで、兄弟の中で2つ目以降のものを削除
    const spansToRemove = Array.from(cell.querySelectorAll("span")).slice(1);

    for (const span of spansToRemove) {
      span.remove();
    }
  }

  console.log("Header Cells to Remove:", headerCellsToRemove);

  for (const cell of headerCellsToRemove) {
    cell.item.remove();
  }

  for (const row of selectedRecords) {
    const recordCells = Array.from(row.children);

    // indexがheaderCellsToRemoveのindexに含まれるものを削除
    const cellsToRemove = recordCells
      .map((cell, index) =>
        headerCellsToRemove.some((header) => header.index === index) ? { item: cell, index } : null,
      )
      .filter((item): item is { item: Element; index: number } => item !== null);

    console.log("Cells to Remove:", cellsToRemove);

    for (const cell of cellsToRemove) {
      cell.item.remove();
    }
  }

  // headerRowとselectedRecordsを新しく作成したtableに追加
  const newTable = document.createElement("table");

  const headerRowTr = document.createElement("tr");

  for (const cell of Array.from(headerRow.children)) {
    const newCell = document.createElement("th");

    newCell.innerHTML = cell.innerHTML; // innerHTMLをコピー

    headerRowTr.appendChild(newCell);
  }

  newTable.appendChild(headerRowTr);

  for (const row of selectedRecords) {
    const newRow = document.createElement("tr");

    const recordCells = Array.from(row.children);

    for (const cell of recordCells) {
      const newCell = document.createElement("td");

      newCell.innerHTML = cell.innerHTML; // innerHTMLをコピー

      newRow.appendChild(newCell);
    }

    newTable.appendChild(newRow);
  }

  // 新しいtableをクリップボードにコピー
  const data = new ClipboardItem({
    "text/html": new Blob([newTable.outerHTML], { type: "text/html" }),
  });

  navigator.clipboard.write([data]).then(
    () => {
      console.log("Copied to clipboard successfully.");
    },
    (error) => {
      console.error("Failed to copy to clipboard:", error);
    },
  );
};

const bindCopyRow = () => {
  hotkeys("command+x", (event) => {
    if (event.repeat) {
      return; // キーがリピートされている場合は何もしない
    }

    copyRow();
  });
};

// TODO: ヘッダー無しのコピー
// TODO: Studioへのペースト
// TODO: Studioへの複数行ペースト
// TODO: リファクタリング（要素弄りがぐちゃぐちゃすぎる）

const init = () => {
  // 初期化処理
  console.log("Initializing application...");

  bindCopyRow();

  // 他の初期化処理をここに追加
  console.log("Application initialized successfully.");
};

init();
