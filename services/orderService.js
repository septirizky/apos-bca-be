const {
  Order,
  Member,
  Tables,
  TablesArea,
  TablesSection,
  OrderDetail,
  OrderDetailOption,
  Item,
  Options,
  ItemSubcategory,
  ItemCategory,
  Config,
} = require("../models");
const discountEngineService = require("./discountEngineService");

class OrderService {
  async getOrders() {
    const orders = await Order.findAll({
      include: [
        {
          model: TablesArea,
          attributes: ["ta_name"],
        },
        {
          model: Tables,
          attributes: ["t_name"],
          include: [
            {
              model: TablesSection,
              attributes: ["ts_name"],
            },
          ],
        },
      ],
    });

    return orders;
  }

  async getOrderDetail(o_id, { memberCode, discountId, discountMode } = {}) {
    const order = await Order.findOne({
      where: { o_id },
      attributes: ["o_id", "t_id", "o_start_time", "m_code"],
      include: [
        {
          model: Tables,
          attributes: ["t_name"],
          required: false,
        },
      ],
    });

    const details = await OrderDetail.findAll({
      where: { o_id },
      include: [
        {
          model: Item,
          attributes: [
            "i_id",
            "i_name",
            "i_sell_price",
            "i_cooking_charge",
            "i_kind",
            "isc_id",
          ],
          include: [
            {
              model: ItemSubcategory,
              attributes: ["isc_id", "isc_name", "ic_id"],
              include: [
                {
                  model: ItemCategory,
                  attributes: ["ic_id", "ic_name"],
                },
              ],
            },
          ],
        },
        {
          model: OrderDetailOption,
          attributes: ["od_id", "op_id"],
          include: [
            {
              model: Options,
              attributes: ["op_name"],
            },
          ],
        },
      ],
    });

    let foodTotal = 0;
    let beverageTotal = 0;
    let otherTotal = 0;
    let cookingChargeTotal = 0;

    details.forEach((item) => {
      const qty = parseFloat(item.od_quantity || 0);
      const price = parseFloat(item.Item?.i_sell_price || 0);
      const itemTotal = price * qty;
      const cooking = parseFloat(item.Item?.i_cooking_charge || 0);
      const kind = String(item.Item?.i_kind || "Other")
        .trim()
        .toLowerCase();

      if (kind === "food") {
        foodTotal += itemTotal;
      } else if (kind === "beverage") {
        beverageTotal += itemTotal;
      } else {
        otherTotal += itemTotal;
      }

      cookingChargeTotal += cooking * qty;
    });

    const effectiveMemberCode = memberCode || order?.m_code || null;

    const discountResult = await discountEngineService.applyDiscount({
      orderDetails: details,
      memberCode: effectiveMemberCode,
      discountId,
      discountMode,
      referenceTime: order?.o_start_time ? new Date(order.o_start_time) : null,
    });

    const items = details.map((detail) => {
      const row = detail.toJSON();
      const qty = parseFloat(row.od_quantity || 0);
      const sellPrice = parseFloat(row.Item?.i_sell_price || row.od_price || 0);
      const itemTotal = sellPrice * qty;
      const cookingCharge = parseFloat(row.Item?.i_cooking_charge || 0) * qty;
      const perItemDiscount = discountResult.perItem[row.od_id] || {};
      const discountAmount = parseFloat(perItemDiscount.discount_amount || 0);
      const discountPercent = parseFloat(perItemDiscount.discount_percent || 0);
      const discountList = perItemDiscount.discounts || [];

      return {
        ...row,
        qty,
        sell_price: sellPrice,
        item_total: itemTotal,
        cooking_charge_total: cookingCharge,
        discount_percent: discountPercent,
        discounts: discountList,
        discount_amount: discountAmount,
        discount_value: discountAmount * -1,
        final_price: itemTotal - discountAmount,
      };
    });

    const discountTotal = parseFloat(discountResult.discountTotal || 0);
    const totalBeforeDiscount = foodTotal + beverageTotal + otherTotal;
    const subtotal = totalBeforeDiscount - discountTotal;
    const taxConfig = await Config.findOne({
      where: {
        c_key: "VAT",
      },
      attributes: ["c_value"],
    });
    const vatPercent = parseFloat(taxConfig?.c_value || 0);
    const pbjt = ((subtotal + cookingChargeTotal) * vatPercent) / 100;
    const total = subtotal + cookingChargeTotal + pbjt;

    return {
      t_name: order?.Table?.t_name || null,
      m_code: effectiveMemberCode,
      items,
      summary: {
        food_total: foodTotal,
        beverage_total: beverageTotal,
        other_total: otherTotal,
        total_before_discount: totalBeforeDiscount,
        discount_total: discountTotal,
        subtotal,
        cooking_charge: cookingChargeTotal,
        pbjt,
        total,
      },
    };
  }

  async updateOrderMemberCode(o_id, m_code) {
    const order = await Order.findByPk(o_id);

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const normalizedCode =
      typeof m_code === "string" ? m_code.trim() : m_code ?? null;

    let nextMemberCode = null;

    if (normalizedCode) {
      const member = await Member.findOne({
        where: {
          m_code: normalizedCode,
          m_status: "Active",
        },
        attributes: ["m_code"],
      });

      if (!member) {
        throw new Error("INVALID_MEMBER_CODE");
      }

      nextMemberCode = member.m_code;
    }

    order.m_code = nextMemberCode;
    await order.save();

    return {
      o_id: order.o_id,
      m_code: order.m_code,
    };
  }
}

module.exports = new OrderService();
