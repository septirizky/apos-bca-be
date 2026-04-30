const paymentService = require("../services/paymentService");
const logService = require("../services/logService");
const configService = require("../services/configService");

class PaymentController {
  async pay(req, res) {
    let branchLogInfo = {
      br_id: 1,
      br_name: "POS",
    };

    try {
      branchLogInfo = await configService.getBranchLogInfo();

      const {
        o_id,
        is_id,
        is_counter,
        dp_id,
        u_id,
        u_name,
        payment_method,
        voucher_code,
        voucher_id,
        voucher_amount,
        apos_partner_ref_id,
        apos_tx_status,
        apos_feature_type,
        apos_trace_no,
        apos_approval_code,
        apos_ref_no,
        apos_card_number,
        apos_merchant_id,
        apos_terminal_id,
        apos_acquirer_type,
        pos_id,
        pos_ip,
      } = req.body;

      if (!o_id || !is_id || !u_id) {
        return res.status(400).json({
          error: "Parameter tidak lengkap",
        });
      }

      const requestLog = {
        o_id,
        is_id,
        is_counter,
        dp_id,
        u_id,
        payment_method,
        voucher_code,
        voucher_id,
        voucher_amount,
        apos_partner_ref_id,
        apos_tx_status,
        apos_feature_type,
        apos_trace_no,
        apos_approval_code,
        apos_ref_no,
        apos_card_number,
        apos_merchant_id,
        apos_terminal_id,
        apos_acquirer_type,
        pos_id,
        pos_ip,
      };

      const result = await paymentService.processPayment({
        o_id,
        is_id,
        is_counter,
        u_id,
        dp_id,
        payment_method,
        voucher_code,
        voucher_id,
        voucher_amount,
        apos_partner_ref_id,
        apos_tx_status,
        apos_feature_type,
        apos_trace_no,
        apos_approval_code,
        apos_ref_no,
        apos_card_number,
        apos_merchant_id,
        apos_terminal_id,
        apos_acquirer_type,
        pos_id,
        pos_ip,
        u_name,
      });

      await logService.saveLog({
        br_id: branchLogInfo.br_id,
        br_name: branchLogInfo.br_name,

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
        br_id: branchLogInfo.br_id,
        br_name: branchLogInfo.br_name,

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
