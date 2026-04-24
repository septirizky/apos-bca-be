const discountService = require("../services/discountService");

class DiscountController {
  async getAll(req, res) {
    try {
      const discounts = await discountService.getAllDiscount();

      res.json({ message: "Success get all Discount", discounts: discounts });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new DiscountController();
