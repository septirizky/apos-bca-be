const Sequelize = require("sequelize");
const sequelize = require("../config/database");

/*
|--------------------------------------------------------------------------
| Import Models
|--------------------------------------------------------------------------
*/

const Order = require("./Order")(sequelize, Sequelize);
const OrderDetail = require("./OrderDetail")(sequelize, Sequelize);
const OrderDetailOption = require("./OrderDetailOption")(sequelize, Sequelize);
const Tables = require("./Tables")(sequelize, Sequelize);
const TablesArea = require("./TablesArea")(sequelize, Sequelize);
const TablesSection = require("./TablesSection")(sequelize, Sequelize);

const Item = require("./Item")(sequelize, Sequelize);
const ItemSubcategory = require("./ItemSubcategory")(sequelize, Sequelize);
const ItemCategory = require("./ItemCategory")(sequelize, Sequelize);
const Options = require("./Options")(sequelize, Sequelize);
const Member = require("./Member")(sequelize, Sequelize);
const Discount = require("./Discount")(sequelize, Sequelize);
const DiscountDetail = require("./DiscountDetail")(sequelize, Sequelize);
const Config = require("./Config")(sequelize, Sequelize);

const ItemSale = require("./ItemSale")(sequelize, Sequelize);
const ItemSaleDetail = require("./ItemSaleDetail")(sequelize, Sequelize);
const ItemSaleDetailOption = require("./ItemSaleDetailOption")(
  sequelize,
  Sequelize,
);
const ItemSalePayment = require("./ItemSalePayment")(sequelize, Sequelize);
const ItemSaleDiscount = require("./ItemSaleDiscount")(sequelize, Sequelize);
const OrderHistory = require("./OrderHistory")(sequelize, Sequelize);
const OrderHistoryDetail = require("./OrderHistoryDetail")(sequelize, Sequelize);
const LogPrint = require("./LogPrint")(sequelize, Sequelize);
const CardType = require("./CardType")(sequelize, Sequelize);

const DownPayment = require("./DownPayment")(sequelize, Sequelize);
const Voucher = require("./Voucher")(sequelize, Sequelize);
const VoucherSet = require("./VoucherSet")(sequelize, Sequelize);

const User = require("./User")(sequelize, Sequelize);

const LogLock = require("./LogLock")(sequelize, Sequelize);
const PiMlpLog = require("./PiMlpLog")(sequelize, Sequelize);

/*
|--------------------------------------------------------------------------
| Relations
|--------------------------------------------------------------------------
*/

// ORDER -> ORDER DETAIL
Order.hasMany(OrderDetail, { foreignKey: "o_id" });
OrderDetail.belongsTo(Order, { foreignKey: "o_id" });

// ORDER DETAIL -> ORDER DETAIL OPTION
OrderDetail.hasMany(OrderDetailOption, { foreignKey: "od_id" });
OrderDetailOption.belongsTo(OrderDetail, { foreignKey: "od_id" });

// ORDER DETAIL OPTION -> OPTION
OrderDetailOption.belongsTo(Options, { foreignKey: "op_id" });
Options.hasMany(OrderDetailOption, { foreignKey: "op_id" });

// ITEM -> ORDER DETAIL
Item.hasMany(OrderDetail, { foreignKey: "i_id" });
OrderDetail.belongsTo(Item, { foreignKey: "i_id" });

// ORDER -> TABLE
Order.belongsTo(Tables, { foreignKey: "t_id" });
Tables.hasMany(Order, { foreignKey: "t_id" });

// ORDER -> AREA
Order.belongsTo(TablesArea, { foreignKey: "ta_id" });
TablesArea.hasMany(Order, { foreignKey: "ta_id" });

// ORDER -> USER
Order.belongsTo(User, { foreignKey: "u_id" });
User.hasMany(Order, { foreignKey: "u_id" });

// TABLE -> SECTION
Tables.belongsTo(TablesSection, { foreignKey: "ts_id" });
TablesSection.hasMany(Tables, { foreignKey: "ts_id" });

// ITEM SALE -> ITEM SALE DETAIL
ItemSale.hasMany(ItemSaleDetail, { foreignKey: "is_id" });
ItemSaleDetail.belongsTo(ItemSale, { foreignKey: "is_id" });

ItemSale.hasMany(ItemSalePayment, { foreignKey: "is_id" });
ItemSalePayment.belongsTo(ItemSale, { foreignKey: "is_id" });

ItemSale.hasMany(ItemSaleDiscount, { foreignKey: "is_id" });
ItemSaleDiscount.belongsTo(ItemSale, { foreignKey: "is_id" });

OrderHistory.hasMany(OrderHistoryDetail, { foreignKey: "oh_id" });
OrderHistoryDetail.belongsTo(OrderHistory, { foreignKey: "oh_id" });

// ITEM -> SUBCATEGORY
Item.belongsTo(ItemSubcategory, { foreignKey: "isc_id" });
ItemSubcategory.hasMany(Item, { foreignKey: "isc_id" });

// SUBCATEGORY -> CATEGORY
ItemSubcategory.belongsTo(ItemCategory, { foreignKey: "ic_id" });
ItemCategory.hasMany(ItemSubcategory, { foreignKey: "ic_id" });

// DISCOUNT -> DISCOUNT DETAIL
Discount.hasMany(DiscountDetail, { foreignKey: "d_id" });
DiscountDetail.belongsTo(Discount, { foreignKey: "d_id" });

// ITEM -> ITEM SALE DETAIL
Item.hasMany(ItemSaleDetail, { foreignKey: "i_id" });
ItemSaleDetail.belongsTo(Item, { foreignKey: "i_id" });

// ITEM SALE DETAIL -> OPTION
ItemSaleDetail.hasMany(ItemSaleDetailOption, { foreignKey: "isd_id" });
ItemSaleDetailOption.belongsTo(ItemSaleDetail, { foreignKey: "isd_id" });

// ITEM SALE -> DOWN PAYMENT
ItemSale.hasMany(DownPayment, { foreignKey: "is_id" });
DownPayment.belongsTo(ItemSale, { foreignKey: "is_id" });

// ITEM SALE -> VOUCHER
ItemSale.hasMany(Voucher, { foreignKey: "is_id" });
Voucher.belongsTo(ItemSale, { foreignKey: "is_id" });

// VOUCHER -> VOUCHER SET
Voucher.belongsTo(VoucherSet, { foreignKey: "vs_id" });
VoucherSet.hasMany(Voucher, { foreignKey: "vs_id" });

User.hasMany(ItemSaleDetail, { foreignKey: "u_id" });
ItemSaleDetail.belongsTo(User, { foreignKey: "u_id" });

// TABLE -> LOG LOCK
Tables.hasMany(LogLock, { foreignKey: "t_id" });
LogLock.belongsTo(Tables, { foreignKey: "t_id" });

// USER -> LOG LOCK
User.hasMany(LogLock, { foreignKey: "u_id" });
LogLock.belongsTo(User, { foreignKey: "u_id" });

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

module.exports = {
  sequelize,
  Sequelize,

  Order,
  OrderDetail,
  OrderDetailOption,

  Tables,
  TablesArea,
  TablesSection,

  Item,
  ItemSubcategory,
  ItemCategory,

  Options,

  Member,

  Discount,
  DiscountDetail,

  Config,

  ItemSale,
  ItemSaleDetail,
  ItemSaleDetailOption,
  ItemSalePayment,
  ItemSaleDiscount,
  OrderHistory,
  OrderHistoryDetail,
  LogPrint,
  CardType,

  DownPayment,
  Voucher,
  VoucherSet,

  User,
  LogLock,
  PiMlpLog,
};
