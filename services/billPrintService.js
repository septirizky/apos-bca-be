const {
  Sequelize,
  sequelize,
  Config,
  Order,
  OrderDetail,
  Item,
  ItemSubcategory,
  ItemCategory,
  Tables,
  TablesArea,
  Member,
  User,
  OrderHistory,
  OrderHistoryDetail,
  LogPrint,
} = require("../models");
const discountEngineService = require("./discountEngineService");
const printerService = require("./printerService");

const ZERO_MYSQL_DATE = "0000-00-00 00:00:00";
const PRINT_WIDTH = 32;

class BillPrintService {
  async printInitiationBill({
    orderId,
    userId,
    userName,
    printerTarget,
    printerIp,
    printerPort,
    posId,
    posIp,
  }) {
    return sequelize.transaction(async (transaction) => {
      const branchId = await this.branchId(transaction);
      const order = await this.loadOrder(orderId, transaction);
      const details = await this.loadDetails(orderId, transaction);
      const calculated = await this.calculate(order, details, transaction);
      const printCount = await this.nextPrintCount(orderId, transaction);
      const now = this.nowWib();
      const messageNow = this.currentWibString();
      const cashierName = await this.userName(userId, userName, transaction);
      const waiterName = order.User?.u_name || cashierName || "";
      const memberLabel = await this.memberLabel(order.m_code, transaction);
      const tableName = order.Table?.t_name || order.t_id || "";
      const areaName = order.TablesArea?.ta_name || "";

      const plainMessage = this.buildInitiationMessage({
        order,
        details,
        calculated,
        printCount,
        settledAt: messageNow,
        cashierName,
        waiterName,
        memberLabel,
        tableName,
        areaName,
      });
      const sourceMessage = this.toInitiationRtf(plainMessage);

      const initiationHistory = await this.createHistory({
        branchId,
        order,
        userId,
        type: "Initiation",
        desc: `${this.formatMoney(calculated.total)}.00`,
        areaName,
        now,
        transaction,
      });
      await this.createHistoryDetails({
        branchId,
        historyId: initiationHistory.oh_id,
        details,
        now,
        transaction,
      });

      const lockHistory = await this.createHistory({
        branchId,
        order,
        userId,
        type: "Order Lock",
        desc: "[Kunci otomatis karena pencetakan bill]",
        areaName,
        now,
        transaction,
      });
      await this.createHistoryDetails({
        branchId,
        historyId: lockHistory.oh_id,
        details,
        now,
        transaction,
      });

      await Order.update(
        { o_locked: "True" },
        { where: { o_id: order.o_id }, transaction },
      );

      const logPrint = await LogPrint.create(
        {
          br_id: branchId,
          u_id: userId || order.u_id || 0,
          is_id: order.is_id || 0,
          o_id: order.o_id,
          t_id: order.t_id || 0,
          ts_id: order.Table?.ts_id || 0,
          ta_id: order.ta_id || 0,
          lp_print_type: "Bill",
          lp_title: `Table ${tableName}`,
          lp_message: plainMessage,
          lp_message_source: sourceMessage,
          lp_message_script: "",
          lp_printer_name: "Final",
          lp_print_counter: 0,
          lp_count: printCount,
          lp_time: now,
          lp_ip: posIp || "",
          pos_id: posId || "",
          lp_printed: "False",
          lp_rpm_printed: "False",
          lp_print_time: this.zeroDate(),
          lp_loaded: "False",
          lp_load_time: this.zeroDate(),
          lp_redirected: "False",
          lp_redirect_time: this.zeroDate(),
          lp_delayed_print: "True",
          lp_rpm_session: "",
        },
        { transaction },
      );

      if (String(printerTarget || "").toUpperCase() === "EPSON") {
        await printerService.printEpsonNetwork({
          printerIp,
          printerPort,
          content: sourceMessage,
        });
      }

      return {
        success: true,
        message:
          printerTarget === "EPSON"
            ? "Bill terkirim ke Epson"
            : "Bill siap dicetak di EDC",
        lp_id: logPrint.lp_id,
        is_id: order.is_id,
        lp_message: plainMessage,
        lp_message_source: sourceMessage,
      };
    });
  }

  async loadOrder(orderId, transaction) {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: TablesArea, attributes: ["ta_name"], required: false },
        { model: Tables, attributes: ["t_name", "ts_id"], required: false },
        { model: User, attributes: ["u_name"], required: false },
      ],
      transaction,
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    return order;
  }

  async loadDetails(orderId, transaction) {
    return OrderDetail.findAll({
      where: { o_id: orderId },
      include: [
        {
          model: Item,
          required: false,
          include: [
            {
              model: ItemSubcategory,
              required: false,
              include: [{ model: ItemCategory, required: false }],
            },
          ],
        },
      ],
      order: [["od_id", "ASC"]],
      transaction,
    });
  }

  async calculate(order, details, transaction) {
    let foodTotal = 0;
    let beverageTotal = 0;
    let otherTotal = 0;
    let cookingCharge = 0;

    details.forEach((detail) => {
      const qty = this.toNumber(detail.od_quantity);
      const price = this.toNumber(detail.Item?.i_sell_price || detail.od_price);
      const kind = String(detail.Item?.i_kind || "Other")
        .trim()
        .toLowerCase();
      if (kind === "food") foodTotal += qty * price;
      else if (kind === "beverage") beverageTotal += qty * price;
      else otherTotal += qty * price;
      cookingCharge += qty * this.toNumber(detail.Item?.i_cooking_charge);
    });

    const discountResult = await discountEngineService.applyDiscount({
      orderDetails: details,
      memberCode: order.m_code || null,
      referenceTime: order.o_start_time ? new Date(order.o_start_time) : null,
    });
    const discountTotal = this.toNumber(discountResult.discountTotal);
    const totalBeforeDiscount = foodTotal + beverageTotal + otherTotal;
    const subtotal = totalBeforeDiscount - discountTotal;
    const vatPercent = this.toNumber(
      await this.configValue("VAT", 0, transaction),
    );
    const pbjt = ((subtotal + cookingCharge) * vatPercent) / 100;

    return {
      foodTotal,
      beverageTotal,
      otherTotal,
      totalBeforeDiscount,
      discountTotal,
      subtotal,
      cookingCharge,
      vatPercent,
      pbjt,
      total: subtotal + cookingCharge + pbjt,
      perItem: discountResult.perItem || {},
    };
  }

  buildInitiationMessage({
    order,
    details,
    calculated,
    printCount,
    settledAt,
    cashierName,
    waiterName,
    memberLabel,
    tableName,
    areaName,
  }) {
    const lines = [
      "TAGIHAN SEMENTARA",
      "Harap menunggu Final Bill untuk",
      "penyelesaian pembayaran.",

      memberLabel || "",
      `---------------------- Print # ${printCount}`,
      `Initiated   : ${this.formatDateTime(order.o_start_time)}`,
      `Settled     : ${settledAt}`,
      `Waiter      : ${waiterName || "-"}`,
      `Cashier     : ${cashierName || "-"}`,
      "---------------------------------",
      `${order.o_pax || 0}  Pax`,
      `Table ${tableName}/${areaName}`,
      "=================================",
    ];

    details.forEach((detail) => {
      const qty = this.toNumber(detail.od_quantity);
      const price = this.toNumber(detail.Item?.i_sell_price || detail.od_price);
      const itemTotal = qty * price;
      const itemName = detail.od_name || detail.Item?.i_name || "";
      lines.push(itemName);
      lines.push(
        this.receiptLine(
          `${this.padLeft(this.formatQty(qty), 2)}    x ${this.padLeft(this.formatMoney(price), 8)}`,
          itemTotal,
          "=",
        ),
      );

      const discounts = calculated.perItem[detail.od_id]?.discounts || [];
      discounts
        .filter((discount) => discount.is_applied !== false)
        .forEach((discount) => {
          const percent = this.formatPercent(
            discount.dd_value ?? discount.discount_percent,
          );
          lines.push(this.discountLine(percent, discount.discount_amount));
        });
    });

    lines.push("__RIGHT__----------");
    if (calculated.foodTotal > 0)
      lines.push(this.receiptLine("Food Total", calculated.foodTotal));
    if (calculated.beverageTotal > 0)
      lines.push(this.receiptLine("Beverage Total", calculated.beverageTotal));
    if (calculated.otherTotal > 0)
      lines.push(this.receiptLine("Other Total", calculated.otherTotal));
    lines.push("");
    lines.push(
      this.receiptLine("Total Bef. Disc.", calculated.totalBeforeDiscount),
    );
    lines.push(this.receiptLine("Total Discount", calculated.discountTotal));
    lines.push(this.receiptLine("Subtotal", calculated.subtotal));
    if (calculated.cookingCharge > 0)
      lines.push(this.receiptLine("Cooking Charge", calculated.cookingCharge));
    lines.push(
      this.receiptLine(
        `PBJT      ${this.toNumber(calculated.vatPercent).toFixed(2)}%`,
        calculated.pbjt,
      ),
    );
    lines.push("");
    lines.push(this.receiptLine("Total", calculated.total));
    lines.push("TEMP BILL / TAGIHAN SEMENTARA");
    lines.push("Harap periksa kembali tagihan");
    lines.push("anda sebelum anda membayar");

    return lines.join("\n");
  }

  toInitiationRtf(message) {
    return `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033{\\fonttbl{\\f0\\fnil FontA11;}{\\f1\\fnil FontB22;}{\\f2\\fnil Consolas;}}\n\\viewkind4\\uc1\\pard\\f0\\fs18 ${message
      .split("\n")
      .map((line) => `${this.rtfLine(line)}\\par`)
      .join("")}\\f2\\fs22\\par\n}`;
  }

  rtfLine(line) {
    let escaped = this.escapeRtf(line);
    if (/^Table /.test(line) || /^Total\s{2,}/.test(line)) {
      escaped = `\\f1 ${escaped}\\f0`;
    }
    return escaped;
  }

  async createHistory({
    branchId,
    order,
    userId,
    type,
    desc,
    areaName,
    now,
    transaction,
  }) {
    return OrderHistory.create(
      {
        br_id: branchId,
        oh_type: type,
        oh_module: "TABLE",
        o_id: order.o_id,
        is_id: order.is_id || 0,
        t_id: order.t_id || 0,
        t_id_dest: 0,
        i_id: 0,
        u_id: userId || order.u_id || 0,
        u_id_alt: 0,
        oh_qty: 0,
        oh_desc: desc,
        oh_table_area: areaName || "",
        oh_options: "",
        oh_entry: now,
        oh_deletion: this.zeroDate(),
        oh_status: "Active",
      },
      { transaction },
    );
  }

  async createHistoryDetails({
    branchId,
    historyId,
    details,
    now,
    transaction,
  }) {
    await Promise.all(
      details.map((detail) =>
        OrderHistoryDetail.create(
          {
            br_id: branchId,
            oh_id: historyId,
            i_id: detail.i_id || 0,
            ohd_qty: this.toNumber(detail.od_quantity),
            ohd_price: this.toNumber(
              detail.Item?.i_sell_price || detail.od_price,
            ),
            ohd_entry_time: now,
            ohd_entry: this.zeroDate(),
            ohd_deletion: this.zeroDate(),
            ohd_stamp: Sequelize.literal("CURRENT_TIMESTAMP"),
            ohd_status: "Active",
          },
          { transaction },
        ),
      ),
    );
  }

  async nextPrintCount(orderId, transaction) {
    return (
      (await LogPrint.count({
        where: { o_id: orderId, lp_print_type: "Bill" },
        transaction,
      })) + 1
    );
  }

  async branchId(transaction) {
    return (
      this.toNumber(await this.configValue("BRANCH_ID", 1, transaction)) || 1
    );
  }

  async configValue(key, fallback, transaction) {
    const config = await Config.findOne({
      where: { c_key: key },
      attributes: ["c_value"],
      transaction,
    });
    return config?.c_value ?? fallback;
  }

  async userName(userId, fallback, transaction) {
    if (fallback) return fallback;
    const user = userId
      ? await User.findByPk(userId, { attributes: ["u_name"], transaction })
      : null;
    return user?.u_name || "";
  }

  async memberLabel(memberCode, transaction) {
    if (!memberCode) return "";
    const member = await Member.findOne({
      where: { m_code: memberCode },
      attributes: ["m_name", "m_code"],
      transaction,
    });
    return member?.m_name || memberCode;
  }

  nowWib() {
    return Sequelize.literal("DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR)");
  }

  currentWibString() {
    const date = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return (
      [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        String(date.getUTCDate()).padStart(2, "0"),
      ].join("-") +
      ` ${[
        String(date.getUTCHours()).padStart(2, "0"),
        String(date.getUTCMinutes()).padStart(2, "0"),
        String(date.getUTCSeconds()).padStart(2, "0"),
      ].join(":")}`
    );
  }

  zeroDate() {
    return Sequelize.literal(`'${ZERO_MYSQL_DATE}'`);
  }

  toNumber(value) {
    const number = Number.parseFloat(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  formatQty(value) {
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(2).replace(/\.?0+$/, "");
  }

  formatMoney(value) {
    return Math.round(this.toNumber(value)).toLocaleString("en-US");
  }

  formatPercent(value) {
    const number = this.toNumber(value);
    return Number.isInteger(number)
      ? `${number}.0`
      : number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  padLeft(value, size) {
    return String(value || "").padStart(size, " ");
  }

  receiptLine(label, amount, separator = "") {
    const value = `${separator}${separator ? " " : ""}${this.formatMoney(amount)}`;
    const left = String(label || "");
    const spacing = Math.max(1, PRINT_WIDTH - left.length - value.length);
    return `${left}${" ".repeat(spacing)}${value}`;
  }

  discountLine(percent, amount) {
    const value = `-${this.formatMoney(amount)}`;
    return `[1] [${percent}%] ${value}`.padStart(PRINT_WIDTH, " ");
  }

  formatDateTime(value) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return (
      [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-") +
      ` ${[
        String(date.getHours()).padStart(2, "0"),
        String(date.getMinutes()).padStart(2, "0"),
        String(date.getSeconds()).padStart(2, "0"),
      ].join(":")}`
    );
  }

  escapeRtf(value) {
    return String(value || "").replace(/[\\{}]/g, "\\$&");
  }
}

module.exports = new BillPrintService();
