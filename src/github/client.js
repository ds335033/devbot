import { Octokit } from '@octokit/rest';

export class GitHubClient {
  constructor() {
    this.octokit = process.env.GITHUB_TOKEN
      ? new Octokit({ auth: process.env.GITHUB_TOKEN })
      : null;
  }

  get connected() {
    return !!this.octokit;
  }

  async createRepo(name, description, isPrivate = false) {
    if (!this.octokit) throw new Error('GitHub not configured');
    const { data } = await this.octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    });
    return data;
  }

  async pushFiles(owner, repo, files, message = 'Initial commit by DevBot') {
    if (!this.octokit) throw new Error('GitHub not configured');

    // Get the default branch ref
    const { data: ref } = await this.octokit.git.getRef({
      owner, repo, ref: 'heads/main',
    });
    const latestCommitSha = ref.object.sha;

    // Get the tree of the latest commit
    const { data: commit } = await this.octokit.git.getCommit({
      owner, repo, commit_sha: latestCommitSha,
    });

    // Create blobs for each file
    const blobs = await Promise.all(
      Object.entries(files).map(async ([path, content]) => {
        const { data } = await this.octokit.git.createBlob({
          owner, repo, content, encoding: 'utf-8',
        });
        return { path, sha: data.sha, mode: '100644', type: 'blob' };
      })
    );

    // Create a new tree
    const { data: tree } = await this.octokit.git.createTree({
      owner, repo, base_tree: commit.tree.sha, tree: blobs,
    });

    // Create a new commit
    const { data: newCommit } = await this.octokit.git.createCommit({
      owner, repo, message, tree: tree.sha, parents: [latestCommitSha],
    });

    // Update the ref
    await this.octokit.git.updateRef({
      owner, repo, ref: 'heads/main', sha: newCommit.sha,
    });

    return { commitSha: newCommit.sha, filesCount: blobs.length };
  }

  async createIssue(owner, repo, title, body) {
    if (!this.octokit) throw new Error('GitHub not configured');
    const { data } = await this.octokit.issues.create({
      owner, repo, title, body,
    });
    return data;
  }

  async createPR(owner, repo, title, body, head, base = 'main') {
    if (!this.octokit) throw new Error('GitHub not configured');
    const { data } = await this.octokit.pulls.create({
      owner, repo, title, body, head, base,
    });
    return data;
  }

  async listRepos() {
    if (!this.octokit) throw new Error('GitHub not configured');
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated', per_page: 30,
    });
    return data.map(r => ({
      name: r.full_name,
      description: r.description,
      url: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
    }));
  }
}
