const { Voucher } = require("../models");

class VoucherService {
  async validateVoucher(v_code, { allowExpired = false } = {}) {
    const normalizedCode =
      typeof v_code === "string" ? v_code.trim().toUpperCase() : "";

    if (!normalizedCode) {
      const err = new Error("VOUCHER_CODE_REQUIRED");
      err.statusCode = 400;
      throw err;
    }

    const voucher = await Voucher.findOne({
      where: {
        v_code: normalizedCode,
      },
    });

    if (!voucher) {
      const err = new Error("VOUCHER_NOT_FOUND");
      err.statusCode = 404;
      throw err;
    }

    if (voucher.v_status === "Used") {
      const err = new Error("VOUCHER_USED");
      err.statusCode = 409;
      throw err;
    }

    if (voucher.v_status !== "New") {
      const err = new Error("VOUCHER_NOT_AVAILABLE");
      err.statusCode = 409;
      throw err;
    }

    if (this.isNotStarted(voucher.v_start_date)) {
      const err = new Error("VOUCHER_NOT_STARTED");
      err.statusCode = 409;
      throw err;
    }

    const expired = this.isExpired(voucher.v_end_date);
    if (expired && !allowExpired) {
      const err = new Error("VOUCHER_EXPIRED_CONFIRM");
      err.statusCode = 409;
      err.voucher = voucher;
      throw err;
    }

    return this.toResponse(voucher, expired);
  }

  isExpired(endDate) {
    if (!endDate) return false;

    const today = new Date();
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const voucherEndDate = new Date(`${endDate}T23:59:59`);

    return voucherEndDate < todayOnly;
  }

  isNotStarted(startDate) {
    if (!startDate) return false;

    const today = new Date();
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const voucherStartDate = new Date(`${startDate}T00:00:00`);

    return voucherStartDate > todayOnly;
  }

  toResponse(voucher, expired) {
    return {
      v_id: voucher.v_id,
      v_code: voucher.v_code,
      v_nominal: parseFloat(voucher.v_nominal || 0),
      v_start_date: voucher.v_start_date,
      v_end_date: voucher.v_end_date,
      v_status: voucher.v_status,
      expired,
    };
  }
}

module.exports = new VoucherService();
