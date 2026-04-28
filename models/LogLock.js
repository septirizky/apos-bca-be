module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "LogLock",
    {
      l_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      u_id: DataTypes.INTEGER,
      t_id: DataTypes.INTEGER,
      lock_id: DataTypes.STRING(32),
      l_type: DataTypes.ENUM("Lock", "Unlock", "ForceUnlock"),
      pos_id: DataTypes.STRING(50),
      pos_ip: DataTypes.STRING(50),
      lock_state: DataTypes.ENUM("Unlocked", "Locked"),
      l_entry: DataTypes.DATE,
    },
    {
      tableName: "log_lock",
      timestamps: false,
    },
  );
};
