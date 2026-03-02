import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const regimenUnits = await prisma.userMedicineRegimenTime.groupBy({
    by: ['unit'],
    _count: {
      unit: true,
    }
  });
  
  const logUnits = await prisma.medicationLog.groupBy({
    by: ['unit'],
    _count: {
      unit: true,
    }
  });

  console.log("=== Units in UserMedicineRegimenTime ===");
  regimenUnits.forEach(u => console.log(`${u.unit}: ${u._count.unit} times`));
  
  console.log("\n=== Units in MedicationLog ===");
  logUnits.forEach(u => console.log(`${u.unit}: ${u._count.unit} times`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
