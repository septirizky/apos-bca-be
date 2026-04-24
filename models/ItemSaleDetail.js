module.exports = (sequelize, DataTypes) => {
  const ItemSaleDetail = sequelize.define(
    "ItemSaleDetail",
    {
      isd_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },

      br_id: DataTypes.INTEGER.UNSIGNED,

      is_id: DataTypes.INTEGER.UNSIGNED,

      isd_guid: DataTypes.STRING(8),

      i_id: DataTypes.INTEGER.UNSIGNED,

      u_id: DataTypes.INTEGER.UNSIGNED,

      isd_quantity: DataTypes.DECIMAL(12, 3),

      isd_quantity_alt: DataTypes.DECIMAL(12, 3),

      isd_sell_price: DataTypes.DECIMAL(12, 2),

      isd_sale_price: DataTypes.DECIMAL(12, 2),

      isd_option_price: DataTypes.DECIMAL(12, 2),

      isd_discount_amount: DataTypes.DECIMAL(12, 2),

      isd_discount_percent: DataTypes.DECIMAL(5, 2),

      isd_subtotal: DataTypes.DECIMAL(12, 2),

      isd_item_cost: DataTypes.DECIMAL(12, 2),

      isd_item_point: DataTypes.DECIMAL(12, 2),

      isd_ratio: DataTypes.DECIMAL(12, 2),

      isd_description: DataTypes.STRING(100),

      isd_name: DataTypes.STRING(64),

      isd_alt_name: DataTypes.STRING(64),

      isd_tag: DataTypes.STRING(64),

      isd_tax_free: DataTypes.ENUM("False", "True"),

      isd_service_free: DataTypes.ENUM("False", "True"),

      isd_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    {
      tableName: "item_sale_detail",
      timestamps: false,
    },
  );

  return ItemSaleDetail;
};
