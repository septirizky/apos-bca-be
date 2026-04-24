module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "ItemCategory",
    {
      ic_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ic_name: DataTypes.STRING,
      ic_status: DataTypes.STRING,
    },
    {
      tableName: "item_category",
      timestamps: false,
    },
  );
};
