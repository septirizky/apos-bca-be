module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "OrderHistory",
    {
      oh_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      br_id: DataTypes.INTEGER.UNSIGNED,
      oh_type: DataTypes.ENUM("Addition", "Deletion", "Table Move", "Table Cancel", "Table Join", "Table Split", "Reprint", "Initiation", "Final", "Order Lock", "Order Unlock"),
      oh_module: DataTypes.ENUM("NA", "MAIN", "LOGIN", "ORDER", "TABLE", "CASHIER", "STALL", "AREA", "BANDAR", "JENOVA", "QUICK"),
      o_id: DataTypes.INTEGER.UNSIGNED,
      is_id: DataTypes.INTEGER.UNSIGNED,
      t_id: DataTypes.INTEGER.UNSIGNED,
      t_id_dest: DataTypes.INTEGER.UNSIGNED,
      i_id: DataTypes.INTEGER.UNSIGNED,
      u_id: DataTypes.INTEGER.UNSIGNED,
      u_id_alt: DataTypes.INTEGER.UNSIGNED,
      oh_qty: DataTypes.DECIMAL(12, 3),
      oh_desc: DataTypes.STRING(200),
      oh_table_area: DataTypes.STRING(100),
      oh_options: DataTypes.STRING(255),
      oh_entry: DataTypes.DATE,
      oh_deletion: DataTypes.DATE,
      oh_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    { tableName: "order_history", timestamps: false },
  );
};
