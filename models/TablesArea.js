module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "TablesArea",
    {
      ta_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      ta_name: DataTypes.STRING,
      ta_status: DataTypes.STRING,
    },
    {
      tableName: "tables_area",
      timestamps: false,
    },
  );
};
