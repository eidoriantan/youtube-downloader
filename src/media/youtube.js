/* global Request, Headers */

import { Innertube, UniversalCache } from 'youtubei.js/web'

const proxyUrl = process.env.REACT_APP_PROXY_URL || 'http://localhost:8787'

const getProxyUrl = () => {
  const url = new URL(proxyUrl, window.location.origin)
  const localHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  const localPage = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  if (localHost && localPage && url.protocol === 'https:') {
    url.protocol = 'http:'
  }

  return url
}

const toProxyUrl = (target, headers) => {
  const targetUrl = new URL(target)
  const url = getProxyUrl()
  const serializedHeaders = {}

  for (const [name, value] of headers.entries()) {
    serializedHeaders[name] = value
  }

  url.pathname = targetUrl.pathname || '/'
  url.search = targetUrl.search
  url.searchParams.set('__host', targetUrl.host)
  url.searchParams.set('__headers', JSON.stringify(serializedHeaders))
  return url.toString()
}

const proxyFetch = async (input, init = {}) => {
  const request = new Request(input, init)
  const headers = new Headers(request.headers)
  headers.delete('user-agent')
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const proxyRequestUrl = toProxyUrl(request.url, headers)

  try {
    return await fetch(proxyRequestUrl, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      duplex: hasBody ? 'half' : undefined,
      redirect: request.redirect,
      signal: request.signal
    })
  } catch (error) {
    throw new Error(`Unable to reach the YouTube proxy at ${proxyRequestUrl}. Use HTTP for local Wrangler development and HTTPS only for a deployed Worker. ${error.message}`)
  }
}

let clientPromise

export const getYoutubeClient = () => {
  if (!clientPromise) {
    clientPromise = Innertube.create({
      cache: new UniversalCache(true),
      fetch: proxyFetch
    })
  }

  return clientPromise
}

export const getYoutubeInfo = async (url) => {
  const client = await getYoutubeClient()
  return client.getInfo(url)
}

export { proxyFetch }
