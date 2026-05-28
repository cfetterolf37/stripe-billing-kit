#!/usr/bin/env node

/**
 * create-stripe-billing-kit
 *
 * Usage:
 *   npx create-stripe-billing-kit
 *   npx create-stripe-billing-kit --target ./my-app
 *   pnpm dlx create-stripe-billing-kit
 *
 * What it does:
 * 1. Copies all kit files into your existing Next.js project (or target dir)
 * 2. Checks for required dependencies and prints the install command
 * 3. Prints next steps
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ─── Parse args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const targetIndex = args.indexOf('--target')
const targetArg = targetIndex !== -1 ? args[targetIndex + 1] : null
const targetDir = targetArg
  ? path.resolve(process.cwd(), targetArg)
  : process.cwd()

// ─── Detect package manager ───────────────────────────────────────────────────

function detectPackageManager() {
  if (fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(targetDir, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

// ─── Copy files recursively ───────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      // Don't overwrite existing files unless they're kit-specific
      if (!fs.existsSync(destPath) || entry.name === '.env.example') {
        fs.copyFileSync(srcPath, destPath)
        console.log(`  ✓ ${path.relative(targetDir, destPath)}`)
      } else {
        console.log(`  ~ skipped (exists): ${path.relative(targetDir, destPath)}`)
      }
    }
  }
}

// ─── Check for existing Next.js project ──────────────────────────────────────

function checkNextProject() {
  const pkgPath = path.join(targetDir, 'package.json')
  if (!fs.existsSync(pkgPath)) {
    console.warn('\n  ⚠  No package.json found.')
    console.warn('     Run this inside an existing Next.js project, or use --target to point to one.')
    process.exit(1)
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const hasNext = pkg.dependencies?.next || pkg.devDependencies?.next
  if (!hasNext) {
    console.warn('\n  ⚠  This does not appear to be a Next.js project (no "next" dependency found).')
    console.warn('     The kit requires Next.js 15+ with the App Router.')
  }
}

// ─── Required dependencies ────────────────────────────────────────────────────

const REQUIRED_DEPS = [
  'stripe',
  '@supabase/supabase-js',
  '@supabase/ssr',
]

function checkDependencies() {
  const pkgPath = path.join(targetDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const installed = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  }

  return REQUIRED_DEPS.filter((dep) => !installed[dep])
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n  Stripe Billing Kit\n')
  console.log('  Scaffolding files into:', targetDir)
  console.log()

  checkNextProject()

  // Source: the kit's template directory (relative to this script)
  const templateDir = path.join(__dirname, '..', 'template')

  if (!fs.existsSync(templateDir)) {
    console.error('  ✗ Template directory not found. Package may be corrupted.')
    process.exit(1)
  }

  // Copy all template files
  console.log('  Copying files:')
  copyDir(templateDir, targetDir)

  // Check missing dependencies
  const missing = checkDependencies()
  const pm = detectPackageManager()

  console.log('\n  Done.\n')

  if (missing.length > 0) {
    const installCmd = {
      npm: `npm install ${missing.join(' ')}`,
      pnpm: `pnpm add ${missing.join(' ')}`,
      yarn: `yarn add ${missing.join(' ')}`,
    }[pm]

    console.log('  Install required dependencies:')
    console.log(`\n    ${installCmd}\n`)
  }

  console.log('  Next steps:')
  console.log('    1. cp .env.example .env.local')
  console.log('    2. Fill in .env.local (see docs/SETUP.md for where to find each value)')
  console.log('    3. supabase db push  (or run migrations in Supabase SQL Editor)')
  console.log('    4. stripe listen --forward-to localhost:3000/api/stripe/webhooks')
  console.log('    5. npm run dev\n')
  console.log('  Full setup guide: docs/SETUP.md')
  console.log('  Webhook guide:    docs/WEBHOOKS.md\n')
}

main().catch((err) => {
  console.error('\n  Error:', err.message)
  process.exit(1)
})
