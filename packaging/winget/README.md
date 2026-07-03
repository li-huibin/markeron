# WinGet Distribution

MarkerOn is already discoverable through the Microsoft Store source:

```powershell
winget search --name MarkerOn --accept-source-agreements
winget install --id 9N6623X973JV --source msstore --accept-source-agreements
```

Current result checked on 2026-07-03:

```text
Name      ID           Version   Source
MarkerOn  9N6623X973JV Unknown   msstore
```

Recommended next step: keep the Microsoft Store listing as the canonical WinGet path unless a separate direct-installer manifest is needed in `microsoft/winget-pkgs`.

If a direct WinGet community manifest is submitted later, use:

- Package identifier: `ifer47.MarkerOn`
- Package name: `MarkerOn`
- Publisher: `ifer47`
- Homepage: `https://github.com/ifer47/markeron`
- License: `MIT`
- Release URL: `https://github.com/ifer47/markeron/releases/tag/v1.0.0`
- Installer URL: `https://github.com/ifer47/markeron/releases/download/v1.0.0/MarkerOn_1.0.0_x64_zh-CN.msi`
- Installer SHA256: `3694b53359e2828321097c0992738a6efca1657e2e83c9c04e548cc5f9329e80`
