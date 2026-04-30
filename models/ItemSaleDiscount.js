module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "ItemSaleDiscount",
    {
      isdc_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      br_id: DataTypes.INTEGER.UNSIGNED,
      is_id: DataTypes.INTEGER.UNSIGNED,
      d_id: DataTypes.INTEGER.UNSIGNED,
      isdc_entry: DataTypes.DATE,
      isdc_deletion: DataTypes.DATE,
      isdc_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    { tableName: "item_sale_discount", timestamps: false },
  );
};
