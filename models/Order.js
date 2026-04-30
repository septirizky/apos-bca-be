module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "OrderModel",
    {
      o_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      br_id: DataTypes.INTEGER.UNSIGNED,
      o_group: DataTypes.INTEGER.UNSIGNED,
      o_ribbon_group: DataTypes.INTEGER.UNSIGNED,
      o_name: DataTypes.STRING(50),
      ta_id: DataTypes.INTEGER.UNSIGNED,
      is_id: DataTypes.INTEGER.UNSIGNED,
      t_id: DataTypes.INTEGER.UNSIGNED,
      cs_id: DataTypes.INTEGER.UNSIGNED,

      o_start_time: DataTypes.DATE,
      o_pax: DataTypes.DECIMAL(3, 0),
      m_code: DataTypes.STRING(32),
      // m_info: DataTypes.TEXT,

      // o_cashback_id: DataTypes.INTEGER.UNSIGNED,
      // o_tax_free: DataTypes.ENUM("False", "True"),
      // o_service_free: DataTypes.ENUM("False", "True"),
      // o_ccharge_free: DataTypes.ENUM("False", "True"),

      u_id: DataTypes.INTEGER.UNSIGNED,
      // o_intbill_printcount: DataTypes.INTEGER.UNSIGNED,
      o_locked: DataTypes.ENUM("False", "True"),
    },
    {
      tableName: "order",
      timestamps: false,
    },
  );
};
