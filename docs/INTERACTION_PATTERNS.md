# Portal interaction patterns

- Application confirmations use `useConfirmation()` from `ConfirmationContext.jsx`.
  Await its boolean result before issuing any mutation. Supply an action-specific
  title, message, confirmation label and optional danger style. Cancellation,
  Escape or leaving the page must not submit the action. Capture form values
  before awaiting confirmation; React event targets are not retained across awaits.
- Do not add `window.confirm`, `window.alert` or `window.prompt`.
  Toasts report outcomes; confirmation dialogs ask for a decision.
- Document names are headings, not ambiguous download links. Administrators use
  `PrivateFilePreview` with `buttonText="View document"` and `allowDownload`.
  Opening a preview never downloads the file automatically. The download action
  appears inside the viewer and reuses the authenticated file already fetched.
- Document status labels and controls are stacked with clear spacing. Cards stack
  on small screens. A document preview must not close the enclosing application
  review panel when Escape is pressed.
- Keep one visually prominent next action, separate from correction/rejection.
