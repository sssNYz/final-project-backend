// server/userRequest/userRequest.repository.ts
import { prisma } from "@/server/db/client";
import { RequestType, RequestStatus, Prisma } from "@prisma/client";

// ---------- CREATE ----------

export interface CreateUserRequestData {
  userId: number;
  requestType: RequestType;
  requestTitle: string;
  requestDetails: string;
  picture?: string | null;
}

export async function createUserRequest(data: CreateUserRequestData) {
  return prisma.userRequest.create({
    data: {
      userId: data.userId,
      requestType: data.requestType,
      requestTitle: data.requestTitle,
      requestDetails: data.requestDetails,
      picture: data.picture ?? null,
    },
  });
}

// ---------- LIST ----------

export interface ListUserRequestsParams {
  status?: RequestStatus;
  type?: RequestType;
  search?: string;
  skip?: number;
  take?: number;
}

export async function listUserRequests(params: ListUserRequestsParams) {
  const { status, type, search, skip = 0, take = 10 } = params;

  const where: Prisma.UserRequestWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (type) {
    where.requestType = type;
  }

  if (search) {
    where.OR = [
      { requestTitle: { contains: search } },
      { requestDetails: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.userRequest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            userId: true,
            email: true,
          },
        },
        admin: {
          select: {
            userId: true,
            email: true,
          },
        },
      },
    }),
    prisma.userRequest.count({ where }),
  ]);

  return { items, total };
}

// ---------- FIND BY ID ----------

export async function findUserRequestById(requestId: number) {
  return prisma.userRequest.findUnique({
    where: { requestId },
    include: {
      user: {
        select: {
          userId: true,
          email: true,
        },
      },
      admin: {
        select: {
          userId: true,
          email: true,
        },
      },
    },
  });
}

// ---------- UPDATE STATUS ----------

export async function updateUserRequestStatus(
  requestId: number,
  status: RequestStatus,
  adminId: number
) {
  return prisma.userRequest.update({
    where: { requestId },
    data: {
      status,
      adminId,
    },
  });
}

// ---------- DELETE ----------

export async function deleteUserRequest(requestId: number) {
  return prisma.userRequest.delete({
    where: { requestId },
  });
}
