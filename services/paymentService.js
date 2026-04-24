const {
  sequelize,
  OrderDetail,
  OrderDetailOption,
  Item,
  ItemSale,
  ItemSaleDetail,
  ItemSaleDetailOption,
  DownPayment,
} = require("../models");

class PaymentService {
  async processPayment({ o_id, is_id, u_id, dp_id }) {
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

      await ItemSale.update(
        { is_status: "Active" },
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

      await transaction.commit();

      return {
        success: true,
        is_id,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = new PaymentService();
