module.exports = (sequelize, DataTypes) => {
  const Item = sequelize.define(
    "Item",
    {
      i_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },

      i_code: DataTypes.STRING(32),
      i_hotkey: DataTypes.STRING(1),

      i_name: DataTypes.STRING(64),
      i_alt_name: DataTypes.STRING(64),

      i_description: DataTypes.TEXT,
      i_alt_description: DataTypes.TEXT,

      i_kind: DataTypes.ENUM("Food", "Beverage", "Other"),

      i_sell_price: DataTypes.DECIMAL(12, 2),
      i_cooking_charge: DataTypes.DECIMAL(12, 2),

      i_discount: DataTypes.DECIMAL(5, 2),
      i_max_discount: DataTypes.DECIMAL(5, 2),

      i_point: DataTypes.DECIMAL(12, 2),

      i_sold_out: DataTypes.ENUM("False", "True"),

      i_open: DataTypes.ENUM("False", "True"),

      i_service_free: DataTypes.ENUM("False", "True"),

      i_tax_free: DataTypes.ENUM("False", "True"),

      i_order: DataTypes.INTEGER,

      i_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    {
      tableName: "item",
      timestamps: false,
    },
  );

  return Item;
};
