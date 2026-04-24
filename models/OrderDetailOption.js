module.exports = (sequelize, DataTypes) => {
  const OrderDetailOption = sequelize.define(
    "OrderDetailOption",
    {
      odo_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },

      o_id: DataTypes.INTEGER.UNSIGNED,
      br_id: DataTypes.INTEGER.UNSIGNED,

      od_id: DataTypes.INTEGER.UNSIGNED,
      op_id: DataTypes.INTEGER.UNSIGNED,

      odo_quantity: DataTypes.DECIMAL(12, 3),
    },
    {
      tableName: "order_detail_option",
      timestamps: false,
    },
  );

  return OrderDetailOption;
};
