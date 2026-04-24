module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "ItemSubcategory",
    {
      isc_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ic_id: DataTypes.INTEGER,
      isc_name: DataTypes.STRING,
      isc_status: DataTypes.STRING,
    },
    {
      tableName: "item_subcategory",
      timestamps: false,
    },
  );
};
