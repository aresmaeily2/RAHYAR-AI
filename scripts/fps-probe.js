// FPS + heap probe — اجرا در کنسول مرورگر
(async () => {
  const dur = 6000
  let frames = 0
  const t0 = performance.now()
  function loop() { frames++; if (performance.now() - t0 < dur) requestAnimationFrame(loop) }
  requestAnimationFrame(loop)
  await new Promise(r => setTimeout(r, dur + 200))
  const fps = Math.round((frames / (performance.now() - t0)) * 1000)
  const heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null
  return JSON.stringify({ fps, heapMB: heap })
})()
