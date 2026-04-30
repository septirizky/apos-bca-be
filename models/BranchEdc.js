module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "BranchEdc",
    {
      be_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      br_id: DataTypes.INTEGER.UNSIGNED,
      be_name: DataTypes.STRING(150),
      be_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    { tableName: "branch_edc", timestamps: false },
  );
};
