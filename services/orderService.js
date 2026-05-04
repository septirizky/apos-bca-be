const {
  Sequelize,
  Order,
  Member,
  Tables,
  TablesArea,
  TablesSection,
  OrderDetail,
  OrderDetailOption,
  User,
  LogLock,
  Item,
  Options,
  ItemSubcategory,
  ItemCategory,
  Config,
  ItemSale,
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
        {
          model: User,
          attributes: ["u_id", "u_name"],
          required: false,
        },
      ],
      attributes: {
        include: [
          [
            Sequelize.literal(`(
              SELECT ll.lock_state
              FROM log_lock ll
              WHERE ll.t_id = \`OrderModel\`.\`t_id\`
              ORDER BY ll.l_id DESC
              LIMIT 1
            )`),
            "latest_lock_state",
          ],
          [
            Sequelize.literal(`(
              SELECT ll.u_id
              FROM log_lock ll
              WHERE ll.t_id = \`OrderModel\`.\`t_id\`
              ORDER BY ll.l_id DESC
              LIMIT 1
            )`),
            "latest_lock_user_id",
          ],
          [
            Sequelize.literal(`(
              SELECT u.u_name
              FROM log_lock ll
              LEFT JOIN \`user\` u ON u.u_id = ll.u_id
              WHERE ll.t_id = \`OrderModel\`.\`t_id\`
              ORDER BY ll.l_id DESC
              LIMIT 1
            )`),
            "latest_lock_user_name",
          ],
        ],
      },
    });

    return orders;
  }

  async getOrderDetail(o_id, { memberCode, discountId, discountMode } = {}) {
    const order = await Order.findOne({
      where: { o_id },
      attributes: ["o_id", "is_id", "t_id", "ta_id", "o_start_time", "o_pax", "m_code", "u_id"],
      include: [
        {
          model: TablesArea,
          attributes: ["ta_name"],
          required: false,
        },
        {
          model: Tables,
          attributes: ["t_name"],
          required: false,
        },
        {
          model: User,
          attributes: ["u_id", "u_name"],
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
        od_name: row.od_name || row.Item?.i_name || "",
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
    const maxCounter = (await ItemSale.max("is_counter")) || 0;
    const nextCounter = parseInt(maxCounter, 10) + 1;

    return {
      o_id: order?.o_id || null,
      is_id: order?.is_id || null,
      next_is_counter: nextCounter,
      o_start_time: order?.o_start_time || null,
      o_pax: parseInt(order?.o_pax || 0, 10) || 0,
      t_name: order?.Table?.t_name || null,
      ta_name: order?.TablesArea?.ta_name || null,
      u_id: order?.u_id || null,
      u_name: order?.User?.u_name || null,
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

  async lockOrder(o_id, { userId, posId, posIp }) {
    const order = await Order.findByPk(o_id, {
      attributes: ["o_id", "t_id"],
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const latestLock = await LogLock.findOne({
      where: { t_id: order.t_id },
      order: [["l_id", "DESC"]],
      include: [
        {
          model: User,
          attributes: ["u_name"],
          required: false,
        },
      ],
    });

    const latestState = latestLock?.lock_state;
    const lockedByOtherUser =
      latestState === "Locked" &&
      String(latestLock?.u_id || "") !== String(userId || "");

    if (lockedByOtherUser) {
      const err = new Error("ORDER_LOCKED");
      err.lockedBy = latestLock?.User?.u_name || null;
      throw err;
    }

    const lockId = latestState === "Locked"
      ? latestLock.lock_id
      : this.generateLockId();

    const lock = await LogLock.create({
      u_id: userId,
      t_id: order.t_id,
      lock_id: lockId,
      l_type: "Lock",
      pos_id: posId || null,
      pos_ip: posIp || null,
      lock_state: "Locked",
      l_entry: this.nowWib(),
    });

    await Tables.update(
      {
        t_lock_id: lock.lock_id,
        t_locked_by: lock.u_id,
        t_last_ping: this.nowWib(),
      },
      {
        where: { t_id: order.t_id },
      },
    );

    return {
      order_id: order.o_id,
      t_id: order.t_id,
      lock_id: lock.lock_id,
      lock_state: lock.lock_state,
    };
  }

  async unlockOrder(o_id, { userId, posId, posIp }) {
    const order = await Order.findByPk(o_id, {
      attributes: ["o_id", "t_id"],
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const latestLock = await LogLock.findOne({
      where: { t_id: order.t_id },
      order: [["l_id", "DESC"]],
    });

    const lock = await LogLock.create({
      u_id: userId,
      t_id: order.t_id,
      lock_id: latestLock?.lock_id || this.generateLockId(),
      l_type: "Unlock",
      pos_id: posId || null,
      pos_ip: posIp || null,
      lock_state: "Unlocked",
      l_entry: this.nowWib(),
    });

    await Tables.update(
      {
        t_lock_id: null,
        t_locked_by: null,
        t_last_ping: this.nowWib(),
      },
      {
        where: { t_id: order.t_id },
      },
    );

    return {
      order_id: order.o_id,
      t_id: order.t_id,
      lock_id: lock.lock_id,
      lock_state: lock.lock_state,
    };
  }

  generateLockId() {
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("");
  }

  nowWib() {
    return Sequelize.literal("DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR)");
  }
}

module.exports = new OrderService();
