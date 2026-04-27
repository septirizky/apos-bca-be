module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Voucher",
    {
      v_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      vs_id: DataTypes.INTEGER.UNSIGNED,
      u_id: DataTypes.INTEGER.UNSIGNED,
      br_id: DataTypes.INTEGER.UNSIGNED,
      is_id: DataTypes.INTEGER.UNSIGNED,
      v_code: DataTypes.STRING(32),
      v_nominal: DataTypes.DECIMAL(12, 2),
      v_start_date: DataTypes.DATEONLY,
      v_end_date: DataTypes.DATEONLY,
      v_used_time: DataTypes.DATE,
      v_open: DataTypes.ENUM("False", "True"),
      v_entry: DataTypes.DATE,
      v_deletion: DataTypes.DATE,
      v_stamp: DataTypes.DATE,
      v_status: DataTypes.ENUM("New", "Used"),
    },
    {
      tableName: "voucher",
      timestamps: false,
    },
  );
};
