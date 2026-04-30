module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "TablesArea",
    {
      ta_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      br_id: DataTypes.INTEGER.UNSIGNED,
      ta_code: DataTypes.STRING(5),
      ta_name: DataTypes.STRING(10),
      ta_color: DataTypes.INTEGER.UNSIGNED,
      ta_order: DataTypes.INTEGER.UNSIGNED,
      ta_entry: DataTypes.DATE,
      ta_deletion: DataTypes.DATE,
      ta_stamp: DataTypes.DATE,
      ta_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    {
      tableName: "tables_area",
      timestamps: false,
    },
  );
};
