import asyncio
import logging
import os
import uuid
from typing import Any

from fastapi import HTTPException, status
from gradio_client import Client, handle_file

from app.config import settings
from app.providers.base import TryOnProvider

logger = logging.getLogger("virtualfit.providers.hf")


class HuggingFaceSpaceProvider(TryOnProvider):
    def __init__(self, space_id: str | None = None, hf_token: str | None = None):
        self.space_id = space_id or settings.HF_SPACE_ID
        self.hf_token = hf_token or settings.HF_API_TOKEN or None
        self._client: Client | None = None

    @property
    def name(self) -> str:
        return "hf_space"

    @property
    def display_name(self) -> str:
        return f"Hugging Face Space ({self.space_id})"

    @property
    def is_demo(self) -> bool:
        return False

    @property
    def license_name(self) -> str:
        # Both CatVTON and IDM-VTON are CC BY-NC-SA 4.0
        return "CC BY-NC-SA 4.0 (Non-Commercial Research Evaluation Only)"

    @property
    def license_url(self) -> str:
        return "https://creativecommons.org/licenses/by-nc-sa/4.0/"

    @property
    def is_commercial_allowed(self) -> bool:
        return False

    def _get_client(self) -> Client:
        if self._client is None:
            logger.info(f"Connecting to Hugging Face Space: {self.space_id}")
            self._client = Client(self.space_id, hf_token=self.hf_token)
        return self._client

    async def generate(
        self,
        person_image_bytes: bytes,
        garment_image_bytes: bytes,
        category: str = "upper_body",
        options: dict[str, Any] | None = None
    ) -> bytes:
        temp_dir = settings.resolve_path(settings.TEMP_DIR)
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        session_id = uuid.uuid4().hex
        person_temp_path = temp_dir / f"person_{session_id}.jpg"
        garment_temp_path = temp_dir / f"garment_{session_id}.png"
        
        # Save temp files strictly for transmission to Gradio API
        with open(person_temp_path, "wb") as f:
            f.write(person_image_bytes)
        with open(garment_temp_path, "wb") as f:
            f.write(garment_image_bytes)

        max_retries = 2
        last_error = None

        try:
            for attempt in range(max_retries + 1):
                try:
                    logger.info(f"Submitting inference to {self.space_id} (attempt {attempt + 1}/{max_retries + 1})")
                    
                    # Run sync Gradio client call in threadpool with timeout
                    def call_gradio():
                        client = self._get_client()
                        # CatVTON signature
                        if "catvton" in self.space_id.lower():
                            result = client.predict(
                                person_image=handle_file(str(person_temp_path)),
                                garment_image=handle_file(str(garment_temp_path)),
                                api_name="/submit_function"
                            )
                        else:
                            # IDM-VTON or general signature
                            result = client.predict(
                                dict={"background": handle_file(str(person_temp_path)), "layers": [], "composite": None},
                                garm_img=handle_file(str(garment_temp_path)),
                                garment_des="A clean stylish outfit",
                                is_checked=True,
                                is_checked_crop=False,
                                denoise_steps=options.get("denoise_steps", 30) if options else 30,
                                seed=options.get("seed", 42) if options else 42,
                                api_name="/tryon"
                            )
                        return result

                    result_output = await asyncio.wait_for(
                        asyncio.to_thread(call_gradio),
                        timeout=float(settings.TRYON_TIMEOUT_SECONDS)
                    )

                    # Extract resulting file path
                    res_path = None
                    if isinstance(result_output, (list, tuple)) and len(result_output) > 0:
                        res_path = result_output[0]
                    elif isinstance(result_output, str):
                        res_path = result_output

                    if not res_path or not os.path.exists(res_path):
                        raise RuntimeError(f"Gradio Space returned invalid path: {result_output}")

                    with open(res_path, "rb") as rf:
                        output_bytes = rf.read()

                    logger.info(f"Inference succeeded from {self.space_id}, size: {len(output_bytes)} bytes")
                    return output_bytes

                except TimeoutError:
                    last_error = f"Inference request timed out after {settings.TRYON_TIMEOUT_SECONDS}s."
                    logger.warning(last_error)
                    if attempt < max_retries:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    raise HTTPException(
                        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                        detail="The upstream AI provider queue is congested. Please try again in a few moments."
                    )
                except Exception as e:
                    last_error = str(e)
                    logger.warning(f"Gradio call attempt {attempt + 1} failed: {e}")
                    if attempt < max_retries and ("queue" in str(e).lower() or "busy" in str(e).lower()):
                        await asyncio.sleep(2 ** attempt)
                        continue
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Inference failed on Hugging Face Space ({self.space_id}): {last_error}"
                    )

        finally:
            # STRICT ZERO-RETENTION POLICY: Delete temporary files immediately
            for p in (person_temp_path, garment_temp_path):
                try:
                    if p.exists():
                        p.unlink()
                except Exception as del_err:
                    logger.error(f"Failed to delete temp file {p}: {del_err}")
