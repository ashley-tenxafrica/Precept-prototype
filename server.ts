import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { initDb, seedData } from "./src/db";
import { aiRouter } from "./src/api/ai";
import { dataRouter } from "./src/api/data";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Init DB and seed data
  initDb();
  seedData();

  app.use(express.json());

  // API Routes
  app.use("/api/ai", upload.single("file"), aiRouter);
  app.use("/api/data", dataRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
