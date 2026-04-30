const { Discount, DiscountDetail, Member, Sequelize } = require("../models");

const { Op } = Sequelize;

const DAY_BIT_MAP = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
  6: 32,
  0: 64,
};

class DiscountEngineService {
  toNumber(value) {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  getCurrentTimeString(now) {
    return now.toTimeString().slice(0, 8);
  }

  isBetweenTime(currentTime, startTime, endTime) {
    if (!startTime || !endTime) {
      return true;
    }

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    }

    return currentTime >= startTime || currentTime <= endTime;
  }

  isDiscountValidByDateTime(discount, now) {
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const currentTime = this.getCurrentTimeString(now);
    const currentDayBit = DAY_BIT_MAP[now.getDay()];

    if (discount.d_valid_start && today < discount.d_valid_start) {
      return false;
    }

    if (discount.d_valid_end && today > discount.d_valid_end) {
      return false;
    }

    if (
      !this.isBetweenTime(currentTime, discount.d_hour_start, discount.d_hour_end)
    ) {
      return false;
    }

    if (discount.d_dow && currentDayBit) {
      return (parseInt(discount.d_dow, 10) & currentDayBit) !== 0;
    }

    return true;
  }

  normalizeDetailType(type) {
    return String(type || "").trim().toLowerCase();
  }

  getMatchingRulesForItem(rules, item) {
    const itemId = item.i_id;
    const subcategoryId = item.Item?.isc_id;
    const categoryId = item.Item?.ItemSubcategory?.ic_id;

    return rules.filter((rule) => {
      const type = this.normalizeDetailType(rule.dd_type);

      if (type === "item") {
        return this.toNumber(rule.i_id) === this.toNumber(itemId);
      }

      if (type === "subcategory") {
        return this.toNumber(rule.isc_id) === this.toNumber(subcategoryId);
      }

      if (type === "category") {
        return this.toNumber(rule.ic_id) === this.toNumber(categoryId);
      }

      return false;
    });
  }

  getBaseSubtotal(orderDetails) {
    return orderDetails.reduce((sum, detail) => {
      const qty = this.toNumber(detail.od_quantity);
      const price = this.toNumber(detail.Item?.i_sell_price || detail.od_price);
      return sum + qty * price;
    }, 0);
  }

  buildItemCandidates(discount, orderDetails, source, memberData) {
    const rules = (discount.DiscountDetails || []).map((detail) =>
      detail.toJSON ? detail.toJSON() : detail,
    );

    return orderDetails.map((detail) => {
      const qty = this.toNumber(detail.od_quantity);
      const price = this.toNumber(detail.Item?.i_sell_price || detail.od_price);
      const itemTotal = price * qty;
      const matchedRules = this.getMatchingRulesForItem(rules, detail);

      return {
        od_id: detail.od_id,
        item_total: itemTotal,
        discounts: matchedRules.map((rule) => {
          const discountPercent = this.toNumber(rule.dd_value);
          const discountAmount = (itemTotal * discountPercent) / 100;

          return {
            source,
            member: memberData,
            dd_id: rule.dd_id,
            dd_type: rule.dd_type,
            dd_value: discountPercent,
            discount_percent: discountPercent,
            discount_amount: discountAmount,
            discount_value: discountAmount * -1,
            d_id: discount.d_id,
            d_name: discount.d_name,
            d_type: discount.d_type,
          };
        }),
      };
    });
  }

  applyMaxDiscountCap(itemResults, discountId, maxDiscount) {
    if (!(maxDiscount > 0)) {
      return itemResults;
    }

    const affectedItems = itemResults.filter((item) =>
      (item.discounts || []).some(
        (entry) => entry.is_applied && this.toNumber(entry.d_id) === this.toNumber(discountId),
      ),
    );

    const totalDiscount = affectedItems.reduce((sum, item) => {
      const appliedEntry = (item.discounts || []).find(
        (entry) =>
          entry.is_applied && this.toNumber(entry.d_id) === this.toNumber(discountId),
      );
      return sum + this.toNumber(appliedEntry?.discount_amount);
    }, 0);

    if (totalDiscount <= maxDiscount || totalDiscount <= 0) {
      return itemResults;
    }

    const ratio = maxDiscount / totalDiscount;

    return itemResults.map((item) => {
      const appliedEntry = (item.discounts || []).find(
        (entry) =>
          entry.is_applied && this.toNumber(entry.d_id) === this.toNumber(discountId),
      );

      if (!appliedEntry) {
        return item;
      }

      const scaledDiscountAmount =
        this.toNumber(appliedEntry.discount_amount) * ratio;

      return {
        ...item,
        discount_amount: scaledDiscountAmount,
        discount_value: scaledDiscountAmount * -1,
        discount_percent:
          item.item_total > 0 ? (scaledDiscountAmount / item.item_total) * 100 : 0,
        discounts: item.discounts.map((entry) => {
          if (
            entry.is_applied &&
            this.toNumber(entry.d_id) === this.toNumber(discountId)
          ) {
            const scaledEntryAmount =
              this.toNumber(entry.discount_amount) * ratio;
            const scaledEntryPercent =
              item.item_total > 0
                ? (scaledEntryAmount / item.item_total) * 100
                : 0;

            return {
              ...entry,
              is_max_discount_capped: true,
              discount_percent: scaledEntryPercent,
              discount_amount: scaledEntryAmount,
              discount_value: scaledEntryAmount * -1,
            };
          }

          return entry;
        }),
      };
    });
  }

  evaluateDiscountSet(
    discounts,
    orderDetails,
    source,
    memberData,
    referenceTime,
  ) {
    const baseSubtotal = this.getBaseSubtotal(orderDetails);
    const now = referenceTime instanceof Date ? referenceTime : new Date();
    const validDiscounts = discounts.filter((discount) => {
      if (!this.isDiscountValidByDateTime(discount, now)) {
        return false;
      }

      if (
        discount.d_min_transaction &&
        baseSubtotal < this.toNumber(discount.d_min_transaction)
      ) {
        return false;
      }

      return true;
    });

    if (!validDiscounts.length) {
      return null;
    }

    const itemResults = orderDetails.map((detail) => ({
      od_id: detail.od_id,
      item_total:
        this.toNumber(detail.od_quantity) *
        this.toNumber(detail.Item?.i_sell_price || detail.od_price),
      discount_percent: 0,
      discount_amount: 0,
      discount_value: 0,
      discounts: [],
    }));

    for (const discount of validDiscounts) {
      const discountJson = discount.toJSON ? discount.toJSON() : discount;
      const candidatesByItem = this.buildItemCandidates(
        discountJson,
        orderDetails,
        source,
        memberData,
      );

      candidatesByItem.forEach((candidate) => {
        const target = itemResults.find((item) => item.od_id === candidate.od_id);
        if (!target || !candidate.discounts.length) {
          return;
        }

        target.discounts.push(...candidate.discounts);
      });
    }

    const finalizedItems = itemResults.map((item) => {
      const appliedDiscount = item.discounts.reduce((best, current) => {
        if (!best) {
          return current;
        }

        if (
          this.toNumber(current.discount_amount) >
          this.toNumber(best.discount_amount)
        ) {
          return current;
        }

        return best;
      }, null);

      const appliedDdId = appliedDiscount ? appliedDiscount.dd_id : null;
      const appliedDId = appliedDiscount ? appliedDiscount.d_id : null;
      const discountAmount = this.toNumber(appliedDiscount?.discount_amount);

      return {
        ...item,
        discount_percent: this.toNumber(appliedDiscount?.discount_percent),
        discount_amount: discountAmount,
        discount_value: discountAmount * -1,
        discounts: item.discounts.map((entry) => ({
          ...entry,
          is_applied:
            entry.dd_id === appliedDdId && entry.d_id === appliedDId,
        })),
      };
    });

    const cappedItems = validDiscounts.reduce((currentItems, discount) => {
      const maxDiscount = this.toNumber(discount.d_max_disc);
      return this.applyMaxDiscountCap(currentItems, discount.d_id, maxDiscount);
    }, finalizedItems);

    const appliedDiscountMap = new Map();
    cappedItems.forEach((item) => {
      item.discounts
        .filter((entry) => entry.is_applied)
        .forEach((entry) => {
          const key = `${entry.d_id}`;
          const current = appliedDiscountMap.get(key);

          if (!current) {
            appliedDiscountMap.set(key, {
              source: entry.source,
              member: entry.member,
              d_id: entry.d_id,
              d_name: entry.d_name,
              d_type: entry.d_type,
              dd_value: entry.dd_value,
            });
            return;
          }

          // For the same discount id, keep the biggest rule value.
          if (this.toNumber(entry.dd_value) > this.toNumber(current.dd_value)) {
            appliedDiscountMap.set(key, {
              source: entry.source,
              member: entry.member,
              d_id: entry.d_id,
              d_name: entry.d_name,
              d_type: entry.d_type,
              dd_value: entry.dd_value,
            });
          }
        });
    });

    const discountTotal = cappedItems.reduce(
      (sum, item) => sum + this.toNumber(item.discount_amount),
      0,
    );

    if (discountTotal <= 0) {
      return null;
    }

    return {
      items: cappedItems,
      discounts: Array.from(appliedDiscountMap.values()),
      discountTotal,
    };
  }

  async loadDiscountById(discountId) {
    if (!discountId) {
      return null;
    }

    return Discount.findOne({
      where: {
        d_id: discountId,
        d_status: "Active",
      },
      include: [{ model: DiscountDetail }],
    });
  }

  async loadAutoDiscounts() {
    return Discount.findAll({
      where: {
        d_status: "Active",
        [Op.and]: [
          {
            [Op.or]: [{ mt_id: null }, { mt_id: 0 }],
          },
          {
            [Op.or]: [{ m_id: null }, { m_id: 0 }],
          },
        ],
      },
      include: [{ model: DiscountDetail }],
    });
  }

  async loadMemberDiscounts(memberCode) {
    if (!memberCode) {
      return { member: null, discounts: [] };
    }

    const member = await Member.findOne({
      where: {
        m_code: memberCode,
        m_status: "Active",
      },
      attributes: ["m_id", "m_code", "m_name", "mt_id"],
    });

    if (!member) {
      return { member: null, discounts: [] };
    }

    const discounts = await Discount.findAll({
      where: {
        d_status: "Active",
        [Op.or]: [
          { mt_id: member.mt_id },
          {
            [Op.and]: [
              {
                [Op.or]: [{ mt_id: null }, { mt_id: 0 }],
              },
              { m_id: member.m_id },
            ],
          },
        ],
      },
      include: [{ model: DiscountDetail }],
    });

    return { member, discounts };
  }

  mapByOrderDetailId(evaluatedItems) {
    const mapped = {};
    evaluatedItems.forEach((item) => {
      mapped[item.od_id] = item;
    });
    return mapped;
  }

  summarizeAppliedDiscounts(items) {
    const appliedDiscountMap = new Map();

    items.forEach((item) => {
      (item.discounts || [])
        .filter((entry) => entry.is_applied)
        .forEach((entry) => {
          const key = `${entry.d_id}`;
          const current = appliedDiscountMap.get(key);

          if (!current) {
            appliedDiscountMap.set(key, {
              source: entry.source,
              member: entry.member,
              d_id: entry.d_id,
              d_name: entry.d_name,
              d_type: entry.d_type,
              dd_value: entry.dd_value,
            });
            return;
          }

          if (this.toNumber(entry.dd_value) > this.toNumber(current.dd_value)) {
            appliedDiscountMap.set(key, {
              source: entry.source,
              member: entry.member,
              d_id: entry.d_id,
              d_name: entry.d_name,
              d_type: entry.d_type,
              dd_value: entry.dd_value,
            });
          }
        });
    });

    const discountTotal = items.reduce(
      (sum, item) => sum + this.toNumber(item.discount_amount),
      0,
    );

    return {
      discounts: Array.from(appliedDiscountMap.values()),
      discountTotal,
    };
  }

  pickBestPerItemAcrossCandidates(candidates, sourcePriority) {
    if (!candidates.length) {
      return null;
    }

    const itemBySourceAndId = new Map();
    const orderDetailIds = new Set();

    candidates.forEach((candidate) => {
      const source = candidate.source;
      const byId = new Map();

      candidate.evaluated.items.forEach((item) => {
        byId.set(item.od_id, item);
        orderDetailIds.add(item.od_id);
      });

      itemBySourceAndId.set(source, byId);
    });

    const mergedItems = [];
    orderDetailIds.forEach((odId) => {
      let bestSource = null;
      let bestItem = null;

      candidates.forEach((candidate) => {
        const source = candidate.source;
        const item = itemBySourceAndId.get(source)?.get(odId);
        if (!item) {
          return;
        }

        if (!bestItem) {
          bestItem = item;
          bestSource = source;
          return;
        }

        const currentAmount = this.toNumber(item.discount_amount);
        const bestAmount = this.toNumber(bestItem.discount_amount);

        if (currentAmount > bestAmount) {
          bestItem = item;
          bestSource = source;
          return;
        }

        if (
          currentAmount === bestAmount &&
          sourcePriority[source] < sourcePriority[bestSource]
        ) {
          bestItem = item;
          bestSource = source;
        }
      });

      if (bestItem) {
        mergedItems.push(bestItem);
      }
    });

    const summary = this.summarizeAppliedDiscounts(mergedItems);
    if (summary.discountTotal <= 0) {
      return null;
    }

    return {
      items: mergedItems,
      discounts: summary.discounts,
      discountTotal: summary.discountTotal,
    };
  }

  async applyDiscount({
    orderDetails,
    memberCode,
    discountId,
    discountMode = "best",
    referenceTime,
  }) {
    const sourcePriority = { auto: 1, member: 2, manual: 3 };
    const candidates = [];
    let memberData = null;
    const mode = String(discountMode || "best").trim().toLowerCase();

    const autoCandidates = await this.loadAutoDiscounts();
    const autoResult = this.evaluateDiscountSet(
      autoCandidates,
      orderDetails,
      "auto",
      null,
      referenceTime,
    );
    if (autoResult) {
      candidates.push({ source: "auto", evaluated: autoResult });
    }

    if (memberCode) {
      const memberResult = await this.loadMemberDiscounts(memberCode);
      memberData = memberResult.member ? memberResult.member.toJSON() : null;
      const memberDiscountResult = this.evaluateDiscountSet(
        memberResult.discounts,
        orderDetails,
        "member",
        memberData,
        referenceTime,
      );

      if (memberDiscountResult) {
        candidates.push({ source: "member", evaluated: memberDiscountResult });
      }
    }

    if (discountId) {
      const manual = await this.loadDiscountById(discountId);
      const manualResult = manual
        ? this.evaluateDiscountSet(
            [manual],
            orderDetails,
            "manual",
            memberData,
            referenceTime,
          )
        : null;
      if (manualResult) {
        candidates.push({ source: "manual", evaluated: manualResult });
      }
    }

    const selected = candidates.reduce((best, current) => {
      if (!best) {
        return current;
      }

      if (current.evaluated.discountTotal > best.evaluated.discountTotal) {
        return current;
      }

      if (current.evaluated.discountTotal < best.evaluated.discountTotal) {
        return best;
      }

      return sourcePriority[current.source] < sourcePriority[best.source]
        ? current
        : best;
    }, null);

    let finalSelected = null;

    if (mode === "best") {
      const merged = this.pickBestPerItemAcrossCandidates(
        candidates,
        sourcePriority,
      );
      if (merged) {
        finalSelected = {
          source: "best",
          evaluated: merged,
        };
      }
    } else if (["auto", "member", "manual"].includes(mode)) {
      finalSelected =
        candidates.find((candidate) => candidate.source === mode) || null;
    } else {
      finalSelected = selected;
    }

    const source = finalSelected ? finalSelected.source : "none";

    if (!finalSelected) {
      return {
        source,
        member: memberData,
        discounts: [],
        perItem: {},
        discountTotal: 0,
      };
    }

    return {
      source,
      member: memberData,
      discounts: finalSelected.evaluated.discounts,
      perItem: this.mapByOrderDetailId(finalSelected.evaluated.items),
      discountTotal: finalSelected.evaluated.discountTotal,
    };
  }
}

module.exports = new DiscountEngineService();
