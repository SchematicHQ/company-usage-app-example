// src/app/api/placeholder/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="16" fill="#E5E7EB"/>
      <path d="M16 8C14.9391 8 13.9217 8.42143 13.1716 9.17157C12.4214 9.92172 12 10.9391 12 12C12 13.0609 12.4214 14.0783 13.1716 14.8284C13.9217 15.5786 14.9391 16 16 16C17.0609 16 18.0783 15.5786 18.8284 14.8284C19.5786 14.0783 20 13.0609 20 12C20 10.9391 19.5786 9.92172 18.8284 9.17157C18.0783 8.42143 17.0609 8 16 8Z" fill="#9CA3AF"/>
      <path d="M24 24C24 24 24 22.6667 24 22C24 20 20.4183 18 16 18C11.5817 18 8 20 8 22C8 22.6667 8 24 8 24H24Z" fill="#9CA3AF"/>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
    },
  });
}