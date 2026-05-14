const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const prisma = require("./prisma/client");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

// ======================
// SERVER
// ======================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// ======================
// CONFIG
// ======================

const PORT = process.env.PORT || 3000;

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://192.168.1.10:${PORT}`;

// ======================
// MIDDLEWARE
// ======================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("uploads"));

// ======================
// DATABASE CHECK
// ======================

async function connectDB() {
  try {
    await prisma.$connect();

    console.log("Database connected");
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

connectDB();

// ======================
// ROOT
// ======================

app.get("/", (req, res) => {
  return res.status(200).send("API running");
});

// ======================
// MULTER
// ======================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// ======================
// UPLOAD IMAGE
// ======================

app.post(
  "/upload",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image uploaded",
        });
      }

      const imageUrl =
        BASE_URL + "/uploads/" + req.file.filename;

      return res.status(200).json({
        success: true,
        imageUrl,
      });
    } catch (error) {
      console.error("UPLOAD ERROR:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================
// PRODUCTS
// ======================

// GET ALL PRODUCTS

app.get("/products", async (req, res) => {
  try {
    console.log("GET PRODUCTS");

    const products =
      await prisma.product.findMany();

    return res.status(200).json(products);
  } catch (error) {
    console.error("PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET PRODUCT BY ID

app.get("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const product =
      await prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE PRODUCT

app.post("/products", async (req, res) => {
  try {
    const {
      name,
      price,
      image,
      description,
      category,
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: "Missing name or price",
      });
    }

    const product =
      await prisma.product.create({
        data: {
          name,
          price: Number(price),
          image: image || "",
          description: description || "",
          category: category || "Khac",
        },
      });

    io.emit("product_updated");

    return res.status(201).json(product);
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE PRODUCT

app.put("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      name,
      price,
      image,
      description,
      category,
    } = req.body;

    const product =
      await prisma.product.update({
        where: {
          id,
        },

        data: {
          name,
          price: Number(price),
          image,
          description,
          category,
        },
      });

    io.emit("product_updated");

    return res.status(200).json(product);
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE PRODUCT

app.delete("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.product.delete({
      where: {
        id,
      },
    });

    io.emit("product_updated");

    return res.status(200).json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================
// OPTIONS
// ======================

// GET OPTIONS

app.get("/options", async (req, res) => {
  try {
    const options =
      await prisma.option.findMany();

    return res.status(200).json(options);
  } catch (error) {
    console.error("OPTIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE OPTION

app.post("/options", async (req, res) => {
  try {
    const {
      name,
      type,
      price,
    } = req.body;

    const option =
      await prisma.option.create({
        data: {
          name,
          type,
          price: Number(price),
        },
      });

    return res.status(201).json(option);
  } catch (error) {
    console.error("CREATE OPTION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================
// ORDERS
// ======================

// CREATE ORDER

app.post("/orders", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Items invalid",
      });
    }

    let total = 0;

    for (const item of items) {
      total +=
        Number(item.price) *
        Number(item.quantity);
    }

    const order =
      await prisma.order.create({
        data: {
          total,

          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },

        include: {
          items: true,
        },
      });

    return res.status(201).json(order);
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET ORDERS

app.get("/orders", async (req, res) => {
  try {
    const orders =
      await prisma.order.findMany({
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return res.status(200).json(orders);
  } catch (error) {
    console.error("GET ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================
// 404
// ======================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ======================
// GLOBAL ERROR
// ======================

app.use((error, req, res, next) => {
  console.error("GLOBAL ERROR:", error);

  return res.status(500).json({
    success: false,
    message: error.message,
  });
});

// ======================
// START SERVER
// ======================

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    "Server running on port " + PORT
  );

  console.log("Base URL: " + BASE_URL);
});