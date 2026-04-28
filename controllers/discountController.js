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

  async validateMember(req, res) {
    try {
      const { m_code } = req.body;
      const result = await discountService.validateMemberDiscount(m_code);

      res.json({
        message: "Discount valid",
        ...result,
      });
    } catch (err) {
      const messages = {
        MEMBER_CODE_REQUIRED: "Masukkan kode member",
        MEMBER_NOT_FOUND: "Member tidak ditemukan",
        DISCOUNT_NOT_FOUND: "Diskon aktif untuk member ini tidak ditemukan",
      };

      res.status(err.statusCode || 500).json({
        code: err.message,
        message: messages[err.message] || err.message,
      });
    }
  }
}

module.exports = new DiscountController();
