export interface CommitInfo {
  id: string;
  shortId: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface BranchInfo {
  name: string;
  refName: string;
  isNew: boolean;
}

export interface ParsedPush {
  pushedBy: string;
  repositoryName: string;
  repositoryUrl: string;
  projectName: string;
  pushId: number;
  pushDate: string;
  pushUrl: string;
  branches: BranchInfo[];
  commits: CommitInfo[];
}

interface AzureDevOpsCommit {
  commitId: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  comment: string;
  url: string;
}

interface AzureDevOpsRefUpdate {
  name: string;
  oldObjectId: string;
  newObjectId: string;
}

interface AzureDevOpsPayload {
  eventType: string;
  resource: {
    commits: AzureDevOpsCommit[];
    refUpdates: AzureDevOpsRefUpdate[];
    repository: {
      name: string;
      remoteUrl: string;
      defaultBranch: string;
      project: {
        name: string;
      };
    };
    pushedBy: {
      displayName: string;
    };
    pushId: number;
    date: string;
    url: string;
  };
}

const ZERO_OID = "0000000000000000000000000000000000000000";

function stripRefsPrefix(ref: string): string {
  return ref.replace(/^refs\/heads\//, "");
}

function parseCommits(commits: AzureDevOpsCommit[]): CommitInfo[] {
  return commits.map((c) => ({
    id: c.commitId,
    shortId: c.commitId.substring(0, 7),
    message: c.comment.split("\n")[0],
    author: c.author.name,
    date: c.author.date,
    url: c.url,
  }));
}

function parseBranches(refUpdates: AzureDevOpsRefUpdate[]): BranchInfo[] {
  return refUpdates
    .filter((r) => r.newObjectId !== ZERO_OID)
    .map((r) => ({
      name: stripRefsPrefix(r.name),
      refName: r.name,
      isNew: r.oldObjectId === ZERO_OID,
    }));
}

export function parsePushPayload(payload: AzureDevOpsPayload): ParsedPush | null {
  if (payload.eventType !== "git.push") {
    return null;
  }

  const { resource } = payload;

  if (!resource) {
    return null;
  }

  return {
    pushedBy: resource.pushedBy?.displayName ?? "Unknown",
    repositoryName: resource.repository?.name ?? "Unknown",
    repositoryUrl: resource.repository?.remoteUrl ?? "",
    projectName: resource.repository?.project?.name ?? "Unknown",
    pushId: resource.pushId ?? 0,
    pushDate: resource.date ?? new Date().toISOString(),
    pushUrl: resource.url ?? "",
    branches: parseBranches(resource.refUpdates || []),
    commits: parseCommits(resource.commits || []),
  };
}
