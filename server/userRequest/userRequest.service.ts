// server/userRequest/userRequest.service.ts
import { RequestType, RequestStatus } from "@prisma/client";
import fs from "fs";
import path from "path";
import { ServiceError } from "@/server/common/errors";
import {
  createUserRequest,
  listUserRequests,
  findUserRequestById,
  updateUserRequestStatus,
  deleteUserRequest,
} from "./userRequest.repository";

// ---------- HELPERS ----------

const VALID_REQUEST_TYPES: RequestType[] = [
  "PROBLEM",
  "HELP",
  "IMPROVEMENT",
  "ADD_MEDICINE",
];

const VALID_REQUEST_STATUSES: RequestStatus[] = ["PENDING", "REJECTED", "DONE"];

const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isValidRequestType(value: string): value is RequestType {
  return VALID_REQUEST_TYPES.includes(value as RequestType);
}

function isValidRequestStatus(value: string): value is RequestStatus {
  return VALID_REQUEST_STATUSES.includes(value as RequestStatus);
}

// Save picture to public/uploads/user_request/{requestType}/{timestamp}-{random}.{ext}
async function saveUserRequestPicture(
  file: { buffer: Buffer; originalFilename: string; mimeType: string },
  requestType: RequestType
): Promise<string> {
  // Validate image type
  if (!VALID_IMAGE_TYPES.includes(file.mimeType)) {
    throw new ServiceError(400, {
      error: "Invalid image type",
      allowedTypes: VALID_IMAGE_TYPES,
    });
  }

  // Build folder path: public/uploads/user_request/{requestType}/
  const uploadsDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "user_request",
    requestType.toLowerCase()
  );

  // Create folder if not exists
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  // Build file name: {timestamp}-{random}.{ext}
  const ext = path.extname(file.originalFilename) || ".jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(16).slice(2, 10);
  const fileName = `${timestamp}-${random}${ext}`;

  // Full path to save
  const filePath = path.join(uploadsDir, fileName);

  // Write file
  await fs.promises.writeFile(filePath, file.buffer);

  // Return DB value (relative path)
  return `uploads/user_request/${requestType.toLowerCase()}/${fileName}`;
}

// Delete old picture file (best-effort)
async function deleteUserRequestPicture(picturePath: string | null) {
  if (!picturePath || picturePath.trim() === "") return;

  // Only delete local files, skip URLs
  if (picturePath.startsWith("http://") || picturePath.startsWith("https://")) {
    return;
  }

  let rel = picturePath.trim();
  if (rel.startsWith("/")) rel = rel.slice(1);

  const absolutePath = path.resolve(process.cwd(), "public", rel);

  // Safety: only delete files inside uploads/user_request/
  const safeDir = path.resolve(process.cwd(), "public", "uploads", "user_request");
  if (!absolutePath.startsWith(safeDir + path.sep)) {
    return;
  }

  try {
    await fs.promises.unlink(absolutePath);
  } catch {
    // Ignore errors (file not found, etc.)
  }
}

// ---------- CREATE (Mobile) ----------

export interface CreateUserRequestInput {
  userId: number;
  requestType: string;
  requestTitle: string;
  requestDetails: string;
  pictureFile?: { buffer: Buffer; originalFilename: string; mimeType: string } | null;
}

export async function createUserRequestForMobile(input: CreateUserRequestInput) {
  // Validate requestType
  if (!input.requestType || !isValidRequestType(input.requestType)) {
    throw new ServiceError(400, {
      error: "requestType is required and must be one of: PROBLEM, HELP, IMPROVEMENT, ADD_MEDICINE",
    });
  }

  // Validate requestTitle
  if (!input.requestTitle || input.requestTitle.trim() === "") {
    throw new ServiceError(400, {
      error: "requestTitle is required",
    });
  }

  // Validate requestDetails (can be empty only for ADD_MEDICINE)
  const detailsEmpty = !input.requestDetails || input.requestDetails.trim() === "";
  if (detailsEmpty && input.requestType !== "ADD_MEDICINE") {
    throw new ServiceError(400, {
      error: "requestDetails is required for this request type",
    });
  }

  // Save picture if provided
  let picturePath: string | null = null;
  if (input.pictureFile) {
    picturePath = await saveUserRequestPicture(
      input.pictureFile,
      input.requestType as RequestType
    );
  }

  // Create in DB
  const created = await createUserRequest({
    userId: input.userId,
    requestType: input.requestType as RequestType,
    requestTitle: input.requestTitle.trim(),
    requestDetails: detailsEmpty ? "" : input.requestDetails.trim(),
    picture: picturePath,
  });

  return {
    message: "Request created",
    request: created,
  };
}

// ---------- LIST (Admin) ----------

export interface ListUserRequestsInput {
  status?: string | null;
  type?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}

export async function listUserRequestsForAdmin(input: ListUserRequestsInput) {
  const page = input.page && input.page > 0 ? input.page : 1;
  const pageSize = input.pageSize && input.pageSize > 0 ? input.pageSize : 10;
  const skip = (page - 1) * pageSize;

  // Validate status if provided
  let status: RequestStatus | undefined;
  if (input.status) {
    if (!isValidRequestStatus(input.status)) {
      throw new ServiceError(400, {
        error: "status must be one of: PENDING, REJECTED, DONE",
      });
    }
    status = input.status as RequestStatus;
  }

  // Validate type if provided
  let type: RequestType | undefined;
  if (input.type) {
    if (!isValidRequestType(input.type)) {
      throw new ServiceError(400, {
        error: "type must be one of: PROBLEM, HELP, IMPROVEMENT, ADD_MEDICINE",
      });
    }
    type = input.type as RequestType;
  }

  const { items, total } = await listUserRequests({
    status,
    type,
    search: input.search ?? undefined,
    skip,
    take: pageSize,
  });

  return {
    items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// ---------- UPDATE STATUS (Admin) ----------

export interface UpdateUserRequestStatusInput {
  requestId: number;
  status: string;
  adminId: number;
}

export async function updateUserRequestStatusForAdmin(
  input: UpdateUserRequestStatusInput
) {
  // Validate requestId
  if (!input.requestId || input.requestId <= 0) {
    throw new ServiceError(400, {
      error: "requestId is required",
    });
  }

  // Validate status
  if (!input.status || !isValidRequestStatus(input.status)) {
    throw new ServiceError(400, {
      error: "status must be one of: PENDING, REJECTED, DONE",
    });
  }

  // Check if request exists
  const existing = await findUserRequestById(input.requestId);
  if (!existing) {
    throw new ServiceError(404, {
      error: "Request not found",
    });
  }

  // Update
  const updated = await updateUserRequestStatus(
    input.requestId,
    input.status as RequestStatus,
    input.adminId
  );

  return {
    message: "Request status updated",
    request: updated,
  };
}

// ---------- DELETE (Admin) ----------

export interface DeleteUserRequestInput {
  requestId: number;
}

export async function deleteUserRequestForAdmin(input: DeleteUserRequestInput) {
  // Validate requestId
  if (!input.requestId || input.requestId <= 0) {
    throw new ServiceError(400, {
      error: "requestId is required",
    });
  }

  // Check if request exists
  const existing = await findUserRequestById(input.requestId);
  if (!existing) {
    throw new ServiceError(404, {
      error: "Request not found",
    });
  }

  // Delete picture file if exists (best-effort)
  await deleteUserRequestPicture(existing.picture);

  // Delete from DB
  await deleteUserRequest(input.requestId);

  return {
    message: "Request deleted",
  };
}
