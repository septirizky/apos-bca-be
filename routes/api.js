const express = require("express");
const router = express.Router();

const AuthController = require("../controllers/authController");
const OrderController = require("../controllers/orderController");
const MemberController = require("../controllers/memberController");
const DiscountController = require("../controllers/discountController");
const ConfigController = require("../controllers/configController");
const DownPaymentController = require("../controllers/downPaymentController");
const VoucherController = require("../controllers/voucherController");
const PaymentController = require("../controllers/paymentController");
const LogController = require("../controllers/logController");
const PrintController = require("../controllers/printController");

/* LOGIN */
router.post("/login-pin", AuthController.loginPin);
/* ORDER */
router.get("/orders", OrderController.getOrders);
router.get("/orders/:o_id/detail", OrderController.getOrderDetail);
router.patch("/orders/:o_id/member-code", OrderController.updateOrderMemberCode);
router.post("/orders/:o_id/lock", OrderController.lockOrder);
router.post("/orders/:o_id/unlock", OrderController.unlockOrder);

/* MEMBER */
router.post("/member/search", MemberController.search);

/* DISCOUNT */
router.get("/discounts", DiscountController.getAll);
router.post("/discounts/validate-member", DiscountController.validateMember);

/* TAX */
router.get("/taxes", ConfigController.getTax);
router.get("/database-status", ConfigController.getDatabaseStatus);
router.get("/branch-name", ConfigController.getBranchName);
router.get("/receipt-info", ConfigController.getReceiptInfo);

/* DOWN PAYMENT */
router.get("/down-payments", DownPaymentController.getAll);

/* VOUCHER */
router.post("/vouchers/validate", VoucherController.validate);

/* PAYMENT */
router.post("/payment", PaymentController.pay);

/* LOG */
router.post("/logs/pi-mlp", LogController.savePiMlpLog);

/* PRINT */
router.post("/print/bill-initiation", PrintController.printInitiationBill);
router.post("/print/epson", PrintController.printEpson);
router.post("/print/epson/final-bill", PrintController.printFinalBillEpson);
router.post("/print/epson/test", PrintController.testEpson);
router.get("/print/final-bill/:is_id", PrintController.getFinalBillContent);

module.exports = router;
