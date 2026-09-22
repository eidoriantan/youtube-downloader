const getValue = (value, fallback = '') => value === undefined || value === null ? fallback : value

const normalizeFormat = (format) => {
  const mimeType = getValue(format.mime_type || format.mimeType)
  const hasAudio = Boolean(format.has_audio ?? format.hasAudio)
  const hasVideo = Boolean(format.has_video ?? format.hasVideo)
  const contentLength = getValue(format.content_length || format.contentLength)
  const duration = getValue(format.approx_duration_ms || format.approxDurationMs)

  return {
    ...format,
    itag: format.itag,
    mimeType,
    qualityLabel: getValue(format.quality_label || format.qualityLabel),
    bitrate: getValue(format.average_bitrate || format.bitrate),
    contentLength,
    approxDurationMs: duration,
    hasAudio,
    hasVideo,
    progressive: hasAudio && hasVideo,
    supported: Boolean(format.url || format.signature_cipher || format.signatureCipher)
  }
}

export const normalizeYoutubeInfo = (info, sourceUrl) => {
  const basicInfo = info.basic_info || info.videoDetails || {}
  const streamingData = info.streaming_data || info.streamingData || {}
  const formats = [
    ...(streamingData.formats || []),
    ...(streamingData.adaptive_formats || streamingData.adaptiveFormats || [])
  ].map(normalizeFormat)
  const videoId = getValue(basicInfo.id || basicInfo.video_id)
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`

  return {
    ...info,
    videoDetails: {
      ...basicInfo,
      title: getValue(basicInfo.title, 'YouTube video'),
      video_url: sourceUrl || canonicalUrl,
      embed: {
        iframeUrl: `https://www.youtube.com/embed/${videoId}`
      }
    },
    audioFormats: formats.filter((format) => format.hasAudio && !format.hasVideo),
    videoFormats: formats.filter((format) => format.hasVideo),
    progressiveFormats: formats.filter((format) => format.progressive),
    formats
  }
}
