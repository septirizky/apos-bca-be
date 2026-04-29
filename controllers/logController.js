const logService = require("../services/logService");

class LogController {
  async savePiMlpLog(req, res) {
    try {
      const {
        br_id,
        br_name,
        u_id,
        u_name,
        l_call,
        l_request,
        l_response,
        l_status_code,
        l_error_code,
        l_rest_message,
        l_success,
      } = req.body;

      await logService.saveLog({
        br_id: br_id || 1,
        br_name: br_name || "POS",
        u_id,
        u_name,
        url: l_call,
        request: l_request,
        response: l_response,
        status: l_status_code,
        error_code: l_error_code,
        message: l_rest_message,
        success: l_success === true || l_success === "True",
      });

      res.json({
        message: "Log berhasil disimpan",
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new LogController();
