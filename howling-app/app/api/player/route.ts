import { NextRequest, NextResponse } from 'next/server';
import { getFullPlayerData } from '@/lib/riot';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameName = searchParams.get('gameName');
  const tagLine = searchParams.get('tagLine');

  if (!gameName || !tagLine) {
    return NextResponse.json(
      { error: 'gameName e tagLine são obrigatórios' },
      { status: 400 }
    );
  }

  try {
    const data = await getFullPlayerData(gameName, tagLine);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}