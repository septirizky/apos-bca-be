const printerService = require("../services/printerService");
const billPrintService = require("../services/billPrintService");
const paymentService = require("../services/paymentService");
const { LogPrint } = require("../models");

async function prepareFinalBillPrintLog(logPrint, req) {
  const isReprint = logPrint.lp_printed === "True";
  const finalWhere = logPrint.lp_id
    ? { lp_id: logPrint.lp_id }
    : { is_id: logPrint.is_id, lp_print_type: "Final" };

  if (!isReprint) {
    await LogPrint.update(
      {
        lp_printed: "True",
        lp_print_time: new Date(),
      },
      { where: finalWhere },
    );
    return logPrint;
  }

    const nextCount = (Number(logPrint.lp_count) || 1) + 1;
    const printBy = extractCashierName(logPrint.lp_message) || req.body?.u_name || req.query?.u_name || "";
    const printAt = formatPrintDateTime(new Date());
    const reprintSource = paymentService.toRtfSource(logPrint.lp_message || "", {
      includeDuplicate: true,
      duplicateCount: nextCount,
      printBy,
      printAt,
    });
  const row = logPrint.get({ plain: true });
  delete row.lp_id;

  await LogPrint.update({ lp_count: nextCount }, { where: finalWhere });
  return LogPrint.create({
    ...row,
    lp_print_type: "BillReprint",
    lp_message_source: reprintSource,
    lp_count: nextCount,
    lp_time: new Date(),
    lp_printed: "True",
    lp_print_time: new Date(),
    lp_ip: req.ip || logPrint.lp_ip || "",
    pos_id: req.body?.pos_id || logPrint.pos_id || "",
  });
}

function formatPrintDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return (
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-") +
    ` ${[
      String(date.getHours()).padStart(2, "0"),
      String(date.getMinutes()).padStart(2, "0"),
      String(date.getSeconds()).padStart(2, "0"),
    ].join(":")}`
  );
}

function extractCashierName(message) {
  const match = String(message || "").match(/^Cashier\s*:\s*(.+)$/m);
  return match ? match[1].trim() : "";
}

class PrintController {
  async printInitiationBill(req, res) {
    try {
      const result = await billPrintService.printInitiationBill({
        orderId: req.body.o_id,
        userId: req.body.u_id,
        userName: req.body.u_name,
        printerTarget: req.body.printer_target,
        printerIp: req.body.printer_ip,
        printerPort: req.body.printer_port,
        posId: req.body.pos_id,
        posIp: req.body.pos_ip,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message || "Print bill gagal",
      });
    }
  }

  async printEpson(req, res) {
    try {
      const {
        printer_ip,
        printer_port,
        content,
      } = req.body;

      await printerService.printEpsonNetwork({
        printerIp: printer_ip,
        printerPort: printer_port,
        content,
      });

      res.json({
        success: true,
        message: "Print Epson terkirim",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message || "Print Epson gagal",
      });
    }
  }

  async printFinalBillEpson(req, res) {
    try {
      const {
        is_id,
        printer_ip,
        printer_port,
      } = req.body;

      if (!is_id) {
        return res.status(400).json({
          success: false,
          message: "Transaction ID tidak tersedia",
        });
      }

      const logPrint = await LogPrint.findOne({
        where: { is_id, lp_print_type: "Final" },
        order: [["lp_id", "DESC"]],
      });

      if (!logPrint) {
        return res.status(404).json({
          success: false,
          message: "Data log_print tidak ditemukan",
        });
      }

      const printLog = await prepareFinalBillPrintLog(logPrint, req);
      const content = printLog.lp_message_source || printLog.lp_message;

      await printerService.printEpsonNetwork({
        printerIp: printer_ip,
        printerPort: printer_port,
        content,
      });

      res.json({
        success: true,
        message: "Final bill terkirim ke Epson",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message || "Print final bill gagal",
      });
    }
  }

  async getFinalBillContent(req, res) {
    try {
      const { is_id } = req.params;

      const logPrint = await LogPrint.findOne({
        where: { is_id, lp_print_type: "Final" },
        order: [["lp_id", "DESC"]],
      });

      if (!logPrint) {
        return res.status(404).json({
          success: false,
          message: "Data log_print tidak ditemukan",
        });
      }

      const printLog = await prepareFinalBillPrintLog(logPrint, req);
      const plainMessage = printerService.normalizeReceiptText(
        printLog.lp_message || printLog.lp_message_source || "",
      );

      res.json({
        success: true,
        lp_message: plainMessage,
        lp_message_source: printLog.lp_message_source || "",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message || "Gagal mengambil final bill",
      });
    }
  }

  async testEpson(req, res) {
    try {
      const {
        printer_ip,
        printer_port,
        content,
      } = req.body;

      await printerService.printEpsonNetwork({
        printerIp: printer_ip,
        printerPort: printer_port,
        content,
      });

      res.json({
        success: true,
        message: "Test print Epson terkirim",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message || "Test print Epson gagal",
      });
    }
  }

}

module.exports = new PrintController();
