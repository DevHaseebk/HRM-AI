import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";

export interface HashPasswordsResult {
  updated: number;
}

export async function hashExistingPasswords(): Promise<HashPasswordsResult> {
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, email, password, password_hash")
    .is("password_hash", null);

  if (error) {
    throw new Error(error.message);
  }

  let updated = 0;

  for (const user of users ?? []) {
    if (!user.password || user.password === "[hashed]") {
      console.log(`Skipping ${user.email}: no plaintext password available`);
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, 10);
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ password_hash: passwordHash, password: "[hashed]" })
      .eq("id", user.id);

    if (updateError) {
      throw new Error(`Failed to update ${user.email}: ${updateError.message}`);
    }

    updated += 1;
    console.log(`Hashed password for ${user.email}`);
  }

  console.log(`Password hashing complete. Updated ${updated} user(s).`);
  return { updated };
}
