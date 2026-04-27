const voucherService = require("../services/voucherService");

class VoucherController {
  async validate(req, res) {
    try {
      const { v_code, allow_expired } = req.body;

      const voucher = await voucherService.validateVoucher(v_code, {
        allowExpired: allow_expired === true,
      });

      res.json({
        message: "Voucher valid",
        voucher,
      });
    } catch (err) {
      if (err.message === "VOUCHER_EXPIRED_CONFIRM" && err.voucher) {
        return res.status(409).json({
          code: err.message,
          message: "Voucher kadaluarsa apakah akan tetap digunakan?",
          voucher: voucherService.toResponse(err.voucher, true),
        });
      }

      const messages = {
        VOUCHER_CODE_REQUIRED: "Masukkan kode voucher",
        VOUCHER_NOT_FOUND: "Voucher tidak ditemukan",
        VOUCHER_USED: "Voucher sudah digunakan",
        VOUCHER_NOT_AVAILABLE: "Voucher tidak tersedia",
        VOUCHER_NOT_STARTED: "Voucher belum berlaku",
      };

      res.status(err.statusCode || 500).json({
        code: err.message,
        message: messages[err.message] || err.message,
      });
    }
  }
}

module.exports = new VoucherController();
