const express = require("express");
const router = express.Router();
const prisma = require("../prisma/client");

// GET OPTIONS
router.get("/", async (req, res) => {
  try {
    const options = await prisma.option.findMany();
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;