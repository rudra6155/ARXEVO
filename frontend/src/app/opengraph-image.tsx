import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
// Image metadata
export const alt = 'ARXEVO'
export const size = {
  width: 1200,
  height: 630,
}
 
export const contentType = 'image/png'
 
// Image generation
export default async function Image() {
  // Use Inter as a fallback since fetching Cormorant Garamond font data might be tricky synchronously,
  // but we can try to style it directly.
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: '#0a0a08',
          color: '#e8e0d0',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          letterSpacing: '0.1em',
        }}
      >
        ARXEVO
      </div>
    ),
    {
      ...size,
    }
  )
}
