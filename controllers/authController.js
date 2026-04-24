const { User, Sequelize } = require("../models");

const { Op } = Sequelize;

class AuthController {
  async loginPin(req, res) {
    try {
      const { pin } = req.body;

      const user = await User.findOne({
        where: {
          u_pin: pin,
          u_status: "Active",
          ur_id: {
            [Op.in]: [3, 6, 27],
          },
        },
        attributes: ["u_id", "u_name", "ur_id"],
      });

      if (!user) {
        return res.status(401).json({
          message: "PIN salah atau tidak memiliki akses",
        });
      }

      res.json({ message: "Login successful", user });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new AuthController();
