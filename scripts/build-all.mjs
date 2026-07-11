#!/usr/bin/env node
/**
 * MarkerOnPlus 多平台打包脚本
 *
 * 支持平台:
 *   - Windows: x64, ARM64
 *   - macOS: x64 (Intel), ARM64 (Apple Silicon)
 *   - Linux: x64 (amd64), ARM64 (arm64)
 *
 * 输出目录: target/<platform>/<arch>/
 *
 * 注意:
 *   - Tauri 不支持鸿蒙系统 (HarmonyOS)，鸿蒙需使用 ArkUI 单独开发
 *   - 跨平台交叉编译需要对应平台的工具链
 *   - 推荐在各自平台上本地构建以获得最佳效果
 */

import { execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, rmSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { platform, arch } from 'node:os'

const ROOT = resolve(import.meta.dirname, '..')
const SRC_TAURI = join(ROOT, 'src-tauri')
const TARGET_DIR = join(ROOT, 'target')

const PLATFORMS = {
  'windows-x64': {
    target: 'x86_64-pc-windows-msvc',
    platform: 'windows',
    arch: 'x64',
    bundleDir: 'x86_64-pc-windows-msvc/release/bundle',
    formats: ['nsis', 'msi', 'msix'],
  },
  'windows-arm64': {
    target: 'aarch64-pc-windows-msvc',
    platform: 'windows',
    arch: 'arm64',
    bundleDir: 'aarch64-pc-windows-msvc/release/bundle',
    formats: ['nsis', 'msi', 'msix'],
  },
  'macos-x64': {
    target: 'x86_64-apple-darwin',
    platform: 'macos',
    arch: 'x64',
    bundleDir: 'x86_64-apple-darwin/release/bundle',
    formats: ['dmg', 'app'],
  },
  'macos-arm64': {
    target: 'aarch64-apple-darwin',
    platform: 'macos',
    arch: 'arm64',
    bundleDir: 'aarch64-apple-darwin/release/bundle',
    formats: ['dmg', 'app'],
  },
  'linux-x64': {
    target: 'x86_64-unknown-linux-gnu',
    platform: 'linux',
    arch: 'x64',
    bundleDir: 'x86_64-unknown-linux-gnu/release/bundle',
    formats: ['appimage', 'deb'],
  },
  'linux-arm64': {
    target: 'aarch64-unknown-linux-gnu',
    platform: 'linux',
    arch: 'arm64',
    bundleDir: 'aarch64-unknown-linux-gnu/release/bundle',
    formats: ['appimage', 'deb'],
  },
}

function run(cmd, args, { cwd = ROOT, env = process.env } = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`)
  }
}

function getVersion() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
  return pkg.version
}

function copyDir(src, dest) {
  if (!existsSync(src)) return
  mkdirSync(dest, { recursive: true })
  const entries = readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
      console.log(`  -> ${basename(destPath)}`)
    }
  }
}

function collectArtifacts(platformKey, config, version) {
  const bundlePath = join(SRC_TAURI, 'target', config.bundleDir)
  const outputDir = join(TARGET_DIR, config.platform, config.arch)

  console.log(`\n📦 Collecting artifacts for ${platformKey}...`)
  console.log(`   Source: ${bundlePath}`)
  console.log(`   Output: ${outputDir}`)

  if (!existsSync(bundlePath)) {
    console.log(`   ⚠ Bundle directory not found: ${bundlePath}`)
    return
  }

  mkdirSync(outputDir, { recursive: true })

  for (const format of config.formats) {
    const formatDir = join(bundlePath, format)
    if (existsSync(formatDir)) {
      copyDir(formatDir, outputDir)
    }
  }

  const exePath = join(SRC_TAURI, 'target', config.bundleDir.replace('/bundle', ''))
  if (existsSync(exePath)) {
    const files = readdirSync(exePath)
    for (const file of files) {
      const filePath = join(exePath, file)
      const stat = statSync(filePath)
      if (stat.isFile() && (file.endsWith('.exe') || file.endsWith('.dll'))) {
        copyFileSync(filePath, join(outputDir, file))
        console.log(`  -> ${file}`)
      }
    }
  }

  console.log(`   ✅ Artifacts collected to ${outputDir}`)
}

function buildPlatform(platformKey) {
  const config = PLATFORMS[platformKey]
  if (!config) {
    throw new Error(`Unknown platform: ${platformKey}`)
  }

  console.log(`\n========================================`)
  console.log(`🔨 Building: ${platformKey}`)
  console.log(`   Target: ${config.target}`)
  console.log(`========================================`)

  const tauriArgs = ['tauri', 'build', '--target', config.target]

  run('npx', tauriArgs, { cwd: ROOT })

  const version = getVersion()
  collectArtifacts(platformKey, config, version)
}

function buildCurrentPlatform() {
  const currentOs = platform()
  const currentArch = arch()

  let platformKey
  if (currentOs === 'win32') {
    platformKey = currentArch === 'x64' ? 'windows-x64' : 'windows-arm64'
  } else if (currentOs === 'darwin') {
    platformKey = currentArch === 'x64' ? 'macos-x64' : 'macos-arm64'
  } else if (currentOs === 'linux') {
    platformKey = currentArch === 'x64' ? 'linux-x64' : 'linux-arm64'
  } else {
    throw new Error(`Unsupported platform: ${currentOs}`)
  }

  console.log(`\n🖥️  Current platform: ${currentOs} ${currentArch}`)
  console.log(`🔑 Building: ${platformKey}`)

  buildPlatform(platformKey)
}

function listPlatforms() {
  console.log('\n📋 Available platforms:')
  console.log('')
  console.log('  Windows:')
  console.log('    windows-x64    - Windows x64 (Intel/AMD)')
  console.log('    windows-arm64  - Windows ARM64')
  console.log('')
  console.log('  macOS:')
  console.log('    macos-x64      - macOS Intel (x86_64)')
  console.log('    macos-arm64    - macOS Apple Silicon (ARM64)')
  console.log('')
  console.log('  Linux:')
  console.log('    linux-x64      - Linux x64 (amd64)')
  console.log('    linux-arm64    - Linux ARM64')
  console.log('')
  console.log('  Note: HarmonyOS is not supported by Tauri.')
  console.log('')
}

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
MarkerOnPlus 多平台打包脚本

Usage:
  node scripts/build-all.mjs [options] [platforms...]

Options:
  -h, --help       显示帮助
  --list           列出所有支持的平台
  --current        构建当前平台
  --all            构建所有平台 (需对应工具链)
  --clean          清理输出目录

Platforms:
  windows-x64, windows-arm64
  macos-x64, macos-arm64
  linux-x64, linux-arm64

Examples:
  node scripts/build-all.mjs --current
  node scripts/build-all.mjs windows-x64
  node scripts/build-all.mjs windows-x64 windows-arm64
  node scripts/build-all.mjs --all

输出目录:
  target/<platform>/<arch>/

注意:
  - Tauri 不支持鸿蒙系统 (HarmonyOS)
  - 跨平台编译需要安装对应平台的 Rust 工具链
  - Windows 上构建 macOS 需要 macOS 交叉编译工具链 (不推荐)
  - 推荐在各自平台上本地构建
`)
    process.exit(0)
  }

  if (args.includes('--list')) {
    listPlatforms()
    process.exit(0)
  }

  if (args.includes('--clean')) {
    console.log('\n🧹 Cleaning target directory...')
    if (existsSync(TARGET_DIR)) {
      rmSync(TARGET_DIR, { recursive: true, force: true })
    }
    mkdirSync(TARGET_DIR, { recursive: true })
    console.log('   ✅ Cleaned')
  }

  const platforms = []

  if (args.includes('--all')) {
    platforms.push(...Object.keys(PLATFORMS))
  } else if (args.includes('--current')) {
    buildCurrentPlatform()
    return
  } else {
    for (const arg of args) {
      if (!arg.startsWith('--')) {
        if (PLATFORMS[arg]) {
          platforms.push(arg)
        } else {
          console.error(`❌ Unknown platform: ${arg}`)
          console.log('   Use --list to see available platforms')
          process.exit(1)
        }
      }
    }
  }

  if (platforms.length === 0) {
    console.log('⚠️  No platforms specified. Building current platform...')
    buildCurrentPlatform()
    return
  }

  console.log(`\n🚀 Starting build for ${platforms.length} platform(s):`)
  platforms.forEach(p => console.log(`   - ${p}`))

  let failed = []
  for (const p of platforms) {
    try {
      buildPlatform(p)
    } catch (e) {
      console.error(`\n❌ Failed to build ${p}: ${e.message}`)
      failed.push(p)
    }
  }

  console.log('\n========================================')
  console.log('📊 Build Summary')
  console.log('========================================')
  console.log(`  Total: ${platforms.length}`)
  console.log(`  Success: ${platforms.length - failed.length}`)
  if (failed.length > 0) {
    console.log(`  Failed: ${failed.length}`)
    failed.forEach(p => console.log(`    - ${p}`))
  }
  console.log('')
  console.log(`  Output: ${TARGET_DIR}/`)
  console.log('')

  if (failed.length > 0) {
    process.exit(1)
  }
}

main()
