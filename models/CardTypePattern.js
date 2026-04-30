module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "CardTypePattern",
    {
      cp_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      cp_pattern: DataTypes.STRING(20),
      cp_pattern_start: DataTypes.INTEGER.UNSIGNED,
      cp_pattern_count: DataTypes.INTEGER.UNSIGNED,
      ct_id: DataTypes.INTEGER.UNSIGNED,
      cp_entry: DataTypes.DATE,
      cp_deletion: DataTypes.DATE,
      cp_stamp: DataTypes.DATE,
      cp_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    { tableName: "card_type_pattern", timestamps: false },
  );
};
