import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const app = express();

app.use(cors());
app.use(express.json());

app.get("/usuarios", async (_req, res) => {
  const usuarios = await prisma.usuario.findMany();
  res.json(usuarios);
});

app.post("/usuarios", async (req, res) => {
  const { nome, email } = req.body;
  const usuario = await prisma.usuario.create({ data: { nome, email } });
  res.status(201).json(usuario);
});

app.listen(3333, () => console.log("API em http://localhost:3333"));
