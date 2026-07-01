# TODO - Fix Gemini API key issue (OcrFinance)

- [ ] Inspect `backend/server.py` for how the Gemini key is configured (already inspected).
- [ ] Patch `backend/server.py` to load `GEMINI_API_KEY` from environment variables instead of hard-coding.
- [ ] Add a clear startup check/error if the env var is missing.
- [ ] (Optional) Add `.env` usage guidance in README (if README exists).
- [ ] Run the Flask app and trigger `/ocr` to confirm auth succeeds.
- [ ] If still failing, capture and diagnose the exact Gemini/auth error returned.
