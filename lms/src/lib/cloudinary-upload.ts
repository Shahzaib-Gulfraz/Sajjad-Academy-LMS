import { apiAuthRequest } from "./api";

interface UploadSignatureResponse {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
  resourceType: "image" | "raw" | "auto";
}

interface UploadResponse {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  format: string;
  bytes: number;
}

/**
 * Upload image to Cloudinary and return URL + publicId
 */
export const uploadImageToCloudinary = async (
  file: File,
  folder: string = "courses"
): Promise<UploadResponse> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  // Step 1: Get upload signature from backend
  const signatureData = await apiAuthRequest<UploadSignatureResponse>(
    "/files/upload-signature",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folder,
        resourceType: "image",
        allowedFormats: ["jpg", "jpeg", "png", "webp"],
      }),
    }
  );

  // Step 2: Upload directly to Cloudinary
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signatureData.apiKey);
  formData.append("timestamp", String(signatureData.timestamp));
  formData.append("signature", signatureData.signature);
  formData.append("folder", signatureData.folder);

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`;
  const response = await fetch(cloudinaryUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const cloudinaryMessage = errorBody?.error?.message ?? "Failed to upload image to Cloudinary";
    throw new Error(cloudinaryMessage);
  }

  const cloudinaryResponse = await response.json();

  // Step 3: Confirm upload with backend
  await apiAuthRequest("/files/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicId: cloudinaryResponse.public_id,
      resourceType: "image",
      secureUrl: cloudinaryResponse.secure_url,
      format: cloudinaryResponse.format,
      bytes: cloudinaryResponse.bytes,
    }),
  });

  return {
    publicId: cloudinaryResponse.public_id,
    secureUrl: cloudinaryResponse.secure_url,
    resourceType: "image",
    format: cloudinaryResponse.format,
    bytes: cloudinaryResponse.bytes,
  };
};

/**
 * Upload any file to Cloudinary and return URL + publicId
 */
export const uploadFileToCloudinary = async (
  file: File,
  folder: string = "courses/materials"
): Promise<UploadResponse> => {
  // Determine resource type based on file type
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const resourceType = isImage ? "image" : (isVideo ? "video" : "raw");

  // Step 1: Get upload signature from backend
  const signatureData = await apiAuthRequest<UploadSignatureResponse>(
    "/files/upload-signature",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folder,
        resourceType,
        allowedFormats: isImage ? ["jpg", "jpeg", "png", "webp"] : undefined,
      }),
    }
  );

  // Step 2: Upload directly to Cloudinary
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signatureData.apiKey);
  formData.append("timestamp", String(signatureData.timestamp));
  formData.append("signature", signatureData.signature);
  formData.append("folder", signatureData.folder);

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${resourceType}/upload`;
  const response = await fetch(cloudinaryUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const cloudinaryMessage = errorBody?.error?.message ?? "Failed to upload file to Cloudinary";
    throw new Error(cloudinaryMessage);
  }

  const cloudinaryResponse = await response.json();

  // Step 3: Confirm upload with backend
  await apiAuthRequest("/files/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicId: cloudinaryResponse.public_id,
      resourceType,
      secureUrl: cloudinaryResponse.secure_url,
      format: cloudinaryResponse.format,
      bytes: cloudinaryResponse.bytes,
    }),
  });

  return {
    publicId: cloudinaryResponse.public_id,
    secureUrl: cloudinaryResponse.secure_url,
    resourceType,
    format: cloudinaryResponse.format,
    bytes: cloudinaryResponse.bytes,
  };
};

/**
 * Delete file from Cloudinary via backend
 */
export const deleteFileFromCloudinary = async (
  publicId: string,
  resourceType: string = "image"
): Promise<void> => {
  try {
    await apiAuthRequest(`/files/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, resourceType }),
    });
  } catch (error) {
    console.error("Failed to delete file from Cloudinary:", error);
    // Don't throw - deletion is best effort
  }
};
