module.exports = (sequelize, DataTypes) => {
  const ItemSaleDetailOption = sequelize.define(
    "ItemSaleDetailOption",
    {
      isdo_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },

      br_id: DataTypes.INTEGER.UNSIGNED,

      isd_id: DataTypes.INTEGER.UNSIGNED,

      op_id: DataTypes.INTEGER.UNSIGNED,

      isdo_item_cost: DataTypes.DECIMAL(12, 2),

      op_price: DataTypes.DECIMAL(12, 2),
    },
    {
      tableName: "item_sale_detail_option",
      timestamps: false,
    },
  );

  return ItemSaleDetailOption;
};
