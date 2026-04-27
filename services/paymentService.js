const {
  sequelize,
  OrderDetail,
  OrderDetailOption,
  Item,
  ItemSale,
  ItemSaleDetail,
  ItemSaleDetailOption,
  DownPayment,
  Voucher,
} = require("../models");

class PaymentService {
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
  }) {
    const transaction = await sequelize.transaction();

    try {
      const orderDetails = await OrderDetail.findAll({
        where: { o_id },
        transaction,
      });

      if (!orderDetails.length) {
        throw new Error("Order tidak ditemukan");
      }

      for (const od of orderDetails) {
        const item = await Item.findOne({
          where: { i_id: od.i_id },
          transaction,
        });

        if (!item) {
          throw new Error(`Item tidak ditemukan: ${od.i_id}`);
        }

        const quantity = od.od_quantity;
        const price = item.i_sell_price;
        const subtotal = quantity * price;

        const detail = await ItemSaleDetail.create(
          {
            is_id,
            i_id: od.i_id,
            u_id,

            isd_quantity: quantity,
            isd_sell_price: price,
            isd_subtotal: subtotal,
          },
          { transaction },
        );

        const options = await OrderDetailOption.findAll({
          where: { od_id: od.od_id },
          transaction,
        });

        for (const option of options) {
          await ItemSaleDetailOption.create(
            {
              isd_id: detail.isd_id,
              op_id: option.op_id,
            },
            { transaction },
          );
        }
      }

      const downPayment = dp_id
        ? await DownPayment.findOne({
            where: { dp_id },
            transaction,
          })
        : null;

      const voucher = voucher_id
        ? await Voucher.findOne({
            where: { v_id: voucher_id },
            transaction,
          })
        : voucher_code
          ? await Voucher.findOne({
              where: { v_code: voucher_code },
              transaction,
            })
          : null;

      if (voucher && voucher.v_status !== "New") {
        throw new Error("Voucher sudah digunakan");
      }

      const paymentMetadata = {
        payment_method: payment_method || null,
        voucher_id: voucher?.v_id || null,
        voucher_code: voucher?.v_code || voucher_code || null,
        apos_partner_ref_id: apos_partner_ref_id || null,
      };
      const requestedCounter = parseInt(is_counter || 0, 10);
      const maxCounter = (await ItemSale.max("is_counter", { transaction })) || 0;
      const nextCounter = parseInt(maxCounter, 10) + 1;
      const transactionCounter =
        requestedCounter > parseInt(maxCounter, 10) ? requestedCounter : nextCounter;

      await ItemSale.update(
        {
          is_status: "Active",
          is_payment_status: "Paid",
          is_transaction_time: new Date(),
          u_id,
          is_counter: transactionCounter,
          is_dp: downPayment ? downPayment.dp_amount : 0,
          is_voucher_amount: voucher ? voucher.v_nominal : voucher_amount || 0,
          m_trans_data: JSON.stringify(paymentMetadata),
        },
        {
          where: { is_id },
          transaction,
        },
      );

      if (dp_id) {
        await DownPayment.update(
          {
            dp_status: "Used",
            u_id,
          },
          {
            where: { dp_id },
            transaction,
          },
        );
      }

      if (voucher) {
        await Voucher.update(
          {
            v_status: "Used",
            is_id,
            u_id,
            v_used_time: new Date(),
          },
          {
            where: { v_id: voucher.v_id, v_status: "New" },
            transaction,
          },
        );
      }

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
}

module.exports = new PaymentService();
