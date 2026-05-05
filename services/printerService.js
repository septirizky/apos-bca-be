const net = require("net");

class PrinterService {
  async printEpsonNetwork({ printerIp, printerPort = 9100, content }) {
    if (!printerIp) {
      throw new Error("IP printer Epson belum diisi");
    }

    const port = Number.parseInt(printerPort, 10) || 9100;
    const payload = this.buildEpsonPayload(content);

    await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (err) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (err) reject(err);
        else resolve();
      };

      socket.setTimeout(5000);
      socket.once("error", finish);
      socket.once("timeout", () =>
        finish(new Error("Koneksi printer timeout")),
      );

      socket.connect(port, printerIp, () => {
        socket.write(payload, (err) => {
          if (err) {
            finish(err);
            return;
          }
          socket.end();
        });
      });

      socket.once("close", () => finish());
    });
  }

  buildEpsonPayload(content) {
    const text = this.normalizePrintText(content || this.defaultTestContent());
    const initializePrinter = Buffer.from([0x1b, 0x40]);
    const compactLineSpacing = Buffer.from([0x1b, 0x33, 0x12]);
    const tabStops = Buffer.from([0x1b, 0x44, 0x0c, 0x1e, 0x00]);
    const feedAfterPrint = Buffer.from([0x1b, 0x64, 0x01]);
    const partialCut = Buffer.from([0x1d, 0x56, 0x42, 0x00]);
    return Buffer.concat([
      initializePrinter,
      compactLineSpacing,
      tabStops,
      this.formattedTextBuffer(text),
      feedAfterPrint,
      partialCut,
    ]);
  }

  normalizePrintText(content) {
    if (!content) return "";
    if (!content.trim().startsWith("{\\rtf")) return content;

    const markBigFont = (value) => {
      const marker = String(value).trim().startsWith("Table ")
        ? "\u0003"
        : "\u0001";
      return `${marker}${value}\u0002`;
    };

    const preparedContent = /{\\f0\\fnil FontB22;}/.test(content)
      ? content
          .replace(/\\f0(?:\\fs\d+)? ?([^\\{}]*?)\\par/g, (_, value) => {
            return `${markBigFont(value)}\\par`;
          })
          .replace(
            /\\f0(?:\\fs\d+)? ?([^\\{}]*?)\\f1(?:\\fs\d+)?/g,
            (_, value) => {
              return markBigFont(value);
            },
          )
      : content.replace(/\\f1 ?([^\\{}]*?)\\f0/g, (_, value) => {
          return markBigFont(value);
        });

    return preparedContent
      .replace(/\r\n/g, "\n")
      .replace(/{\\fonttbl(?:{[^{}]*}|[^{}])*}/g, "")
      .replace(/^{\\rtf1\\ansi\\ansicpg\d+\\deff\d+\\deflang\d+/g, "")
      .replace(/\\viewkind\d+\\uc\d+\\pard/g, "")
      .replace(/\\par[d]?[ \t]*(\r?\n)?/g, "\n")
      .replace(/\\'[0-9a-fA-F]{2}/g, "")
      .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
      .replace(/\\([\\{}])/g, "$1")
      .replace(/[{}]/g, "")
      .replace(/^\s*\n+/, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  normalizeReceiptText(content) {
    const text = this.normalizePrintText(content || "");
    return text
      .split("\n")
      .filter((line) => !this.isWelcomeLine(line))
      .map((line) => {
        const tableMatch = line.match(/^\s*(Table\s+.+?)\s*$/);
        if (tableMatch) return tableMatch[1];
        return this.normalizeReceiptLine(line);
      })
      .join("\n");
  }

  formattedTextBuffer(text) {
    const normalFont = Buffer.from([0x1b, 0x21, 0x00]);
    const bigFont = Buffer.from([0x1b, 0x21, 0x18]);
    const alignLeft = Buffer.from([0x1b, 0x61, 0x00]);
    const alignCenter = Buffer.from([0x1b, 0x61, 0x01]);
    const alignRight = Buffer.from([0x1b, 0x61, 0x02]);
    const resetLine = Buffer.concat([alignLeft, normalFont]);
    const chunks = [resetLine];
    let current = "";

    const flushCurrent = () => {
      if (!current) return;
      chunks.push(this.formatPlainChunk(current));
      current = "";
    };

    for (const char of text) {
      if (char === "\u0001" || char === "\u0002" || char === "\u0003") {
        flushCurrent();
        if (char === "\u0001") chunks.push(bigFont);
        else if (char === "\u0003")
          chunks.push(Buffer.concat([alignRight, bigFont]));
        else chunks.push(resetLine);
      } else if (char === "\n") {
        current += char;
        flushCurrent();
        chunks.push(resetLine);
      } else {
        current += char;
      }
    }

    flushCurrent();
    chunks.push(resetLine);
    return Buffer.concat(chunks);
  }

  formatPlainChunk(chunk) {
    const lines = chunk.split("\n").filter((line) => !this.isWelcomeLine(line));
    const buffers = [];
    const normalFont = Buffer.from([0x1b, 0x21, 0x00]);
    const bigFont = Buffer.from([0x1b, 0x21, 0x18]);
    const alignLeft = Buffer.from([0x1b, 0x61, 0x00]);
    const alignCenter = Buffer.from([0x1b, 0x61, 0x01]);
    const alignRight = Buffer.from([0x1b, 0x61, 0x02]);
    const resetLine = Buffer.concat([alignLeft, normalFont]);

    lines.forEach((line, index) => {
      if (line) {
        if (/^\s*Table /.test(line)) {
          buffers.push(
            Buffer.concat([
              alignRight,
              bigFont,
              this.plainLineBuffer(line),
              resetLine,
            ]),
          );
        } else if (/^\s*TAGIHAN SEMENTARA\s*$/.test(line)) {
          buffers.push(
            Buffer.concat([bigFont, this.plainLineBuffer(line), resetLine]),
          );
        } else if (/^Total\s+\d/.test(line)) {
          buffers.push(
            Buffer.concat([bigFont, this.plainLineBuffer(line), resetLine]),
          );
        } else {
          buffers.push(this.plainLineBuffer(line));
        }
      }
      if (index < lines.length - 1) buffers.push(Buffer.from("\n", "ascii"));
    });

    return Buffer.concat(buffers);
  }

  plainLineBuffer(line) {
    if (line.startsWith("__RIGHT__")) {
      const value = line.replace("__RIGHT__", "");
      return Buffer.from(value.padStart(33, " "), "utf8");
    }

    const tableMatch = line.match(/^\s*(Table\s+.+?)\s*$/);
    if (tableMatch) {
      return Buffer.from(tableMatch[1], "utf8");
    }

    const normalizedReceiptLine = this.normalizeReceiptLine(line);
    if (normalizedReceiptLine !== line) {
      return Buffer.from(normalizedReceiptLine, "utf8");
    }

    const discountMatch = line.match(
      /^\s*(\[\d+\]\s+\[[^\]]+\])\s+(-[\d,.]+)\s*$/,
    );
    if (discountMatch) {
      const label = discountMatch[1];
      const value = discountMatch[2];
      const labelStartColumn = 12;
      const spaces = Math.max(
        1,
        35 - labelStartColumn - label.length - value.length,
      );
      return Buffer.from(`\t${label}${" ".repeat(spaces)}${value}`, "utf8");
    }
    return Buffer.from(line, "utf8");
  }

  normalizeReceiptLine(line) {
    const pbjtMatch = line.match(/^PBJT\s+(\d+(?:\.\d+)?)%\s+([\d,.]+)\s*$/);
    if (pbjtMatch) {
      return this.receiptLine(`PBJT ${pbjtMatch[1]}%`, pbjtMatch[2], 33);
    }

    const totalMatch = line.match(/^Total\s+([\d,.]+)\s*$/);
    if (totalMatch) {
      return this.receiptLine("Total", totalMatch[1], 33);
    }

    const summaryMatch = line.match(
      /^(Food Total|Beverage Total|Other Total|Total Bef\. Disc\.|Total Discount|Subtotal|Cooking Charge)\s+(-?[\d,.]+)\s*$/,
    );
    if (summaryMatch) {
      return this.receiptLine(summaryMatch[1], summaryMatch[2], 33);
    }

    const itemMatch = line.match(/^(\s*\S+\s+x\s+[\d,.]+)\s+=\s*([\d,.]+)\s*$/);
    if (itemMatch) {
      return this.receiptLine(itemMatch[1], itemMatch[2], 33, "=");
    }

    return line;
  }

  receiptLine(label, value, width, separator = "") {
    const left = String(label || "");
    const right = `${separator}${separator ? " " : ""}${value || ""}`;
    const spacing = Math.max(1, width - left.length - right.length);
    return `${left}${" ".repeat(spacing)}${right}`;
  }

  centerLine(value, width = 33) {
    const text = String(value || "");
    const leftPadding = Math.max(0, Math.floor((width - text.length) / 2));
    return `${" ".repeat(leftPadding)}${text}`;
  }

  isWelcomeLine(line) {
    return /^welcome,?$/i.test(String(line || "").trim());
  }

  defaultTestContent() {
    return [
      "APOS TEST PRINT",
      "EPSON TM-U220",
      "Network printer connected",
      new Date().toISOString(),
    ].join("\n");
  }
}

module.exports = new PrinterService();
