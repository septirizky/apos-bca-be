module.exports = (sequelize, DataTypes) => {
  const OrderDetail = sequelize.define(
    "OrderDetail",
    {
      od_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      // br_id: DataTypes.INTEGER.UNSIGNED,
      o_id: DataTypes.INTEGER.UNSIGNED,
      i_id: DataTypes.INTEGER.UNSIGNED,
      // u_id: DataTypes.INTEGER.UNSIGNED,

      od_name: DataTypes.STRING(64),
      od_alt_name: DataTypes.STRING(64),
      // od_tag: DataTypes.STRING(64),

      od_price: DataTypes.DECIMAL(12, 2),
      // od_ratio: DataTypes.DECIMAL(12, 2),
      // od_desc: DataTypes.STRING(200),

      od_quantity: DataTypes.DECIMAL(12, 3),
      // od_quantity_alt: DataTypes.DECIMAL(12, 3),

      od_discount: DataTypes.DECIMAL(12, 2),

      // od_printed: DataTypes.ENUM("False", "True"),
      // od_op_count: DataTypes.INTEGER,

      od_tax_free: DataTypes.ENUM("False", "True"),
      od_service_free: DataTypes.ENUM("False", "True"),
    },
    {
      tableName: "order_detail",
      timestamps: false,
    },
  );

  return OrderDetail;
};
