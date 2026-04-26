const orderService = require("../services/orderService");
const realtimeService = require("../services/realtimeService");

class OrderController {
  async getOrders(req, res) {
    try {
      const data = await orderService.getOrders();

      res.json({
        message: "success get orders",
        orders: data,
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }

  async getOrderDetail(req, res) {
    try {
      const { o_id } = req.params;
      const { member_code, discount_id, discount_mode } = req.query;

      const data = await orderService.getOrderDetail(o_id, {
        memberCode: member_code,
        discountId: discount_id,
        discountMode: discount_mode,
      });

      res.json(data);
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }

  async updateOrderMemberCode(req, res) {
    try {
      const { o_id } = req.params;
      const { m_code } = req.body;

      const data = await orderService.updateOrderMemberCode(o_id, m_code);

      realtimeService.broadcast("orders_changed", {
        orderId: data.o_id,
      });

      res.json({
        message: "success update order member code",
        order: data,
      });
    } catch (err) {
      if (err.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({
          message: "Order tidak ditemukan",
        });
      }

      if (err.message === "INVALID_MEMBER_CODE") {
        return res.status(404).json({
          message: "Member tidak ditemukan",
        });
      }

      res.status(500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new OrderController();
