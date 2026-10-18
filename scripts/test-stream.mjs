// تست استریم SDK
import ZAI from 'z-ai-web-dev-sdk'

async function main() {
  const zai = await ZAI.create()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'فقط JSON بده: {"reply":"سلام"}' },
      { role: 'user', content: 'سلام' },
    ],
    stream: true,
  })

  console.log('type:', typeof completion)
  console.log('has asyncIterator:', typeof completion?.[Symbol.asyncIterator])
  console.log('keys:', completion ? Object.keys(completion) : 'null')

  if (typeof completion?.[Symbol.asyncIterator] === 'function') {
    let count = 0
    for await (const chunk of completion) {
      count++
      if (count <= 3) {
        console.log('chunk keys:', Object.keys(chunk))
        console.log('chunk:', JSON.stringify(chunk).slice(0, 300))
      }
    }
    console.log('total chunks:', count)
  } else {
    console.log('full:', JSON.stringify(completion).slice(0, 500))
  }
}

main().catch((e) => {
  console.error('ERROR:', e?.message ?? e)
  process.exit(1)
})
