module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Options",
    {
      op_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      br_id: DataTypes.INTEGER,
      opc_id: DataTypes.INTEGER,
      op_code: DataTypes.STRING,
      ii_id: DataTypes.INTEGER,
      op_name: DataTypes.STRING,
      op_alt_name: DataTypes.STRING,
      op_global: DataTypes.STRING,
      op_order: DataTypes.INTEGER,
      op_price_mod: DataTypes.DECIMAL(12, 2),
      op_status: DataTypes.STRING,
    },
    {
      tableName: "options",
      timestamps: false,
    },
  );
};
