const downPaymentService = require("../services/downPaymentService");

class DownPaymentController {
  async getAll(req, res) {
    try {
      const data = await downPaymentService.getAllActive();

      res.json(data);
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new DownPaymentController();
