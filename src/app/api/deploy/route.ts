import { NextRequest, NextResponse } from 'next/server';
import { pushProjectToGithub } from '@/lib/github/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { githubToken, projectName, files } = body;

    if (!githubToken || !projectName || !files || files.length === 0) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const result = await pushProjectToGithub(githubToken, projectName, files);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        repoUrl: result.repoUrl,
        // This is the magic Vercel link that handles importing the repo and deploying it
        vercelDeployUrl: `https://vercel.com/new/clone?repository-url=${encodeURIComponent(result.repoUrl!)}`
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('Deployment API Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
