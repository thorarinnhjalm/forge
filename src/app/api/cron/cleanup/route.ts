import { NextResponse } from 'next/server';
import { Sandbox } from 'e2b';

export async function GET(request: Request) {
  // Vernda þennan endapunkt svo hann geti bara verið keyrður af CRON eða okkur
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const paginator = await Sandbox.list();
    const runningSandboxes = await paginator.nextItems();
    let killedCount = 0;

    for (const sandbox of runningSandboxes) {
      // Drepum alla sandkassa sem eru eldri en X (e2b sér oftast sjálfkrafa um timeout 
      // ef keepAlive er ekki kallað, en gott að hafa þetta sem öryggisnet)
      try {
        await Sandbox.kill(sandbox.sandboxId);
        killedCount++;
      } catch (e) {
        console.error(`Gat ekki drepið sandbox ${sandbox.sandboxId}`, e);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Hreinsaði ${killedCount} af ${runningSandboxes.length} sandkössum.` 
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Failed to list sandboxes' }, { status: 500 });
  }
}
