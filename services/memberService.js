const { Member } = require("../models");

class MemberService {
  async findMember(m_code) {
    const member = await Member.findOne({
      where: {
        m_code,
        m_status: "Active",
      },
      attributes: ["m_id", "m_code", "m_name", "mt_id"],
    });

    return member;
  }
}

module.exports = new MemberService();
