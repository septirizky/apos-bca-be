module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Tables",
    {
      t_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      br_id: DataTypes.INTEGER.UNSIGNED,
      ts_id: DataTypes.INTEGER,
      t_name: DataTypes.STRING(64),
      t_locked_by: DataTypes.INTEGER,
      t_lock_id: DataTypes.STRING(32),
      tt_id: DataTypes.INTEGER.UNSIGNED,
      t_type: DataTypes.ENUM("Rectangle", "Ellipse"),
      t_x: DataTypes.INTEGER,
      t_y: DataTypes.INTEGER,
      t_width: DataTypes.INTEGER,
      t_height: DataTypes.INTEGER,
      t_last_ping: DataTypes.DATE,
      t_required_key: DataTypes.STRING(50),
      t_delivery_buffer: DataTypes.ENUM("False", "True"),
      t_entry: DataTypes.DATE,
      t_deletion: DataTypes.DATE,
      t_stamp: DataTypes.DATE,
      t_status: DataTypes.ENUM("Deleted", "Suspended", "Active"),
    },
    {
      tableName: "tables",
      timestamps: false,
    },
  );
};
