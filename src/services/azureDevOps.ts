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

interface AzureDevOpsPushResource {
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
}

interface AzureDevOpsPushResponse {
  count: number;
  value: AzureDevOpsPushResource[];
}

const ZERO_OID = "0000000000000000000000000000000000000000";

function stripRefsPrefix(ref: string): string {
  return ref.replace(/^refs\/heads\//, "");
}

export interface MissedPush {
  pushId: number;
  pushedBy: string;
  repositoryName: string;
  repositoryUrl: string;
  projectName: string;
  pushDate: string;
  pushUrl: string;
  branches: { name: string; isNew: boolean }[];
  commits: {
    id: string;
    shortId: string;
    message: string;
    author: string;
    date: string;
    url: string;
  }[];
}

function mapPush(r: AzureDevOpsPushResource): MissedPush {
  const refUpdates = r.refUpdates || [];
  const commits = r.commits || [];

  return {
    pushId: r.pushId,
    pushedBy: r.pushedBy?.displayName ?? "Unknown",
    repositoryName: r.repository?.name ?? "Unknown",
    repositoryUrl: r.repository?.remoteUrl ?? "",
    projectName: r.repository?.project?.name ?? "Unknown",
    pushDate: r.date ?? new Date().toISOString(),
    pushUrl: r.url ?? "",
    branches: refUpdates
      .filter((ru) => ru.newObjectId !== ZERO_OID)
      .map((ru) => ({
        name: stripRefsPrefix(ru.name),
        isNew: ru.oldObjectId === ZERO_OID,
      })),
    commits: commits.map((c) => ({
      id: c.commitId,
      shortId: c.commitId.substring(0, 7),
      message: c.comment.split("\n")[0],
      author: c.author?.name ?? "Unknown",
      date: c.author?.date ?? new Date().toISOString(),
      url: c.url ?? "",
    })),
  };
}

export async function fetchMissedPushes(
  org: string,
  project: string,
  repo: string,
  pat: string,
  afterPushId: number
): Promise<MissedPush[]> {
  const apiUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pushes?api-version=7.0&$top=50`;

  console.log(
    `Fetching missed pushes from Azure DevOps (after push #${afterPushId})...`
  );

  console.log(`API URL: ${apiUrl}`);

  const auth = Buffer.from(`:${pat}`).toString("base64");

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure DevOps API error ${response.status}: ${text}`);
  }

  const data: AzureDevOpsPushResponse = await response.json();

  const missed = data.value
    .filter((p) => p.pushId > afterPushId)
    .filter((p) => {
      const refUpdates = p.refUpdates || [];
      return refUpdates.some((ru) => ru.newObjectId !== ZERO_OID);
    })
    .map(mapPush)
    .sort((a, b) => a.pushId - b.pushId);

  return missed;
}
