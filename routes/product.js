const express = require("express");
const router = express.Router();
const prisma = require("../prisma/client");

// GET PRODUCTS
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;