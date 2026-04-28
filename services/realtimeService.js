const WebSocket = require("ws");
const { sequelize, Sequelize } = require("../models");

const SOCKET_PATH = "/realtime";
const WATCH_INTERVAL_MS = Number(process.env.REALTIME_POLL_INTERVAL_MS || 2000);

class RealtimeService {
  constructor() {
    this.wss = null;
    this.timer = null;
    this.signatures = {
      orders: null,
      downPayments: null,
    };
  }

  attach(server) {
    this.wss = new WebSocket.Server({
      server,
      path: SOCKET_PATH,
    });

    this.wss.on("connection", (socket) => {
      socket.isAlive = true;
      socket.on("pong", () => {
        socket.isAlive = true;
      });

      this.send(socket, "connected", {
        intervalMs: WATCH_INTERVAL_MS,
      });
    });

    this.startWatching();
  }

  startWatching() {
    if (this.timer) return;

    this.timer = setInterval(async () => {
      await this.checkForChanges();
    }, WATCH_INTERVAL_MS);
  }

  async checkForChanges() {
    if (!this.wss || this.wss.clients.size === 0) return;

    this.keepAliveClients();

    try {
      const [ordersSignature, downPaymentsSignature] = await Promise.all([
        this.getOrdersSignature(),
        this.getDownPaymentsSignature(),
      ]);

      this.broadcastWhenChanged("orders", ordersSignature, "orders_changed");
      this.broadcastWhenChanged(
        "downPayments",
        downPaymentsSignature,
        "down_payments_changed",
      );
    } catch (err) {
      this.broadcast("database_status_changed", {
        online: false,
        message: err.message,
      });
    }
  }

  broadcastWhenChanged(key, nextSignature, eventName) {
    if (this.signatures[key] === null) {
      this.signatures[key] = nextSignature;
      return;
    }

    if (this.signatures[key] !== nextSignature) {
      this.signatures[key] = nextSignature;
      this.broadcast(eventName);
    }
  }

  keepAliveClients() {
    this.wss.clients.forEach((socket) => {
      if (socket.isAlive === false) {
        socket.terminate();
        return;
      }

      socket.isAlive = false;
      socket.ping();
    });
  }

  async getOrdersSignature() {
    const [rows] = await sequelize.query(
      `
      SELECT
        (SELECT COUNT(*) FROM \`order\`) AS order_count,
        (SELECT COALESCE(MAX(o_id), 0) FROM \`order\`) AS last_order_id,
        (SELECT COALESCE(GROUP_CONCAT(CONCAT(o_id, ':', COALESCE(m_code, '')) ORDER BY o_id SEPARATOR '|'), '') FROM \`order\`) AS member_codes,
        (SELECT COALESCE(MAX(l_id), 0) FROM log_lock) AS last_lock_id,
        (SELECT COALESCE(COUNT(*), 0) FROM order_detail) AS detail_count,
        (SELECT COALESCE(MAX(od_id), 0) FROM order_detail) AS last_detail_id,
        (SELECT COALESCE(SUM(od_quantity), 0) FROM order_detail) AS total_quantity,
        (SELECT COALESCE(SUM(od_discount), 0) FROM order_detail) AS total_discount
      `,
      { type: Sequelize.QueryTypes.SELECT },
    );

    return JSON.stringify(rows);
  }

  async getDownPaymentsSignature() {
    const [rows] = await sequelize.query(
      `
      SELECT
        COUNT(*) AS down_payment_count,
        COALESCE(MAX(dp_id), 0) AS last_down_payment_id,
        COALESCE(MAX(dp_update), MAX(dp_entry), '1970-01-01') AS last_down_payment_update,
        COALESCE(SUM(dp_amount), 0) AS total_down_payment
      FROM down_payment
      WHERE dp_status = 'Active'
      `,
      { type: Sequelize.QueryTypes.SELECT },
    );

    return JSON.stringify(rows);
  }

  broadcast(type, payload = {}) {
    if (!this.wss) return;

    const message = JSON.stringify({
      type,
      payload,
      sentAt: new Date().toISOString(),
    });

    this.wss.clients.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    });
  }

  send(socket, type, payload = {}) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(
      JSON.stringify({
        type,
        payload,
        sentAt: new Date().toISOString(),
      }),
    );
  }
}

module.exports = new RealtimeService();
