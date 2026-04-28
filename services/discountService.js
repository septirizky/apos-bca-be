const { Discount, DiscountDetail, Member, Sequelize } = require("../models");

const { Op } = Sequelize;

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

  async validateMemberDiscount(memberCode) {
    const normalizedCode =
      typeof memberCode === "string" ? memberCode.trim() : "";

    if (!normalizedCode) {
      const err = new Error("MEMBER_CODE_REQUIRED");
      err.statusCode = 400;
      throw err;
    }

    const member = await Member.findOne({
      where: {
        m_code: normalizedCode,
        m_status: "Active",
      },
      attributes: ["m_id", "m_code", "m_name", "mt_id"],
    });

    if (!member) {
      const err = new Error("MEMBER_NOT_FOUND");
      err.statusCode = 404;
      throw err;
    }

    const discounts = await Discount.findAll({
      where: {
        d_status: "Active",
        [Op.or]: [
          { mt_id: member.mt_id },
          {
            [Op.and]: [
              {
                [Op.or]: [{ mt_id: null }, { mt_id: 0 }],
              },
              { m_id: member.m_id },
            ],
          },
        ],
      },
      include: [{ model: DiscountDetail }],
    });

    if (!discounts.length) {
      const err = new Error("DISCOUNT_NOT_FOUND");
      err.statusCode = 404;
      throw err;
    }

    return {
      member: {
        m_id: member.m_id,
        m_code: member.m_code,
        m_name: member.m_name,
        mt_id: member.mt_id,
      },
      discounts: discounts.map((discount) => {
        const details = discount.DiscountDetails || [];
        const values = details
          .map((detail) => parseFloat(detail.dd_value || 0))
          .filter((value) => value > 0);
        const maxValue = values.length ? Math.max(...values) : 0;

        return {
          d_id: discount.d_id,
          d_name: discount.d_name,
          d_type: discount.d_type,
          d_max_disc: parseFloat(discount.d_max_disc || 0),
          dd_value: maxValue,
        };
      }),
    };
  }
}

module.exports = new DiscountService();
