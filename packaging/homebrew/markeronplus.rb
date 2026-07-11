cask "markeronplus" do
  arch arm: "aarch64", intel: "x64"

  version "1.0.0"
  sha256 arm:   "7339b7f5ac4a9e0ab95a6e35b9eb2fc1d3c0c6cd89dab22573060313c728d3ef",
         intel: "beddf4c171f596a41a0b73784ec64899c311c34599a5f23cca7fbca5a06b4129"

  url "https://github.com/ifer47/markeronplus/releases/download/v#{version}/MarkerOnPlus_#{version}_#{arch}.dmg",
      verified: "github.com/ifer47/markeronplus/"
  name "MarkerOnPlus"
  desc "Lightweight screen annotation and screenshot tool with click-through mode"
  homepage "https://github.com/ifer47/markeronplus"

  app "MarkerOnPlus.app"

  zap trash: [
    "~/Library/Application Support/com.markeronplus.app",
    "~/Library/Preferences/com.markeronplus.app.plist",
    "~/Library/Saved Application State/com.markeronplus.app.savedState",
  ]
end
