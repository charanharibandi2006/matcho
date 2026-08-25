import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export async function uploadTournamentIcon(file) {
  if (!file) return null;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Please select a JPG or PNG image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5 MB.");
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : "jpg";

  const fileName = `${crypto.randomUUID()}.${extension}`;

  const filePath = `tournaments/${fileName}`;

  const { error: uploadError } =
    await supabase.storage
      .from("tournament-icons")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage
    .from("tournament-icons")
    .getPublicUrl(filePath);

  return publicUrl;
}