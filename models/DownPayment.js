module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "DownPayment",
    {
      dp_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      // br_id: DataTypes.INTEGER.UNSIGNED,
      // bq_id: DataTypes.INTEGER.UNSIGNED,
      // rl_id: DataTypes.INTEGER.UNSIGNED,
      is_id: DataTypes.INTEGER.UNSIGNED,
      // be_id: DataTypes.INTEGER.UNSIGNED,

      // be_name: DataTypes.STRING(50),
      br_id: DataTypes.INTEGER.UNSIGNED,
      be_id: DataTypes.INTEGER.UNSIGNED,
      be_name: DataTypes.STRING(50),
      dp_code: DataTypes.STRING(8),
      dp_name: DataTypes.STRING(50),
      dp_contact: DataTypes.STRING(50),
      dp_notes: DataTypes.STRING(200),
      dp_reffnumber: DataTypes.STRING(200),

      dp_type: DataTypes.ENUM("Cash", "Card", "Credit", "Debit", "Transfer"),

      dp_date: DataTypes.DATEONLY,
      dp_amount: DataTypes.DECIMAL(12, 2),

      // dp_refund_type: DataTypes.ENUM("Cash", "Void", "Transfer"),
      // dp_refund_date: DataTypes.DATEONLY,
      // dp_refund_amount: DataTypes.DECIMAL(12, 2),
      // dp_refund_reason: DataTypes.STRING(200),

      dp_entry: DataTypes.DATE,
      dp_activation_time: DataTypes.DATE,
      dp_use_time: DataTypes.DATE,
      dp_use_id: DataTypes.INTEGER.UNSIGNED,
      // dp_refund_time: DataTypes.DATE,
      // dp_income_time: DataTypes.DATE,
      // dp_void_time: DataTypes.DATE,

      dp_update: DataTypes.DATE,

      // dp_entry_id: DataTypes.INTEGER.UNSIGNED,
      // dp_activation_id: DataTypes.INTEGER.UNSIGNED,
      // dp_use_id: DataTypes.INTEGER.UNSIGNED,
      // dp_refund_id: DataTypes.INTEGER.UNSIGNED,
      // dp_income_id: DataTypes.INTEGER.UNSIGNED,
      // dp_void_id: DataTypes.INTEGER.UNSIGNED,

      // dp_tag: DataTypes.INTEGER.UNSIGNED,
      // dp_label: DataTypes.STRING(50),

      dp_status: DataTypes.ENUM(
        "Unpaid",
        "Active",
        "Used",
        "Refunded",
        "Other Income",
        "Void",
        "Deleted",
      ),
    },
    {
      tableName: "down_payment",
      timestamps: false,
    },
  );
};
