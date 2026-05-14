const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const prisma = require("./prisma/client");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
// ================= CONFIG =================
const PORT = 5000;
const BASE_URL = "http://192.168.1.101:5000";

app.use(cors());
app.use(express.json());

// ================= DB CHECK =================
async function checkDB() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ Database error:", err.message);
  }
}
checkDB();

// ================= UPLOAD =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.use("/uploads", express.static("uploads"));

app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    imageUrl: `${BASE_URL}/uploads/${req.file.filename}`,
  });
});

// ================= TEST =================
app.get("/", (req, res) => {
  res.send("API running 🚀");
});

// ================= PRODUCTS =================

// GET ALL
app.get("/products", async (req, res) => {
  try {
    const data = await Promise.race([
      prisma.product.findMany({ orderBy: { id: "desc" } }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 5000)
      ),
    ]);

    res.json(data);
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err.message);
    res.status(500).json({ error: "Không lấy được sản phẩm" });
  }
});

// GET ONE
app.get("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    }

    res.json(product);
     } catch (err) {
    res.status(500).json({ error: "Lỗi lấy sản phẩm" });
  }
});

// CREATE
app.post("/products", async (req, res) => {
  try {
    const { name, price, image, description } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "Thiếu dữ liệu" });
    }

    const product = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        image,
        description,
      },
    });

    res.json(product);
    io.emit("product_updated");

  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err.message);
    res.status(500).json({ error: "Lỗi tạo sản phẩm" });
  }
});

// UPDATE
app.put("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, price, image, description } = req.body;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name,
        price: Number(price),
        image,
        description,
      },
    });

    res.json(updated);
    io.emit("product_updated");
  } catch (err) {
    console.error("UPDATE ERROR:", err.message);
    res.status(500).json({ error: "Lỗi update sản phẩm" });
  }
});

// DELETE
app.delete("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: "Đã xoá sản phẩm" });
    io.emit("product_updated");
  } catch (err) {
    console.error("DELETE ERROR:", err.message);
    res.status(500).json({ error: "Lỗi xoá sản phẩm" });
  }
});

// ================= OPTIONS =================

app.get("/options", async (req, res) => {
  try {
    const data = await prisma.option.findMany();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy option" });
  }
});

app.post("/options", async (req, res) => {
  try {
    const { name, type, price } = req.body;

    const option = await prisma.option.create({
      data: { name, type, price: Number(price) },
    });

    res.json(option);
  } catch (err) {
    res.status(500).json({ error: "Lỗi tạo option" });
  }
});

// ================= ORDER =================

app.post("/orders", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: "Không có sản phẩm" });
    }

    let total = 0;

    for (const item of items) {
      total += item.price * item.quantity;
    }

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
    });

    res.json(order);
  } catch (err) {
    console.error("ORDER ERROR:", err.message);
    res.status(500).json({ error: "Lỗi tạo order" });
  }
});

// ================= GET ORDERS =================

app.get("/orders", async (req, res) => {
  try {
    const data = await prisma.order.findMany({
      include: {
        items: {
          include: {
            options: true,
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy order" });
  }
});

// ================= START =================

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at ${BASE_URL}`);
});