module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "OrderHistoryDetail",
    {
      ohd_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      br_id: DataTypes.INTEGER.UNSIGNED,
      oh_id: DataTypes.INTEGER.UNSIGNED,
      i_id: DataTypes.INTEGER.UNSIGNED,
      ohd_qty: DataTypes.DECIMAL(12, 2),
      ohd_price: DataTypes.DECIMAL(12, 2),
      ohd_entry_time: DataTypes.DATE,
      ohd_entry: DataTypes.DATE,
      ohd_deletion: DataTypes.DATE,
      ohd_stamp: DataTypes.DATE,
      ohd_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    { tableName: "order_history_detail", timestamps: false },
  );
};
