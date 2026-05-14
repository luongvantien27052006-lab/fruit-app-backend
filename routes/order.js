const express = require("express");
const router = express.Router();
const prisma = require("../prisma/client");

router.post("/", async (req, res) => {
  try {
    const { name, phone, items } = req.body;

    // 👉 tính tổng
    let total = 0;

    for (const item of items) {
      total += item.price * item.quantity;
    }

    // 👉 tạo order
    const order = await prisma.order.create({
      data: {
        total,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            options: {
              create: item.options.map((optId) => ({
                optionId: optId,
              })),
            },
          })),
        },
      },
      include: {
        items: {
          include: {
            options: true,
          },
        },
      },
    });

    res.json(order);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;