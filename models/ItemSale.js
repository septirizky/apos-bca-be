module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "ItemSale",
    {
      is_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      br_id: DataTypes.INTEGER.UNSIGNED,
      is_date: DataTypes.DATEONLY,
      is_start_time: DataTypes.DATE,
      is_transaction_time: DataTypes.DATE,
      is_pbn: DataTypes.STRING(25),
      t_id: DataTypes.INTEGER.UNSIGNED,
      ta_id: DataTypes.INTEGER.UNSIGNED,
      ba_id: DataTypes.INTEGER.UNSIGNED,
      u_id: DataTypes.INTEGER.UNSIGNED,
      cs_id: DataTypes.INTEGER.UNSIGNED,
      u_id_courier: DataTypes.INTEGER.UNSIGNED,
      u_id_deliverer: DataTypes.INTEGER.UNSIGNED,

      is_discount_amount: DataTypes.DECIMAL(12, 2),
      is_discount_percent: DataTypes.DECIMAL(5, 2),
      is_vat_amount: DataTypes.DECIMAL(12, 2),
      is_vat_percent: DataTypes.DECIMAL(5, 2),
      is_service_amount: DataTypes.DECIMAL(12, 2),
      is_service_percent: DataTypes.DECIMAL(5, 2),
      is_dp: DataTypes.DECIMAL(12, 2),

      m_id: DataTypes.INTEGER.UNSIGNED,
      m_info: DataTypes.TEXT,
      m_trans_data: DataTypes.TEXT,
      m_trans_pending: DataTypes.ENUM("False", "True"),

      is_point_gained: DataTypes.INTEGER,
      is_point_redeem: DataTypes.INTEGER,
      is_point_redeem_value: DataTypes.INTEGER,

      is_card_number: DataTypes.STRING(50),

      is_cashback_bonus: DataTypes.DECIMAL(12, 2),
      is_cashback_amount: DataTypes.DECIMAL(12, 2),
      is_cashback_is_id: DataTypes.INTEGER.UNSIGNED,

      is_voucher_amount: DataTypes.DECIMAL(12, 2),
      is_voucher_back_amount: DataTypes.DECIMAL(12, 2),

      is_total_before_disc: DataTypes.DECIMAL(12, 2),
      is_total_before_vat: DataTypes.DECIMAL(12, 2),

      is_cooking_charge: DataTypes.DECIMAL(12, 2),
      is_rounding: DataTypes.DECIMAL(5, 2),

      is_total: DataTypes.DECIMAL(12, 2),
      is_item_point: DataTypes.DECIMAL(12, 2),
      is_pax: DataTypes.DECIMAL(3, 0),

      is_payment_status: DataTypes.ENUM("Debt", "Pending", "Paid", "Direct"),

      is_debt_name: DataTypes.STRING(50),
      is_note: DataTypes.TEXT("medium"),
      is_name: DataTypes.STRING(50),
      is_pos_id: DataTypes.STRING(8),
      is_item_cost: DataTypes.DECIMAL(12, 2),
      is_counter: DataTypes.INTEGER,

      is_staged: DataTypes.ENUM("False", "True"),
      is_staged_date: DataTypes.DATE,
      is_kind: DataTypes.ENUM("Normal", "Sampling", "Training", "Waste"),
      is_delivery_rate: DataTypes.ENUM("Unrated", "Good", "Bad"),

      is_entry: DataTypes.DATE,
      is_deletion: DataTypes.DATE,
      is_stamp: DataTypes.DATE,

      is_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    {
      tableName: "item_sale",
      timestamps: false,
    },
  );
};
