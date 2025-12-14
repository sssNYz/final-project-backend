// app/api/admin/v1/medicine/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MedicineType } from "@prisma/client";
import fs from "fs";
import path from "path";

import { requireAuth } from "@/lib/auth";
import { ServiceError } from "@/server/common/errors";
import {
  createMedicineForAdmin,
  CreateMedicineInput,
} from "@/server/medicine/medicine.service";

function toErrorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return {
      status: error.statusCode,
      body: error.body,
    };
  }

  console.error("Error in create medicine:", error);
  return {
    status: 500,
    body: { error: "Internal server error" },
  };
}

async function saveMedicinePicture(file: File | null): Promise<string | null> {
  if (!file) return null;

  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new ServiceError(400, {
      error: "Invalid image type",
      allowedTypes: validTypes,
    });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "medicine_database"
  );
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(file.name) || ".jpg";
  const fileName = `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}${ext}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.promises.writeFile(filePath, buffer);

  return `uploads/medicine_database/${fileName}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUser = await requireAuth(request);

    const formData = await request.formData();

    const mediThName = String(formData.get("mediThName") ?? "");
    const mediEnName = String(formData.get("mediEnName") ?? "");
    const mediTradeName = formData.get("mediTradeName") as string | null;
    const mediTypeValue = String(formData.get("mediType") ?? "ORAL");
    const mediType = mediTypeValue as MedicineType;

    const mediUse = formData.get("mediUse") as string | null;
    const mediGuide = formData.get("mediGuide") as string | null;
    const mediEffects = formData.get("mediEffects") as string | null;
    const mediNoUse = formData.get("mediNoUse") as string | null;
    const mediWarning = formData.get("mediWarning") as string | null;
    const mediStore = formData.get("mediStore") as string | null;

    const pictureFile = formData.get("picture") as File | null;
    const mediPicturePath = await saveMedicinePicture(pictureFile);

    const input: CreateMedicineInput = {
      mediThName,
      mediEnName,
      mediTradeName,
      mediType,
      mediUse,
      mediGuide,
      mediEffects,
      mediNoUse,
      mediWarning,
      mediStore,
      mediPicturePath,
    };

    const result = await createMedicineForAdmin({
      supabaseUser,
      input,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}