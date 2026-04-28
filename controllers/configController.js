const configService = require("../services/configService");

class ConfigController {
  async getTax(req, res) {
    try {
      const tax = await configService.getVat();

      res.json({
        message: "Success get Tax",
        tax: tax,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }

  async getDatabaseStatus(req, res) {
    try {
      const status = await configService.checkDatabaseConnection();

      res.json({
        message: "Success get database status",
        status,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }

  async getBranchName(req, res) {
    try {
      const branchName = await configService.getBranchName();

      if (!branchName) {
        return res.status(404).json({
          message: "Branch name tidak ditemukan",
        });
      }

      res.json({
        message: "Success get branch name",
        branch_name: branchName,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }

  async getReceiptInfo(req, res) {
    try {
      const info = await configService.getReceiptInfo();

      res.json({
        message: "Success get receipt info",
        ...info,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
}

module.exports = new ConfigController();
