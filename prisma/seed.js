const prisma = require("./client");

async function main() {
  await prisma.option.createMany({
    data: [
      // SIZE
      { name: "Nhỏ", type: "size", price: 0 },
      { name: "Vừa", type: "size", price: 5000 },
      { name: "Lớn", type: "size", price: 10000 },

      // TOPPING
      { name: "Muối ớt", type: "topping", price: 3000 },
      { name: "Đường", type: "topping", price: 2000 },

      // SUGAR (cho tea)
      { name: "0%", type: "sugar", price: 0 },
      { name: "50%", type: "sugar", price: 0 },
      { name: "100%", type: "sugar", price: 0 },

      // ICE (cho tea)
      { name: "Ít đá", type: "ice", price: 0 },
      { name: "Nhiều đá", type: "ice", price: 0 },
    ],
  });

  console.log("✅ Seed option xong");
}

main();