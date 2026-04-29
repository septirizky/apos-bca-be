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
      t_locked_by: DataTypes.INTEGER,
      t_lock_id: DataTypes.STRING(32),
      t_last_ping: DataTypes.DATE,
      t_status: DataTypes.STRING,
    },
    {
      tableName: "tables",
      timestamps: false,
    },
  );
};
