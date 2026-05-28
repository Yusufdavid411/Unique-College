import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@uniquecollege.edu.ng";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: process.env.ADMIN_NAME || "System Administrator",
      passwordHash,
      role: "ADMIN",
      isActive: true
    },
    create: {
      name: process.env.ADMIN_NAME || "System Administrator",
      email,
      passwordHash,
      role: "ADMIN"
    }
  });

  const settings = [
    ["institution_name", "Unique College of Health Science and Technology", "identity"],
    ["contact_email", "uniquecollegescience@gmail.com", "contact"],
    ["contact_phone", "+234 909 283 5595, +234 813 531 2799", "contact"],
    ["address", "R3W6 + Q6X Satellite Quarters, behind Police Station, Kwali-Abuja", "contact"],
    ["website", "www.uniquecollegekwali.com", "contact"],
    ["motto", "Excellence in Impacting Knowledge", "identity"]
  ];

  for (const [key, value, group] of settings) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value, group },
      create: { key, value, group }
    });
  }

  console.log(`Seed complete. Admin: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
