# Scoop Distribution Notes

Scoop is strongest when the app has a portable `.zip` release that can be extracted into Scoop's app directory without running a traditional installer.

Current v1.0.0 Windows assets are installer-oriented:

- `MarkerOn_1.0.0_x64-setup.exe`
- `MarkerOn_1.0.0_x64-setup.nsis.zip`
- `MarkerOn_1.0.0_x64_zh-CN.msi`
- `MarkerOn_1.0.0_x64.msix`

Recommended next step before submitting to Scoop Extras:

1. Add a true portable Windows zip artifact, for example `MarkerOn_1.0.0_windows_x64_portable.zip`.
2. Ensure it can run from the extracted folder without writing installation metadata.
3. Include `MarkerOn.exe`, required runtime files, icon resources, and an optional shortcut target.
4. Generate SHA256 for the zip and add an autoupdate block.

Draft metadata:

- App name: `markeron`
- Description: `Lightweight screen annotation tool with click-through mode`
- Homepage: `https://github.com/ifer47/markeron`
- License: `MIT`
- Architecture: `64bit`
- Bin/shortcut target: `MarkerOn.exe`
