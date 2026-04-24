const { Discount, DiscountDetail } = require("../models");

class DiscountService {
  async getAllDiscount() {
    const discounts = await Discount.findAll({
      where: {
        d_status: "Active",
      },
      include: [
        {
          model: DiscountDetail,
        },
      ],
    });

    return discounts;
  }
}

module.exports = new DiscountService();
