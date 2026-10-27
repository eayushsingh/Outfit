import io
import uuid

import filetype
from fastapi import HTTPException, status
from PIL import Image, ImageOps

from app.config import settings

# Enforce strict decompression bomb protection
Image.MAX_IMAGE_PIXELS = 10_000_000  # 10 Megapixels max


class UploadService:
    @staticmethod
    def validate_and_process_image(
        file_bytes: bytes,
        filename_hint: str = "",
        is_cutout: bool = False
    ) -> tuple[bytes, str, str]:
        """
        Performs forensic validation on uploaded image bytes:
        1. Size boundary check.
        2. Real MIME sniffing (magic byte inspection, not trusting headers).
        3. Decompression bomb and pixel count validation.
        4. Strips all EXIF/metadata.
        5. Re-encodes into clean standard JPEG (or PNG if transparent cutout).
        6. Generates collision-proof randomized filename.

        Returns: (sanitized_bytes, safe_filename, mime_type)
        """
        # 1. Size Check
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty."
            )
        
        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE if hasattr(status, "HTTP_413_CONTENT_TOO_LARGE") else 413,
                detail=f"File exceeds maximum allowed size of {max_mb:.1f} MB."
            )

        # 2. Real MIME Sniffing via Magic Bytes
        kind = filetype.guess(file_bytes)
        if kind is None or kind.mime not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    f"Unsupported image format. "
                    f"Detected: {kind.mime if kind else 'unknown'}. "
                    f"Allowed: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
                )
            )

        # 3. Pillow Decompression & Integrity Check
        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.verify()
        except Image.DecompressionBombError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security rejection: Potential decompression bomb detected."
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Corrupted or invalid image structure: {str(e)}"
            )

        # 4. Open fresh stream for transformation & EXIF stripping
        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                # Correct orientation if EXIF orientation tag was present, then discard EXIF
                img = ImageOps.exif_transpose(img)
                
                width, height = img.size
                if width < settings.MIN_IMAGE_DIMENSION or height < settings.MIN_IMAGE_DIMENSION:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Image dimensions ({width}x{height}) are below minimum threshold ({settings.MIN_IMAGE_DIMENSION}px)."
                    )
                if width > settings.MAX_IMAGE_DIMENSION or height > settings.MAX_IMAGE_DIMENSION:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Image dimensions ({width}x{height}) exceed maximum permitted ({settings.MAX_IMAGE_DIMENSION}px)."
                    )

                output_io = io.BytesIO()
                random_id = uuid.uuid4().hex

                # Re-encode cleanly to neutralize embedded payloads
                has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
                if is_cutout or has_alpha:
                    clean_img = img.convert("RGBA")
                    clean_img.save(output_io, format="PNG", optimize=True)
                    safe_filename = f"{random_id}.png"
                    out_mime = "image/png"
                else:
                    clean_img = img.convert("RGB")
                    clean_img.save(output_io, format="JPEG", quality=90, optimize=True)
                    safe_filename = f"{random_id}.jpg"
                    out_mime = "image/jpeg"

                sanitized_bytes = output_io.getvalue()
                return sanitized_bytes, safe_filename, out_mime

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process and sanitize image: {str(e)}"
            )

    @classmethod
    def save_upload(cls, file_bytes: bytes, is_cutout: bool = False) -> tuple[str, str]:
        """
        Validates, re-encodes, and saves an upload to the designated upload dir.
        Returns: (safe_filename, relative_url)
        """
        sanitized_bytes, safe_filename, _ = cls.validate_and_process_image(file_bytes, is_cutout=is_cutout)
        upload_path = settings.resolve_path(settings.UPLOAD_DIR) / safe_filename
        with open(upload_path, "wb") as f:
            f.write(sanitized_bytes)
        
        return safe_filename, f"/api/catalog/assets/{safe_filename}"
