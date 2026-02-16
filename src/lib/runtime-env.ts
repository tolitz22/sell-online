const CLOUDINARY_UPLOAD_FOLDER_KEY = ["CLOUDINARY", "UPLOAD", "FOLDER"].join("_");

export function getCloudinaryUploadRoot() {
  const value = process.env[CLOUDINARY_UPLOAD_FOLDER_KEY];
  return value?.trim() || "products";
}
