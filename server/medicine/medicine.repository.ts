import { Prisma, MedicineType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function createMedicine(data: Prisma.MedicineDatabaseCreateInput) {
  return prisma.medicineDatabase.create({ data });
}

export async function findMedicineById(mediId: number) {
  return prisma.medicineDatabase.findUnique({
    where: { mediId },
  });
}

export interface ListMedicineParams {
  search?: string;
  type?: MedicineType;
  orderByName?: "asc" | "desc";
  includeDeleted?: boolean;
  skip?: number;
  take?: number;
}

export async function listMedicines({
  search,
  type,
  orderByName = "asc",
  includeDeleted = false,
  skip = 0,
  take = 10,
}: ListMedicineParams) {
  const where: Prisma.MedicineDatabaseWhereInput = includeDeleted
    ? {}
    : { mediStatus: true };

  if (search && search.trim() !== "") {
    where.OR = [
      { mediThName: { contains: search } },
      { mediEnName: { contains: search } },
      { mediTradeName: { contains: search } },
    ];
  }

  if (type) {
    where.mediType = type;
  }

  const [items, total] = await Promise.all([
    prisma.medicineDatabase.findMany({
      where,
      select: {
        mediId: true,
        mediThName: true,
        mediEnName: true,
        mediTradeName: true,
        mediType: true,

        mediPicture: true,
        mediStatus: true,
      },
      orderBy: { mediEnName: orderByName },
      skip,
      take,
    }),
    prisma.medicineDatabase.count({ where }),
  ]);
  return { items, total };
}

export async function updateMedicine(
  mediId: number,
  data: Prisma.MedicineDatabaseUpdateInput
) {
  return prisma.medicineDatabase.update({
    where: { mediId },
    data,
  });
}

export async function setMedicineStatus(
  mediId: number,
  status: boolean,
  adminId: number
) {
  return prisma.medicineDatabase.update({
    where: { mediId },
    data: {
      mediStatus: status,
      adminId,
    },
  });
}

export async function countMedicines({
  includeDeleted = false,
}: {
  includeDeleted?: boolean;
}) {
  const where: Prisma.MedicineDatabaseWhereInput = includeDeleted
    ? {}
    : { mediStatus: true };

  return prisma.medicineDatabase.count({ where });
}