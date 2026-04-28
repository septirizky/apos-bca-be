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

  async getReceiptInfo() {
    const configs = await Config.findAll({
      where: {
        c_key: ["INFO1", "INFO2", "INFO3"],
      },
    });

    const infoMap = configs.reduce((acc, config) => {
      acc[config.c_key] = config.c_value;
      return acc;
    }, {});

    return {
      info1: infoMap.INFO1 || "",
      info2: infoMap.INFO2 || "",
      info3: infoMap.INFO3 || "",
    };
  }
}

module.exports = new ConfigService();
