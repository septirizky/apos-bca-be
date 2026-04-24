module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "DiscountDetail",
    {
      dd_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      d_id: DataTypes.INTEGER,
      dd_type: DataTypes.STRING,
      dd_value: DataTypes.DECIMAL(10, 2),
      ic_id: DataTypes.INTEGER,
      isc_id: DataTypes.INTEGER,
      i_id: DataTypes.INTEGER,
    },
    {
      tableName: "discount_detail",
      timestamps: false,
    },
  );
};
