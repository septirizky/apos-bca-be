module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Member",
    {
      m_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      m_code: DataTypes.STRING,
      m_type: DataTypes.STRING,
      m_name: DataTypes.STRING,
      mt_id: DataTypes.INTEGER,
      m_status: DataTypes.STRING,
    },
    {
      tableName: "member",
      timestamps: false,
    },
  );
};
