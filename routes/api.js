const express = require("express");
const router = express.Router();

const AuthController = require("../controllers/authController");
const OrderController = require("../controllers/orderController");
const MemberController = require("../controllers/memberController");
const DiscountController = require("../controllers/discountController");
const ConfigController = require("../controllers/configController");
const DownPaymentController = require("../controllers/downPaymentController");
// const PaymentController = require("../controllers/paymentController");

/* LOGIN */
router.post("/login-pin", AuthController.loginPin);
/* ORDER */
router.get("/orders", OrderController.getOrders);
router.get("/orders/:o_id/detail", OrderController.getOrderDetail);
router.patch("/orders/:o_id/member-code", OrderController.updateOrderMemberCode);

/* MEMBER */
router.post("/member/search", MemberController.search);

/* DISCOUNT */
router.get("/discounts", DiscountController.getAll);

/* TAX */
router.get("/taxes", ConfigController.getTax);
router.get("/database-status", ConfigController.getDatabaseStatus);
router.get("/branch-name", ConfigController.getBranchName);

/* DOWN PAYMENT */
router.get("/down-payments", DownPaymentController.getAll);

/* PAYMENT */
// router.post("/payment", PaymentController.pay);

module.exports = router;
