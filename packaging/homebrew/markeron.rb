cask "markeron" do
  arch arm: "aarch64", intel: "x64"

  version "1.0.0"
  sha256 arm:   "7339b7f5ac4a9e0ab95a6e35b9eb2fc1d3c0c6cd89dab22573060313c728d3ef",
         intel: "beddf4c171f596a41a0b73784ec64899c311c34599a5f23cca7fbca5a06b4129"

  url "https://github.com/ifer47/markeron/releases/download/v#{version}/MarkerOn_#{version}_#{arch}.dmg",
      verified: "github.com/ifer47/markeron/"
  name "MarkerOn"
  desc "Lightweight screen annotation tool with click-through mode"
  homepage "https://github.com/ifer47/markeron"

  app "MarkerOn.app"

  zap trash: [
    "~/Library/Application Support/com.markeron.app",
    "~/Library/Preferences/com.markeron.app.plist",
    "~/Library/Saved Application State/com.markeron.app.savedState",
  ]
end
