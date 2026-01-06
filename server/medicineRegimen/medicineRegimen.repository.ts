// server/medicineRegimen/medicineRegimen.repository.ts
import { prisma } from "@/lib/prisma";
import { ScheduleType, MealRelation } from "@prisma/client";

// ---------- DB queries ----------

export async function findProfileByIdAndUserId(profileId: number, userId: number) {
  return prisma.userProfile.findFirst({
    where: { profileId, userId },
  });
}

export async function findMedicineListById(mediListId: number) {
  return prisma.medicineList.findUnique({
    where: { mediListId },
    include: {
      profile: {
        select: {
          profileId: true,
          userId: true,
        },
      },
    },
  });
}

export async function findRegimenById(mediRegimenId: number) {
  return prisma.userMedicineRegimen.findUnique({
    where: { mediRegimenId },
    include: {
      medicineList: {
        include: {
          profile: {
            select: {
              profileId: true,
              userId: true,
            },
          },
          medicine: {
            select: {
              mediId: true,
              mediThName: true,
              mediEnName: true,
              mediTradeName: true,
              mediType: true,
              mediPicture: true,
            },
          },
        },
      },
      times: {
        orderBy: { time: "asc" },
      },
    },
  });
}

export async function listRegimensByProfileId(profileId: number) {
  return prisma.userMedicineRegimen.findMany({
    where: {
      medicineList: {
        profileId,
      },
    },
    include: {
      medicineList: {
        include: {
          medicine: {
            select: {
              mediId: true,
              mediThName: true,
              mediEnName: true,
              mediTradeName: true,
              mediType: true,
              mediPicture: true,
            },
          },
        },
      },
      times: {
        orderBy: { time: "asc" },
      },
    },
    orderBy: { mediRegimenId: "desc" },
  });
}

export async function createRegimenWithTimes(params: {
  mediListId: number;
  scheduleType: ScheduleType;
  startDate: Date;
  endDate: Date | null;
  daysOfWeek: string | null;
  intervalDays: number | null;
  cycleOnDays: number | null;
  cycleBreakDays: number | null;
  times: Array<{
    time: Date;
    dose: number;
    unit: string;
    mealRelation: MealRelation;
    mealOffsetMin: number | null;
  }>;
}) {
  return prisma.$transaction(async (tx) => {
    // Create regimen
    const regimen = await tx.userMedicineRegimen.create({
      data: {
        mediListId: params.mediListId,
        scheduleType: params.scheduleType,
        startDate: params.startDate,
        endDate: params.endDate,
        daysOfWeek: params.daysOfWeek,
        intervalDays: params.intervalDays,
        cycleOnDays: params.cycleOnDays,
        cycleBreakDays: params.cycleBreakDays,
      },
    });

    // Create times
    const createdTimes = await Promise.all(
      params.times.map((timeData) =>
        tx.userMedicineRegimenTime.create({
          data: {
            mediRegimenId: regimen.mediRegimenId,
            time: timeData.time,
            dose: timeData.dose,
            unit: timeData.unit,
            mealRelation: timeData.mealRelation,
            mealOffsetMin: timeData.mealOffsetMin,
          },
        })
      )
    );

    // Return regimen with times
    return {
      ...regimen,
      times: createdTimes,
    };
  });
}

export async function updateRegimenFields(
  mediRegimenId: number,
  data: {
    scheduleType?: ScheduleType;
    startDate?: Date;
    endDate?: Date | null;
    daysOfWeek?: string | null;
    intervalDays?: number | null;
    cycleOnDays?: number | null;
    cycleBreakDays?: number | null;
  }
) {
  return prisma.userMedicineRegimen.update({
    where: { mediRegimenId },
    data,
    include: {
      medicineList: {
        include: {
          medicine: {
            select: {
              mediId: true,
              mediThName: true,
              mediEnName: true,
              mediTradeName: true,
              mediType: true,
              mediPicture: true,
            },
          },
        },
      },
      times: {
        orderBy: { time: "asc" },
      },
    },
  });
}

export async function deleteRegimenById(mediRegimenId: number) {
  // Prisma will cascade delete times automatically
  return prisma.userMedicineRegimen.delete({
    where: { mediRegimenId },
  });
}

