const memberService = require("../services/memberService");

class MemberController {
  async search(req, res) {
    try {
      const { m_code } = req.body;

      const member = await memberService.findMember(m_code);

      if (!member) {
        return res.status(404).json({
          message: "Member tidak ditemukan",
        });
      }

      res.json(member);
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new MemberController();
