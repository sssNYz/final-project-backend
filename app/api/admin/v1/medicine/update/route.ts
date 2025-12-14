// app/api/admin/v1/medicine/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MedicineType } from "@prisma/client";
import fs from "fs";
import path from "path";

import { requireAuth } from "@/lib/auth";
import { ServiceError } from "@/server/common/errors";
import {
  updateMedicineForAdmin,
  UpdateMedicineInput,
} from "@/server/medicine/medicine.service";

function toErrorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return {
      status: error.statusCode,
      body: error.body,
    };
  }

  console.error("Error in update medicine:", error);
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

export async function PATCH(request: NextRequest) {
  try {
    const supabaseUser = await requireAuth(request);
    const formData = await request.formData();

    const mediIdRaw = formData.get("mediId");
    const mediId = Number(mediIdRaw);

    if (!mediId || Number.isNaN(mediId)) {
      throw new ServiceError(400, { error: "mediId is required and must be a number" });
    }

    const input: UpdateMedicineInput = { mediId };

    const mediThName = formData.get("mediThName");
    if (mediThName !== null) input.mediThName = String(mediThName);

    const mediEnName = formData.get("mediEnName");
    if (mediEnName !== null) input.mediEnName = String(mediEnName);

    const mediTradeName = formData.get("mediTradeName");
    if (mediTradeName !== null) input.mediTradeName = String(mediTradeName);

    const mediTypeValue = formData.get("mediType");
    if (mediTypeValue !== null) {
      input.mediType = String(mediTypeValue) as MedicineType;
    }

    const mediUse = formData.get("mediUse");
    if (mediUse !== null) input.mediUse = String(mediUse);

    const mediGuide = formData.get("mediGuide");
    if (mediGuide !== null) input.mediGuide = String(mediGuide);

    const mediEffects = formData.get("mediEffects");
    if (mediEffects !== null) input.mediEffects = String(mediEffects);

    const mediNoUse = formData.get("mediNoUse");
    if (mediNoUse !== null) input.mediNoUse = String(mediNoUse);

    const mediWarning = formData.get("mediWarning");
    if (mediWarning !== null) input.mediWarning = String(mediWarning);

    const mediStore = formData.get("mediStore");
    if (mediStore !== null) input.mediStore = String(mediStore);

    const pictureFile = formData.get("picture") as File | null;
    if (pictureFile) {
      input.mediPicturePath = await saveMedicinePicture(pictureFile);
    }

    const result = await updateMedicineForAdmin({
      supabaseUser,
      input,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}