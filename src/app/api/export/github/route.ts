import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export async function POST(request: Request) {
  try {
    const { githubToken, repoName, files, description } = await request.json();

    if (!githubToken || !repoName || !files || !files.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const octokit = new Octokit({ auth: githubToken });

    // 1. Fá upplýsingar um notandann
    const { data: user } = await octokit.rest.users.getAuthenticated();
    
    // 2. Búa til nýtt repository
    let repoUrl = '';
    try {
      const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: description || 'Byggt með Forge AI (tryforge.tech)',
        private: false,
        auto_init: true, // Býr til initial commit
      });
      repoUrl = repo.html_url;
    } catch (e: any) {
      if (e.status === 422) {
        return NextResponse.json({ error: 'Repository nafn er nú þegar í notkun á GitHub reikningnum þínum.' }, { status: 400 });
      }
      throw e;
    }

    // 3. Fá nýjasta commit SHA til að geta uppfært tree
    const { data: ref } = await octokit.rest.git.getRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/main',
    }).catch(async () => {
      // Stundum notar GitHub 'master' ef stillingar notanda krefjast þess
      return await octokit.rest.git.getRef({
        owner: user.login,
        repo: repoName,
        ref: 'heads/master',
      });
    });

    const baseTreeSha = ref.object.sha;

    // 4. Búa til blobs (skrár)
    const treePayload = await Promise.all(
      files.map(async (file: { path: string; content: string }) => {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner: user.login,
          repo: repoName,
          content: file.content,
          encoding: 'utf-8',
        });
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      })
    );

    // Bæta við README.md ef það er ekki til
    if (!files.find((f: any) => f.path === 'README.md')) {
      const readmeContent = `# ${repoName}\n\n${description || 'Vefapp byggt með [Forge AI](https://tryforge.tech).'}\n\nÞessi kóði var algjörlega smíðaður af Forge og keyrir beint í vafra. Engin uppsetning þarf.`;
      const { data: blob } = await octokit.rest.git.createBlob({
        owner: user.login,
        repo: repoName,
        content: readmeContent,
        encoding: 'utf-8',
      });
      treePayload.push({
        path: 'README.md',
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      });
    }

    // 5. Búa til nýtt Tree
    const { data: tree } = await octokit.rest.git.createTree({
      owner: user.login,
      repo: repoName,
      base_tree: baseTreeSha,
      tree: treePayload,
    });

    // 6. Búa til Commit
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: user.login,
      repo: repoName,
      message: 'Initial commit from Forge AI',
      tree: tree.sha,
      parents: [baseTreeSha],
    });

    // 7. Uppfæra Ref (ýta commitinu á branchið)
    await octokit.rest.git.updateRef({
      owner: user.login,
      repo: repoName,
      ref: ref.ref.replace('refs/', ''), // t.d. heads/main
      sha: commit.sha,
    });

    return NextResponse.json({ success: true, url: repoUrl });
  } catch (error: any) {
    console.error('GitHub export error:', error);
    return NextResponse.json({ 
      error: error.response?.data?.message || error.message || 'Mistókst að ýta á GitHub' 
    }, { status: 500 });
  }
}
