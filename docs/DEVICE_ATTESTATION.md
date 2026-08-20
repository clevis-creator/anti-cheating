# Device Attestation & Kiosk Client (Proposal)

Options to improve exam kiosk security:

- Use platform-specific native apps (Windows/macOS) to enforce kiosk mode and device attestation.
- Use Trusted Platform Module (TPM) or platform attestation APIs to verify boot and OS integrity.
- For web-only deployments, use Safe Exam Browser (SEB) or locked-down managed browsers via MDM.
- Consider shipping a small native launcher that verifies binaries via code signing and communicates with the server.

Recommendation
- Start with SEB for quick wins, then evaluate native kiosk for high-stakes exams.
