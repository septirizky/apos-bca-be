module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Discount",
    {
      d_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },

      //   br_id: DataTypes.INTEGER.UNSIGNED,
      d_name: DataTypes.STRING(120),
      //   d_level: DataTypes.TINYINT.UNSIGNED,
      d_type: DataTypes.ENUM("Item", "Transaction", "Amount"),
      d_dow: DataTypes.INTEGER,
      //   d_skip_holiday: DataTypes.ENUM("False", "True"),

      mt_id: DataTypes.INTEGER.UNSIGNED,
      m_id: DataTypes.INTEGER.UNSIGNED,

      d_min_transaction: DataTypes.DECIMAL(12, 2),
      d_max_disc: DataTypes.DECIMAL(12, 2),
      d_hour_start: DataTypes.TIME,
      d_hour_end: DataTypes.TIME,
      d_valid_start: DataTypes.DATEONLY,
      d_valid_end: DataTypes.DATEONLY,

      //   d_entry: DataTypes.DATE,
      //   d_deletion: DataTypes.DATE,
      //   d_stamp: DataTypes.DATE,
      //   pt_id: DataTypes.INTEGER.UNSIGNED,
      //   d_permanent_member: DataTypes.ENUM("False", "True"),
      d_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    {
      tableName: "discount",
      timestamps: false,
    },
  );
};
