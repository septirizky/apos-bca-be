module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "PiMlpLog",
    {
      l_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      br_id: DataTypes.INTEGER,
      br_name: DataTypes.STRING,

      u_id: DataTypes.INTEGER,
      u_name: DataTypes.STRING,

      l_call: DataTypes.STRING,

      l_request: DataTypes.TEXT,

      l_response: DataTypes.TEXT,

      l_status_code: DataTypes.INTEGER,

      l_error_code: DataTypes.STRING,

      l_rest_message: DataTypes.STRING,

      l_success: DataTypes.ENUM("False", "True"),

      l_entry: DataTypes.DATE,

      l_update: DataTypes.DATE,
    },
    {
      tableName: "pi_mlp_log",
      timestamps: false,
    },
  );
};
