import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@shared/schema";

async function seed() {
  console.log("Verificando se usuário admin já existe...");
  
  const existingUsers = await db.select().from(users);
  
  if (existingUsers.length > 0) {
    console.log("Usuário admin já existe. Pulando criação.");
    return;
  }

  console.log("Criando usuário admin...");
  
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  await db.insert(users).values({
    username: "admin",
    password: hashedPassword,
    name: "Administrador",
    role: "admin",
  });

  console.log("Usuário admin criado com sucesso!");
  console.log("Login: admin");
  console.log("Senha: admin123");
}

seed()
  .then(() => {
    console.log("Seed finalizado!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  });
