module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "TablesSection",
    {
      ts_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      br_id: DataTypes.INTEGER,
      ts_order: DataTypes.INTEGER.UNSIGNED,
      ts_name: DataTypes.STRING(64),
      ts_map: DataTypes.STRING(128),
      ts_entry: DataTypes.DATE,
      ts_deletion: DataTypes.DATE,
      ts_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    {
      tableName: "tables_section",
      timestamps: false,
    },
  );
};
