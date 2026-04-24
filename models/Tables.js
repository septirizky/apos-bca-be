module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Tables",
    {
      t_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      ts_id: DataTypes.INTEGER,
      ta_id: DataTypes.INTEGER,
      t_name: DataTypes.STRING,
      t_status: DataTypes.STRING,
    },
    {
      tableName: "tables",
      timestamps: false,
    },
  );
};
