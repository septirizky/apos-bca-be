module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "VoucherSet",
    {
      vs_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      vs_name: DataTypes.STRING(120),
    },
    {
      tableName: "voucher_set",
      timestamps: false,
    },
  );
};
