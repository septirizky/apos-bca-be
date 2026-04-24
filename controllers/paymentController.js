const paymentService = require("../services/paymentService");
const logService = require("../services/logService");

class PaymentController {
  async pay(req, res) {
    try {
      const { o_id, is_id, dp_id, u_id, u_name } = req.body;

      if (!o_id || !is_id || !u_id) {
        return res.status(400).json({
          error: "Parameter tidak lengkap",
        });
      }

      const requestLog = {
        o_id,
        is_id,
        dp_id,
        u_id,
      };

      const result = await paymentService.processPayment({
        o_id,
        is_id,
        u_id,
        dp_id,
      });

      await logService.saveLog({
        br_id: 1,
        br_name: "POS",

        u_id,
        u_name,

        url: "/api/payment",

        request: requestLog,

        response: result,

        status: 200,

        message: "SUCCESS",

        success: true,
      });

      res.json({
        message: "Payment berhasil",
        data: result,
      });
    } catch (err) {
      await logService.saveLog({
        br_id: 1,
        br_name: "POS",

        u_id: req.body.u_id,
        u_name: req.body.u_name,

        url: "/api/payment",

        request: req.body,

        response: err.message,

        status: 500,

        error_code: "SERVER_ERROR",

        message: "Payment gagal",

        success: false,
      });

      res.status(500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new PaymentController();
