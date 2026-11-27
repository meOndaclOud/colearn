
import { admin, ok } from "./lib.mjs";

const classEmail = "mm.03.mdymm.coders@gmail.com";

// Find the existing class account
const { users } = ok(await admin.auth.admin.listUsers());

const user = users.find(
  (u) => u.email?.toLowerCase() === classEmail.toLowerCase()
);

if (!user) {
  throw new Error("Class Auth account not found.");
}

// Update its metadata without changing its password
const { user: updatedUser } = ok(
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      role: "class",
      teacher_id: "7f17f306-77ad-4838-b282-ad8d4694482c",
      username: classEmail,
      timezone: "Asia/Yangon"
    }
  })
);

console.log("Class account updated:", updatedUser.email);
