const { PiMlpLog, Sequelize } = require("../models");

class LogService {
  async saveLog({
    br_id,
    br_name,
    u_id,
    u_name,
    url,
    request,
    response,
    status,
    error_code,
    message,
    success,
  }) {
    await PiMlpLog.create({
      br_id,
      br_name,

      u_id,
      u_name,

      l_call: url,

      l_request: JSON.stringify(request),

      l_response: JSON.stringify(response),

      l_status_code: status,

      l_error_code: error_code,

      l_rest_message: message,

      l_success: success ? "True" : "False",

      l_entry: Sequelize.literal("DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR)"),
    });
  }
}

module.exports = new LogService();
