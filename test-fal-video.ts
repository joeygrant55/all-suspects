/**
 * Quick test: fal.ai image-to-video with the polling fix
 * Tests that queue submit + polling URLs are correct
 */
import { generateImageToVideo, isFalConfigured } from './server/video/falClient'
import * as fs from 'fs'

async function main() {
  console.log('=== fal.ai Video Pipeline Test ===')
  console.log(`FAL configured: ${isFalConfigured()}`)

  if (!isFalConfigured()) {
    console.error('FAL_KEY not set!')
    process.exit(1)
  }

  // Use a real room image from Blue Moon mystery
  const testImagePath = 'public/generated/last-call-at-the-blue-moon/assets/rooms/main-bar.webp'
  if (!fs.existsSync(testImagePath)) {
    console.error(`Test image not found: ${testImagePath}`)
    process.exit(1)
  }

  // We need to serve the image for fal.ai to access it
  // For testing, we can try with a data URL or a public URL
  // fal.ai needs a publicly accessible URL, so local file won't work directly
  // Let's test the submit + poll flow with a text-to-video instead

  console.log('\n--- Test 1: Text-to-Video (Kling 1.6) ---')
  console.log('Prompt: Slow pan across a dimly lit 1920s speakeasy bar...')

  const startTime = Date.now()
  
  // Import generateFalVideo for text-only test
  const { generateFalVideo } = await import('./server/video/falClient')
  
  const result = await generateFalVideo({
    prompt: 'Slow cinematic camera pan across a dimly lit 1920s speakeasy bar. Jazz era atmosphere, art deco details, moody amber lighting, smoke wisps, empty bar stools. Noir film aesthetic. No people. Smooth dolly movement.',
    duration: 5,
    aspectRatio: '16:9',
    model: 'kling-1.6',
  })

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`\nResult (${elapsed}s):`)
  console.log(`  Success: ${result.success}`)
  console.log(`  Model: ${result.model}`)
  console.log(`  Video URL: ${result.videoUrl || 'N/A'}`)
  console.log(`  Error: ${result.error || 'none'}`)

  if (result.success && result.videoUrl) {
    const localPath = `public${result.videoUrl}`
    const exists = fs.existsSync(localPath)
    const size = exists ? (fs.statSync(localPath).size / 1024 / 1024).toFixed(1) : '?'
    console.log(`  Local file: ${localPath} (${exists ? size + 'MB' : 'NOT FOUND'})`)
    console.log('\n✅ VIDEO PIPELINE WORKING!')
  } else {
    console.log('\n❌ Video generation failed — check logs above')
  }
}

main().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
