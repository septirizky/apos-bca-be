const printerService = require("../services/printerService");
const billPrintService = require("../services/billPrintService");
const { LogPrint } = require("../models");

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
        where: { is_id },
        order: [["lp_id", "DESC"]],
      });

      if (!logPrint) {
        return res.status(404).json({
          success: false,
          message: "Data log_print tidak ditemukan",
        });
      }

      await printerService.printEpsonNetwork({
        printerIp: printer_ip,
        printerPort: printer_port,
        content: logPrint.lp_message_source || logPrint.lp_message,
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
        where: { is_id },
        order: [["lp_id", "DESC"]],
      });

      if (!logPrint) {
        return res.status(404).json({
          success: false,
          message: "Data log_print tidak ditemukan",
        });
      }

      res.json({
        success: true,
        lp_message: logPrint.lp_message || "",
        lp_message_source: logPrint.lp_message_source || "",
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
