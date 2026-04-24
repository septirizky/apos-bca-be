module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Config",
    {
      c_key: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      c_value: DataTypes.STRING,
      c_desc: DataTypes.STRING,

      c_default: DataTypes.STRING,

      c_active_build: DataTypes.INTEGER,
      br_id: DataTypes.INTEGER,
    },
    {
      tableName: "config",
      timestamps: false,
    },
  );
};
