module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "CardType",
    {
      ct_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      ct_name: DataTypes.STRING(50),
      ct_type: DataTypes.ENUM("Credit", "Debit", "Unknown"),
      b_id: DataTypes.INTEGER.UNSIGNED,
      bm_id: DataTypes.INTEGER.UNSIGNED,
      ct_sap_code: DataTypes.STRING(50),
      ct_entry: DataTypes.DATE,
      ct_deletion: DataTypes.DATE,
      ct_stamp: DataTypes.DATE,
      ct_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    { tableName: "card_type", timestamps: false },
  );
};
