
# Admin V2 Deletion Logic Explained

Yes, the current implementation of `DELETE /api/admin/v2/users/[userId]` deletes **EVERYTHING** associated with the user.

## Deletion Cascade (Order of Operations)

The deletion happens in a `prisma.$transaction`, meaning either **ALL** of it gets deleted, or **NONE** of it (if an error occurs).

1.  **User Requests (Admin)**: Any requests handled by this user (as an admin) are unlinked (`adminId` set to null).
2.  **Device Tokens**: All mobile device tokens for notifications are deleted.
3.  **User Relationships**: All follow/following relationships (both as owner and viewer) are deleted.
4.  **User Requests (Creator)**: All help/feedback requests created by this user are deleted.
5.  **Profiles**: It finds all profiles for the user.
    *   **Medication Logs**: All logs (history of taking meds) for these profiles are deleted.
    *   **Medicine Lists**: It finds all medicines in the user's lists.
        *   **Regimen Times**: All scheduled times for these medicines are deleted.
        *   **Regimens**: All schedules (daily, weekly, etc.) are deleted.
        *   **Medicine List Items**: The medicines themselves are removed from the profiles. **This includes the `pictureOption` and any `mediNickname`.**
    *   **User Profiles**: The profiles themselves (name, picture) are deleted.
6.  **User Account**: The main user record (email, password hash, role) is deleted.
7.  **Supabase Auth**: Finally, the user is removed from Supabase's authentication system.

## About Pictures (Files)

**Database Records**: Yes, the database records pointing to the pictures (e.g., `profilePicture` used in `UserProfile`, `picture` in `UserRequest`) are strictly deleted.

**Physical Files**: 
- Currently, the **files themselves** (the actual `.jpg` or `.png` images stored in `public/uploads` or Supabase Storage) are **NOT** automatically deleted from the disk/cloud storage by this code. 
- The code deletes the *reference* to the file in the database. 
- If you want the actual file to be deleted from the server's disk, we need to add extra logic (using `fs.unlink` or Supabase Storage API) to delete the file paths found in columns like `UserProfile.profilePicture`, `UserRequest.picture`, etc.

**Currently Implemented**: Database cleanup is 100% complete. File cleanup is pending confirmation if you need it.
