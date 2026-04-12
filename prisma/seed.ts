import { PrismaClient, Role, MedicineType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Create Super Admin Account
  const superAdminEmail = 'admin@medi-buddy.xyz';
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const existingAdmin = await prisma.userAccount.findUnique({
    where: { email: superAdminEmail },
  });

  if (!existingAdmin) {
    const admin = await prisma.userAccount.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        provider: 'email',
        role: Role.SuperAdmin,
        status: true,
        tutorialDone: true,
        emailVerifiedAt: new Date(),
        profiles: {
          create: {
            profileName: 'Super Admin',
            profilePicture: null,
          },
        },
      },
    });
    console.log(`Created super admin account: ${admin.email}`);
  } else {
    console.log(`Super admin account already exists: ${existingAdmin.email}`);
  }

  // 2. Create Initial Medicine Database Entry
  const existingMedicine = await prisma.medicineDatabase.findFirst();

  if (!existingMedicine) {
    const medicine = await prisma.medicineDatabase.create({
      data: {
        mediThName: 'พาราเซตามอล',
        mediEnName: 'Paracetamol',
        mediTradeName: 'Tylenol',
        mediType: MedicineType.ORAL,
        mediUse: 'บรรเทาอาการปวดและลดไข้',
        mediGuide: 'รับประทานครั้งละ 1-2 เม็ด ทุก 4-6 ชั่วโมง',
        mediEffects: 'อาจมีผลต่อตับหากใช้เกินขนาด',
        mediNoUse: 'ผู้ที่เป็นโรคตับ',
        mediWarning: 'ไม่ควรรับประทานร่วมกับแอลกอฮอล์',
        mediStore: 'เก็บในที่แห้ง อุณหภูมิไม่เกิน 30 องศาเซลเซียส',
        mediStatus: true,
      },
    });
    console.log(`Created initial medicine data: ${medicine.mediEnName}`);
  } else {
    console.log(`Medicine database already has data. Skipping initial seeding.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
