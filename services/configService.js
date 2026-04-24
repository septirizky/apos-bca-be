const { Config, sequelize } = require("../models");

class ConfigService {
  async getVat() {
    const config = await Config.findOne({
      where: {
        c_key: "VAT",
      },
    });

    return parseInt(config.c_value, 10);
  }

  async checkDatabaseConnection() {
    try {
      await sequelize.authenticate();
      return "Online";
    } catch (err) {
      return "Offline";
    }
  }

  async getBranchName() {
    const config = await Config.findOne({
      where: {
        c_key: "BRANCH_NAME",
      },
    });

    return config ? config.c_value : null;
  }
}

module.exports = new ConfigService();
