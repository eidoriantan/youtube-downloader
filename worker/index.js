/* global Headers, Response, URL */

// Cloudflare Worker port of:
// https://github.com/LuanRT/kira/blob/main/proxy/deno.ts
//
// Usage from the browser is identical to the Deno version:
//   fetch(`https://your-worker.workers.dev/some/path?__host=www.youtube.com&...`)
// YouTube.js's custom `fetch` implementation should rewrite requests to go
// through this Worker, setting `__host` to the real target host and
// (optionally) `__headers` to a JSON-encoded header map.

const ALLOWED_HEADERS = [
  'Origin',
  'X-Requested-With',
  'Content-Type',
  'Accept',
  'Authorization',
  'x-goog-visitor-id',
  'x-goog-api-key',
  'x-origin',
  'x-youtube-client-version',
  'x-youtube-client-name',
  'x-goog-api-format-version',
  'x-goog-authuser',
  'x-user-agent',
  'Accept-Language',
  'X-Goog-FieldMask',
  'Range',
  'Referer',
  'Cookie'
].join(', ')

function copyHeader (headerName, to, from) {
  const hdrVal = from.get(headerName)
  if (hdrVal) {
    to.set(headerName, hdrVal)
  }
}

async function handleRequest (request) {
  const origin = request.headers.get('origin') || ''

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: new Headers({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'true'
      })
    })
  }

  const url = new URL(request.url)

  if (!url.searchParams.has('__host')) {
    return new Response(
      'Request is formatted incorrectly. Please include __host in the query string.',
      { status: 400 }
    )
  }

  // Point the URL at the real destination
  url.host = url.searchParams.get('__host')
  url.protocol = 'https'
  url.port = '443'
  url.searchParams.delete('__host')

  // Build outbound headers
  const requestHeaders = new Headers(
    JSON.parse(url.searchParams.get('__headers') || '{}')
  )
  copyHeader('range', requestHeaders, request.headers)
  if (!requestHeaders.has('user-agent')) {
    copyHeader('user-agent', requestHeaders, request.headers)
  }
  url.searchParams.delete('__headers')

  if (url.host.includes('youtube')) {
    requestHeaders.set('origin', 'https://www.youtube.com')
    requestHeaders.set('referer', 'https://www.youtube.com/')
  }

  if (request.headers.has('Authorization')) {
    requestHeaders.set('Authorization', request.headers.get('Authorization'))
  }

  const fetchRes = await fetch(url.toString(), {
    method: request.method,
    headers: requestHeaders,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body
  })

  // Construct the return headers
  const headers = new Headers()
  copyHeader('content-length', headers, fetchRes.headers)
  copyHeader('content-type', headers, fetchRes.headers)
  copyHeader('content-disposition', headers, fetchRes.headers)
  copyHeader('accept-ranges', headers, fetchRes.headers)
  copyHeader('content-range', headers, fetchRes.headers)

  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Credentials', 'true')

  return new Response(fetchRes.body, {
    status: fetchRes.status,
    headers
  })
}

export default {
  async fetch (request) {
    return handleRequest(request)
  }
}
