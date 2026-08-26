# Safe Exam Browser (SEB) Support

This project includes a simple SEB configuration generator and an example `.seb` file to help run exams in a Safe Exam Browser (SEB) kiosk.

Why use SEB
- SEB provides a secure, locked-down browser environment that helps prevent switching away from the exam, opening other applications, or using developer tools.

What’s included
- `tools/generate-seb.js` — Node script to generate a `.seb` config with the correct start URL.
- `docs/examai-example.seb` — Example SEB plist you can import into SEB and test.

Quick usage
1. Install Node.js if not already installed.
2. Run the generator from the repository root, supplying the exam start URL. Example:

```bash
node tools/generate-seb.js --url "http://127.0.0.1:5174/exam/EXAM_ID" --output exam-EXAM_ID.seb
```

3. Open `exam-EXAM_ID.seb` in Safe Exam Browser (SEB). SEB will import the configuration and can be locked to that URL.

Notes & recommendations
- SEB config files may include secrets or settings — treat generated `.seb` files as sensitive for production exams.
- For high-stakes exams, require SEB and enforce `requireFullscreen` in exam settings alongside server-side checks.
- Set `SEB_CONFIG_KEY_HASH` in the backend environment, or set an exam-specific `sebConfigKeyHash`, to validate the `X-SafeExamBrowser-ConfigKeyHash` header.
- This validates the configured browser key but does not replace SEB's signed/encrypted configuration workflow. Use official SEB exam keys and test the generated configuration before high-stakes use.
