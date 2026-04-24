module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      u_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },

      br_id: DataTypes.INTEGER.UNSIGNED,

      u_login: DataTypes.STRING(64),

      u_pass: DataTypes.STRING(32),

      u_pin: DataTypes.STRING(6),

      u_cardnumber: DataTypes.STRING(16),

      u_rfid_card_number: DataTypes.STRING(16),

      u_nik: DataTypes.STRING(20),

      u_name: DataTypes.STRING(64),

      u_last_login: DataTypes.DATE,

      u_create_time: DataTypes.DATE,

      ur_id: DataTypes.INTEGER.UNSIGNED,

      esh_id: DataTypes.INTEGER.UNSIGNED,

      u_clock_date: DataTypes.DATEONLY,

      u_last_clock_in: DataTypes.DATE,

      u_last_clock_out: DataTypes.DATE,

      u_last_pin_change: DataTypes.DATEONLY,

      u_clocked_in: DataTypes.ENUM("False", "True"),

      u_shifted_in: DataTypes.ENUM("False", "True"),

      u_entry: DataTypes.DATE,

      u_deletion: DataTypes.DATE,

      u_stamp: DataTypes.DATE,

      u_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    {
      tableName: "user",
      timestamps: false,
    },
  );

  return User;
};
