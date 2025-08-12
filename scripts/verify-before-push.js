#!/usr/bin/env node

/**
 * Pre-push verification script
 * Ensures the build will succeed on Vercel before pushing to GitHub
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n📋 ${description}...`, 'cyan');
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    log(`✅ ${description} passed!`, 'green');
    return { success: true, output };
  } catch (error) {
    log(`❌ ${description} failed!`, 'red');
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.log(error.stderr);
    return { success: false, error };
  }
}

function checkEnvFile() {
  log('\n🔍 Checking environment variables...', 'cyan');
  
  const envExample = path.join(process.cwd(), '.env.example');
  const envLocal = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envLocal)) {
    log('⚠️  Warning: .env.local not found. Make sure environment variables are configured in Vercel.', 'yellow');
    return true; // Don't fail, as env vars might be set in Vercel
  }
  
  if (fs.existsSync(envExample)) {
    const exampleVars = fs.readFileSync(envExample, 'utf-8')
      .split('\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('=')[0].trim());
    
    const localVars = fs.readFileSync(envLocal, 'utf-8')
      .split('\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('=')[0].trim());
    
    const missingVars = exampleVars.filter(v => !localVars.includes(v));
    
    if (missingVars.length > 0) {
      log(`⚠️  Warning: Missing environment variables in .env.local: ${missingVars.join(', ')}`, 'yellow');
      log('   Make sure these are configured in Vercel dashboard.', 'yellow');
    }
  }
  
  log('✅ Environment check completed!', 'green');
  return true;
}

async function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('🚀 PRE-PUSH VERIFICATION FOR VERCEL', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  const checks = [];
  
  // 1. Check TypeScript compilation
  const tsCheck = runCommand('npx tsc --noEmit', 'TypeScript type checking');
  checks.push(tsCheck.success);
  
  // 2. Check ESLint
  const lintCheck = runCommand('npm run lint', 'ESLint');
  checks.push(lintCheck.success);
  
  // 3. Check environment variables
  const envCheck = checkEnvFile();
  checks.push(envCheck);
  
  // 4. Run build locally (same as Vercel would)
  log('\n🔨 Running production build (this may take a minute)...', 'cyan');
  const buildCheck = runCommand('npm run build', 'Next.js production build');
  checks.push(buildCheck.success);
  
  // 5. Check for uncommitted changes
  log('\n📝 Checking for uncommitted changes...', 'cyan');
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim()) {
      log('⚠️  Warning: You have uncommitted changes:', 'yellow');
      console.log(status);
      log('   Consider committing these before pushing.', 'yellow');
    } else {
      log('✅ No uncommitted changes!', 'green');
    }
  } catch (error) {
    log('⚠️  Could not check git status', 'yellow');
  }
  
  // 6. Optional: Run Vercel build locally (requires being linked to project)
  log('\n🔧 Checking Vercel CLI build (optional)...', 'cyan');
  const vercelBuildCheck = runCommand('vercel build', 'Vercel local build');
  if (!vercelBuildCheck.success) {
    log('ℹ️  Note: Vercel build failed locally. This might be due to missing environment variables.', 'yellow');
    log('   The actual build on Vercel servers might still succeed if env vars are configured there.', 'yellow');
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('📊 VERIFICATION SUMMARY', 'bright');
  log('='.repeat(60), 'bright');
  
  const requiredChecks = checks.slice(0, 4); // First 4 are required
  const allRequiredPassed = requiredChecks.every(check => check);
  
  if (allRequiredPassed) {
    log('\n✅ All required checks passed! Safe to push to GitHub.', 'green');
    log('\nTo push your changes, run:', 'cyan');
    log('  git push origin main', 'bright');
    process.exit(0);
  } else {
    log('\n❌ Some required checks failed. Please fix the issues before pushing.', 'red');
    log('\nFailed checks need to be resolved to ensure successful Vercel deployment.', 'yellow');
    process.exit(1);
  }
}

// Run the verification
main().catch(error => {
  log('\n❌ Unexpected error during verification:', 'red');
  console.error(error);
  process.exit(1);
});