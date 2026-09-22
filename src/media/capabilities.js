export const getMediaCapabilities = () => {
  const isolated = typeof window !== 'undefined' && window.crossOriginIsolated === true
  const sharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'

  return {
    isolated,
    sharedArrayBuffer,
    ffmpegWasm: isolated && sharedArrayBuffer
  }
}

export const assertMediaCapabilities = () => {
  const capabilities = getMediaCapabilities()

  if (!capabilities.isolated) {
    const error = new Error('Media conversion requires cross-origin isolation. Enable COOP and COEP response headers for this site.')
    error.code = 'CROSS_ORIGIN_ISOLATION_REQUIRED'
    throw error
  }

  if (!capabilities.sharedArrayBuffer) {
    const error = new Error('Media conversion is unavailable because SharedArrayBuffer is not supported by this browser.')
    error.code = 'SHARED_ARRAY_BUFFER_UNAVAILABLE'
    throw error
  }

  return capabilities
}
