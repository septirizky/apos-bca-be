const { DownPayment } = require("../models");

class DownPaymentService {
  async getAllActive() {
    return await DownPayment.findAll({
      where: {
        dp_status: "Active",
      },
    });
  }
}

module.exports = new DownPaymentService();
