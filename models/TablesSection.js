module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "TablesSection",
    {
      ts_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      ts_name: DataTypes.STRING,
      ts_status: DataTypes.STRING,
    },
    {
      tableName: "tables_section",
      timestamps: false,
    },
  );
};
