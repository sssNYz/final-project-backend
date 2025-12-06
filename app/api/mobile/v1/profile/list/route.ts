import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { listProfilesForUser } from "@/server/profile/profiles.service";


export async function GET(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try{

            //call service to list profiles
            const result = await listProfilesForUser(prismaUser.userId);
        
            return NextResponse.json(result, { status: 200 });
        } catch (error: any) {
            console.error("Error listing profiles:", error);

            //if service error, return the error
            if (error?.statusCode && error?.body) {
                return NextResponse.json(error.body, { status: error.statusCode });
            }

            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
    }