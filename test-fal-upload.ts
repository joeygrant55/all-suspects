import { uploadToFal, generateImageToVideo } from './server/video/falClient'

async function main() {
  const testImage = 'public/generated/last-call-at-the-blue-moon/assets/rooms/main-bar.webp'
  
  console.log('=== Test 1: Upload to fal.ai ===')
  const url = await uploadToFal(testImage)
  console.log(`Public URL: ${url}`)
  
  console.log('\n=== Test 2: Image-to-Video (local path auto-upload) ===')
  const result = await generateImageToVideo(
    testImage,
    'Slow cinematic pan across a dimly lit 1920s speakeasy bar. Amber lighting, smoke wisps, art deco details. Empty, moody noir atmosphere. Smooth dolly movement.',
    'kling-1.6'
  )
  
  console.log(`Success: ${result.success}`)
  console.log(`Model: ${result.model}`)
  console.log(`Video: ${result.videoUrl || 'N/A'}`)
  console.log(`Error: ${result.error || 'none'}`)
  console.log(`Duration: ${result.durationMs ? (result.durationMs / 1000).toFixed(1) + 's' : 'N/A'}`)
}

main().catch(console.error)
