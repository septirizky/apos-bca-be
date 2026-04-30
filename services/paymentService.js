const {
  sequelize,
  Sequelize,
  Config,
  Order,
  OrderDetail,
  OrderDetailOption,
  Item,
  ItemSubcategory,
  ItemCategory,
  ItemSale,
  ItemSaleDetail,
  ItemSaleDetailOption,
  ItemSalePayment,
  ItemSaleDiscount,
  OrderHistory,
  OrderHistoryDetail,
  LogPrint,
  LogLock,
  Tables,
  TablesArea,
  TablesSection,
  DownPayment,
  Voucher,
  CardType,
  CardTypePattern,
  BranchEdc,
  User,
} = require("../models");
const discountEngineService = require("./discountEngineService");

const ZERO_DATE = "2000-01-01 00:00:00";
const ZERO_MYSQL_DATE = "0000-00-00 00:00:00";

class PaymentService {
  toNumber(value) {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  nowWib() {
    return Sequelize.literal("DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR)");
  }

  todayWib() {
    return Sequelize.literal("DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR))");
  }

  async getConfigValue(key, fallback = null, transaction = null) {
    const config = await Config.findOne({
      where: { c_key: key },
      attributes: ["c_value"],
      transaction,
    });
    return config?.c_value ?? fallback;
  }

  async processPayment({
    o_id,
    is_id,
    is_counter,
    u_id,
    dp_id,
    payment_method,
    voucher_code,
    voucher_id,
    voucher_amount,
    apos_partner_ref_id,
    apos_trace_no,
    apos_approval_code,
    apos_ref_no,
    apos_card_number,
    apos_acquirer_type,
    pos_id,
    pos_ip,
    u_name,
  }) {
    const transaction = await sequelize.transaction();

    try {
      const branchId = parseInt(
        await this.getConfigValue("BRANCH_ID", 1, transaction),
        10,
      ) || 1;
      const vatPercent = this.toNumber(
        await this.getConfigValue("VAT", 0, transaction),
      );

      const order = await Order.findByPk(o_id, {
        attributes: [
          "o_id",
          "br_id",
          "is_id",
          "t_id",
          "ta_id",
          "cs_id",
          "o_start_time",
          "o_pax",
          "m_code",
          "u_id",
        ],
        include: [
          {
            model: Tables,
            attributes: ["t_id", "t_name", "ts_id"],
            include: [{ model: TablesSection, attributes: ["ts_id", "ts_name"] }],
          },
          { model: TablesArea, attributes: ["ta_id", "ta_name"] },
        ],
        transaction,
      });

      if (!order) {
        throw new Error("Order tidak ditemukan");
      }

      const orderDetails = await OrderDetail.findAll({
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
                include: [{ model: ItemCategory, attributes: ["ic_id", "ic_name"] }],
              },
            ],
          },
          {
            model: OrderDetailOption,
            attributes: ["odo_id", "o_id", "od_id", "op_id"],
          },
        ],
        transaction,
      });

      if (!orderDetails.length) {
        throw new Error("Order detail tidak ditemukan");
      }

      const discountResult = await discountEngineService.applyDiscount({
        orderDetails,
        memberCode: order.m_code,
        referenceTime: order.o_start_time ? new Date(order.o_start_time) : null,
      });

      const calculated = this.calculateSummary(
        orderDetails,
        discountResult,
        vatPercent,
      );
      const requestedCounter = parseInt(is_counter || 0, 10);
      const maxCounter = (await ItemSale.max("is_counter", { transaction })) || 0;
      const nextCounter = parseInt(maxCounter, 10) + 1;
      const transactionCounter =
        requestedCounter > parseInt(maxCounter, 10) ? requestedCounter : nextCounter;

      const downPayment = dp_id
        ? await DownPayment.findOne({ where: { dp_id }, transaction })
        : null;
      const dpAmount = downPayment ? this.toNumber(downPayment.dp_amount) : 0;

      const voucher = voucher_id
        ? await Voucher.findOne({ where: { v_id: voucher_id }, transaction })
        : voucher_code
          ? await Voucher.findOne({ where: { v_code: voucher_code }, transaction })
          : null;

      if (voucher && voucher.v_status !== "New") {
        throw new Error("Voucher sudah digunakan");
      }

      const voucherAmountValue = voucher
        ? this.toNumber(voucher.v_nominal)
        : this.toNumber(voucher_amount);
      const cardAmount = Math.max(
        0,
        calculated.total - dpAmount - voucherAmountValue,
      );

      const paymentMetadata = {
        payment_method: payment_method || null,
        voucher_id: voucher?.v_id || null,
        voucher_code: voucher?.v_code || voucher_code || null,
        apos_partner_ref_id: apos_partner_ref_id || null,
      };

      await ItemSale.update(
        {
          br_id: branchId,
          is_date: this.todayWib(),
          is_transaction_time: this.nowWib(),
          is_discount_amount: calculated.discountTotal,
          is_discount_percent: 0,
          is_vat_amount: calculated.pbjt,
          is_vat_percent: vatPercent,
          is_dp: 0,
          is_voucher_amount: 0,
          is_total_before_disc: calculated.totalBeforeDiscount,
          is_total_before_vat: calculated.subtotal,
          is_cooking_charge: calculated.cookingCharge,
          is_rounding: 0,
          is_total: calculated.total,
          is_pax: order.o_pax || 0,
          is_payment_status: "Direct",
          is_counter: transactionCounter,
          is_status: "Active",
          u_id,
          is_pos_id: pos_id || "",
          m_trans_data: JSON.stringify(paymentMetadata),
        },
        { where: { is_id }, transaction },
      );

      const detailIdByOrderDetailId = new Map();
      for (const detail of orderDetails) {
        const row = detail.toJSON();
        const item = row.Item || {};
        const qty = this.toNumber(row.od_quantity);
        const sellPrice = this.toNumber(item.i_sell_price || row.od_price);
        const perItemDiscount = discountResult.perItem[row.od_id] || {};
        const discountAmount = this.toNumber(perItemDiscount.discount_amount);
        const discountPercent = this.toNumber(perItemDiscount.discount_percent);
        const subtotal = qty * sellPrice - discountAmount;

        const saleDetail = await ItemSaleDetail.create(
          {
            br_id: branchId,
            is_id,
            isd_guid: "",
            i_id: row.i_id || 0,
            u_id,
            isd_quantity: qty,
            isd_quantity_alt: 0,
            isd_sell_price: sellPrice,
            isd_sale_price: 0,
            isd_option_price: 0,
            isd_discount_amount: discountAmount,
            isd_discount_percent: discountPercent,
            isd_subtotal: subtotal,
            isd_item_cost: 0,
            isd_item_point: 0,
            isd_ratio: 0,
            isd_description: "",
            isd_name: "",
            isd_alt_name: row.od_alt_name || "",
            isd_tag: "",
            isd_tax_free: row.od_tax_free || "False",
            isd_service_free: row.od_service_free || "False",
            isd_entry: this.nowWib(),
            isd_deletion: this.zeroMysqlDate(),
            isd_status: "Active",
          },
          { transaction },
        );

        detailIdByOrderDetailId.set(row.od_id, saleDetail.isd_id);

        for (const option of row.OrderDetailOptions || []) {
          await ItemSaleDetailOption.create(
            {
              br_id: branchId,
              isd_id: saleDetail.isd_id,
              op_id: option.op_id || 0,
              isdo_item_cost: 0,
              op_price: 0,
            },
            { transaction },
          );
        }
      }

      const paymentLines = await this.createPayments({
        branchId,
        isId: is_id,
        cardAmount,
        downPayment,
        dpAmount,
        voucher,
        voucherAmount: voucherAmountValue,
        paymentMethod: payment_method,
        apos_trace_no,
        apos_approval_code,
        apos_ref_no,
        apos_card_number,
        apos_acquirer_type,
        transaction,
      });

      if (downPayment) {
        await DownPayment.update(
          {
            dp_status: "Used",
            is_id,
            dp_use_time: this.nowWib(),
            dp_use_id: u_id,
          },
          { where: { dp_id }, transaction },
        );
      }

      if (voucher) {
        await Voucher.update(
          {
            v_status: "Used",
            is_id,
            u_id,
            v_used_time: this.nowWib(),
          },
          { where: { v_id: voucher.v_id, v_status: "New" }, transaction },
        );
      }

      for (const discount of discountResult.discounts || []) {
        await ItemSaleDiscount.create(
          {
            br_id: branchId,
            is_id,
            d_id: discount.d_id || 0,
            isdc_entry: this.nowWib(),
            isdc_deletion: this.zeroMysqlDate(),
            isdc_status: "Active",
          },
          { transaction },
        );
      }

      const finalHistory = await OrderHistory.create(
        {
          br_id: branchId,
          oh_type: "Final",
          oh_module: "TABLE",
          o_id,
          is_id,
          t_id: order.t_id || 0,
          t_id_dest: 0,
          i_id: 0,
          u_id,
          u_id_alt: 0,
          oh_qty: 0,
          oh_desc: this.formatMoney(calculated.total),
          oh_table_area: order.TablesArea?.ta_name || "",
          oh_options: "",
          oh_entry: this.nowWib(),
          oh_deletion: this.zeroMysqlDate(),
          oh_status: "Active",
        },
        { transaction },
      );

      await this.createOrderHistoryDetails({
        branchId,
        orderHistoryId: finalHistory.oh_id,
        orderDetails,
        transaction,
      });

      const [cashierName, waiterName] = await Promise.all([
        this.getUserName(u_id, u_name, transaction),
        this.getUserName(order.u_id, null, transaction),
      ]);
      const settledAt = new Date();

      await this.unlockTable({ order, userId: u_id, posId: pos_id, posIp: pos_ip, transaction });

      await this.createLogPrint({
        branchId,
        order,
        details: orderDetails,
        calculated,
        isId: is_id,
        userId: u_id,
        posId: pos_id,
        posIp: pos_ip,
        cashierName,
        waiterName,
        settledAt,
        paymentLines,
        discounts: discountResult.discounts || [],
        receiptInfo: await this.getReceiptInfo(transaction),
        transaction,
      });

      await OrderDetailOption.destroy({ where: { o_id }, transaction });
      await OrderDetail.destroy({ where: { o_id }, transaction });
      await Order.destroy({ where: { o_id }, transaction });

      await transaction.commit();

      return {
        success: true,
        is_id,
        is_counter: transactionCounter,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  calculateSummary(orderDetails, discountResult, vatPercent) {
    let foodTotal = 0;
    let beverageTotal = 0;
    let otherTotal = 0;
    let cookingCharge = 0;

    orderDetails.forEach((detail) => {
      const qty = this.toNumber(detail.od_quantity);
      const price = this.toNumber(detail.Item?.i_sell_price || detail.od_price);
      const total = qty * price;
      const cooking = this.toNumber(detail.Item?.i_cooking_charge) * qty;
      const kind = String(detail.Item?.i_kind || "Other").trim().toLowerCase();

      if (kind === "food") foodTotal += total;
      else if (kind === "beverage") beverageTotal += total;
      else otherTotal += total;

      cookingCharge += cooking;
    });

    const discountTotal = this.toNumber(discountResult.discountTotal);
    const totalBeforeDiscount = foodTotal + beverageTotal + otherTotal;
    const subtotal = totalBeforeDiscount - discountTotal;
    const pbjt = ((subtotal + cookingCharge) * vatPercent) / 100;
    const total = subtotal + cookingCharge + pbjt;

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
      total,
    };
  }

  async createPayments({
    branchId,
    isId,
    cardAmount,
    downPayment,
    dpAmount,
    voucher,
    voucherAmount,
    paymentMethod,
    apos_trace_no,
    apos_approval_code,
    apos_ref_no,
    apos_card_number,
    apos_acquirer_type,
    transaction,
  }) {
    const paymentLines = [];

    if (downPayment && dpAmount > 0) {
      await ItemSalePayment.create(
        this.paymentRow({
          branchId,
          isId,
          type: "DownPayment",
          amount: dpAmount,
          dpId: downPayment.dp_id,
          cardNumber: downPayment.dp_code || "",
          signerName: downPayment.dp_name || "",
        }),
        { transaction },
      );
      paymentLines.push({
        type: "DOWN PAYMENT",
        detail: [downPayment.dp_code, downPayment.dp_name, downPayment.dp_id]
          .filter(Boolean)
          .join("/"),
        amount: dpAmount,
      });
    }

    if (voucher && voucherAmount > 0) {
      await ItemSalePayment.create(
        this.paymentRow({
          branchId,
          isId,
          type: "Voucher",
          amount: voucherAmount,
          voucherId: voucher.v_id,
          voucherNumber: voucher.v_code || "",
          voucherValue: voucherAmount,
        }),
        { transaction },
      );
      paymentLines.push({
        type: "VOUCHER",
        detail: voucher.v_code || "",
        amount: voucherAmount,
      });
    }

    if (cardAmount > 0 || paymentMethod) {
      const cardMeta = await this.resolveCardPaymentMeta({
        branchId,
        cardNumber: apos_card_number,
        acquirerType: apos_acquirer_type,
        transaction,
      });
      await ItemSalePayment.create(
        this.paymentRow({
          branchId,
          isId,
          type: "Card",
          amount: cardAmount,
          ctId: cardMeta.cardTypeId,
          beId: cardMeta.branchEdcId,
          cardNumber: cardMeta.cardNumber,
          trace: apos_trace_no || "",
          approval: apos_approval_code || "",
          rrn: apos_ref_no || "",
        }),
        { transaction },
      );
      paymentLines.push({
        type: cardMeta.cardTypeName || paymentMethod || "CARD",
        detail: "**** ****",
        amount: cardAmount,
      });
    }

    return paymentLines;
  }

  async createOrderHistoryDetails({
    branchId,
    orderHistoryId,
    orderDetails,
    transaction,
  }) {
    for (const detail of orderDetails) {
      await OrderHistoryDetail.create(
        {
          br_id: branchId,
          oh_id: orderHistoryId,
          i_id: detail.i_id || 0,
          ohd_qty: this.toNumber(detail.od_quantity),
          ohd_price: this.toNumber(detail.Item?.i_sell_price || detail.od_price),
          ohd_entry_time: this.nowWib(),
          ohd_entry: this.zeroMysqlDate(),
          ohd_deletion: this.zeroMysqlDate(),
          ohd_stamp: Sequelize.literal("CURRENT_TIMESTAMP"),
          ohd_status: "Active",
        },
        { transaction },
      );
    }
  }

  paymentRow({
    branchId,
    isId,
    type,
    amount,
    ctId = 0,
    beId = 0,
    voucherId = 0,
    dpId = 0,
    cardNumber = "",
    signerName = "",
    voucherNumber = "",
    voucherValue = 0,
    trace = "",
    approval = "",
    rrn = "",
  }) {
    return {
      br_id: branchId,
      is_id: isId,
      isp_type: type,
      ct_id: ctId,
      ct_id_detected: ctId,
      cc_id: 0,
      v_id: voucherId,
      be_id: beId,
      dt_id: 0,
      ce_id: 0,
      dp_id: dpId,
      dp_type: 0,
      isp_card_number: String(cardNumber).slice(0, 20),
      isp_card_holder: "",
      isp_signer_name: String(signerName).slice(0, 20),
      isp_voucher_number: String(voucherNumber).slice(0, 32),
      isp_trace_num: String(trace).slice(0, 32),
      isp_appr_code: String(approval).slice(0, 32),
      isp_rrn: String(rrn).slice(0, 32),
      isp_voucher_value: voucherValue,
      isp_tendered: 0,
      isp_rate: 0,
      isp_change: 0,
      isp_rounding: 0,
      isp_card_issuer: 0,
      isp_amount: amount,
      isp_paid: "True",
      isp_paid_date: this.nowWib(),
      isp_entry: this.nowWib(),
      isp_deletion: this.zeroMysqlDate(),
      isp_status: "Active",
    };
  }

  async resolveCardPaymentMeta({ branchId, cardNumber, acquirerType, transaction }) {
    const bin = this.extractCardBin(cardNumber);
    const [branchEdc, cardPattern] = await Promise.all([
      BranchEdc.findOne({
        where: {
          br_id: branchId,
          be_name: { [Sequelize.Op.like]: "%BCA%" },
          [Sequelize.Op.or]: [{ be_status: "Active" }, { be_status: null }],
        },
        attributes: ["be_id"],
        transaction,
      }),
      bin
        ? CardTypePattern.findOne({
            where: {
              cp_status: "Active",
              cp_pattern: bin,
            },
            attributes: ["ct_id"],
            transaction,
          })
        : null,
    ]);

    const cardTypeId = cardPattern?.ct_id || 52;

    const cardType = await CardType.findOne({
      where: {
        ct_id: cardTypeId,
        ct_status: "Active",
      },
      attributes: ["ct_name"],
      transaction,
    });

    return {
      branchEdcId: branchEdc?.be_id || 0,
      cardTypeId,
      cardTypeName: cardType?.ct_name || acquirerType || "",
      cardNumber: bin,
    };
  }

  extractCardBin(cardNumber) {
    const digits = String(cardNumber || "").replace(/\D/g, "");
    return digits.length >= 6 ? digits.slice(0, 6) : "";
  }

  async unlockTable({ order, userId, posId, posIp, transaction }) {
    const latestLock = await LogLock.findOne({
      where: { t_id: order.t_id },
      order: [["l_id", "DESC"]],
      transaction,
    });

    await LogLock.create(
      {
        u_id: userId,
        t_id: order.t_id,
        lock_id: latestLock?.lock_id || this.generateLockId(),
        l_type: "Unlock",
        pos_id: posId || null,
        pos_ip: posIp || null,
        lock_state: "Unlocked",
        l_entry: this.nowWib(),
      },
      { transaction },
    );

    await Tables.update(
      {
        t_lock_id: null,
        t_locked_by: null,
        t_last_ping: this.nowWib(),
      },
      { where: { t_id: order.t_id }, transaction },
    );
  }

  generateLockId() {
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("");
  }

  async getReceiptInfo(transaction) {
    const configs = await Config.findAll({
      where: { c_key: ["BRANCH_NAME", "INFO1", "INFO2", "INFO3"] },
      transaction,
    });
    const infoMap = configs.reduce((acc, config) => {
      acc[config.c_key] = config.c_value;
      return acc;
    }, {});
    return [
      infoMap.BRANCH_NAME,
      infoMap.INFO1,
      infoMap.INFO2,
      infoMap.INFO3,
    ].filter(Boolean);
  }

  async createLogPrint({
    branchId,
    order,
    details,
    calculated,
    isId,
    userId,
    posId,
    posIp,
    cashierName,
    waiterName,
    settledAt,
    paymentLines,
    discounts,
    receiptInfo,
    transaction,
  }) {
    const tableName = order.Table?.t_name || order.t_id;
    const areaName = order.TablesArea?.ta_name || "";
    const plainMessage = this.buildPrintMessage({
      receiptInfo,
      isId,
      tableName,
      areaName,
      order,
      details,
      calculated,
      cashierName,
      waiterName,
      settledAt,
      paymentLines,
      discounts,
    });
    const sourceMessage = this.toRtfSource(plainMessage);

    await LogPrint.create(
      {
        br_id: branchId,
        u_id: userId,
        is_id: isId,
        o_id: order.o_id,
        t_id: order.t_id || 0,
        ts_id: order.Table?.ts_id || 0,
        ta_id: order.ta_id || 0,
        lp_print_type: "Final",
        lp_title: `Table ${tableName}`,
        lp_message: plainMessage,
        lp_message_source: sourceMessage,
        lp_message_script: "",
        lp_printer_name: "LOCAL",
        lp_print_counter: 0,
        lp_count: 1,
        lp_time: this.nowWib(),
        lp_ip: posIp || "",
        pos_id: posId || "",
        lp_printed: "False",
        lp_rpm_printed: "False",
        lp_print_time: this.zeroMysqlDate(),
        lp_loaded: "False",
        lp_load_time: this.zeroMysqlDate(),
        lp_redirected: "False",
        lp_redirect_time: this.zeroMysqlDate(),
        lp_delayed_print: "True",
        lp_rpm_session: "",
      },
      { transaction },
    );
  }

  buildPrintMessage({
    receiptInfo,
    isId,
    tableName,
    areaName,
    order,
    details,
    calculated,
    cashierName,
    waiterName,
    settledAt,
    paymentLines,
    discounts,
  }) {
    const lines = [
      ...receiptInfo,
      "",
      `#${isId} /`,
      "---------------------------------",
      `Initiated   : ${this.formatDateTime(order.o_start_time)}`,
      `Settled     : ${this.formatDateTime(settledAt)}`,
      `Waiter      : ${waiterName || "-"}`,
      `Cashier     : ${cashierName || "-"}`,
      "---------------------------------",
      `${order.o_pax || 0}  Pax`,
      `        Table ${tableName}/${areaName}`,
      "Welcome,",
      "=================================",
    ];

    details.forEach((detail) => {
      const qty = this.toNumber(detail.od_quantity);
      const price = this.toNumber(detail.Item?.i_sell_price || detail.od_price);
      lines.push(detail.od_name || detail.Item?.i_name || "");
      lines.push(
        `${this.padLeft(this.formatQty(qty), 2)}    x ${this.padLeft(
          this.formatMoney(price),
          8,
        )}       =${this.padLeft(this.formatMoney(qty * price), 9)}`,
      );
    });

    lines.push("                       ----------");
    if (calculated.foodTotal > 0) {
      lines.push(`Food Total              ${this.padLeft(this.formatMoney(calculated.foodTotal), 9)}`);
    }
    if (calculated.beverageTotal > 0) {
      lines.push(`Beverage Total          ${this.padLeft(this.formatMoney(calculated.beverageTotal), 9)}`);
    }
    if (calculated.otherTotal > 0) {
      lines.push(`Other Total             ${this.padLeft(this.formatMoney(calculated.otherTotal), 9)}`);
    }
    lines.push("");
    lines.push(`Total Bef. Disc.        ${this.padLeft(this.formatMoney(calculated.totalBeforeDiscount), 9)}`);
    lines.push(`Total Discount          ${this.padLeft(this.formatMoney(calculated.discountTotal), 9)}`);
    lines.push(`Subtotal                ${this.padLeft(this.formatMoney(calculated.subtotal), 9)}`);
    lines.push(`Cooking Charge          ${this.padLeft(this.formatMoney(calculated.cookingCharge), 9)}`);
    lines.push(
      `PBJT      ${this.toNumber(calculated.vatPercent).toFixed(2)}%          ${this.padLeft(
        this.formatMoney(calculated.pbjt),
        9,
      )}`,
    );
    lines.push("");
    lines.push(`Total      ${this.formatMoney(calculated.total)}`);
    lines.push("");
    lines.push("FINAL BILL / TAGIHAN AKHIR");
    lines.push("----------- PAYMENT -------------");

    (paymentLines || []).forEach((payment) => {
      lines.push(payment.type);
      lines.push(`${payment.detail || ""}${this.padLeft(this.formatMoney(payment.amount), 30 - String(payment.detail || "").length)}`);
    });

    if ((discounts || []).length) {
      lines.push("");
      discounts.forEach((discount) => {
        lines.push(discount.d_name || "");
      });
    }

    lines.push("Terima kasih atas kunjungan anda");
    lines.push("");
    lines.push("=====Download Aplikasi BD+ ==== ");
    lines.push("Cashback poin 5% dari transaksi, ");
    lines.push("mudah reservasi, dan banyak rewards");

    return lines.join("\n");
  }

  toRtfSource(message) {
    const lines = message.split("\n");
    const firstFour = lines.slice(0, 4);
    const rest = lines.slice(4);
    return `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033{\\fonttbl{\\f0\\fnil FontB22;}{\\f1\\fnil FontA11;}{\\f2\\fnil Consolas;}}\n\\viewkind4\\uc1\\pard\\f0\\fs18 ${this.escapeRtf(
      firstFour[0] || "",
    )}\\par\n\\f1 ${firstFour
      .slice(1)
      .map((line) => `${this.escapeRtf(line)}\\par`)
      .join("\n")}\n\\par\n=================================\\par\nDUPLICATE BILL #[DUPCOUNT]\\par\n[DUPMSG1]\\par\n[DUPMSG2]\\par\n=================================\\par\n\\par\n${rest
      .map((line) => `${this.escapeRtf(line)}\\par`)
      .join("\n")}\n\\f2\\fs20\\par\n}`;
  }

  escapeRtf(value) {
    return String(value || "").replace(/[\\{}]/g, "\\$&");
  }

  zeroMysqlDate() {
    return Sequelize.literal(`'${ZERO_MYSQL_DATE}'`);
  }

  async getUserName(userId, fallback, transaction) {
    if (fallback) return fallback;
    if (!userId) return "";

    const user = await User.findByPk(userId, {
      attributes: ["u_name"],
      transaction,
    });
    return user?.u_name || "";
  }

  formatDateTime(value) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-") + ` ${[
      String(date.getHours()).padStart(2, "0"),
      String(date.getMinutes()).padStart(2, "0"),
      String(date.getSeconds()).padStart(2, "0"),
    ].join(":")}`;
  }

  formatQty(value) {
    const qty = this.toNumber(value);
    return Number.isInteger(qty) ? String(qty) : qty.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  }

  padLeft(value, width) {
    return String(value).padStart(Math.max(width, String(value).length), " ");
  }

  formatMoney(value) {
    return Math.round(this.toNumber(value)).toLocaleString("en-US");
  }
}

module.exports = new PaymentService();
