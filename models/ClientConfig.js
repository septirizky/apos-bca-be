module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "ClientConfig",
    {
      c_key: { type: DataTypes.STRING(100), primaryKey: true },
      c_value: DataTypes.STRING(255),
      c_desc: DataTypes.STRING(255),
      c_default: DataTypes.STRING(255),
      c_active_build: DataTypes.INTEGER,
      br_id: DataTypes.INTEGER,
    },
    {
      tableName: "client_config",
      timestamps: false,
    },
  );
};
