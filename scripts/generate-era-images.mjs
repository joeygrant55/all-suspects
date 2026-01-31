#!/usr/bin/env node
/**
 * Generate cinematic era background images using Gemini
 */

import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '../public/ui/eras')

// Ensure output directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

const IMAGE_MODELS = [
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image',
  'gemini-2.0-flash-exp-image-generation',
]

const ERAS = [
  {
    id: '1920s',
    prompt: 'Cinematic noir detective mystery game background, 1920s speakeasy interior, jazz club atmosphere with art deco architecture, dramatic film noir shadows, golden amber lighting through smoke, vintage detective aesthetic, moody atmospheric cinematography, dark noir color palette, mysterious and elegant, wide cinematic composition'
  },
  {
    id: '1940s',
    prompt: 'Cinematic Hollywood golden age mystery game background, 1940s film studio set, dramatic movie lighting with spotlights, glamorous noir crime scene, art deco Hollywood style, silver screen aesthetic, vintage movie poster atmosphere, deep shadows and dramatic lighting, mysterious thriller cinematography, wide cinematic composition'
  },
  {
    id: '1970s',
    prompt: 'Cinematic 1970s disco era mystery game background, nightclub interior with disco ball reflections, neon purple and pink lighting, velvet textures, groovy retro noir aesthetic, mysterious dark secrets atmosphere, psychedelic crime thriller style, dramatic moody lighting, vintage detective vibe, wide cinematic composition'
  },
  {
    id: 'victorian',
    prompt: 'Cinematic Victorian Gothic mystery game background, fog-shrouded manor library interior, gaslight illumination with candles, dark ornate architecture with gothic details, mysterious deep shadows, period drama noir cinematography, deep blue-gray atmospheric color palette, haunting and elegant, wide cinematic composition'
  },
  {
    id: '2050s',
    prompt: 'Cinematic sci-fi noir mystery game background, futuristic space station interior corridor, zero gravity environment aesthetic, high-tech isolation with neon cyan lighting, sleek minimalist metallic design, dramatic shadows in sterile corridors, cyberpunk detective atmosphere, tech thriller cinematography, wide cinematic composition'
  },
  {
    id: 'custom',
    prompt: 'Cinematic abstract mystery noir game background, mysterious atmospheric detective aesthetic with dramatic shadows, adaptable noir thriller atmosphere, deep purple magical lighting, open-ended mystery setting, moody enigmatic cinematography, versatile noir style, wide cinematic composition'
  }
]

async function generateImage(era) {
  console.log(`\n🎨 Generating ${era.id} era background...`)
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  
  let lastError = null
  for (const model of IMAGE_MODELS) {
    try {
      console.log(`   Trying model: ${model}...`)
      
      const response = await ai.models.generateContent({
        model,
        contents: era.prompt,
        config: {
          responseModalities: ['image', 'text'],
        },
      })

      const parts = response.candidates?.[0]?.content?.parts
      if (!parts) throw new Error('No response parts')

      for (const part of parts) {
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, 'base64')
          const outputPath = path.join(publicDir, `${era.id}.png`)
          fs.writeFileSync(outputPath, buffer)
          console.log(`   ✅ Saved: ${outputPath}`)
          return outputPath
        }
      }
      throw new Error('No image data in response')
    } catch (err) {
      lastError = err
      console.log(`   ❌ Model ${model} failed: ${err.message}`)
      continue
    }
  }
  
  console.error(`   ❌ All models failed for ${era.id}:`, lastError?.message)
  return null
}

async function main() {
  console.log('🎬 Generating cinematic era backgrounds for All Suspects...\n')
  console.log(`Output directory: ${publicDir}\n`)
  
  for (const era of ERAS) {
    await generateImage(era)
    
    // Rate limit: wait 3 seconds between requests
    if (ERAS.indexOf(era) < ERAS.length - 1) {
      console.log('   ⏳ Waiting 3s before next generation...')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }
  
  console.log('\n✨ Done! Era backgrounds generated.')
  console.log('\nNext steps:')
  console.log('1. Review images in public/ui/eras/')
  console.log('2. Update MysteryCreator.tsx to use background images')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
